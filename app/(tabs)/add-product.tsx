import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { notifyIfExpiring } from "../../components/ExpiryBadge";
import { getUser } from "../../utils/storage";
import { BASE_URL } from "../../config/api";
import { COLORS } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons"; 

export default function AddProductScreen() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [expiry, setExpiry] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Format date to DD/MM/YYYY
  const formatDate = (date: Date) => {
    return `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}/${date.getFullYear()}`;
  };

  const handleSave = async () => {
  if (!name || !category || !expiry) {
    Alert.alert("Error", "Please fill all fields");
    return;
  }

  const user = await getUser();
  console.log("USER:", user);

  // 🔥 CRITICAL FIX
  if (!user || !user.email) {
    Alert.alert("Error", "User not found ❌");
    return;
  }

  const normalizedEmail = user.email.trim().toLowerCase();

  try {
    console.log("Calling API...");

    const res = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        expiryDate: expiry.toISOString(),
        userId: normalizedEmail
      })
    });

    const data = await res.json();

    console.log("STATUS:", res.status);
    console.log("DATA:", data);

    if (!res.ok) {
      Alert.alert("Error", "Failed to save product");
      return;
    }

    Alert.alert("Success", "Saved ✅");

  } catch (err) {
    console.log("ERROR:", err);
    Alert.alert("Network error ❌");
  }

  setName("");
  setCategory("General");
  setExpiry(null);

  router.back();
};


  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
              <View style={styles.header}>
  <TouchableOpacity onPress={() => router.back()}>
    <Ionicons
      name="arrow-back"
      size={24}
      color={COLORS.heading}
    />
  </TouchableOpacity>

  <Text style={styles.headerTitle}>
    Add Product
  </Text>
</View>
       <View style={styles.card}>
      <Text style={styles.label}>Product Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Milk"
        value={name}
        onChangeText={setName}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={category}
          onValueChange={(itemValue) => setCategory(itemValue)}
          dropdownIconColor={COLORS.darkGreen}
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Dairy" value="Dairy" />
          <Picker.Item label="Meat" value="Meat" />
          <Picker.Item label="Beverages" value="Beverages" />
          <Picker.Item label="Snacks" value="Snacks" />
          <Picker.Item label="Canned Goods" value="Canned" />
          <Picker.Item label="Frozen" value="Frozen" />
          <Picker.Item label="Bakery" value="Bakery" />
          <Picker.Item label="Condiments" value="Condiments" />
          <Picker.Item label="Medicine" value="Medicine" />
          <Picker.Item label="Cosmetics" value="Cosmetics" />
          <Picker.Item label="General" value="General" />
        </Picker>
      </View>
      <Text style={styles.label}>Expiry Date</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={{ color: expiry ? COLORS.heading : "#999" }}>
          {expiry ? formatDate(expiry) : "Select Date"}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={expiry || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "calendar"}
          accentColor={COLORS.darkGreen}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (event?.type === "dismissed") return;
            if (selectedDate) setExpiry(selectedDate);
          }}
        />
      )}

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Add Product</Text>
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
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.heading,
    marginBottom: 25,
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
  pickerWrapper: {
    backgroundColor: COLORS.softGray,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.lightGreen,
  },
  picker: {
    height: 50,
    color: COLORS.darkGreen,
  },
  pickerItem: {
    fontSize: 15,
  },
    card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
  },
  button: {
    marginTop: 30,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 18,
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
});
