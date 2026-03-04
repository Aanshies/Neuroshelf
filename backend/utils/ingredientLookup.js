// backend/utils/ingredientLookup.js
const axios = require('axios');
require('dotenv').config();

const USDA_API_KEY = process.env.USDA_API_KEY;
const cosmeticDB = require('../data/ewgSkinDeep.json'); // EWG dataset

async function lookupFoodIngredient(ingredient) {
  try {
    const res = await axios.get(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(ingredient)}&api_key=${USDA_API_KEY}`
    );
    const food = res.data.foods?.[0];
    if (food) {
      return {
        name: ingredient,
        risk: "low",
        longTermEffects: "Check nutrient & allergen info",
        sourceReference: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${food.fdcId}`
      };
    }
  } catch (err) {
    console.log("USDA error:", err.message);
  }
  return null;
}

function lookupCosmeticIngredient(ingredient) {
  const key = ingredient.toLowerCase();
  return cosmeticDB[key] || null;
}

module.exports = { lookupFoodIngredient, lookupCosmeticIngredient };