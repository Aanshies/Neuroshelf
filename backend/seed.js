require("dotenv").config();
const mongoose = require("mongoose");
const Ingredient = require("./models/Ingredient");
const seedData = require("./utils/ingredientDatabase");

mongoose.connect(process.env.MONGO_URI);

async function seed() {
  await Ingredient.deleteMany({});
  await Ingredient.insertMany(seedData);
  console.log("Regulatory ingredients seeded.");
  process.exit();
}

seed();
