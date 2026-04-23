import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// ADD PRODUCT
router.post("/", async (req, res) => {
  try {
    const { name, category, expiryDate, userEmail } = req.body;

    const email = userEmail?.trim().toLowerCase();

    console.log("SAVE EMAIL:", email);

    if (!email) {
      return res.status(400).json({ error: "userEmail missing ❌" });
    }

    const product = new Product({
      name,
      category,
      expiryDate,
      userEmail: email
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

    console.log("GET EMAIL:", userEmail);

    if (!userEmail) {
      return res.json([]);
    }

    const products = await Product.find({ userEmail }).sort({
      createdAt: -1,
    });

    console.log("FOUND PRODUCTS:", products);

    res.json(products);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;