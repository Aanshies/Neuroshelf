import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { saveUser } from "../../utils/storage";
import { getProducts } from "../../utils/productStorage";
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

// Check user before trying to log in
const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert("Error", "Enter email and password");
    return;
  }

  try {
    const res = await fetch("http://10.39.41.248:5000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      Alert.alert(data.error || "Login failed");
      return;
    }

    if (!data.user) {
      Alert.alert("User not registered. Please sign up first.");
      return;
    }

    // ✅ Save user in AsyncStorage
    await saveUser(data.user);

    // Now, let's fetch the products after login
    const products = await getProducts();
    //console.log("Products after login:", products); // Check what we get

    if (products.length === 0) {
      Alert.alert("No products found.");
    } else {
      // Redirect to dashboard and pass products (if needed)
      router.replace("/(tabs)/dashboard");
    }
  } catch (err) {
    console.error(err);
    Alert.alert("Server error");
  }
};
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>NeuroShelf</Text>
        <Text style={styles.tagline}>Smart Expiry & Ingredient Monitor</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign into your account</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
          <Text style={styles.bottomText}>
            Don't have an account? <Text style={styles.greenText}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  appName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000",
  },
  tagline: {
    fontSize: 14,
    color: "#64748b",
  },
  card: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 20,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#16a34a",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  bottomText: {
    textAlign: "center",
    marginTop: 20,
    color: "#000",
  },
  greenText: {
    color: "#16a34a",
    fontWeight: "bold",
  },
});
