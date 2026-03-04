
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUser } from "./storage";

// get storage key for a given email
const keyForEmail = (email: string) => `USER_PRODUCTS_${email}`;

// get current user's storage key
const getKey = async () => {
  const user = await getUser();
  if (!user?.email) return null;
  return keyForEmail(user.email);
};

// SAVE product for current user
export const saveProduct = async (product: any) => {
  const key = await getKey();
  if (!key) {
    console.log("Cannot save product: no user logged in");
    return;
  }
  const existing = await AsyncStorage.getItem(key);
  const products = existing ? JSON.parse(existing) : [];
  products.push(product);
  await AsyncStorage.setItem(key, JSON.stringify(products));
};

// GET products for current user
export const getProducts = async () => {
  try {
    const user = await getUser(); // Ensure user exists
    if (!user?.email) {
      console.log("No user logged in, can't fetch products.");
      return [];  // No products if no user
    }

    const key = `USER_PRODUCTS_${user.email}`; // Key based on user email
    const data = await AsyncStorage.getItem(key);

    if (!data) {
      console.log("No products found for this user.");
      return []; // If no products are found, return empty array
    }

    return JSON.parse(data); // Return the stored products
  } catch (err) {
    console.log("Error getting products:", err);
    return []; // Return empty if there's an error
  }
};

// CLEAR products for current user (on logout)
export const clearProductsForUser = async (email: string) => {
  try {
    const key = keyForEmail(email);
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.log("Error clearing products:", err);
  }
};


// DELETE single product for current user
export const deleteProduct = async (id: string) => {
  try {
    const key = await getKey();
    if (!key) {
      console.log("Cannot delete: no user logged in");
      return [];
    }

    const existing = await AsyncStorage.getItem(key);
    const products = existing ? JSON.parse(existing) : [];

    const updatedProducts = products.filter((p: any) => p.id !== id);

    await AsyncStorage.setItem(key, JSON.stringify(updatedProducts));

    return updatedProducts; // return updated list
  } catch (err) {
    console.log("Error deleting product:", err);
    return [];
  }
};