const BASE_URL = "https://neuroshelf-1.onrender.com";

import { getUser } from "./storage";

// Helper to get current user's email
const getUserEmail = async (): Promise<string | null> => {
  const user = await getUser();
  return user?.email?.trim().toLowerCase() ?? null;
};

// SAVE product for current user
export const saveProduct = async (product: {
  name: string;
  category: string;
  expiryDate: string;
}) => {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) {
      console.log("Cannot save product: no user logged in");
      return null;
    }

    const response = await fetch(`${BASE_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...product, userEmail }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.log("Save failed:", err);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.log("Error saving product:", err);
    return null;
  }
};

// GET products for current user
export const getProducts = async () => {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) {
      console.log("No user logged in, can't fetch products.");
      return [];
    }

    const response = await fetch(
      `${BASE_URL}/products?userEmail=${encodeURIComponent(userEmail)}`
    );

    if (!response.ok) {
      console.log("Fetch failed:", response.status);
      return [];
    }

    return await response.json();
  } catch (err) {
    console.log("Error getting products:", err);
    return [];
  }
};

// DELETE single product for current user
export const deleteProduct = async (id: string) => {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) {
      console.log("Cannot delete: no user logged in");
      return [];
    }

    const response = await fetch(`${BASE_URL}/products/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail }),
    });

    if (!response.ok) {
      console.log("Delete failed:", response.status);
      return [];
    }

    // Re-fetch the updated list after deletion
    return await getProducts();
  } catch (err) {
    console.log("Error deleting product:", err);
    return [];
  }
};

// CLEAR products for current user (on logout)
// No-op on frontend now — data lives in DB, nothing local to clear
export const clearProductsForUser = async (_email: string) => {
  // Previously cleared AsyncStorage; now data is in MongoDB.
  // If you want a "wipe all products" feature, add a DELETE /products?userEmail= route.
  console.log("clearProductsForUser: data is now in DB, nothing to clear locally.");
};