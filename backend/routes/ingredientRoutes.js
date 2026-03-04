const express = require("express");
const router = express.Router();
const vision = require("@google-cloud/vision");
const path = require("path");
const fetch = global.fetch || require("node-fetch");
require("dotenv").config();

const client = new vision.ImageAnnotatorClient({
  keyFilename: path.join(__dirname, "../config/google-key.json"),
});

/* ================= CORE DATABASE ================= */

const coreDB = [
  { name: "SODIUM BENZOATE", risk: "High", reason: "May trigger allergic reactions in sensitive individuals." },
  { name: "SODIUM LAURYL SULFATE", risk: "High", reason: "Known to cause skin irritation and dryness." },
  { name: "TRICLOSAN", risk: "High", reason: "Associated with endocrine disruption concerns." },
  { name: "FORMALDEHYDE", risk: "High", reason: "Classified as a potential carcinogen." },

  { name: "SUGAR", risk: "Moderate", reason: "High consumption linked to obesity and diabetes." },
  { name: "PALM OIL", risk: "Moderate", reason: "High saturated fat content." },
  { name: "PARABEN", risk: "Moderate", reason: "Possible hormonal disruption risk." },
  { name: "FRAGRANCE", risk: "Moderate", reason: "May contain hidden allergens." },
];

/* ================= CLEAN OCR TEXT ================= */

function extractIngredientsOnly(text) {
  const upper = text.toUpperCase();
  const match = upper.match(/INGREDIENTS:\s*([\s\S]*)/);

  if (!match) return upper;

  return match[1]
    .split("WWW.")[0]
    .split("IMPORTANT")[0]
    .split("ART.-NO")[0]
    .replace(/[0-9]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[^A-Z0-9,()\s\-]/g, "")
    .trim();
}

/* ================= SMART SCORING ================= */

function calculateScore(allRisks) {
  let score = 10;

  allRisks.forEach(i => {
    const level = (i.riskLevel || "").toUpperCase();

    if (level.includes("HIGH")) score -= 3;
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
    const { image, ingredientsText, category } = req.body;

if (!image && !ingredientsText) {
  return res.status(400).json({ error: "Image or ingredients text required" });
}
    console.log("\n===== NEW ANALYSIS REQUEST =====");

let rawText = "";

if (image) {
  const buffer = Buffer.from(image, "base64");
  const [ocrResult] = await client.textDetection({
    image: { content: buffer },
  });
  rawText = ocrResult.textAnnotations?.[0]?.description || "";
} else {
  rawText = ingredientsText;
}
    console.log("\n===== RAW OCR TEXT =====");
    console.log(rawText);

    const cleanedText = extractIngredientsOnly(rawText);

    console.log("\n===== CLEANED TEXT =====");
    console.log(cleanedText);

    const ingredientList = cleanedText
      .split(/,|\n|;/)
      .map(i => i.trim())
      .filter(i =>
        i.length > 2 &&
        !i.includes("CONTAINS") &&
        !i.includes("MAY CONTAIN") &&
        /^[A-Z\s()\-]+$/.test(i) 
      );

    console.log("\n===== FINAL INGREDIENT ARRAY =====");
    console.log(ingredientList);

    let allAnalyzedIngredients = [];

    for (let ing of ingredientList.slice(0, 15)) {

      const upperIng = ing.toUpperCase();
      console.log(`\nAnalyzing: ${upperIng}`);

      const found = coreDB.find(db =>
        upperIng.includes(db.name)
      );

      if (found) {
        console.log("Matched in CoreDB");

        allAnalyzedIngredients.push({
          name: found.name,
          riskLevel: found.risk,
          shortReason: found.reason,
          detailedReason: found.reason,
          source: "Certified Database"
        });

      } else {
        try {
          console.log("Sending to AI...");

          const aiResponse = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
              },
              body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                  {
                    role: "user",
                    content: `Is "${upperIng}" harmful in ${category || "food"}?
Reply ONLY in JSON:
{
"risk":"Low/Moderate/High",
"reason":"short explanation"
}`
                  }
                ],
              }),
            }
          );

          const aiData = await aiResponse.json();
          const content = aiData?.choices?.[0]?.message?.content;

          console.log("AI Raw Response:", content);

          if (content) {
            try {
              const parsed = JSON.parse(content);

              let risk = parsed.risk || parsed.Risk || parsed.SPICES || "Low";
              if (risk === "Low/Moderate") risk = "Moderate";

              allAnalyzedIngredients.push({
                name: upperIng,
                riskLevel: risk,
                shortReason: parsed.reason || "No major concern.",
                detailedReason: parsed.reason || "No detailed information available.",
                source: "AI Analysis"
              });

            } catch (err) {
              console.log("JSON PARSE ERROR:", err.message);
            }
          }

        } catch (err) {
          console.log("AI FAILED:", err.message);
        }
      }
    }

    console.log("\n===== ALL ANALYZED INGREDIENTS =====");
    console.log(allAnalyzedIngredients);

    /* ===== Risk Counts ===== */

    const highCount = allAnalyzedIngredients.filter(i =>
      i.riskLevel.toUpperCase().includes("HIGH")
    ).length;

    const moderateCount = allAnalyzedIngredients.filter(i =>
      i.riskLevel.toUpperCase().includes("MODERATE")
    ).length;

    const lowCount = allAnalyzedIngredients.length - highCount - moderateCount;

    /* ===== Score ===== */

    const safetyScore = calculateScore(allAnalyzedIngredients);
    const riskSummary = calculateRiskSummary(safetyScore);

    /* ===== Harmful (Moderate + High) ===== */

    const harmfulIngredients = allAnalyzedIngredients.filter(i =>
      i.riskLevel.toUpperCase().includes("HIGH") ||
      i.riskLevel.toUpperCase().includes("MODERATE")
    );

    /* ===== Overall Explanation ===== */

    const overallExplanation = `
This product contains ${highCount} high-risk and ${moderateCount} moderate-risk ingredients.
Moderate ingredients should be consumed occasionally.
High-risk ingredients may require caution.
`;

    /* ===== FINAL RESPONSE ===== */

    res.json({
      rawText,
      cleanedText,
      allAnalyzedIngredients,
      harmfulIngredients,
      safetyScore,
      riskSummary,
      riskBreakdown: {
        high: highCount,
        moderate: moderateCount,
        low: lowCount
      },
      overallExplanation,
      healthAlert: highCount > 0,
      caution: "Smart ingredient safety evaluation completed."
    });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

module.exports = router;