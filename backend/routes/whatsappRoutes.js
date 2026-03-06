// ================== routes/whatsappRoutes.js ==================
import express from "express";
import twilio from "twilio";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ── Models (safe re-use) ──────────────────────────────────────
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

// ── Normalise phone → E.164 format ───────────────────────────
const normalisePhone = (phone) => {
  let p = phone.replace(/\s+/g, "").replace(/[^+\d]/g, "");
  if (!p.startsWith("+")) p = "+91" + p; // default India if no country code
  return p;
};

// ── POST /api/whatsapp/send-reminder ─────────────────────────
// Called by "Send Test Alert" button — sends fixed confirmation message
router.post("/send-reminder", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email });
    if (!user)       return res.status(404).json({ error: "User not found" });
    if (!user.phone) return res.status(400).json({ error: "No WhatsApp number saved on your profile" });

    const testMessage =
      `🧠 *NeuroShelf Test Alert*\n\n` +
      `Hey ${user.name || "there"}! 👋\n` +
      `✅ Your WhatsApp alerts are live and working!\n\n` +
      `You'll get a daily heads-up when your products are about to expire — no more surprise spoilage! 🎯\n\n` +
      `💡 _Tip: Add more products to stay ahead of expiry dates._\n\n` +
      `Stay smart, stay fresh! 🥗✨`;

    const toNumber = `whatsapp:${normalisePhone(user.phone)}`;

    const twilioMsg = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to:   toNumber,
      body: testMessage,
    });

    console.log(`[WhatsApp] ✅ Test sent to ${user.email} → ${toNumber}`);

    res.json({ success: true, sent: true, sid: twilioMsg.sid, status: twilioMsg.status });
  } catch (err) {
    console.error("[WhatsApp] ❌ Test send error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/whatsapp/prefs ───────────────────────────────────
// Toggle daily midnight notifications on/off
router.put("/prefs", async (req, res) => {
  try {
    const { email, enabled } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    user.notificationPrefs = { enabled: enabled ?? false };
    await user.save();

    console.log(`[WhatsApp] Prefs updated for ${email}: enabled=${enabled}`);

    res.json({
      success: true,
      message: `Daily midnight reminders ${enabled ? "enabled ✅" : "disabled"}`,
      prefs:   user.notificationPrefs,
    });
  } catch (err) {
    console.error("[WhatsApp] Prefs error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;