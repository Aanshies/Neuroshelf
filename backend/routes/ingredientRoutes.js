import express from "express";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import vision from "@google-cloud/vision";

dotenv.config();

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const analysisCache = new Map();

// Vision client — uses google-key.json via env var GOOGLE_APPLICATION_CREDENTIALS
const client = new vision.ImageAnnotatorClient();

/* ================= CORE DATABASE ================= */
const coreDB = [
  { name: "SODIUM BENZOATE",      risk: "High",     reason: "May trigger allergic reactions in sensitive individuals." },
  { name: "SODIUM LAURYL SULFATE",risk: "High",     reason: "Known to cause skin irritation and dryness." },
  { name: "TRICLOSAN",            risk: "High",     reason: "Associated with endocrine disruption concerns." },
  { name: "FORMALDEHYDE",         risk: "High",     reason: "Classified as a potential carcinogen." },
  { name: "SUGAR",                risk: "Moderate", reason: "High consumption linked to obesity and diabetes." },
  { name: "PALM OIL",             risk: "Moderate", reason: "High saturated fat content." },
  { name: "PARABEN",              risk: "Moderate", reason: "Possible hormonal disruption risk." },
  { name: "FRAGRANCE",            risk: "Moderate", reason: "May contain hidden allergens." },
];

/* ================= TRANSLATE via GROQ ================= */
// Replaces @google-cloud/translate — uses Groq AI for translation (no extra package needed)
async function translateText(text, targetLang) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0,
        messages: [{
          role: "user",
          content: `Translate the following text to ${targetLang}. Return ONLY the translated text, nothing else.\n\n"${text}"`,
        }],
      }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || text;
  } catch {
    return text;
  }
}

const LANG_NAMES = {
  hi: "Hindi", te: "Telugu", ta: "Tamil", kn: "Kannada",
  ml: "Malayalam", mr: "Marathi", bn: "Bengali", gu: "Gujarati",
  pa: "Punjabi", or: "Odia", en: "English",
};

/* ================= HELPERS ================= */
function extractIngredientsOnly(text) {
  const upper = text.toUpperCase();
  const match = upper.match(/INGREDIENTS:\s*([\s\S]*)/);
  if (!match) return upper;
  return match[1]
    .split("WWW.")[0].split("IMPORTANT")[0].split("ART.-NO")[0]
    .replace(/[0-9]/g, "").replace(/\s{2,}/g, " ")
    .replace(/[^A-Z0-9,()\s\-]/g, "").trim();
}

function calculateScore(allRisks) {
  let score = 10;
  allRisks.forEach(i => {
    const level = (i.riskLevel || "").toUpperCase();
    if (level.includes("HIGH"))     score -= 3;
    else if (level.includes("MODERATE")) score -= 1;
  });
  return Math.max(score, 1);
}

function calculateRiskSummary(score) {
  if (score >= 8) return "Low Risk";
  if (score >= 5) return "Moderate Risk";
  return "High Risk";
}

