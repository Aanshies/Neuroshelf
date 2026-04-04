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
import { BASE_URL } from "../config/api";
import * as Speech from "expo-speech";


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
  const [modalType, setModalType] = useState<"language" | "category" | null>(null);
  const categories = ["Food Product", "Cosmetic Product", "Other"];
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const languages = [
  "English",
  "Hindi",
  "Telugu",
  "Tamil",
  "Kannada",
  "Malayalam",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Punjabi",
  "Urdu"
];
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
    category: selectedCategory.toLowerCase().includes("cosmetic") ? "cosmetic" : "food",
    language: selectedLanguage,
  };
}

if (scanMode === "barcode") {
  endpoint = "/api/barcode/analyze";
  bodyData = {
    image: base64Image,
    language: selectedLanguage, // ✅ ADD THIS
  };
}

if (scanMode === "productName") {
  endpoint = "/api/product-name/analyze";
  bodyData = {
    image: base64Image,
    category: selectedCategory.toLowerCase().includes("cosmetic") ? "cosmetic" : "food",
    language: selectedLanguage,
  };
}
console.log("LANG SENT:", selectedLanguage);
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

const speakText = async () => {
  if (!scanResult) {
    Alert.alert("No data to speak");
    return;
  }

  Speech.stop(); // Stop any ongoing speech
  setSpeaking(false);

  // Build the text to speak
  const fullText = scanResult.harmfulIngredients?.length
    ? scanResult.harmfulIngredients
        .map((item: any) => {
          const template = speechTemplates[selectedLanguage] || speechTemplates["English"];
          return template(item);
        })
        .join(". ") + "."
    : "No harmful ingredients detected.";

  if (!fullText.trim()) {
    Alert.alert("No text to speak");
    return;
  }

  // Map languages to TTS codes
  const langMap: Record<string, string> = {
    English: "en-US",
    Hindi: "hi-IN",
    Telugu: "te-IN",
    Tamil: "ta-IN",
    Kannada: "kn-IN",
    Malayalam: "ml-IN",
    Bengali: "bn-IN",
    Marathi: "mr-IN",
    Gujarati: "gu-IN",
    Punjabi: "pa-IN",
    Urdu: "ur-IN",
  };

  let finalLang = "en-US"; // Default fallback

  try {
    // Try to get device voices
    const voices = await Speech.getAvailableVoicesAsync();
    const selectedLangCode = langMap[selectedLanguage] || "en-US";

    const isSupported = voices.some((v) =>
      v.language.toLowerCase().includes(selectedLangCode.split("-")[0])
    );

    finalLang = isSupported ? selectedLangCode : "en-US";
  } catch (err) {
    console.warn("Failed to get voices, defaulting to English.", err);
    finalLang = "en-US";
  }

  try {
    setSpeaking(true);
    Speech.speak(fullText, {
      language: finalLang,
      rate: 0.85,
      pitch: 1,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: (error) => {
        console.error("TTS failed:", error);
        Alert.alert("Speech Error", "Text-to-speech failed. Using English fallback.");
        setSpeaking(false);
      },
    });
  } catch (err) {
    console.error("Speech.speak failed:", err);
    Alert.alert("Speech Error", "Unable to play text-to-speech.");
    setSpeaking(false);
  }
};


const stopSpeech = () => {
  Speech.stop();
  setSpeaking(false);
};

const [speaking, setSpeaking] = useState(false);

const score = scanResult
  ? scanResult.safetyScore ??
    calculateSafetyScore(scanResult.harmfulIngredients)
  : 0;

const isSafe = score >= 7;
const langKey = selectedLanguage as keyof typeof labels;
const labels = {
  English: { safe: "SAFE ✅", unsafe: "UNSAFE ⚠️" },
  Hindi: { safe: "सुरक्षित ✅", unsafe: "असुरक्षित ⚠️" },
  Telugu: { safe: "సురక్షితం ✅", unsafe: "అసురక్షితం ⚠️" },
  Tamil: { safe: "பாதுகாப்பானது ✅", unsafe: "பாதுகாப்பற்றது ⚠️" },
  Kannada: { safe: "ಸುರಕ್ಷಿತ ✅", unsafe: "ಅಸುರಕ್ಷಿತ ⚠️" },
  Malayalam: { safe: "സുരക്ഷിതം ✅", unsafe: "അസുരക്ഷിതം ⚠️" },
  Bengali: { safe: "নিরাপদ ✅", unsafe: "অনিরাপদ ⚠️" },
  Marathi: { safe: "सुरक्षित ✅", unsafe: "असुरक्षित ⚠️" },
  Gujarati: { safe: "સુરક્ષિત ✅", unsafe: "અસુરક્ષિત ⚠️" },
  Punjabi: { safe: "ਸੁਰੱਖਿਅਤ ✅", unsafe: "ਅਸੁਰੱਖਿਅਤ ⚠️" },
  Urdu: { safe: "محفوظ ✅", unsafe: "غیر محفوظ ⚠️" },
};

