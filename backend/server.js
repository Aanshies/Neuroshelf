// ================== IMPORTS ==================
import express from "express";
import multer from "multer";
import vision from "@google-cloud/vision";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

if (process.env.GOOGLE_KEY_JSON) {
  fs.writeFileSync("/tmp/google-key.json", process.env.GOOGLE_KEY_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = "/tmp/google-key.json";
}

import ingredientRoutes from "./routes/ingredientRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";
import { startScheduler } from "./utils/notificationScheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================== INIT APP ==================
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/ingredients", ingredientRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/products", productRoutes);
// ================== MONGODB CONNECTION ==================
const mongoURI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000; 

mongoose.connect(mongoURI)
  .then(() => {
    console.log("🚀 Connected to MongoDB Atlas");
    startScheduler(); // ✅ Start midnight cron after DB ready
  })
  .catch(err => console.error("MongoDB connection error:", err));

// ================== USER SCHEMA ==================
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  phone:    { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
  notificationPrefs: {                          // ✅ NEW
    enabled: { type: Boolean, default: false }, // daily midnight WhatsApp on/off
  },
});

// ✅ Safe — won't throw OverwriteModelError
const User = mongoose.models.User || mongoose.model("User", userSchema);

// ================== GOOGLE VISION ==================
const client = new vision.ImageAnnotatorClient();

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
  let clean = raw.toUpperCase().replace(/[\.\-]/g, "/").replace(/\s+/g, "").trim();
  if (/^\d{8}$/.test(clean)) {
    return new Date(parseInt(clean.slice(0,4)), parseInt(clean.slice(4,6))-1, parseInt(clean.slice(6,8)));
  }
  const parts = clean.split("/").map(Number);
  if (parts.length === 3) {
    let [a, b, c] = parts;
    if (a > 31) return new Date(a, b-1, c);
    if (c < 100) c += 2000;
    return new Date(c, b-1, a);
  }
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
  const numericRegex = /\b\d{1,4}\s?[\/\-\.]\s?\d{1,4}(?:\s?[\/\-\.]\s?\d{2,4})?\b|\b\d{8}\b/g;
  const rawDates = fullText.match(numericRegex) || [];
  let expiryDate = null, mfgDate = null;
  const expiryKeywords = ["EXP","EXPIRY","EXPIRE","USE BY","BEST BEFORE","BB"];
  const mfgKeywords    = ["MFG","MFD","MANUFACTURE","PKD"];

  rawDates.forEach((raw) => {
    const parsed = parseDate(raw);
    if (!parsed || isNaN(parsed.getTime())) return;
    const cleanRaw = raw.replace(/\s+/g, "");
    const index    = fullText.replace(/\s+/g, "").indexOf(cleanRaw);
    const context  = fullText.substring(Math.max(0, index-30), index+30);
    if (expiryKeywords.some(w => context.includes(w))) expiryDate = parsed;
    if (mfgKeywords.some(w => context.includes(w)))    mfgDate    = parsed;
  });

  if (!expiryDate && rawDates.length > 0) {
    const parsedDates = rawDates.map(parseDate).filter(d => d && !isNaN(d.getTime()));
    if (parsedDates.length > 0) expiryDate = parsedDates.sort((a,b) => b-a)[0];
  }
  return { expiryDate, mfgDate };
};

