const ingredientRoutes = require("./routes/ingredientRoutes");
app.use("/api/ingredients", ingredientRoutes);
module.exports = [
  {
    name: "partially hydrogenated oil",
    synonyms: ["trans fat", "hydrogenated vegetable oil"],
    riskLevel: "High",
    sourceReference: "WHO Trans Fat Guidelines / FDA Ban on PHO",
    longTermEffects: "Linked to increased LDL cholesterol and cardiovascular disease."
  },
  {
    name: "sodium nitrite",
    synonyms: [],
    riskLevel: "High",
    sourceReference: "WHO IARC / EFSA Evaluation",
    longTermEffects: "Associated with formation of nitrosamines and potential cancer risk in excessive intake."
  },
  {
    name: "potassium bromate",
    synonyms: [],
    riskLevel: "High",
    sourceReference: "IARC / WHO",
    longTermEffects: "Classified as possibly carcinogenic to humans."
  },
  {
  name: "Tocopherol",
  riskLevel: "Moderate",
  sourceReference: "https://www.fda.gov/food/ingredient-safety",
  longTermEffects: "May cause skin irritation in sensitive individuals. Safe as food additive in regulated doses."
},
  {
    name: "caramel color",
    synonyms: ["e150d"],
    riskLevel: "Moderate",
    sourceReference: "EFSA Food Additive Review",
    longTermEffects: "Certain types may contain contaminants if consumed excessively."
  },
  {
    name: "sodium tripolyphosphate",
    synonyms: ["e451"],
    riskLevel: "Moderate",
    sourceReference: "EFSA Phosphate Evaluation",
    longTermEffects: "Excess intake may affect kidney function and bone health."
  },
  {
    name: "potassium iodate",
    synonyms: [],
    riskLevel: "Moderate",
    sourceReference: "WHO Iodine Safety",
    longTermEffects: "Excess iodine may affect thyroid function."
  },
  {
    name: "formaldehyde",
    synonyms: ["formalin", "methylene glycol"],
    riskLevel: "High",
    sourceReference: "IARC / National Toxicology Program",
    longTermEffects: "Known human carcinogen; can cause severe skin irritation and allergies."
  },
  {
    name: "paraben",
    synonyms: ["methylparaben", "ethylparaben", "propylparaben", "butylparaben"],
    riskLevel: "Moderate",
    sourceReference: "European Scientific Committee on Consumer Safety",
    longTermEffects: "Potential endocrine disruptor; may mimic estrogen in the body."
  },
  {
    name: "sodium lauryl sulfate",
    synonyms: ["sls"],
    riskLevel: "Moderate",
    sourceReference: "Journal of the American College of Toxicology",
    longTermEffects: "Known skin and eye irritant; may strip natural oils causing dermatitis."
  },
  {
    name: "phthalates",
    synonyms: ["dep", "dbp", "dehp", "fragrance"],
    riskLevel: "High",
    sourceReference: "Endocrine Society",
    longTermEffects: "Linked to hormonal disruption and reproductive system concerns."
  },
  {
    name: "triclosan",
    synonyms: ["e5-chloro-2-hydroxydiphenyl ether"],
    riskLevel: "High",
    sourceReference: "FDA / EPA",
    longTermEffects: "Associated with bacterial resistance and thyroid hormone disruption."
  }
];
