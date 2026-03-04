import { Text, StyleSheet } from "react-native";
import { mockNotify } from "../utils/notifications";

export function getExpiryStatus(expiry: string) {
  const today = new Date();
  const expiryDate = new Date(expiry);
  const diff =
    (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  if (diff < 0) return "expired";
  if (diff <= 7) return "expiring";
  return "fresh";
}

export default function ExpiryBadge({ expiry }: { expiry: string }) {
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

export function notifyIfExpiring(
  name: string,
  expiry: string
) {
  const today = new Date();
  const expiryDate = new Date(expiry);
  const diff =
    (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  if (diff <= 2 && diff >= 0) {
    mockNotify(
      "Product Expiring Soon",
      `${name} expires in ${Math.ceil(diff)} day(s)`
    );
  }

  if (diff < 0) {
    mockNotify(
      "Product Expired",
      `${name} has expired`
    );
  }
}

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
