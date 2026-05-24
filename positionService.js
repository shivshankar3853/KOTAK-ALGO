const axios = require("axios");
const logger = require("./logger");

const {
  getSession,
  refreshTokenIfNeeded,
  isTokenExpired
} = require("./sessionManager"); // 👈 SINGLE SOURCE ONLY

let cachedPositions = [];
let lastFetchTime = 0;

const CACHE_TTL = 5000; // 5 sec

// ================= FETCH POSITIONS =================
async function fetchPositions(force = false) {
  try {

    const session = getSession();

  
    const sessionToken = session?.token || session?.session_token;
    const sid = session?.sid;
    const baseUrl = session?.baseUrl;

    if (!sessionToken || !sid || !baseUrl) {
      logger.warn("⚠️ Missing session for positions");
      return cachedPositions;
    }

    // cache throttle
    const now = Date.now();
    if (!force && now - lastFetchTime < CACHE_TTL) {
      return cachedPositions;
    }

    // token refresh
    if (isTokenExpired?.()) {
      logger.warn("🔁 Token expired → refreshing session...");
      await refreshTokenIfNeeded?.();
    }

    const url = `${baseUrl}/quick/user/positions`;

    logger.info(`📡 Fetching positions: ${url}`);

    const response = await axios.get(url, {
      headers: {
        Auth: sessionToken,
        sid,
        "neo-fin-key": "neotradeapi"
      },
      timeout: 10000
    });

    const positions =
      response.data?.data ||
      response.data?.Success ||
      response.data ||
      [];

    cachedPositions = Array.isArray(positions)
      ? positions
      : [];

    lastFetchTime = now;

    logger.info(`📊 Positions Loaded: ${cachedPositions.length}`);

    return cachedPositions;

  } catch (err) {

    logger.error(`❌ Position fetch error: ${err.message}`);

    if (err.response) {

      logger.error(
        `📡 API Response: ${JSON.stringify(err.response.data)}`
      );

      // 🔥 AUTO RECOVER ON INVALID SESSION
      if (err.response.status === 401) {
        logger.warn("🔁 401 detected → forcing session refresh");

        try {
          await refreshTokenIfNeeded?.();
        } catch (e) {
          logger.error("❌ Token refresh failed");
        }
      }
    }

    return cachedPositions;
  }
}

// ================= PUBLIC =================
async function getPositions() {
  return fetchPositions();
}

module.exports = {
  getPositions,
  fetchPositions
};