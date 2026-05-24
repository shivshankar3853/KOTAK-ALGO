const Trade = require("./models/Trade");

const {
  getTick
} = require("./wsService");

const logger = require("./logger");

async function monitorTargets() {

  try {

    const trades = await Trade.find({
      status: "OPEN"
    });

    for (const trade of trades) {

      try {

        const ltp = getTick(trade.symbol);

        if (!ltp) {
          continue;
        }

        // BUY TARGET
        if (
          trade.side === "BUY" &&
          trade.targetPrice &&
          ltp >= trade.targetPrice
        ) {

          logger.info(
            `🎯 BUY target hit: ${trade.symbol} @ ${ltp}`
          );

          trade.status = "TARGET_HIT";

          trade.exitPrice = ltp;

          trade.exitTime = new Date();

          trade.pnl =
            (ltp - trade.entryPrice) *
            trade.quantity;

          await trade.save();

          if (global.io) {

            global.io.emit(
              "targetHit",
              {
                symbol: trade.symbol,
                ltp
              }
            );
          }
        }

        // SELL TARGET
        if (
          trade.side === "SELL" &&
          trade.targetPrice &&
          ltp <= trade.targetPrice
        ) {

          logger.info(
            `🎯 SELL target hit: ${trade.symbol} @ ${ltp}`
          );

          trade.status = "TARGET_HIT";

          trade.exitPrice = ltp;

          trade.exitTime = new Date();

          trade.pnl =
            (trade.entryPrice - ltp) *
            trade.quantity;

          await trade.save();

          if (global.io) {

            global.io.emit(
              "targetHit",
              {
                symbol: trade.symbol,
                ltp
              }
            );
          }
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