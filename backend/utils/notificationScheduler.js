// ================== utils/notificationScheduler.js ==================
// Fires at 00:00 every night. Sends WhatsApp to every user with
// notificationPrefs.enabled = true, listing EXPIRED + EXPIRING SOON products.

import cron from "node-cron";
import twilio from "twilio";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ── Models ────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: String, phone: String, email: String, password: String,
  notificationPrefs: { enabled: { type: Boolean, default: false } },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: String, category: String, expiryDate: Date, status: String, daysLeft: Number,
}, { timestamps: true });

const User    = mongoose.models.User    || mongoose.model("User",    userSchema);
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const daysUntil = (date) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(date) - today) / (1000 * 60 * 60 * 24));
};

const normalisePhone = (phone) => {
  let p = phone.replace(/\s+/g, "").replace(/[^+\d]/g, "");
  if (!p.startsWith("+")) p = "+91" + p;
  return p;
};

// ── Build nightly message ────────────────────────────────────
const buildNightlyMessage = (userName, expired, expiringSoon) => {
  const lines = [];

  if (expired.length > 0) {
    lines.push(`🔴 *EXPIRED (${expired.length})*`);
    expired.forEach((p, i) => {
      lines.push(
        `   ${i + 1}. *${p.name}*\n` +
        `      📅 Expired: ${formatDate(p.expiryDate)}` +
        (p.category ? `\n      🏷️ ${p.category}` : "")
      );
    });
  }

  if (expiringSoon.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(`🟡 *EXPIRING SOON (${expiringSoon.length})*`);
    expiringSoon.forEach((p, i) => {
      const days     = daysUntil(p.expiryDate);
      const dayLabel = days === 0 ? "TODAY" : days === 1 ? "Tomorrow" : `in ${days} days`;
      lines.push(
        `   ${i + 1}. *${p.name}*\n` +
        `      📅 Expires: ${formatDate(p.expiryDate)} (${dayLabel})` +
        (p.category ? `\n      🏷️ ${p.category}` : "")
      );
    });
  }

  return (
    `⚠️ *NeuroShelf Daily Alert* ⚠️\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Hi *${userName}*! 👋\n` +
    `You have *${expired.length + expiringSoon.length}* product(s) that need attention:\n\n` +
    lines.join("\n") +
    `\n\n━━━━━━━━━━━━━━━━━━━━━\n` +
    `Please remove expired items and use expiring ones soon.\n` +
    `_Sent automatically at midnight via NeuroShelf_ 🌙`
  );
};

// ── Send for one user ─────────────────────────────────────────
const sendForUser = async (user) => {
  try {
    const expired      = await Product.find({ status: "EXPIRED"       }).sort({ expiryDate: 1 });
    const expiringSoon = await Product.find({ status: "EXPIRING SOON" }).sort({ expiryDate: 1 });

    if (expired.length === 0 && expiringSoon.length === 0) {
      console.log(`[Scheduler] ℹ️  No products to alert for ${user.email}`);
      return;
    }

    const toNumber = `whatsapp:${normalisePhone(user.phone)}`;

    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to:   toNumber,
      body: buildNightlyMessage(user.name, expired, expiringSoon),
    });

    console.log(`[Scheduler] ✅ Sent to ${user.email} — ${expired.length} expired, ${expiringSoon.length} expiring soon`);
  } catch (err) {
    console.error(`[Scheduler] ❌ Failed for ${user.email}:`, err.message);
  }
};

// ── Start cron ────────────────────────────────────────────────
export const startScheduler = () => {
  // "0 0 * * *" = every day at midnight 00:00
  cron.schedule("* * * * *", async () => {
    console.log("[Scheduler] 🌙 Midnight — running daily expiry alerts...");
    try {
      const users = await User.find({
        "notificationPrefs.enabled": true,
        phone: { $exists: true, $ne: "" },
      });
      console.log(`[Scheduler] Found ${users.length} user(s) to notify`);
      for (const user of users) await sendForUser(user);
      console.log("[Scheduler] ✅ Done");
    } catch (err) {
      console.error("[Scheduler] ❌ Error:", err.message);
    }
  });

  console.log("🕐 Scheduler started — daily alerts fire at midnight (00:00)");
};