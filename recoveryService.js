const Trade = require("./models/Trade");

const { subscribeSymbol } = require("./wsService");
const { resolveTargetPriceFromTrade, normalizeTargetPoints } = require("./targetLogic");

async function recoverPositions() {
  try {
    console.log("♻️ Recovering Positions...");

    const openTrades = await Trade.find({ status: "OPEN" });
    const subscribed = new Set();

    for (const trade of openTrades) {
      if (!trade.instrument) {
        console.log("⚠️ Skipping trade (no instrument):", trade?._id);
        continue;
      }

      const targetPrice = resolveTargetPriceFromTrade(trade);

      if (!trade.targetPrice || Number(trade.targetPrice) !== Number(targetPrice)) {
        trade.targetPrice = targetPrice;
      }

      if (!trade.targetPoints) {
        trade.targetPoints = normalizeTargetPoints(trade.targetPoints);
      }

      await trade.save();

      if (!subscribed.has(trade.instrument)) {
        subscribeSymbol(trade.instrument);
        subscribed.add(trade.instrument);
        console.log("♻️ Re-Subscribed:", trade.instrument);
      }

      console.log("♻️ Recovered target:", trade.instrument, targetPrice);
    }

    console.log("✅ Recovery Complete");
  } catch (err) {
    console.log("❌ Recovery Error:", err.message);
  }
}

module.exports = {
  recoverPositions,
};