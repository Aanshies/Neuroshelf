const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// Add product
router.post("/", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all products
router.get("/", async (req, res) => {
  const { userId } = req.query;

  const products = await Product
    .find({ userId })
    .sort({ createdAt: -1 });

  res.json(products);
});

module.exports = router;