// ================== OCR ROUTE ==================
app.post("/api/ocr", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image received" });
  const imagePath     = req.file.path;
  const processedPath = imagePath + "-processed.jpg";
  try {
    await sharp(imagePath).resize({width:1600}).grayscale().normalize().sharpen().threshold(150).toFile(processedPath);
    const [result]  = await client.textDetection(processedPath);
    const fullText  = result.textAnnotations?.[0]?.description || "";
    const { expiryDate, mfgDate } = detectDates(fullText);
    const today = new Date(); today.setHours(0,0,0,0);
    let daysLeft = null, status = "DATE NOT FOUND";
    if (expiryDate) {
      const expiry = new Date(expiryDate); expiry.setHours(0,0,0,0);
      daysLeft = Math.ceil((expiry - today) / (1000*60*60*24));
      status   = daysLeft < 0 ? "EXPIRED" : daysLeft <= 7 ? "EXPIRING SOON" : "SAFE";
    }
    res.json({ manufacturingDate: mfgDate ? mfgDate.toISOString() : null, detectedExpiry: expiryDate ? expiryDate.toISOString() : null, daysLeft, status });
  } catch (err) {
    console.error("OCR ERROR:", err);
    res.status(500).json({ error: "OCR Failed" });
  } finally {
    if (fs.existsSync(imagePath))     fs.unlinkSync(imagePath);
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

    const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) return res.status(400).json({ error: "Email already exists" });

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) return res.status(400).json({ error: "Phone already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
  name,
  email: email.trim().toLowerCase(),
  phone,
  password: hashedPassword
});
    res.json({
  message: "User Created",
  user: {
    id: user._id,
    email: user.email,
    name: user.name,
    phone: user.phone
  }
});

    
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


   const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

    res.json({
  message: "Login successful",
  user: {
    id: user._id,
    email: user.email,
    name: user.name,
    phone: user.phone
  }
});

    
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
    res.status(500).json({ error: "Server error" });
  }
});

// ================== UPDATE PROFILE ==================
app.put("/api/user/:email", async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (name)     user.name     = name;
    if (phone)    user.phone    = phone;
    if (password) user.password = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ message: "Profile updated successfully", user: { email: user.email, name: user.name, phone: user.phone, notificationPrefs: user.notificationPrefs } });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ================== BARCODE ANALYZER ==================
app.post("/api/barcode/analyze", async (req, res) => {
  try {
    const { image, language = "English" } = req.body;

    if (!image) return res.status(400).json({ error: "No image provided" });

    const buffer = Buffer.from(image, "base64");

    const [result] = await client.textDetection({
      image: { content: buffer },
    });

    const detectedText = result.textAnnotations?.[0]?.description || "";

    const barcodeMatch = detectedText.match(/\b\d{8,14}\b/);

    if (!barcodeMatch)
      return res.status(400).json({ error: "Barcode not detected" });

    const barcode = barcodeMatch[0];

    let productData = null;

    try {
      const offRes = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const offData = await offRes.json();
      if (offData.status === 1) productData = offData.product;
    } catch {}

    if (!productData) {
      try {
        const bRes = await fetch(
          `https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`
        );
        const bData = await bRes.json();
        if (bData.status === 1) productData = bData.product;
      } catch {}
    }

    if (!productData)
      return res.json({
        productName: "Product not found",
        ingredients: null,
        message: "Please scan ingredient label for analysis.",
      });

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
        overallExplanation:
          "Ingredients not found. Please upload the ingredient image.",
        harmfulIngredients: [],
      });
    }

    // 🔥 CALL INGREDIENT ANALYSIS
    const aiResponse = await fetch(
      `${process.env.BASE_URL}/api/ingredients/analyze`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: null,
          category: "food",
          ingredientsText: ingredients,
          language,
        }),
      }
    );

    const analysisData = await aiResponse.json();

    

   return res.json({
  productName,
  ingredients,
  ...analysisData
});
  } catch (err) {
    console.error("BARCODE ERROR:", err);
    res.status(500).json({ error: "Barcode processing failed" });
  }
});

