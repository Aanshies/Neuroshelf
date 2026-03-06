import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Switch, Linking, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { getUser, saveUser } from "../../utils/storage";
import { router } from "expo-router";

const BASE_URL = Platform.OS === "web"
  ? "http://localhost:5000"
  : "http://10.39.41.248:5000";

const TWILIO_SANDBOX_NUMBER = "14155238886";
const TWILIO_JOIN_KEYWORD   = "join vertical-anybody";

type UserType = {
  email:  string;
  name?:  string;
  phone?: string;
  notificationPrefs?: { enabled: boolean };
};

export default function ProfileScreen() {
  const [user,          setUser]          = useState<UserType | null>(null);
  const [fullName,      setFullName]      = useState("");
  const [phone,         setPhone]         = useState("");
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [sending,       setSending]       = useState(false);
  const [togglingNoti,  setTogglingNoti]  = useState(false);
  const [notiEnabled,   setNotiEnabled]   = useState(false);
  const [sandboxOpened, setSandboxOpened] = useState(false);

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    try {
      const localUser = await getUser();
      if (!localUser?.email) {
        Alert.alert("Error", "No logged in user found");
        setLoading(false);
        return;
      }
      const res = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(localUser.email)}`);
      if (res.status === 404) {
        const createRes = await fetch(`${BASE_URL}/api/user`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: localUser.email, name: localUser.name || "", phone: "" }),
        });
        applyUserData((await createRes.json()).user);
      } else {
        applyUserData(await res.json());
      }
    } catch (err) {
      console.error("Profile load error:", err);
      Alert.alert("Error", "Unable to load profile. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  const applyUserData = (data: UserType) => {
    if (!data) return;
    setUser(data);
    setFullName(data.name  || "");
    setPhone(data.phone    || "");
    setNotiEnabled(data.notificationPrefs?.enabled ?? false);
  };

  // ── Save profile ──────────────────────────────────────────
  const handleSave = async () => {
    const email = user?.email;
    if (!email) return Alert.alert("Error", "User email missing");
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/user/${encodeURIComponent(email)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, phone }),
      });
      if (!res.ok) throw new Error("Update failed");
      const result = await res.json();
      setUser(result.user);
      await saveUser(result.user);
      Alert.alert("✅ Saved", "Profile updated successfully");
    } catch {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // ── Open WhatsApp sandbox opt-in ──────────────────────────
  const handleEnableWhatsApp = async () => {
    if (!phone) {
      Alert.alert("Phone Required", "Please save your WhatsApp number above first, then try again.");
      return;
    }
    const waUrl = `https://wa.me/${TWILIO_SANDBOX_NUMBER}?text=${encodeURIComponent(TWILIO_JOIN_KEYWORD)}`;
    try {
      await Linking.openURL(waUrl);
      setSandboxOpened(true);
    } catch {
      Alert.alert("Error", "Could not open WhatsApp. Please make sure it is installed.");
    }
  };

  // ── Send test alert ───────────────────────────────────────
  const handleSendTest = async () => {
    if (!phone) {
      Alert.alert("Phone Required", "Add your WhatsApp number and save profile first.");
      return;
    }
    setSending(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/whatsapp/send-reminder`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email }),
      });
      const data = await res.json();
      if (data.success && data.sent) {
        Alert.alert("✅ Test Sent!", "Check your WhatsApp — the test message has been delivered!");
      } else {
        throw new Error(data.error || "Send failed");
      }
    } catch (err: any) {
      Alert.alert(
        "❌ Failed",
        err.message.includes("Channel")
          ? "Twilio FROM number is wrong. Check TWILIO_WHATSAPP_FROM in your .env — it must be: whatsapp:+14155238886"
          : err.message || "Make sure you joined the sandbox first, then retry."
      );
    } finally {
      setSending(false);
    }
  };

  // ── Toggle midnight notifications ─────────────────────────
  const handleToggleNotification = async (value: boolean) => {
    if (value && !phone) {
      Alert.alert("Phone Required", "Please save your WhatsApp number before enabling notifications.");
      return;
    }
    setNotiEnabled(value);
    setTogglingNoti(true);
    try {
      const res = await fetch(`${BASE_URL}/api/whatsapp/prefs`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email, enabled: value }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
    } catch {
      setNotiEnabled(!value); // revert on failure
      Alert.alert("Error", "Failed to update notification setting");
    } finally {
      setTogglingNoti(false);
    }
  };

  if (loading) return <View style={s.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!user)   return <View style={s.loader}><Text style={{ color: COLORS.subtitle }}>No user found</Text></View>;

  return (
    <ScrollView contentContainerStyle={s.container}>

      {/* ── Header ──────────────────────────────────────────── */}
     <View style={s.header}>
  <TouchableOpacity
    onPress={() => {
      if (router.canGoBack()) router.back();
      else router.replace("/"); // fallback
    }}
  >
    <Ionicons name="arrow-back" size={24} color={COLORS.heading} />
  </TouchableOpacity>
  <Text style={s.headerTitle}>Profile</Text>
</View>

      {/* ── Personal Info ────────────────────────────────────── */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Your Information</Text>

        <Text style={s.label}>Email</Text>
        <View style={s.disabledInput}>
          <Text style={s.disabledText}>{user.email}</Text>
        </View>

        <Text style={s.label}>Full Name</Text>
        <TextInput
          value={fullName} onChangeText={setFullName}
          style={s.input} placeholder="Enter your name"
          placeholderTextColor={COLORS.subtitle}
        />

        <Text style={s.label}>Phone (WhatsApp)</Text>
        <TextInput
          value={phone} onChangeText={setPhone}
          keyboardType="phone-pad" style={s.input}
          placeholder="+91XXXXXXXXXX"
          placeholderTextColor={COLORS.subtitle}
        />
        <Text style={s.hint}>Include country code, e.g. +91 for India</Text>

        <TouchableOpacity
          style={[s.btnPrimary, saving && s.btnDisabled]}
          onPress={handleSave} disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={COLORS.white} />
            : <><Ionicons name="save-outline" size={18} color={COLORS.white} /><Text style={s.btnText}> Save Changes</Text></>
          }
        </TouchableOpacity>
      </View>

      {/* ── Step 1: Connect sandbox ──────────────────────────── */}
      <View style={[s.card, s.mt]}>
        <View style={s.cardHeaderRow}>
          <View style={s.iconBadge}>
            <Ionicons name="logo-whatsapp" size={20} color={COLORS.white} />
          </View>
          <Text style={s.sectionTitle}>Enable WhatsApp Alerts</Text>
        </View>

        <Text style={s.subtitle}>
          One-time setup — tap below to open WhatsApp with a pre-filled message, then just press{" "}
          <Text style={{ fontWeight: "700", color: COLORS.heading }}>Send</Text>.
        </Text>

        {[
          "Tap the button — WhatsApp opens with a pre-filled message.",
          { pre: "Press ", bold: "Send", post: " in WhatsApp." },
          "You're connected! 🎉",
        ].map((step, i) => (
          <View key={i} style={s.stepRow}>
            <View style={s.stepBadge}><Text style={s.stepNum}>{i + 1}</Text></View>
            {typeof step === "string"
              ? <Text style={s.stepText}>{step}</Text>
              : <Text style={s.stepText}>{step.pre}<Text style={{ fontWeight: "700" }}>{step.bold}</Text>{step.post}</Text>
            }
          </View>
        ))}

        <TouchableOpacity style={s.btnGreen} onPress={handleEnableWhatsApp}>
          <Ionicons name="logo-whatsapp" size={18} color={COLORS.white} />
          <Text style={s.btnText}>  Enable WhatsApp Alerts  </Text>
          <Ionicons name="open-outline" size={15} color={COLORS.white} />
        </TouchableOpacity>

        {sandboxOpened && (
          <View style={s.hintRow}>
            <Ionicons name="checkmark-circle" size={15} color={COLORS.primary} />
            <Text style={s.hintText}>
              {"  WhatsApp opened! "}
              <Text style={s.hintLink} onPress={handleEnableWhatsApp}>Tap here</Text>
              {" if it didn't open."}
            </Text>
          </View>
        )}
      </View>

      {/* ── Step 2: Verify ───────────────────────────────────── */}
      <View style={[s.card, s.mt]}>
        <Text style={s.sectionTitle}>Verify Connection</Text>
        <Text style={s.subtitle}>
          After joining above, send a test message to confirm your WhatsApp is connected.
        </Text>

        <TouchableOpacity
          style={[s.btnOutline, sending && s.btnDisabled]}
          onPress={handleSendTest} disabled={sending}
        >
          {sending
            ? <ActivityIndicator color={COLORS.heading} />
            : <><Ionicons name="send-outline" size={17} color={COLORS.heading} /><Text style={s.btnOutlineText}>  Send Test Alert</Text></>
          }
        </TouchableOpacity>
      </View>

      {/* ── Step 3: Enable daily reminders ──────────────────── */}
      <View style={[s.card, s.mt]}>
        <Text style={s.sectionTitle}>📲 Daily Reminders</Text>

        <View style={s.toggleCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleTitle}>Midnight Alerts</Text>
            <Text style={s.toggleSub}>
              Every night at 12:00 AM, you&apos;ll receive a WhatsApp message with all expired and expiring-soon products.
            </Text>
          </View>
          <Switch
            value={notiEnabled}
            onValueChange={handleToggleNotification}
            disabled={togglingNoti}
            trackColor={{ false: COLORS.softGray, true: COLORS.lightGreen }}
            thumbColor={notiEnabled ? COLORS.primary : COLORS.subtitle}
          />
        </View>

        {notiEnabled && (
          <View style={s.activeRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
            <Text style={s.activeText}>
              {"  Active — next alert at "}
              <Text style={{ fontWeight: "700" }}>12:00 AM tonight</Text>
            </Text>
          </View>
        )}
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:   { padding: 20, backgroundColor: COLORS.background, flexGrow: 1, paddingBottom: 50 },
  loader:      { flex: 1, justifyContent: "center", alignItems: "center" },
  header:      { flexDirection: "row", alignItems: "center", marginBottom: 20, paddingTop: 20 },
  headerTitle: { fontSize: 20, fontWeight: "700", marginLeft: 15, color: COLORS.heading },

  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20 },
  mt:   { marginTop: 16 },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.heading, marginBottom: 6 },
  label:        { fontWeight: "600", marginBottom: 6, color: COLORS.heading, marginTop: 12, fontSize: 14 },
  hint:         { fontSize: 11, color: COLORS.subtitle, marginTop: 4 },
  subtitle:     { fontSize: 13, color: COLORS.subtitle, lineHeight: 19, marginBottom: 12 },

  input:        { backgroundColor: COLORS.softGray, borderRadius: 12, padding: 14, color: COLORS.heading },
  disabledInput:{ backgroundColor: COLORS.softGray, borderRadius: 12, padding: 14 },
  disabledText: { color: COLORS.subtitle },

  btnPrimary:  { marginTop: 18, backgroundColor: COLORS.primary, padding: 15, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btnGreen:    { marginTop: 16, backgroundColor: COLORS.darkGreen, padding: 15, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btnOutline:  { marginTop: 4, backgroundColor: COLORS.softGray, padding: 15, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  btnDisabled: { opacity: 0.6 },
  btnText:        { color: COLORS.white,   fontWeight: "700", fontSize: 15 },
  btnOutlineText: { color: COLORS.heading, fontWeight: "600", fontSize: 15 },

  cardHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  iconBadge:     { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },

  stepRow:   { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepNum:   { color: COLORS.white, fontWeight: "700", fontSize: 13 },
  stepText:  { flex: 1, fontSize: 14, color: COLORS.heading, lineHeight: 21 },

  hintRow:  { flexDirection: "row", alignItems: "center", marginTop: 12 },
  hintText: { fontSize: 13, color: COLORS.subtitle },
  hintLink: { color: COLORS.primary, fontWeight: "600", textDecorationLine: "underline" },

  toggleCard:  { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.softGray, borderRadius: 14, padding: 16, marginTop: 8, gap: 12 },
  toggleTitle: { fontSize: 15, fontWeight: "700", color: COLORS.heading, marginBottom: 4 },
  toggleSub:   { fontSize: 12, color: COLORS.subtitle, lineHeight: 17 },

  activeRow:  { flexDirection: "row", alignItems: "center", marginTop: 12, paddingHorizontal: 4 },
  activeText: { fontSize: 13, color: COLORS.primary },
});