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

// ✅ FIX: prevent overwrite error
const Product =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);

export default Product;
