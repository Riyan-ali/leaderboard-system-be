const {
  fetchTop,
  submitRun,
  updateRunService,
} = require("../services/leaderboard.service");
const Player = require("../models/player.model");
const Run = require("../models/run.model");
const { default: mongoose } = require("mongoose");

async function addPlayer(req, res) {
  try {
    const { name, region } = req.body;
    if (!name || !region) {
      return res.status(400).json({ error: "name and region are required" });
    }
    const allowedRegions = Player.schema.path("region").enumValues;
    if (!allowedRegions.includes(region)) {
      return res.status(400).json({ error: "Invalid region" });
    }
    const playerId = new mongoose.Types.ObjectId().toString();
    const player = new Player({ _id: playerId, name, region });
    await player.save();
    res.status(201).json(player);
  } catch (error) {
    res.status(500).json({ error: "Error adding player" });
  }
}

async function addPlayersBulk(req, res) {
  try {
    const playersData = req.body;
    if (!Array.isArray(playersData)) {
      return res
        .status(400)
        .json({ error: "Request body must be an array of players" });
    }
    const allowedRegions = Player.schema.path("region").enumValues;
    const playersToInsert = [];
    for (const playerData of playersData) {
      const { name, region } = playerData;
      if (!name || !region) {
        return res
          .status(400)
          .json({ error: "Each player must have name and region" });
      }
      if (!allowedRegions.includes(region)) {
        return res.status(400).json({ error: `Invalid region: ${region}` });
      }
      const playerId = new mongoose.Types.ObjectId().toString();
      playersToInsert.push({ _id: playerId, name, region });
    }
    const insertedPlayers = await Player.insertMany(playersToInsert);
    res.status(201).json({
      message: "Players added successfully",
      players: insertedPlayers,
    });
  } catch (error) {
    res.status(500).json({ error: "Error adding players" });
  }
}

async function addRun(req, res) {
  try {
    const { playerId, timeMs, mode, trackId, region } = req.body;
    if (!playerId || !timeMs || !mode || !trackId || !region) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ error: "Player not found" });
    const updated = await submitRun(
      { playerId, timeMs, mode, trackId, region },
      req.app.get("io")
    );
    res.status(201).json({ message: "Run added successfully", updated });
  } catch (error) {
    res.status(500).json({ error: "Error adding run" });
  }
}

// New function to generate random run data
function generateRandomRunData(player) {
  const modes = ["Solo", "Team Relay"];
  const trackIds = ["track1", "track2", "track3", "track4"]; // Example track IDs, adjust as needed
  const timeMs = Math.floor(Math.random() * 10000) + 1000; // Random time between 1000ms and 11000ms
  const mode = modes[Math.floor(Math.random() * modes.length)];
  const trackId = trackIds[Math.floor(Math.random() * trackIds.length)];
  return {
    playerId: player._id,
    timeMs,
    mode,
    trackId,
    region: player.region, // Use player's existing region
  };
}

// New function to add bulk runs
async function addRunsBulk(req, res) {
  try {
    // Fetch all players
    const players = await Player.find();
    if (players.length === 0) {
      return res
        .status(404)
        .json({ error: "No players found in the database" });
    }

    // Get Socket.io instance
    const io = req.app.get("io");

    // Generate and submit runs for all players
    const runPromises = players.map(async (player) => {
      const runData = generateRandomRunData(player);
      await submitRun(runData, io);
    });

    // Wait for all runs to be submitted
    await Promise.all(runPromises);

    res.status(201).json({
      message: `Successfully added runs for ${players.length} players`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error adding bulk runs" });
  }
}

async function getPlayers(req, res) {
  try {
    const { region, name, id, limit = 20 } = req.query;
    let query = {};
    if (region) query.region = region;
    if (name) query.name = { $regex: name, $options: "i" };
    if (id) query._id = id;
    const players = await Player.find(query).limit(parseInt(limit, 10));
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: "Error fetching players" });
  }
}

async function updatePlayer(req, res) {
  try {
    const { id } = req.params;
    const { name, region } = req.body;
    if (!name && !region) {
      return res
        .status(400)
        .json({ error: "At least one field to update is required" });
    }
    const player = await Player.findById(id);
    if (!player) return res.status(404).json({ error: "Player not found" });
    if (name) player.name = name;
    if (region && region !== player.region) {
      const oldRegion = player.region;
      player.region = region;
      await Run.updateMany({ playerId: id }, { region });
    }
    await player.save();
    res.json({ message: "Player updated successfully", player });
  } catch (error) {
    res.status(500).json({ error: "Error updating player" });
  }
}

async function updateRun(req, res) {
  try {
    const { id } = req.params;
    const { timeMs } = req.body;
    if (!timeMs) return res.status(400).json({ error: "timeMs is required" });
    const updated = await updateRunService(id, timeMs, req.app.get("io"));
    res.json({ message: "Run updated successfully", updated });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

async function deletePlayer(req, res) {
  try {
    const { id } = req.params;
    const player = await Player.findById(id);
    if (!player) return res.status(404).json({ error: "Player not found" });
    const runs = await Run.find({ playerId: id });
    const redisClient = await require("../utils/redis.client")();
    for (const run of runs) {
      const key = `leaderboard:${run.region}:${run.mode}`;
      await redisClient.zRem(key, id);
    }
    await Run.deleteMany({ playerId: id });
    await Player.deleteOne({ _id: id });
    res.json({ message: "Player and associated runs deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting player" });
  }
}

async function deleteRun(req, res) {
  try {
    const { id } = req.params;
    const run = await Run.findById(id);
    if (!run) return res.status(404).json({ error: "Run not found" });
    const redisClient = await require("../utils/redis.client")();
    const key = `leaderboard:${run.region}:${run.mode}`;
    await redisClient.zRem(key, run.playerId);
    await Run.deleteOne({ _id: id });
    const entries = await redisClient.zRangeWithScores(key, 0, 49);
    const updated = entries.map((e, i) => ({
      playerId: e.value,
      timeMs: e.score,
      rank: i + 1,
    }));
    const io = req.app.get("io");
    if (io) {
      io.emit("leaderboardUpdate", {
        region: run.region,
        mode: run.mode,
        topRuns: updated,
      });
    }
    res.json({ message: "Run deleted successfully", updated });
  } catch (error) {
    res.status(500).json({ error: "Error deleting run" });
  }
}

async function getLeaderboard(req, res) {
  try {
    const { region, mode, limit = 20 } = req.query;
    if (!region || !mode) {
      return res.status(400).json({ error: "region and mode are required" });
    }
    const top = await fetchTop(region, mode, parseInt(limit, 10));
    res.json({ region, mode, topRuns: top });
  } catch (error) {
    res.status(500).json({ error: "Error fetching leaderboard" });
  }
}

async function getDailyLeaderboard(req, res) {
  try {
    const { date, region, mode } = req.query;
    if (!date || !region || !mode) {
      return res
        .status(400)
        .json({ error: "date, region, and mode are required" });
    }
    const daily = await require("../models/dailyLeaderboard.model").findOne({
      date: new Date(date),
      region,
      mode,
    });
    if (!daily)
      return res.status(404).json({ error: "Daily leaderboard not found" });
    res.json(daily);
  } catch (error) {
    res.status(500).json({ error: "Error fetching daily leaderboard" });
  }
}

module.exports = {
  addPlayer,
  addPlayersBulk,
  addRun,
  addRunsBulk,
  getPlayers,
  updatePlayer,
  updateRun,
  deletePlayer,
  deleteRun,
  getLeaderboard,
  getDailyLeaderboard,
};
