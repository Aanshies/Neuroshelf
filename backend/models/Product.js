const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  expiryDate: Date,
  status: String,
  daysLeft: Number,

  userId: {
    type: String,   // ✅ correct
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
