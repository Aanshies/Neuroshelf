const mongoose = require("mongoose");

const IngredientSchema = new mongoose.Schema({
  name: String,
  synonyms: [String],
  riskLevel: String,
  sourceReference: String,
  longTermEffects: String
});

module.exports = mongoose.model("Ingredient", IngredientSchema);
