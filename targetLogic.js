const DEFAULT_TARGET_POINTS = 10;

function normalizeTargetPoints(value) {
  const points = Number(value);

  if (!Number.isFinite(points) || points <= 0) {
    return DEFAULT_TARGET_POINTS;
  }

  return points;
}

function calculateTargetPrice(entryPrice, side, targetPoints = DEFAULT_TARGET_POINTS) {
  const price = Number(entryPrice);

  if (!Number.isFinite(price) || price <= 0) {
    return 0;
  }

  const points = normalizeTargetPoints(targetPoints);

  if (side === "BUY") {
    return price + points;
  }

  return Math.max(price - points, 0.05);
}

function resolveTargetPriceFromTrade(trade = {}) {
  const entryPrice = Number(trade.price || 0);
  const savedTarget = Number(trade.targetPrice || 0);

  if (savedTarget > 0) {
    return savedTarget;
  }

  if (!entryPrice || !trade.side) {
    return 0;
  }

  return calculateTargetPrice(entryPrice, trade.side, trade.targetPoints);
}

module.exports = {
  DEFAULT_TARGET_POINTS,
  normalizeTargetPoints,
  calculateTargetPrice,
  resolveTargetPriceFromTrade
};
