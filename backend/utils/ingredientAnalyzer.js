import ingredientDB from "./ingredientDatabase";
import ruleEngine from "./ruleEngine";

export const analyzeIngredients = (ocrText) => {
  const text = ocrText.toLowerCase();
  let found = [];

  ingredientDB.forEach((ingredient) => {
    if (
      text.includes(ingredient.name) ||
      ingredient.synonyms.some((syn) => text.includes(syn))
    ) {
      found.push(ingredient);
    }
  });

  // Rule engine fallback
  const words = text.split(/,|\n/);

  words.forEach((word) => {
    const ruleResult = ruleEngine(word);
    if (ruleResult) {
      found.push({
        name: word.trim(),
        riskLevel: ruleResult.riskLevel,
        longTermEffects: ruleResult.reason,
        sourceReference: "Rule Engine Detection",
      });
    }
  });

  return found;
};