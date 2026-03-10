import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "@/constants/colors";
import Svg, { Circle } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";

const BASE_URL = "http://10.161.11.248:5000";

/* ================= CIRCULAR SCORE COMPONENT ================= */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CircularScore = ({ score }: { score: number }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 10],
    outputRange: [circumference, 0],
  });

  const color =
    score >= 8 ? "#4CAF50" :
    score >= 5 ? "#FFA500" :
    "#F44336";

  return (
    <View style={{ alignItems: "center", marginBottom: 20 }}>
      <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          <Circle
            stroke="#eee"
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <AnimatedCircle
            stroke={color}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>

        <Text style={{ position: "absolute", fontSize: 24, fontWeight: "700", color: color }}>
          {score}/10
        </Text>
      </View>
    </View>
  );
};

/* ================= MAIN SCREEN ================= */

export default function IngredientsScreen() {

  const [scanMode, setScanMode] = useState<"ingredients" | "barcode" | "productName">("ingredients");
  const [selectedCategory, setSelectedCategory] = useState("Food Product");
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const navigation = useNavigation();
  const categories = ["Food Product", "Cosmetic Product", "Other"];

  const analyzeImage = async (base64Image: string) => {
    setLoading(true);
    setScanResult(null);

    try {
  let endpoint = "";
let bodyData: any = {};

if (scanMode === "ingredients") {
  endpoint = "/api/ingredients/analyze";
  bodyData = {
    image: base64Image,
    category: selectedCategory,
  };
}

if (scanMode === "barcode") {
  endpoint = "/api/barcode/analyze";
  bodyData = {
    image: base64Image,
  };
}

if (scanMode === "productName") {
  endpoint = "/api/product-name/analyze";
  bodyData = {
    image: base64Image, // let backend extract name using OCR
  };
}

const response = await fetch(`${BASE_URL}${endpoint}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(bodyData),
});

      const data = await response.json();
      setScanResult(data);

    } catch {
      Alert.alert("Error", "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const captureImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Allow camera access.");
      return;
    }

    const photo = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.7,
    });

    if (photo.canceled || !photo.assets?.length) return;

    analyzeImage(photo.assets[0].base64!);
  };

  const calculateSafetyScore = (harmfulIngredients: any[]) => {
  if (!harmfulIngredients || harmfulIngredients.length === 0) return 10; // perfect score
  let totalRisk = 0;
  harmfulIngredients.forEach(item => {
    if (!item.riskLevel) return;
    const level = item.riskLevel.toLowerCase();
    if (level.includes("high")) totalRisk += 3;
    else if (level.includes("medium")) totalRisk += 2;
    else totalRisk += 1;
  });
  const score = Math.max(0, 10 - totalRisk); // 10 is max score
  return score;
};

  return (
    <ScrollView contentContainerStyle={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
  <Ionicons name="arrow-back" size={24} color={COLORS.heading} />
</TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Product</Text>
      </View>

      {/* TOGGLE BUTTON */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            scanMode === "ingredients" && styles.activeToggle
          ]}
          onPress={() => setScanMode("ingredients")}
        >
          <Text style={[
            styles.toggleText,
            scanMode === "ingredients" && styles.activeText
          ]}>
            Ingredients
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            scanMode === "barcode" && styles.activeToggle
          ]}
          onPress={() => setScanMode("barcode")}
        >
          <Text style={[
            styles.toggleText,
            scanMode === "barcode" && styles.activeText
          ]}>
            Barcode
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
  style={[
    styles.toggleButton,
    scanMode === "productName" && styles.activeToggle
  ]}
  onPress={() => setScanMode("productName")}
>
  <Text style={[
    styles.toggleText,
    scanMode === "productName" && styles.activeText
  ]}>
    Product Name
  </Text>
</TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Product Category</Text>

        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.dropdownText}>{selectedCategory}</Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.darkGreen} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scanBox}
          onPress={captureImage}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.darkGreen} />
          ) : (
            <>
              <Ionicons
  name={
    scanMode === "barcode"
      ? "barcode-outline"
      : scanMode === "productName"
      ? "pricetag-outline"
      : "scan-outline"
  }
  size={40}
  color={COLORS.darkGreen}
/>
              <Text style={styles.scanText}>
  {scanMode === "ingredients"
    ? "Capture Ingredient Label"
    : scanMode === "barcode"
    ? "Capture Product Barcode"
    : "Capture Product Name"}
</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* RESULT SECTION */}
{scanResult && (
  <View style={styles.resultBox}>
       {/* PRODUCT NAME */}
{scanResult.productName && (
  <Text style={{
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
    color: COLORS.heading
  }}>
    {scanResult.productName}
  </Text>
)}

{/* INGREDIENTS */}
{scanResult.ingredients && (
  <Text style={{
    fontSize: 14,
    textAlign: "center",
    marginBottom: 15,
    color: "#555"
  }}>
    {scanResult.ingredients}
  </Text>
)}
    {/* SCORE */}
{scanResult.harmfulIngredients && (
  <CircularScore score={scanResult.safetyScore ?? calculateSafetyScore(scanResult.harmfulIngredients)} />
)}

    {/* RISK SUMMARY */}
    <Text style={{
      textAlign: "center",
      fontWeight: "600",
      marginBottom: 10,
      color: COLORS.heading
    }}>
      {scanResult.riskSummary}
    </Text>

    {/* HARMFUL INGREDIENTS */}
    {scanResult.harmfulIngredients ? (
  scanResult.harmfulIngredients.length > 0 ? (
    scanResult.harmfulIngredients.map((item: any, index: number) => {

      const riskColor =
        item.riskLevel?.toUpperCase().includes("HIGH")
          ? "#E53935"
          : "#FB8C00";

      return (
        <View key={index} style={styles.ingredientCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.ingredientName}>
              {item.name}
            </Text>

            <View style={[
              styles.riskBadge,
              { backgroundColor: riskColor }
            ]}>
              <Text style={styles.riskText}>
                {item.riskLevel}
              </Text>
            </View>
          </View>

          <Text style={styles.reasonText}>
            {item.shortReason}
          </Text>
        </View>
      );
    })
  ) : (
    <Text style={{
      textAlign: "center",
      color: COLORS.darkGreen,
      fontWeight: "600"
    }}>
      No harmful ingredients detected 
    </Text>
  )
) : null}

    {/* OVERALL EXPLANATION */}
    <Text style={styles.caution}>
      {scanResult.overallExplanation}
    </Text>

  </View>
)}

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  setSelectedCategory(cat);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.modalItem}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </ScrollView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({

  container: {
    padding: 20,
    backgroundColor: COLORS.background,
    flexGrow: 1,
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

  toggleContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.softGray,
    borderRadius: 15,
    marginBottom: 20,
    padding: 5,
  },

  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
  },

  activeToggle: {
    backgroundColor: COLORS.darkGreen,
  },

  toggleText: {
    fontWeight: "600",
    color: COLORS.heading,
  },

  activeText: {
    color: "#fff",
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
  },

  label: {
    fontWeight: "600",
    marginBottom: 8,
    color: COLORS.heading,
  },

  dropdown: {
    backgroundColor: COLORS.softGray,
    borderRadius: 15,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGreen,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  dropdownText: {
    color: COLORS.heading,
    fontWeight: "500",
  },

  scanBox: {
    backgroundColor: COLORS.lightGreen,
    borderRadius: 20,
    paddingVertical: 45,
    alignItems: "center",
  },

  scanText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.darkGreen,
  },
modalOverlay: {
  flex: 1,
  justifyContent: "center",
  backgroundColor: "rgba(0,0,0,0.3)",
},

modalContent: {
  backgroundColor: COLORS.white,
  margin: 30,
  borderRadius: 15,
  paddingVertical: 10,
},

modalItem: {
  padding: 14,
  fontSize: 16,
  color: COLORS.heading,
},

resultBox: {
  backgroundColor: COLORS.white,
  borderRadius: 20,
  padding: 20,
  marginTop: 20,
},
ingredientCard: {
  backgroundColor: COLORS.softGray,
  padding: 15,
  borderRadius: 15,
  marginBottom: 15,
},

cardHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
},

ingredientName: {
  fontSize: 16,
  fontWeight: "600",
  color: COLORS.heading,
  flex: 1,
},

riskBadge: {
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 10,
},

riskText: {
  color: "#fff",
  fontSize: 12,
  fontWeight: "700",
},

reasonText: {
  fontSize: 14,
  color: "#555",
  marginTop: 4,
},

caution: {
  marginTop: 15,
  fontSize: 14,
  textAlign: "center",
  color: COLORS.heading,
},
});