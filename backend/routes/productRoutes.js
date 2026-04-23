import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// ADD PRODUCT
router.post("/", async (req, res) => {
  try {
    console.log("BODY RECEIVED:", req.body);

    const { name, category, expiryDate, userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: "userEmail missing ❌" });
    }

    const product = new Product({
      name,
      category,
      expiryDate,
      userEmail: userEmail.trim().toLowerCase()
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
  try {
    const userEmail = req.query.userEmail?.trim().toLowerCase();

    const products = await Product
      .find({ userEmail })
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;