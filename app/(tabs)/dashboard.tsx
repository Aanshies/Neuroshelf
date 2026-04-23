import { COLORS } from "@/constants/colors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ExpiryBadge, { getExpiryStatus } from "../../components/ExpiryBadge";
import { BASE_URL } from "../../config/api";
import { getUser, logoutUser } from "../../utils/storage";

export default function DashboardScreen() {
  const [products, setProducts] = useState([]);

  // ✅ Check login
  useEffect(() => {
    const checkUser = async () => {
      const user = await getUser();
      if (!user) router.replace("/(auth)/login");
    };
    checkUser();
  }, []);

  // ✅ Load products every time screen opens
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadProducts = async () => {
        try {
          const user = await getUser();
          if (!user) return;

          const normalizedEmail = user.email?.trim().toLowerCase();

console.log("FETCH USER:", normalizedEmail);

const res = await fetch(
  `${BASE_URL}/api/products?userEmail=${normalizedEmail}`
);
          const data = await res.json();

          console.log("FETCHED PRODUCTS:", data); // 🔥 DEBUG

          if (isActive) setProducts(data);
        } catch (err) {
          console.log("Error:", err);
        }
      };

      loadProducts();

      return () => {
        isActive = false;
      };
    }, []),
  );

  // ✅ FIXED expiry logic
  const total = products.length;

  const safe = products.filter(
    (p) => getExpiryStatus(p.expiryDate || p.expiry) === "fresh",
  ).length;

  const expiring = products.filter(
    (p) => getExpiryStatus(p.expiryDate || p.expiry) === "expiring",
  ).length;

  const expired = products.filter(
    (p) => getExpiryStatus(p.expiryDate || p.expiry) === "expired",
  ).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return "No expiry";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Invalid";
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ✅ ALWAYS SHOW STATS */}
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

        {/* PRODUCTS */}
        <Text style={styles.sectionTitle}>YOUR PRODUCTS</Text>

        {products.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={42}
              color="#94a3b8"
            />
            <Text style={styles.emptyText}>No products yet</Text>
          </View>
        ) : (
          products.map((item) => (
            <View key={item._id} style={styles.productCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productCategory}>{item.category}</Text>
                <Text style={styles.productDate}>
                  Exp: {formatDate(item.expiryDate)}
                </Text>
              </View>

              {/* ✅ Badge works properly */}
              <ExpiryBadge expiry={item.expiryDate} />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* STAT CARD */
const StatCard = ({ title, value, bg, color, icon }) => (
  <View style={[styles.card, { backgroundColor: bg }]}>
    <Ionicons name={icon} size={24} color={color} />
    <Text style={[styles.number, { color }]}>{value}</Text>
    <Text style={[styles.label, { color }]}>{title}</Text>
  </View>
);

/* STYLES */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
  },

  headerLeft: { flexDirection: "row", alignItems: "center" },

  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  logo: { width: 25, height: 25 },

  headerTitle: { fontSize: 18, fontWeight: "700" },

  scrollContent: { padding: 20 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  card: {
    width: "48%",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },

  number: { fontSize: 22, fontWeight: "700" },

  label: { fontSize: 14 },

  sectionTitle: { marginTop: 20, fontWeight: "700" },

  emptyBox: {
    alignItems: "center",
    marginTop: 40,
  },

  emptyText: {
    marginTop: 10,
    color: "#64748b",
  },

  productCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  productName: { fontWeight: "700" },

  productCategory: { color: "#64748b" },

  productDate: { fontSize: 12 },
});
