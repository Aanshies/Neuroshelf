import React, { useEffect } from "react";
import { deactivateKeepAwake } from "expo-keep-awake";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { router } from "expo-router";

const { height } = Dimensions.get("window");


export default function Index() {
  useEffect(() => {
  deactivateKeepAwake();
}, []);
  return (
    <View style={styles.container}>
      {/* TOP GREEN SECTION */}
      <View style={styles.topSection}>
        {/* NAV BAR */}
        <View style={styles.navHeader}>
          <View style={styles.logoCircle}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.navLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.authButtons}>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.navText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
              <Text style={styles.navText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* APP NAME */}
        <Text style={styles.appName}>NeuroShelf</Text>
      </View>

      {/* CENTER VIDEO */}
      <View style={styles.videoCircle}>
        <Video
          source={require("../assets/videos/demo.mp4")}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          isMuted
          shouldPlay
          isLooping
        />
      </View>

      {/* BOTTOM WHITE SECTION */}
      <View style={styles.bottomSection}>
<TouchableOpacity
  style={styles.scanButton}
  onPress={() => router.push("scan_ingredients")}
>
  <Text style={styles.scanButtonText}>Scan Ingredients</Text>
</TouchableOpacity>


        <Text style={styles.heroTitle}>
          Scan smarter. Consume safer.
        </Text>

        <Text style={styles.heroSubtitle}>
          AI-powered analysis for safer product choices.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  /* TOP GREEN */
  topSection: {
    height: height * 0.5,
    backgroundColor: "#16a34a",
    paddingTop: 40,
    alignItems: "center",
  },

  /* NAV */
  navHeader: {
    width: "100%",
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  navLogo: {
    width: 26,
    height: 26,
    tintColor: "#16a34a",
  },

  authButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },

  navText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },

  /* APP NAME */
  appName: {
    marginTop: 130,
    fontSize: 52,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 1,
  },

  /* VIDEO */
videoCircle: {
  width: 190,
  height: 190,          // ✅ same as width
  marginTop: -90,
  marginLeft: 90,

  borderRadius: 110,    // ✅ half of width/height
  overflow: "hidden",

  backgroundColor: "#ffffff",
  alignItems: "center",
  justifyContent: "center",

  elevation: 6,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 10,
},



video: {
  width: "100%",
  height: "100%",
},


  /* BOTTOM WHITE */
  bottomSection: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 24,
  },

  scanButton: {
    backgroundColor: "#16a34a",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 24,
  },
  scanButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },

  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
  },
});
