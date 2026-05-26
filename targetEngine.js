const Trade = require("./models/Trade");

const {
  getTick
} = require("./wsService");

const logger = require("./logger");
const { resolveTargetPriceFromTrade } = require("./targetLogic");

async function monitorTargets() {

  try {

    const trades = await Trade.find({
      status: "OPEN"
    });

    for (const trade of trades) {

      try {

        const symbol = trade.instrument || trade.symbol;
        const ltp = getTick(symbol);

        if (!ltp || !trade.price || !trade.quantity) {
          continue;
        }

        const targetPrice = resolveTargetPriceFromTrade(trade);

        if (!targetPrice) {
          continue;
        }

        if (!trade.targetPrice) {
          trade.targetPrice = targetPrice;
        }

        const targetReached =
          trade.side === "BUY"
            ? ltp >= trade.targetPrice
            : ltp <= trade.targetPrice;

        if (!targetReached) {
          continue;
        }

        logger.info(
          `🎯 ${trade.side} target hit: ${symbol} @ ${ltp}`
        );

        trade.status = "TARGET_HIT";
        trade.exitPrice = ltp;
        trade.exitTime = new Date();
        trade.pnl =
          trade.side === "BUY"
            ? (ltp - trade.price) * trade.quantity
            : (trade.price - ltp) * trade.quantity;

        await trade.save();

        if (global.io) {
          global.io.emit("targetHit", {
            symbol,
            ltp,
            targetPrice: trade.targetPrice,
            pnl: trade.pnl
          });
        }

      } catch (err) {

        logger.error(
          `Target trade error: ${err.message}`
        );
      }
    }

  } catch (err) {

    logger.error(
      `Monitor target error: ${err.message}`
    );
  }
}

module.exports = {
  monitorTargets
};