const riskLabels: Record<string, Record<string, string>> = {
  English: { high: "High", medium: "Medium", low: "Low", risk: "risk because" },
  Hindi: { high: "उच्च", medium: "मध्यम", low: "कम", risk: "जोखिम है क्योंकि" },
  Telugu: { high: "ఎక్కువ", medium: "మధ్యస్థ", low: "తక్కువ", risk: "రిస్క్ ఎందుకంటే" },
  Tamil: { high: "உயர்", medium: "மதியம்", low: "குறைவு", risk: "அபாயம் ஏன் என்று" },
  Kannada: { high: "ಹೆಚ್ಚು", medium: "ಮಧ್ಯಮ", low: "ಕಡಿಮೆ", risk: "ಪರಿಹಾರ ಕಾರಣ" },
  Malayalam: { high: "ഉയർന്നത്", medium: "മധ്യമം", low: "കുറവ്", risk: "റിസ്‌ക് കാരണം" },
  Bengali: { high: "উচ্চ", medium: "মধ্যম", low: "কম", risk: "ঝুঁকি কারণ" },
  Marathi: { high: "उच्च", medium: "मध्यम", low: "कमी", risk: "जोखमीचे कारण" },
  Gujarati: { high: "ઉચ્ચ", medium: "મધ્યમ", low: "નીચું", risk: "ખતરો કારણ" },
  Punjabi: { high: "ਉੱਚ", medium: "ਮੱਧਮ", low: "ਘੱਟ", risk: "ਖਤਰਾ ਕਿਉਂ" },
  Urdu: { high: "زیادہ", medium: "درمیانہ", low: "کم", risk: "خطرہ کیونکہ" },
};
const speechTemplates: Record<string, (item: any) => string> = {
  English: (item) => `${item.name} is ${riskLabels["English"][normalizeRiskLevel(item.riskLevel)]} risk because ${item.shortReason}`,
  Hindi: (item) => `${item.name} ${riskLabels["Hindi"][normalizeRiskLevel(item.riskLevel)]} जोखिम है क्योंकि ${item.shortReason}`,
  Telugu: (item) => `${item.name} ${riskLabels["Telugu"][normalizeRiskLevel(item.riskLevel)]} రిస్క్ ఎందుకంటే ${item.shortReason}`,
  Tamil: (item) => `${item.name} ${riskLabels["Tamil"][normalizeRiskLevel(item.riskLevel)]} அபாயம் ஏன் என்று ${item.shortReason}`,
  Kannada: (item) => `${item.name} ${riskLabels["Kannada"][normalizeRiskLevel(item.riskLevel)]} ಅಪಾಯ ಕಾರಣ ${item.shortReason}`,
  Malayalam: (item) => `${item.name} ${riskLabels["Malayalam"][normalizeRiskLevel(item.riskLevel)]} റിസ്‌ക് കാരണം ${item.shortReason}`,
  Bengali: (item) => `${item.name} ${riskLabels["Bengali"][normalizeRiskLevel(item.riskLevel)]} ঝুঁকি কারণ ${item.shortReason}`,
  Marathi: (item) => `${item.name} ${riskLabels["Marathi"][normalizeRiskLevel(item.riskLevel)]} जोखमीचे कारण ${item.shortReason}`,
  Gujarati: (item) => `${item.name} ${riskLabels["Gujarati"][normalizeRiskLevel(item.riskLevel)]} ખતરો કારણ ${item.shortReason}`,
  Punjabi: (item) => `${item.name} ${riskLabels["Punjabi"][normalizeRiskLevel(item.riskLevel)]} ਖਤਰਾ ਕਿਉਂ ${item.shortReason}`,
  Urdu: (item) => `${item.name} ${riskLabels["Urdu"][normalizeRiskLevel(item.riskLevel)]} خطرہ کیونکہ ${item.shortReason}`,
};
const normalizeRiskLevel = (level: string) => {
  if (!level) return "";
  const l = level.toLowerCase();
  if (l.includes("high")) return "high";
  if (l.includes("medium") || l.includes("moderate")) return "medium";
  if (l.includes("low")) return "low";
  return l; // fallback
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
        <Text style={styles.label}>Select Language</Text>

<TouchableOpacity
  style={styles.dropdown}
  onPress={() => {
    setModalType("language");
    setModalVisible(true);
  }}
>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <Ionicons name="globe-outline" size={18} color={COLORS.darkGreen} />
    <Text style={styles.dropdownText}>{selectedLanguage}</Text>
  </View>

  <Ionicons name="chevron-down" size={18} color={COLORS.darkGreen} />
</TouchableOpacity>

        <TouchableOpacity
  style={styles.dropdown}
  onPress={() => {
    setModalType("category");
    setModalVisible(true);
  }}
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
  <>
    <ActivityIndicator size="large" color={COLORS.darkGreen} />
    <Text style={{ marginTop: 10 }}>Analyzing...</Text>
  </>
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
    {scanResult.translatedIngredients || scanResult.ingredients}
  </Text>
)}
    {/* SCORE */}
{scanResult.harmfulIngredients && (
  <CircularScore score={scanResult.safetyScore ?? calculateSafetyScore(scanResult.harmfulIngredients)} />
)}

