const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema({
  time: { type: Date, default: Date.now },

  // ✅ ADD THIS LINE HERE 👇
  broker: { type: String, default: "KOTAK" },

  side: String,
  quantity: Number,
  instrument: String,
  symbol: String,
  orderId: String,

  price: Number,
  targetPoints: { type: Number, default: 10 },
  targetPrice: { type: Number, default: 0 },

  status: { type: String, default: "OPEN" },
  pnl: { type: Number, default: 0 },

  // 🚀 Trailing SL
  highestPrice: { type: Number, default: 0 },
  trailingSL: { type: Number, default: 0 }
});

module.exports = mongoose.model("Trade", tradeSchema);