// ================== PRODUCT NAME ANALYZER ==================
app.post("/api/product-name/analyze", async (req, res) => {
  try {
    const { image, category = "food", language = "English" } = req.body;

    if (!image) return res.status(400).json({ error: "No image provided" });
    if (!["food", "cosmetic"].includes(category))
      return res.status(400).json({ error: "Invalid category" });

    const buffer = Buffer.from(image, "base64");

    const [result] = await client.textDetection({
      image: { content: buffer },
    });

    const detectedText = result.textAnnotations?.[0]?.description || "";

    // ================== SMART PRODUCT NAME EXTRACTION ==================
    function extractSmartProductName(text) {
       const ingredientWords = [
    "sugar","salt","oil","acid","powder","lecithin",
    "preservative","flavour","extract"
  ];
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(
          (l) =>
            l.length > 2 &&
            !/^[^a-zA-Z0-9]+$/.test(l) &&
            !l.toUpperCase().includes("NET WT") &&
            !l.toUpperCase().includes("WWW") &&
            !l.match(/^\d+$/) &&
            !ingredientWords.some(word => l.toLowerCase().includes(word))
        );

      if (!lines.length) return "unknown product";

      let name = lines.slice(0, 4).join(" ").trim();

      ["INSIDE", "NEW", "FREE", "WITH"].forEach((w) => {
        name = name.replace(new RegExp(`\\b${w}\\b`, "gi"), "");
      });

      return name.trim();
    }

    const productName = extractSmartProductName(detectedText);
    const normalizedProductName = productName.toLowerCase().trim();

    let ingredients = null;
    let dataSource = "None";

    // ================== FOOD DATABASE ==================
    if (category === "food") {
      try {
        const offRes = await fetch(
  `https://in.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(productName)}&search_simple=1&json=1`
);

        const offData = await offRes.json();

        if (offData.products?.length) {
          ingredients =
            offData.products[0].ingredients_text ||
            offData.products[0].ingredients_text_en ||
            null;

          if (ingredients) dataSource = "OpenFoodFacts";
        }
      } catch {}
    }

    // ================== COSMETIC DATABASE ==================
    if (category === "cosmetic" && !ingredients) {
      try {
        const bRes = await fetch(
  `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(productName)}&search_simple=1&json=1`
);

        const bData = await bRes.json();

        if (bData.products?.length) {
          ingredients =
            bData.products[0].ingredients_text ||
            bData.products[0].ingredients_text_en ||
            null;

          if (ingredients) dataSource = "OpenBeautyFacts";
        }
      } catch {}
    }

    // ================== AI FALLBACK ==================
    if (!ingredients) {
      const aiRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            temperature: 0,
            top_p: 0,
            max_tokens: 200,
            messages: [
              {
                role: "system",
                content:
  category === "cosmetic"
    ? `You are a COSMETIC ingredient generator. 
Only generate skincare or cosmetic ingredients such as glycerin, niacinamide, hyaluronic acid, parabens, alcohol denat, fragrance, dimethicone, salicylic acid. 
Do NOT generate food ingredients like sugar, caffeine, carbonated water or taurine.

Return EXACT SAME ingredients for same product every time.
Do NOT vary output.

Return ONLY valid JSON like: {"ingredients":["item1","item2","item3"]}`
    : `You are a FOOD ingredient generator. 
Only generate food ingredients such as sugar, salt, cocoa, milk powder, vegetable oil, preservatives.

Return EXACT SAME ingredients for same product every time.
Do NOT vary output.

Return ONLY valid JSON like: {"ingredients":["item1","item2","item3"]}`,
              },
              {
                role: "user",
                content: `Generate realistic ingredients for this ${category} product: ${normalizedProductName}`,
              },
            ],
          }),
        }
      );

      const aiData = await aiRes.json();

      const raw = aiData?.choices?.[0]?.message?.content?.trim();

let parsed;

try {
  parsed = JSON.parse(raw);
} catch {
  // 🔥 Extract JSON manually
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    parsed = JSON.parse(jsonMatch[0]);
  } else {
    throw new Error("Invalid AI response");
  }
}

    // ✅ USE AI GENERATED INGREDIENTS IF DB FAILS
if (!ingredients && parsed?.ingredients) {
  ingredients = parsed.ingredients.join(", ");
  dataSource = "AI Generated";
}
if (!ingredients) {
  return res.json({
    productName,
    ingredients: null,
    message: "Ingredients not found.",
  });
}


    }
    // ================== INGREDIENT ANALYSIS ==================
    const analysisRes = await fetch(
      `${process.env.BASE_URL}/api/ingredients/analyze`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: null,
          ingredientsText: ingredients,
          category,
          language,
        }),
      }
    );

    const analysisData = await analysisRes.json();
   

   return res.json({
  productName,
  ingredients,
  source: dataSource,
  ...analysisData
});
  } catch (err) {
    console.error("PRODUCT NAME ERROR:", err);
    res.status(500).json({ error: "Product name analysis failed" });
  }
});


// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});




