import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// ADD PRODUCT
router.post("/", async (req, res) => {
  try {
    console.log("BODY RECEIVED:", req.body);

    const { name, category, expiryDate, userId } = req.body;

    // 🔥 CRITICAL CHECK
    if (!userId) {
      return res.status(400).json({ error: "userId missing ❌" });
    }

    const product = new Product({
      name,
      category,
      expiryDate,
      userId
    });

    await product.save();

    res.json(product);
  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// GET PRODUCTS
router.get("/", async (req, res) => {
  const { userId } = req.query;

  const products = await Product
    .find({ userId })
    .sort({ createdAt: -1 });

  res.json(products);
});

export default router; // ✅ IMPORTANT
