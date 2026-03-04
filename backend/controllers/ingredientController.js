const Ingredient = require("../models/Ingredient");
const { parseIngredients } = require("../services/ingredientParser");

exports.analyzeIngredients = async (req, res) => {
  try {
    const { ocrText } = req.body;

    const parsed = parseIngredients(ocrText);

    let results = [];
    let score = 10;

    for (let item of parsed) {
      const ingredient = await Ingredient.findOne({ name: item });

      if (ingredient) {
        results.push(ingredient);

        if (ingredient.riskLevel === "High") score -= 3;
        if (ingredient.riskLevel === "Moderate") score -= 1;
        if (ingredient.allergen) score -= 2;
      } else {
        results.push({
          name: item,
          riskLevel: "Unknown",
          allergen: false,
          sourceReference: "Not found in certified database",
          healthNote: "No certified information available."
        });

        score -= 0.5;
      }
    }

    if (score < 1) score = 1;

    res.json({
      ingredients: results,
      overallSafetyScore: Math.round(score),
      disclaimer:
        "This analysis is for informational purposes only and based on WHO/FDA referenced data."
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
