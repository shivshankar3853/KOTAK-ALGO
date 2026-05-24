const { createClient } = require("redis");

let redis = null;

// ================= CREATE CLIENT =================
function createRedisClient() {

  if (redis) {
    return redis;
  }

  redis = createClient({
    username:
      process.env.REDIS_USERNAME,

    password:
      process.env.REDIS_PASSWORD,

    socket: {
      host:
        process.env.REDIS_HOST,

      port: Number(
        process.env.REDIS_PORT
      ),

      reconnectStrategy: (retries) => {

        console.log(
          `🔄 Redis reconnect attempt: ${retries}`
        );

        return Math.min(
          retries * 1000,
          10000
        );
      }
    }
  });

  // ================= EVENTS =================
  redis.on("connect", () => {

    console.log(
      "🟡 Redis connecting..."
    );
  });

  redis.on("ready", () => {

    console.log(
      "✅ Redis Connected"
    );
  });

  redis.on("reconnecting", () => {

    console.log(
      "🔄 Redis reconnecting..."
    );
  });

  redis.on("error", (err) => {

    console.log(
      "❌ Redis Error:",
      err.message
    );
  });

  redis.on("end", () => {

    console.log(
      "🔌 Redis connection closed"
    );
  });

  return redis;
}

// ================= CONNECT =================
async function connectRedis() {

  try {

    const client =
      createRedisClient();

    if (!client.isOpen) {

      await client.connect();
    }

    return client;

  } catch (err) {

    console.log(
      "Redis connect error:",
      err.message
    );

    return null;
  }
}

// ================= GET CLIENT =================
function getRedisClient() {

  if (!redis) {

    redis = createRedisClient();
  }

  return redis;
}

// ================= DISCONNECT =================
async function disconnectRedis() {

  try {

    if (redis && redis.isOpen) {

      await redis.quit();

      console.log(
        "🛑 Redis disconnected"
      );
    }

  } catch (err) {

    console.log(
      "Redis disconnect error:",
      err.message
    );
  }
}

module.exports = {
  redis: createRedisClient(),
  connectRedis,
  getRedisClient,
  disconnectRedis
};