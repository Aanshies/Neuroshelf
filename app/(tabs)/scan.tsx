import React, { useState } from "react";
import { COLORS } from "@/constants/colors";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { saveProduct } from "../../utils/productStorage";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

interface ScanResponse {
  status?: string;
  daysLeft?: number;
  detectedExpiry?: string;
}

export default function ScanScreen() {
  const [productName, setProductName] = useState<string>("");
  const [category, setCategory] = useState<string>("General");
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);

  // ================= SCAN FUNCTION =================

  const handleScan = async () => {
    try {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission required to use camera");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
      });

      if (result.canceled) return;

      const image = result.assets[0];

      if (!image?.uri) {
        Alert.alert("Image capture failed");
        return;
      }

      const formData = new FormData();

      formData.append("image", {
        uri:
          Platform.OS === "android"
            ? image.uri
            : image.uri.replace("file://", ""),
        name: "photo.jpg",
        type: "image/jpeg",
      } as any);

      setLoading(true);

      const response = await fetch(
        "http://10.39.41.248:5000/api/ocr", // 🔴 CHANGE IF NEEDED
        {
          method: "POST",
          body: formData,
          // ❌ DO NOT SET HEADERS HERE
        }
      );

      if (!response.ok) {
  throw new Error("Server Error");
}

const data: ScanResponse = await response.json();


      setScanResult(data);

      if (data.detectedExpiry) {
        setExpiryDate(new Date(data.detectedExpiry));
      }
    } catch (error) {
      console.log("Scan error:", error);
      Alert.alert("Scan failed. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  // ================= ADD PRODUCT =================

const handleAddProduct = async () => {
  if (!productName || !expiryDate) {
    Alert.alert("Please fill all fields");
    return;
  }

  const newProduct = {
    id: Date.now().toString(),
    name: productName,
    category,
    expiry: formatDate(expiryDate),
    createdAt: new Date().toISOString(),
  };

  try {
    await saveProduct(newProduct);

    Alert.alert("Product Added Successfully");

    // reset form
    setProductName("");
    setExpiryDate(null);
    setScanResult(null);
  } catch (error) {
    Alert.alert("Failed to save product");
  }
};

   // 👇 ADD THIS ABOVE return()
const formatDate = (date: Date) => {
  return `${String(date.getDate()).padStart(2, "0")}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${date.getFullYear()}`;
};

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.heading}
          />
          <Text style={styles.headerTitle}>
            Scan Expiry Date
          </Text>
        </View>

        {/* SCAN BOX */}
        <TouchableOpacity
          style={styles.scanBox}
          onPress={handleScan}
        >
          {loading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.darkGreen}
            />
          ) : (
            <>
              <Ionicons
                name="scan-outline"
                size={40}
                color={COLORS.darkGreen}
              />
              <Text style={styles.scanText}>
                Capture Expiry Label
              </Text>
            </>
          )}
        </TouchableOpacity>
{scanResult && (
  <View style={{ marginBottom: 20 }}>
    <Text>Status: {scanResult.status}</Text>
    <Text>Days Left: {scanResult.daysLeft}</Text>

    <TouchableOpacity
      style={{
        marginTop: 10,
        backgroundColor: "#ef4444",
        padding: 10,
        borderRadius: 8,
      }}
      onPress={() => {
        setScanResult(null);
        setExpiryDate(null);
      }}
    >
      <Text style={{ color: "white", textAlign: "center" }}>
        Retake Photo
      </Text>
    </TouchableOpacity>
  </View>
)}


        {/* PRODUCT DETAILS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Product Details
          </Text>

          <Text style={styles.label}>Product Name</Text>
          <TextInput
            placeholder="e.g. Milk"
            value={productName}
            onChangeText={setProductName}
            style={styles.input}
          />

          {/* CATEGORY */}
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


{/* DATE PICKER */}
<Text style={styles.label}>Expiry Date</Text>

<TouchableOpacity
  style={styles.input}
  onPress={() => setShowDatePicker(true)}
>
  <Text style={{ color: COLORS.heading }}>
    {expiryDate
      ? `${String(expiryDate.getDate()).padStart(2, "0")}-${String(
          expiryDate.getMonth() + 1
        ).padStart(2, "0")}-${expiryDate.getFullYear()}`
      : "Select Date"}
  </Text>
</TouchableOpacity>


{showDatePicker && (
  <DateTimePicker
    value={expiryDate || new Date()}
    mode="date"
    display={Platform.OS === "ios" ? "inline" : "calendar"}
    accentColor={COLORS.darkGreen}
    onChange={(event, selectedDate) => {
      setShowDatePicker(false);

      if (event?.type === "dismissed") return;


      if (selectedDate) {
        setExpiryDate(selectedDate);
      }
    }}
  />
)}




          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddProduct}
          >
            <Text style={styles.addButtonText}>
              Add Product
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  scanBox: {
    backgroundColor: COLORS.lightGreen,
    borderRadius: 20,
    paddingVertical: 40,
    alignItems: "center",
    marginBottom: 25,
  },
  scanText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.darkGreen,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    color: COLORS.heading,
  },
  label: {
    marginTop: 15,
    marginBottom: 6,
    fontWeight: "500",
    color: COLORS.heading,
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
  height: 50, // makes dropdown compact
  color: COLORS.darkGreen,
},

pickerItem: {
  fontSize: 15,
},

  addButton: {
    backgroundColor: COLORS.primary,
    marginTop: 25,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
});
