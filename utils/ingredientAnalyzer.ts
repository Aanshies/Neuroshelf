type IngredientResult = {
  name: string;
  source: string;
  riskLevel: "Low" | "Moderate" | "High" | "Unknown";
  note: string;
};

export async function analyzeIngredients(
  ingredients: string[]
): Promise<IngredientResult[]> {
  const results: IngredientResult[] = [];

  for (const ingredient of ingredients) {
    // 🔹 Example: OpenFoodFacts (realistic & allowed)
    const response = await fetch(
      `https://world.openfoodfacts.org/ingredient/${ingredient}.json`
    );

    if (!response.ok) {
      results.push({
        name: ingredient,
        source: "Unknown",
        riskLevel: "Unknown",
        note: "No certified data available",
      });
      continue;
    }

    const data = await response.json();

    results.push({
      name: ingredient,
      source: "OpenFoodFacts / WHO references",
      riskLevel: data?.risk === "high" ? "High" : "Moderate",
      note: data?.description || "Refer certified sources",
    });
  }

  return results;
}
