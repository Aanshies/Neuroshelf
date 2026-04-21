const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  expiryDate: Date,
  status: String,
  daysLeft: Number,
  userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User"
}
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
