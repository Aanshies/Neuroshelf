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

const Product = mongoose.model("Product", productSchema);

export default Product; // ✅ IMPORTANT
