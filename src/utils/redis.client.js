const { createClient } = require("redis");

let client;

async function getRedisClient() {
  if (!client) {
    client = createClient({
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_SOCKET_HOST,
        port: process.env.REDIS_SOCKET_PORT,
      },
    });

    client.on("error", (err) => console.log("Redis Client Error", err));

    await client.connect();
  }
  return client;
}

module.exports = getRedisClient;
