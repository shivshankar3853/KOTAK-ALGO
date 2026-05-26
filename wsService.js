const WebSocket = require("ws");
const logger = require("./logger");

const {
  getSessionToken,
  getWSUrl
} = require("./tokenManager");

const {
  getRedisClient
} = require("./redisClient");

const { sessionBus } = require("./sessionManager");

const redis = getRedisClient();

const tickStore = new Map();

let ws = null;
let reconnectTimeout = null;
let heartbeatInterval = null;
let watchdogInterval = null;

let lastPong = Date.now();
let connected = false;
let reconnecting = false;

// ================= SESSION UPDATE HANDLER =================
let sessionReconnectTimer = null;

sessionBus.on("sessionUpdated", () => {

  if (sessionReconnectTimer) return;

  sessionReconnectTimer = setTimeout(() => {

    sessionReconnectTimer = null;

    logger.info("🔄 Session updated → reconnect WS");

    shutdown();
    connectWS();

  }, 1000);
});

// ================= CLEANUP =================
function cleanupWS() {

  connected = false;

  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (watchdogInterval) clearInterval(watchdogInterval);

  heartbeatInterval = null;
  watchdogInterval = null;

  if (ws) {
    try {
      ws.removeAllListeners();

      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.terminate();
      } else if (ws.readyState !== WebSocket.CLOSED) {
        ws.close();
      }
    } catch (_) {}

    ws = null;
  }
}

// ================= RECONNECT =================
function scheduleReconnect() {

  if (reconnecting) return;

  reconnecting = true;

  reconnectTimeout = setTimeout(() => {

    reconnecting = false;

    logger.info("🔄 Reconnecting WS...");

    connectWS();

  }, 5000);
}

// ================= CONNECT =================
async function connectWS() {

  try {

    const token = getSessionToken();
    const wsUrl = getWSUrl();

    if (!token || !wsUrl) {
      logger.error("⚠️ Missing WS token/url");
      scheduleReconnect();
      return;
    }

    cleanupWS();

    logger.info("🔌 Connecting WS...");

    const currentSocket = new WebSocket(wsUrl);
    ws = currentSocket;

    // ================= OPEN =================
    currentSocket.on("open", () => {

      if (currentSocket !== ws) return;

      connected = true;
      lastPong = Date.now();

      logger.info("📡 WS Connected");

      currentSocket.send(JSON.stringify({
        type: "subscribe",
        token
      }));

      heartbeatInterval = setInterval(() => {

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }

      }, 20000);

      watchdogInterval = setInterval(() => {

        const now = Date.now();

        if (now - lastPong > 60000) {

          logger.error("⚠️ WS heartbeat timeout");

          cleanupWS();
          scheduleReconnect();
        }

      }, 30000);
    });

    // ================= PONG =================
    currentSocket.on("pong", () => {
      if (currentSocket !== ws) return;
      lastPong = Date.now();
    });

    // ================= MESSAGE =================
    currentSocket.on("message", async (data) => {

      if (currentSocket !== ws) return;

      try {

        lastPong = Date.now();

        const parsed = JSON.parse(data);

        const symbol =
          parsed.symbol ||
          parsed.ts ||
          parsed.instrument;

        const ltp = Number(
          parsed.ltp ||
          parsed.lastPrice ||
          0
        );

        if (symbol && ltp) {

          const tick = {
            ltp,
            time: Date.now()
          };

          tickStore.set(symbol, tick);

          if (redis?.isOpen) {
            await redis.set(
              `tick:${symbol}`,
              JSON.stringify(tick),
              { EX: 60 }
            );
          }
        }

        global.io?.emit("tick", parsed);

      } catch (err) {
        logger.error(`WS parse error: ${err.message}`);
      }
    });

    // ================= CLOSE =================
    currentSocket.on("close", () => {

      if (currentSocket !== ws) return;

      connected = false;

      logger.error("🔌 WS Disconnected");

      cleanupWS();
      scheduleReconnect();
    });

    // ================= ERROR =================
    currentSocket.on("error", (err) => {

      if (currentSocket !== ws) return;

      connected = false;

      logger.error(`❌ WS Error: ${err.message}`);
    });

  } catch (err) {

    logger.error(`WS connect error: ${err.message}`);

    scheduleReconnect();
  }
}

// ================= API =================
function getTick(symbol) {
  return tickStore.get(symbol)?.ltp || 0;
}

function isWSConnected() {
  return connected;
}

// ================= SHUTDOWN =================
function shutdown() {

  logger.info("🛑 Closing WS...");

  cleanupWS();

  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  reconnectTimeout = null;
}

// ================= EXPORTS =================
module.exports = {
  connectWS,
  getTick,
  isWSConnected,
  shutdown
};