const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeTargetPoints,
  calculateTargetPrice,
  resolveTargetPriceFromTrade
} = require('../targetLogic');

test('uses default target points when input is missing or invalid', () => {
  assert.equal(normalizeTargetPoints(undefined), 10);
  assert.equal(normalizeTargetPoints(null), 10);
  assert.equal(normalizeTargetPoints(0), 10);
  assert.equal(normalizeTargetPoints(-3), 10);
  assert.equal(normalizeTargetPoints('abc'), 10);
});

test('calculates buy and sell target prices from entry price and points', () => {
  assert.equal(calculateTargetPrice(100, 'BUY', 12), 112);
  assert.equal(calculateTargetPrice(100, 'SELL', 12), 88);
});

test('reuses stored target price when available, else derives from stored points', () => {
  assert.equal(
    resolveTargetPriceFromTrade({ price: 100, targetPrice: 115, side: 'BUY' }),
    115
  );

  assert.equal(
    resolveTargetPriceFromTrade({ price: 100, targetPoints: 7, side: 'BUY' }),
    107
  );

  assert.equal(
    resolveTargetPriceFromTrade({ price: 100, side: 'SELL' }),
    90
  );
});
