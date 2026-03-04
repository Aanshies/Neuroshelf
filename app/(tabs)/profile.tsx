import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { getUser, saveUser } from "../../utils/storage";
import { router } from "expo-router";

const BASE_URL = "http://10.39.41.248:5000";

type UserType = {
  email: string;
  name?: string;
  phone?: string;
};

export default function ProfileScreen() {
  const [user, setUser] = useState<UserType | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const localUser = await getUser();

      if (!localUser?.email) {
        Alert.alert("Error", "No logged in user found");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${BASE_URL}/api/user/${encodeURIComponent(localUser.email)}`
      );

      if (response.status === 404) {
        // Auto create user
        const createRes = await fetch(`${BASE_URL}/api/user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: localUser.email,
            name: localUser.name || "",
            phone: "",
          }),
        });

        const newUser = await createRes.json();
        setUser(newUser.user || newUser);
        setFullName(newUser.name || "");
        setPhone(newUser.phone || "");
      } else {
        const data = await response.json();
        
        setUser(data);
        setFullName(data.name || "");
        setPhone(data.phone || "");
      }
    } catch (error) {
      console.log("Profile load error:", error);
      Alert.alert("Error", "Unable to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const email = user?.email;

      if (!email) {
        Alert.alert("Error", "User email missing");
        return;
      }

      const response = await fetch(
        `${BASE_URL}/api/user/${encodeURIComponent(email)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName,
            phone: phone,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Update failed");
      }

      const result = await response.json();

      setUser(result.user);
      await saveUser(result.user);

      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.log("Update error:", error);
      Alert.alert("Error", "Failed to update profile");
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loader}>
        <Text>No user found</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.heading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your Information</Text>

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <View style={styles.disabledInput}>
          <Text style={styles.disabledText}>{user.email}</Text>
        </View>

        {/* Full Name */}
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
          placeholder="Enter your name"
        />

        {/* Phone */}
        <Text style={styles.label}>Phone (WhatsApp)</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
          placeholder="Enter phone number"
        />

        {/* Save */}
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Ionicons name="save-outline" size={18} color={COLORS.white} />
          <Text style={styles.buttonText}> Save Changes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 15,
    color: COLORS.heading,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.heading,
    marginBottom: 15,
  },
  label: {
    fontWeight: "600",
    marginBottom: 6,
    color: COLORS.heading,
    marginTop: 15,
  },
  input: {
    backgroundColor: COLORS.softGray,
    borderRadius: 12,
    padding: 14,
    color: COLORS.heading,
  },
  disabledInput: {
    backgroundColor: COLORS.softGray,
    borderRadius: 12,
    padding: 14,
  },
  disabledText: {
    color: COLORS.subtitle,
  },
  button: {
    marginTop: 30,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
});
