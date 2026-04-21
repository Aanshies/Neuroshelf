import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// ADD PRODUCT
router.post("/", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json(product);
  } catch (err) {
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