/* ================= MAIN ROUTE ================= */
router.post("/analyze", async (req, res) => {
  try {
    const { image, ingredientsText, category, language } = req.body;
    console.log("🌐 Selected Language:", language);

    if (!image && !ingredientsText) {
      return res.status(400).json({ error: "Image or ingredients text required" });
    }

    let rawText = "";
    if (image) {
      const buffer = Buffer.from(image, "base64");
      const [ocrResult] = await client.textDetection({ image: { content: buffer } });
      rawText = ocrResult.textAnnotations?.[0]?.description || "";
    } else {
      rawText = ingredientsText;
    }

    const cleanedText = extractIngredientsOnly(rawText);

    const ingredientList = cleanedText
      .split(/,|\n|;/)
      .map(i => i.trim().toUpperCase())
      .filter(i => i.length > 2 && !i.includes("CONTAINS") && !i.includes("MAY CONTAIN"))
      .map(i => i.replace(/[^A-Z\s]/g, "").replace(/\s+/g, " ").trim());

    const cacheKey = [...ingredientList].sort().join(",");
    if (analysisCache.has(cacheKey)) {
      console.log("⚡ Using cached analysis");
      return res.json(analysisCache.get(cacheKey));
    }

    let allAnalyzedIngredients = [];

    for (let ing of ingredientList.slice(0, 15)) {
      const upperIng = ing.toUpperCase();
      const found = coreDB.find(db => upperIng.includes(db.name));

      if (found) {
        allAnalyzedIngredients.push({
          name: found.name, riskLevel: found.risk,
          shortReason: found.reason, detailedReason: found.reason,
          source: "Certified Database",
        });
      } else {
        try {
          const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              temperature: 0, top_p: 0,
              messages: [{
                role: "user",
                content: `You are a strict food safety classifier.\n\nIngredient: "${upperIng}"\n\nClassify risk ONLY as one of: Low, Moderate, High\n\nReturn ONLY JSON:\n{"risk":"Low/Moderate/High","reason":"short explanation"}`,
              }],
            }),
          });

          const aiData = await aiResponse.json();
          const content = aiData?.choices?.[0]?.message?.content;

          if (content) {
            try {
              const parsed = JSON.parse(content);
              let risk = parsed.risk || "Low";
              if (risk === "Low/Moderate") risk = "Moderate";
              allAnalyzedIngredients.push({
                name: upperIng, riskLevel: risk,
                shortReason: parsed.reason || "No major concern.",
                detailedReason: parsed.reason || "No detailed information available.",
                source: "AI Analysis",
              });
            } catch {}
          }
        } catch (err) {
          console.log("AI FAILED:", err.message);
        }
      }
    }

    const highCount     = allAnalyzedIngredients.filter(i => i.riskLevel.toUpperCase().includes("HIGH")).length;
    const moderateCount = allAnalyzedIngredients.filter(i => i.riskLevel.toUpperCase().includes("MODERATE")).length;
    const lowCount      = allAnalyzedIngredients.length - highCount - moderateCount;
    const safetyScore   = calculateScore(allAnalyzedIngredients);
    const riskSummary   = calculateRiskSummary(safetyScore);

    const overallExplanation = `This product contains ${highCount} high-risk and ${moderateCount} moderate-risk ingredients. Moderate ingredients should be consumed occasionally. High-risk ingredients may require caution.`;

    let translatedExplanation = overallExplanation;
    let translatedIngredients = allAnalyzedIngredients;

    // Translation via Groq (no extra package needed)
    if (language && language !== "English" && language !== "en") {
      try {
        const langCode = Object.entries(LANG_NAMES).find(([, v]) => v === language)?.[0] || language;
        const langName = LANG_NAMES[langCode] || language;
        console.log(`🌍 Translating to ${langName} (${langCode})`);

        translatedIngredients = await Promise.all(
          allAnalyzedIngredients.map(async (item) => ({
            ...item,
            name:          await translateText(item.name, langName),
            shortReason:   await translateText(item.shortReason, langName),
            detailedReason:await translateText(item.shortReason, langName),
          }))
        );
        translatedExplanation = await translateText(overallExplanation, langName);
      } catch (err) {
        console.log("❌ Translation error:", err.message);
      }
    }

    const harmfulIngredients = translatedIngredients.filter(i =>
      i.riskLevel.toUpperCase().includes("HIGH") || i.riskLevel.toUpperCase().includes("MODERATE")
    );

    const finalResponse = {
      rawText, cleanedText,
      allAnalyzedIngredients: translatedIngredients,
      harmfulIngredients, safetyScore, riskSummary,
      riskBreakdown: { high: highCount, moderate: moderateCount, low: lowCount },
      overallExplanation, translatedExplanation,
      healthAlert: highCount > 0,
      caution: "Smart ingredient safety evaluation completed.",
    };

    analysisCache.set(cacheKey, finalResponse);
    res.json(finalResponse);

  } catch (error) {
    console.error("SERVER ERROR:", error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;