<View
  style={{
    alignSelf: "center",
    backgroundColor: isSafe ? "#4CAF50" : "#E53935",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  }}
>
  <Text style={{ color: "#fff", fontWeight: "700" }}>
  {isSafe
    ? (labels[langKey]?.safe || "SAFE ✅")
    : (labels[langKey]?.unsafe || "UNSAFE ⚠️")}
</Text>
  
</View>

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
  normalizeRiskLevel(item.riskLevel) === "high" ? "#E53935" :
  normalizeRiskLevel(item.riskLevel) === "medium" ? "#FB8C00" :
  "#4CAF50"; // green for low

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
  {riskLabels[selectedLanguage]?.[normalizeRiskLevel(item.riskLevel)] || item.riskLevel}
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
  {scanResult.translatedExplanation || scanResult.overallExplanation}
</Text>
<View style={{ flexDirection: "row", gap: 10, marginTop: 15 }}>
   
   
  {/* <TouchableOpacity
    onPress={speakText}
    style={styles.listenBtn}
  >
    <Ionicons name="volume-high-outline" size={18} color="#fff" />
    <Text style={styles.listenText}>
      {speaking ? "Speaking..." : "Listen"}
    </Text>
  </TouchableOpacity> */}

  {/* {speaking && (
    <TouchableOpacity
      onPress={stopSpeech}
      style={styles.stopBtn}
    >
      <Ionicons name="stop-circle-outline" size={18} color="#fff" />
      <Text style={styles.listenText}>Stop</Text>
    </TouchableOpacity>
  )} */}
  

</View>


  </View>

  
)}

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {modalType === "language" &&
  languages.map((lang) => (
    <TouchableOpacity
      key={lang}
      onPress={() => {
        setSelectedLanguage(lang);
        setModalVisible(false);
      }}
    >
      <Text style={styles.modalItem}>{lang}</Text>
    </TouchableOpacity>
  ))
}

{modalType === "category" &&
  categories.map((cat) => (
    <TouchableOpacity
      key={cat}
      onPress={() => {
        setSelectedCategory(cat);
        setModalVisible(false);
      }}
    >
      <Text style={styles.modalItem}>{cat}</Text>
    </TouchableOpacity>
  ))
}
              
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
listenBtn: {
  flex: 1,
  backgroundColor: COLORS.darkGreen,
  padding: 12,
  borderRadius: 12,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
},

stopBtn: {
  flex: 1,
  backgroundColor: "#E53935",
  padding: 12,
  borderRadius: 12,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
},

listenText: {
  color: "#fff",
  fontWeight: "600",
},
});