const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  expiryDate: Date,
  status: String,
  daysLeft: Number,
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
