// ================== IMPORTS ==================
const express = require("express");
const multer = require("multer");
const vision = require("@google-cloud/vision");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const ingredientRoutes = require("./routes/ingredientRoutes");

// ================== INIT APP ==================
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/api/ingredients", ingredientRoutes);

// ================== MONGODB CONNECTION ==================
const mongoURI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000; 
mongoose.connect(mongoURI)
  .then(() => console.log("🚀 Connected to MongoDB Atlas"))
  .catch(err => console.error("MongoDB connection error:", err));
// ================== USER SCHEMA ==================
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

// ================== GOOGLE VISION ==================
const client = new vision.ImageAnnotatorClient({
  keyFilename: path.join(__dirname, "config/google-key.json"),
});

// ================== UPLOAD SETUP ==================
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

// ================== DATE PARSER ==================
const monthMap = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
};

const parseDate = (raw) => {
  if (!raw) return null;

  let clean = raw
    .toUpperCase()
    .replace(/[\.\-]/g, "/")
    .replace(/\s+/g, "")
    .trim();

  // Handle YYYYMMDD
  if (/^\d{8}$/.test(clean)) {
    const year = parseInt(clean.slice(0, 4));
    const month = parseInt(clean.slice(4, 6));
    const day = parseInt(clean.slice(6, 8));
    return new Date(year, month - 1, day);
  }

  const parts = clean.split("/").map(Number);

  // DD/MM/YYYY or YYYY/MM/DD
  if (parts.length === 3) {
    let [a, b, c] = parts;

    if (a > 31) return new Date(a, b - 1, c); // YYYY/MM/DD

    if (c < 100) c += 2000;

    return new Date(c, b - 1, a);
  }

  // MM/YY or MM/YYYY
  if (parts.length === 2) {
    let [month, year] = parts;

    if (month < 1 || month > 12) return null;

    if (year < 100) year += 2000;

    const lastDay = new Date(year, month, 0);
    lastDay.setHours(23, 59, 59, 999);
    return lastDay;
  }

  return null;
};

// ================== SMART DATE DETECTION ==================
const detectDates = (text) => {
  const fullText = text.toUpperCase();

  const numericRegex =
    /\b\d{1,4}\s?[\/\-\.]\s?\d{1,4}(?:\s?[\/\-\.]\s?\d{2,4})?\b|\b\d{8}\b/g;

  const rawDates = fullText.match(numericRegex) || [];

  let expiryDate = null;
  let mfgDate = null;

  const expiryKeywords = ["EXP", "EXPIRY", "EXPIRE", "USE BY", "BEST BEFORE", "BB"];
  const mfgKeywords = ["MFG", "MFD", "MANUFACTURE", "PKD"];

  rawDates.forEach((raw) => {
    const parsed = parseDate(raw);
    if (!parsed || isNaN(parsed.getTime())) return;

    const cleanRaw = raw.replace(/\s+/g, "");
    const index = fullText.replace(/\s+/g, "").indexOf(cleanRaw);

    const context = fullText.substring(
      Math.max(0, index - 30),
      index + 30
    );

    if (
      expiryKeywords.some((word) => context.includes(word))
    ) {
      expiryDate = parsed;
    }

    if (
      mfgKeywords.some((word) => context.includes(word))
    ) {
      mfgDate = parsed;
    }
  });

  // If still no expiry found → choose latest FUTURE date
  if (!expiryDate && rawDates.length > 0) {
    const today = new Date();

    const parsedDates = rawDates
      .map(parseDate)
      .filter((d) => d && !isNaN(d.getTime()));
    if (parsedDates.length > 0) {
      expiryDate = parsedDates.sort((a, b) => b - a)[0];
    }
  }

  return { expiryDate, mfgDate };
};

// ================== OCR ROUTE ==================
app.post("/api/ocr", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image received" });

  const imagePath = req.file.path;
  const processedPath = imagePath + "-processed.jpg";

  try {
    await sharp(imagePath)
      .resize({ width: 1600 })
      .grayscale()
      .normalize()
      .sharpen()
      .threshold(150)
      .toFile(processedPath);

    const [result] = await client.textDetection(processedPath);
    const fullText = result.textAnnotations?.[0]?.description || "";
    const { expiryDate, mfgDate } = detectDates(fullText);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let daysLeft = null;
    let status = "DATE NOT FOUND";

    if (expiryDate) {
      const expiry = new Date(expiryDate);
      expiry.setHours(0, 0, 0, 0);
      daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      status = daysLeft < 0 ? "EXPIRED" : daysLeft <= 7 ? "EXPIRING SOON" : "SAFE";
    }
    
    res.json({
      manufacturingDate: mfgDate ? mfgDate.toISOString() : null,
      detectedExpiry: expiryDate ? expiryDate.toISOString() : null,
      daysLeft,
      status,
    });
  } catch (err) {
    console.error("OCR ERROR:", err);
    res.status(500).json({ error: "OCR Failed" });
  } finally {
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
  }
});

