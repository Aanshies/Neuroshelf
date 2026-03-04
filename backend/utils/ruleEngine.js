module.exports = function ruleEngine(name) {
  const text = name.toLowerCase(); // ✅ FIXED: was "item" which doesn't exist

  // Artificial colors / dyes
  if (text.includes("color") || text.includes("dye") || text.includes("colour"))
    return {
      riskLevel: "Moderate",
      reason: "Artificial coloring agents may have long-term health concerns.",
    };

  // Phosphates
  if (text.includes("phosphate"))
    return {
      riskLevel: "Moderate",
      reason: "Excess phosphate intake may impact kidney and bone health.",
    };

  // Hydrogenated oils / fats
  if (text.includes("hydrogenated"))
    return {
      riskLevel: "High",
      reason: "Hydrogenated fats are associated with increased cardiovascular risk.",
    };

  // Palm oil
  if (text.includes("palm oil"))
    return {
      riskLevel: "Moderate",
      reason: "High saturated fat content. Environmental concerns also noted.",
    };

  // Flavour enhancer 635
  if (text.includes("635"))
    return {
      riskLevel: "Moderate",
      reason: "Disodium inosinate/guanylate may trigger sensitivity in some individuals.",
    };

  // Caramel colour Class IV (150d)
  if (text.includes("150d"))
    return {
      riskLevel: "Moderate",
      reason: "Caramel colour (Class IV) may contain processing contaminants.",
    };

  // Acidity regulators
  if (text.includes("500") || text.includes("501") || text.includes("451"))
    return {
      riskLevel: "Low",
      reason: "Acidity regulator within regulated safe limits.",
    };

  // Parabens (any type)
  if (text.includes("paraben"))
    return {
      riskLevel: "High",
      reason: "Parabens are endocrine disruptors linked to hormone disruption.",
    };

  // Sulphates
  if (text.includes("sulphate") || text.includes("sulfate"))
    return {
      riskLevel: "Moderate",
      reason: "Sulphates can strip natural oils and irritate skin.",
    };

  // Silicones
  if (text.includes("dimethicone") || text.includes("silicone"))
    return {
      riskLevel: "Low",
      reason: "Generally safe but may cause buildup with prolonged use.",
    };

  // Formaldehyde releasers
  if (text.includes("formaldehyde") || text.includes("formalin"))
    return {
      riskLevel: "High",
      reason: "Known carcinogen. Linked to cancer and skin sensitization.",
    };

  // Alcohol
  if (text.includes("alcohol denat") || text.includes("sd alcohol"))
    return {
      riskLevel: "Low-Moderate",
      reason: "Denatured alcohol can be drying and disrupt the skin barrier.",
    };

  return null;
};