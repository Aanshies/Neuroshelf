import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  expiryDate: Date,
  status: String,
  daysLeft: Number,
  userId: {
    type: String,
    required: true
  }
}, { timestamps: true });

// 🔥 FINAL SAFE FIX
let Product;

try {
  Product = mongoose.model("Product");
} catch (err) {
  Product = mongoose.model("Product", productSchema);
}

export default Product;