// ================== SIGNUP ==================
app.post("/api/user", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password)
      return res.status(400).json({ error: "All fields required" });

    if (password.length < 8)
      return res.status(400).json({ error: "Password must be at least 8 characters" });

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ error: "Email already exists" });

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) return res.status(400).json({ error: "Phone already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, phone, password: hashedPassword });
    res.json({ message: "User created", user: { email: user.email, name: user.name, phone: user.phone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================== LOGIN ==================
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

    res.json({ message: "Login successful", user: { email: user.email, name: user.name, phone: user.phone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================== GET USER PROFILE ==================
app.get("/api/user/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email }).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================== UPDATE PROFILE ==================
app.put("/api/user/:email", async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (password) user.password = await bcrypt.hash(password, 10);

    await user.save();
    res.json({ message: "Profile updated successfully", user: { email: user.email, name: user.name, phone: user.phone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================== BARCODE ANALYZER==================
app.post("/api/barcode/analyze", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const buffer = Buffer.from(image, "base64");

    const [result] = await client.textDetection({
      image: { content: buffer },
    });

    const detectedText = result.textAnnotations?.[0]?.description || "";
    const barcodeMatch = detectedText.match(/\b\d{8,14}\b/);

    if (!barcodeMatch) {
      return res.status(400).json({ error: "Barcode not detected" });
    }

    const barcode = barcodeMatch[0];
    console.log("Detected barcode:", barcode);

    let productData = null;

    // 🔎 Try OpenFoodFacts
    try {
      const offRes = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const offData = await offRes.json();

      if (offData.status === 1) {
        productData = offData.product;
      }
    } catch (err) {
      console.log("OpenFoodFacts failed");
    }

    // 🔎 If not found → Try OpenBeautyFacts
    if (!productData) {
      try {
        const beautyRes = await fetch(
          `https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`
        );
        const beautyData = await beautyRes.json();

        if (beautyData.status === 1) {
          productData = beautyData.product;
        }
      } catch (err) {
        console.log("OpenBeautyFacts failed");
      }
    }

    if (!productData) {
      return res.json({
        productName: "Product not found",
        ingredients: null,
        message: "Please scan ingredient label for analysis."
      });
    }

    const productName =
      productData.product_name ||
      productData.product_name_en ||
      "Unknown Product";

    const ingredients =
      productData.ingredients_text ||
      productData.ingredients_text_en ||
      "";
      if (!ingredients || ingredients.trim().length < 5) {
  return res.json({
    productName,
    ingredients: null,
    safetyScore: null,
    riskSummary: null,
    overallExplanation: "Ingredients not found. Please upload the ingredient image for analysis.",
    harmfulIngredients: []
  });
}

    // 🔥 CALL YOUR AI INGREDIENT ROUTE
    const aiResponse = await fetch("http://localhost:5000/api/ingredients/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: null,              // no image
        category: "food",         // or detect based on API source
        ingredientsText: ingredients
      })
    });

    const aiResult = await aiResponse.json();

    return res.json({
      productName,
      ingredients,
      ...aiResult
    });

  } catch (err) {
    console.error("BARCODE ERROR:", err);
    res.status(500).json({ error: "Barcode processing failed" });
  }
});

// ================== PRODUCT NAME ANALYZER ==================
app.post("/api/product-name/analyze", async (req, res) => {
  try {
    const { image, category = "food" } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    if (!["food", "cosmetic"].includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    console.log("\n===== PRODUCT NAME SCAN STARTED =====");
    console.log("Category:", category);

    // ================= OCR =================
    const buffer = Buffer.from(image, "base64");

    const [result] = await client.textDetection({
      image: { content: buffer },
    });

    const detectedText = result.textAnnotations?.[0]?.description || "";
    console.log("\nDetected OCR Text:\n", detectedText);

    // ================= SMART NAME EXTRACTION =================
    function extractSmartProductName(text) {
      const lines = text
        .split("\n")
        .map(l => l.trim())
        .filter(l =>
          l.length > 2 &&
          !/^[^a-zA-Z0-9]+$/.test(l) &&
          !l.toUpperCase().includes("NET WT") &&
          !l.toUpperCase().includes("HELP") &&
          !l.toUpperCase().includes("RECIPE") &&
          !l.toUpperCase().includes("DRY") &&
          !l.toUpperCase().includes("WWW") &&
          !l.match(/^\d+$/)
        );

      if (!lines.length) return text.split("\n")[0];
let name = lines.slice(0, 4).join(" ").trim();

  // Remove marketing words
  const marketingWords = ["INSIDE", "NEW", "FREE", "WITH"];
  marketingWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    name = name.replace(regex, "");
  });

  // Fix common OCR typos
  name = name.replace(/\bnodles\b/gi, "noodles");
  name = name.replace(/\bchilli\b/gi, "chili");

      return lines.slice(0, 4).join(" ").trim();
    }

    const productName = extractSmartProductName(detectedText);
    console.log("\nExtracted Product Name:", productName);

    let ingredients = null;
    let dataSource = "None";

    // ================= DATABASE SEARCH =================

    if (category === "food") {
      try {
        const offRes = await fetch(
          `https://in.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(productName)}&search_simple=1&json=1`
        );
        const offData = await offRes.json();

        if (offData.products?.length) {
          const product = offData.products[0];
          ingredients =
            product.ingredients_text ||
            product.ingredients_text_en ||
            null;

          if (ingredients) dataSource = "OpenFoodFacts";
        }
      } catch (err) {
        console.log("OpenFoodFacts search failed");
      }
    }

    if (category === "cosmetic" && !ingredients) {
      try {
        const beautyRes = await fetch(
          `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(productName)}&search_simple=1&json=1`
        );
        const beautyData = await beautyRes.json();

        if (beautyData.products?.length) {
          const product = beautyData.products[0];
          ingredients =
            product.ingredients_text ||
            product.ingredients_text_en ||
            null;

          if (ingredients) dataSource = "OpenBeautyFacts";
        }
      } catch (err) {
        console.log("OpenBeautyFacts search failed");
      }
    }

    // ================= AI FALLBACK =================
    if (!ingredients) {
      console.log("\nNo DB result. Generating using AI...");

      const productType = category === "cosmetic" ? "COSMETIC" : "FOOD";

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
            temperature: 0.2,
            messages: [
              {
                role: "system",
                content: `
You are a ${productType} ingredient generator.

STRICT RULES:
- Assume product is ${productType}.
- No explanation.
- No headings.
- No extra text.
- Return ONLY valid JSON.

FORMAT:
{
  "ingredients": ["ingredient1", "ingredient2", "ingredient3"]
}
`
              },
              {
                role: "user",
                content: `Generate realistic ingredients for Indian ${productType} product: ${productName}`
              }
            ],
          }),
        }
      );

      const aiData = await aiResponse.json();
      const raw = aiData?.choices?.[0]?.message?.content?.trim();

      let parsed;

      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        console.log("Invalid AI JSON:", raw);
        return res.status(500).json({ error: "AI format error" });
      }

      if (!Array.isArray(parsed.ingredients)) {
        return res.status(500).json({ error: "AI invalid structure" });
      }

      ingredients = parsed.ingredients.join(", ");
      dataSource = "AI Generated (Structured)";
    }

    console.log("\nFinal Ingredients Source:", dataSource);
    console.log("\nIngredients:\n", ingredients);

    if (!ingredients) {
      return res.json({
        productName,
        ingredients: null,
        message: "Ingredients not found."
      });
    }

    // ================= SEND TO ANALYZER =================
    const analysisResponse = await fetch(
      "http://localhost:5000/api/ingredients/analyze",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: null,
          ingredientsText: ingredients,
          category: category   // dynamic now
        }),
      }
    );

    const analysisResult = await analysisResponse.json();

    console.log("\n===== FINAL ANALYSIS COMPLETE =====");

    return res.json({
      productName,
      ingredients,
      source: dataSource,
      ...analysisResult
    });

  } catch (err) {
    console.error("PRODUCT NAME ERROR:", err);
    res.status(500).json({ error: "Product name analysis failed" });
  }
});


// ================== START SERVER ==================
app.listen(5000, "0.0.0.0", () => {
  console.log("🚀 Server running on port 5000");
});

