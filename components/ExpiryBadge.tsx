import { Text, StyleSheet } from "react-native";
import { mockNotify } from "../utils/notifications";

// ================== STATUS FUNCTION ==================
export function getExpiryStatus(expiry) {
  if (!expiry) return "fresh";

  const today = new Date();
  const expiryDate = new Date(expiry);

  // 🔥 Remove time (VERY IMPORTANT)
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (expiryDate - today) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "expired";
  if (diffDays <= 3) return "expiring";
  return "fresh";
}

// ================== BADGE COMPONENT ==================
export default function ExpiryBadge({ expiry }) {
  const status = getExpiryStatus(expiry);

  const label =
    status === "expired"
      ? "Expired"
      : status === "expiring"
      ? "Expiring Soon"
      : "Fresh";

  return (
    <Text style={[styles.badge, styles[status]]}>
      {label}
    </Text>
  );
}

// ================== NOTIFICATION FUNCTION ==================
export function notifyIfExpiring(name, expiry) {
  const today = new Date();
  const expiryDate = new Date(expiry);

  // 🔥 Remove time
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (expiryDate - today) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 2 && diffDays >= 0) {
    mockNotify(
      "Product Expiring Soon",
      `${name} expires in ${diffDays} day(s)`
    );
  }

  if (diffDays < 0) {
    mockNotify(
      "Product Expired",
      `${name} has expired`
    );
  }
}

// ================== STYLES ==================
const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    fontSize: 12,
    overflow: "hidden",
    alignSelf: "flex-start",
    marginTop: 5,
  },
  fresh: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  expiring: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
  },
  expired: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
});