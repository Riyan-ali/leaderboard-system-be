const Run = require("../models/run.model");
const Daily = require("../models/dailyLeaderboard.model");
const getRedisClient = require("../utils/redis.client");

const TOP_N = 50;

async function submitRun({ playerId, timeMs, mode, trackId, region }, io) {
  await Run.create({ playerId, timeMs, mode, trackId, region });
  const redisClient = await getRedisClient();
  const key = `leaderboard:${region}:${mode}`;
  await redisClient.zAdd(key, [{ score: timeMs, value: playerId }]);
  await redisClient.zRemRangeByRank(key, TOP_N, -1);
  const entries = await redisClient.zRangeWithScores(key, 0, TOP_N - 1);
  const updated = entries.map((e, i) => ({
    playerId: e.value,
    timeMs: e.score,
    rank: i + 1,
  }));
  if (io) {
    io.emit("leaderboardUpdate", { region, mode, topRuns: updated });
  }
  return updated;
}

async function updateRunService(runId, newTimeMs, io) {
  const run = await Run.findById(runId);
  if (!run) throw new Error("Run not found");
  run.timeMs = newTimeMs;
  await run.save();
  const redisClient = await getRedisClient();
  const key = `leaderboard:${run.region}:${run.mode}`;
  await redisClient.zRem(key, run.playerId);
  await redisClient.zAdd(key, [{ score: newTimeMs, value: run.playerId }]);
  await redisClient.zRemRangeByRank(key, TOP_N, -1);
  const entries = await redisClient.zRangeWithScores(key, 0, TOP_N - 1);
  const updated = entries.map((e, i) => ({
    playerId: e.value,
    timeMs: e.score,
    rank: i + 1,
  }));
  if (io) {
    io.emit("leaderboardUpdate", {
      region: run.region,
      mode: run.mode,
      topRuns: updated,
    });
  }
  return updated;
}

async function fetchTop(region, mode, limit) {
  const redisClient = await getRedisClient();
  const key = `leaderboard:${region}:${mode}`;
  if (await redisClient.exists(key)) {
    const entries = await redisClient.zRangeWithScores(key, 0, limit - 1);
    return entries.map((e, i) => ({
      playerId: e.value,
      timeMs: e.score,
      rank: i + 1,
    }));
  }
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const runs = await Run.find({
    region,
    mode,
    createdAt: { $gte: startOfDay },
  })
    .sort({ timeMs: 1 })
    .limit(limit)
    .lean();
  return runs.map((r, i) => ({
    playerId: r.playerId,
    timeMs: r.timeMs,
    rank: i + 1,
  }));
}

async function snapshotDaily() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const regions = [
    "North America",
    "South America",
    "Europe",
    "Africa",
    "Asia",
    "Middle East",
    "Oceania",
    "Antarctica",
  ];
  const modes = ["Solo", "Team Relay"];
  for (const region of regions) {
    for (const mode of modes) {
      const topRuns = await fetchTop(region, mode, TOP_N);
      await Daily.create({ date: today, region, mode, topRuns });
      const redisClient = await getRedisClient();
      await redisClient.del(`leaderboard:${region}:${mode}`);
    }
  }
}

module.exports = { submitRun, updateRunService, fetchTop, snapshotDaily };
