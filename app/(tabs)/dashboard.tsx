import React, { useEffect, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@/constants/colors";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { getProducts , deleteProduct } from "../../utils/productStorage";
import { getExpiryStatus } from "../../components/ExpiryBadge";
import { logoutUser,getUser } from "../../utils/storage";
import ExpiryBadge from "../../components/ExpiryBadge";


export default function DashboardScreen() {
  const [products, setProducts] = useState<any[]>([]);

    // 🔐 Protect dashboard (redirect if no user)
  useEffect(() => {
    const checkUser = async () => {
      const user = await getUser();
      if (!user) {
        router.replace("/(auth)/login");
      }
    };
    checkUser();
  }, []);

useFocusEffect(
  useCallback(() => {
    let isActive = true; // to avoid state updates if screen unmounts

    const loadProducts = async () => {
      try {
        const user = await getUser(); // ✅ this works because it's inside async function
        if (!user) {
          console.log("No user logged in");
          setProducts([]); // clear products if no user
          return;
        }

        const savedProducts = await getProducts();
        if (isActive) setProducts(savedProducts || []);
      } catch (err) {
        console.log("Error loading products:", err);
      }
    };

    loadProducts();

    return () => {
      isActive = false;
    };
  }, [])
);
  const total = products.length;
  const safe = products.filter((p) => getExpiryStatus(p.expiry) === "fresh").length;
  const expiring = products.filter(
    (p) => getExpiryStatus(p.expiry) === "expiring"
  ).length;
  const expired = products.filter(
    (p) => getExpiryStatus(p.expiry) === "expired"
  ).length;



const formatDateFromISO = (dateStr: string) => {
  if (!dateStr) return "No expiry";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Invalid date";
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
};

const handleDelete = async (id: string) => {
  Alert.alert(
    "Delete Product",
    "Are you sure you want to delete this product?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = await deleteProduct(id);
          setProducts(updated);
        },
      },
    ]
  );
};

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logo}
            />
          </View>
          <Text style={styles.headerTitle}>NeuroShelf</Text>
        </View>

        <TouchableOpacity
          onPress={async () => {
            await logoutUser();
            router.replace("/(auth)/login");
          }}
        >
          <Ionicons name="log-out-outline" size={26} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* STAT CARDS */}
        <View style={styles.row}>
          <StatCard
            title="Total"
            value={total}
            bg="#d1fae5"
            color="#065f46"
            icon="cube-outline"
          />
          <StatCard
            title="Expired"
            value={expired}
            bg="#fee2e2"
            color="#dc2626"
            icon="alert-circle-outline"
          />
        </View>

        <View style={styles.row}>
          <StatCard
            title="Expiring"
            value={expiring}
            bg="#fef3c7"
            color="#d97706"
            icon="time-outline"
          />
          <StatCard
            title="Safe"
            value={safe}
            bg="#d1fae5"
            color="#16a34a"
            icon="shield-checkmark-outline"
          />
        </View>

        {/* PRODUCTS SECTION */}
        <Text style={styles.sectionTitle}>YOUR PRODUCTS</Text>
         {products.map((item) => (
  <View key={item.id} style={styles.productCard}>
    <View style={{ flex: 1 }}>
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productCategory}>{item.category}</Text>
<Text style={styles.productDate}>
  Exp: {formatDateFromISO(item.expiry)}
</Text>


    </View>

   <View style={{ alignItems: "center" }}>
  <ExpiryBadge expiry={item.expiry} />

  <TouchableOpacity
    onPress={() => handleDelete(item.id)}
    style={{ marginTop: 8 }}
  >
    <Ionicons name="trash-outline" size={20} color="#dc2626" />
  </TouchableOpacity>
</View>
  </View>
))}

        {products.length === 0 && (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={42}
              color="#94a3b8"
            />
            <Text style={styles.emptyText}>
              No products yet. Add your first one!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- STAT CARD ---------- */
const StatCard = ({ title, value, bg, color, icon }: any) => (
  <View style={[styles.card, { backgroundColor: bg }]}>
    <Ionicons name={icon} size={24} color={color} />
    <Text style={[styles.number, { color }]}>{value}</Text>
    <Text style={[styles.label, { color }]}>{title}</Text>
  </View>
);

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 6,
    
    borderBottomWidth: 1,
    borderBottomColor: COLORS.softGray,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  logo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.heading,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  card: {
    width: "48%",
    borderRadius: 18,
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },

  number: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 8,
    color: COLORS.heading,
  },

  label: {
    marginTop: 8,
    fontWeight: "500",
    fontSize: 16,
    color: COLORS.subtitle,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.heading,
    marginTop: 25,
    marginBottom: 20,
  },

  emptyBox: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingVertical: 50,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.softGray,
  },

  emptyText: {
    marginTop: 16,
    color: COLORS.subtitle,
    fontSize: 16,
  },
  productCard: {
  backgroundColor: COLORS.white,
  padding: 15,
  borderRadius: 15,
  marginBottom: 15,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

productName: {
  fontSize: 16,
  fontWeight: "700",
  color: COLORS.heading,
},

productCategory: {
  fontSize: 13,
  color: COLORS.subtitle,
  marginTop: 2,
},

productDate: {
  fontSize: 12,
  marginTop: 4,
  color: COLORS.subtitle,
},

});
