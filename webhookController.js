const { placeOrder } = require("./orderService");
const { isTradingEnabled, canTrade } = require("./control");
const { validateSignal } = require("./validator");

// ==============================
// 🚫 DUPLICATE SIGNAL PROTECTION (SAFE + LEAK FREE)
// ==============================
const recentSignals = new Map();

// periodic cleanup (prevents memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [key, time] of recentSignals.entries()) {
    if (now - time > 10000) recentSignals.delete(key);
  }
}, 5000);

function isDuplicate(signal) {
  if (!signal) return true;

  const key = `${signal.TS || ""}_${signal.TT || ""}_${signal.Q || ""}`;

  if (recentSignals.has(key)) return true;

  recentSignals.set(key, Date.now());
  return false;
}

// ==============================
// 🔁 NORMALIZE SIGNAL FORMAT
// ==============================
function normalizeSignal(signal) {
  try {
    if (!signal || typeof signal !== "object") return null;

    return {
      TS: formatSymbol(signal.TS),
      TT: signal.TT || signal.transaction_type,
      Q: signal.Q || signal.quantity,
      P: signal.P || signal.product || "NRML",
      VL: signal.VL || signal.validity || "DAY",
      OT: signal.OT || signal.order_type || "MARKET",
      PRICE: signal.PRICE || signal.price || 0
    };
  } catch (err) {
    console.log("❌ Normalize error:", err.message);
    return null;
  }
}

// ==============================
// 🔁 CONVERT INTERNAL → ORDER FORMAT
// ==============================
function convertTV(signal) {
  try {
    if (!signal) return null;

    const qty = Number(signal.Q);
    if (!Number.isFinite(qty) || qty <= 0) return null;

    return {
      TS: signal.TS, // already normalized (no re-format)
      quantity: qty,
      product: signal.P || "NRML",
      validity: signal.VL || "DAY",
      price: Number(signal.PRICE || 0),
      order_type: signal.OT || "MARKET",
      transaction_type: signal.TT,
      disclosed_quantity: 0
    };
  } catch (err) {
    console.log("❌ Conversion error:", err.message);
    return null;
  }
}

// ==============================
// 📡 WEBHOOK HANDLER
// ==============================
async function handleWebhook(req, res) {
  try {
    const body = req.body;

    console.log("📡 Signal Received:", JSON.stringify(body));

    if (global.io?.emit) {
      global.io.emit("signal", body);
    }

    if (!isTradingEnabled()) {
      return res.send("⛔ Trading Disabled");
    }

    const signals = Array.isArray(body) ? body : [body];

    for (const rawSignal of signals) {
      try {

        const normalizedSignal = normalizeSignal(rawSignal);
        if (!normalizedSignal) continue;

        const result = validateSignal(normalizedSignal);

        if (!result.ok) {
          console.log("❌ Invalid signal:", result.error);
          continue;
        }

        const validSignal = result.data;

        if (isDuplicate(validSignal)) {
          console.log("⚠️ Duplicate ignored:", validSignal.TS);
          continue;
        }

        if (!canTrade()) {
          console.log("⛔ Trade limit reached");
          continue;
        }

        const order = convertTV(validSignal);
        if (!order) continue;

        console.log("📤 Final Order:", order);

        const resultOrder = await placeOrder(order);

        console.log("✅ Order Success:", resultOrder);

      } catch (err) {
        console.error("❌ Order Failed:", err.message);
      }
    }

    return res.send("✅ Signal processed");

  } catch (err) {
    console.error("❌ Webhook Error:", err.message);
    return res.status(500).send("Error");
  }
}

// ==============================
// SYMBOL FORMATTER (SAFE)
// ==============================
function formatSymbol(ts) {
  try {
    if (!ts || typeof ts !== "string") return ts;

    const parts = ts.split(" ");

    if (parts.length === 6) {
      const [index, strike, type, day, month, year] = parts;
      const shortYear = year.slice(-2);
      return `${index}${shortYear}${month.toUpperCase()}${strike}${type}`;
    }

    return ts;
  } catch {
    return ts;
  }
}

module.exports = { handleWebhook };