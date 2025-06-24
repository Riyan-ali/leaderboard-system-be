const mongoose = require("mongoose");

const DailyLeaderboardSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  region: {
    type: String,
    enum: [
      "North America",
      "South America",
      "Europe",
      "Africa",
      "Asia",
      "Middle East",
      "Oceania",
      "Antarctica",
    ],
    index: true,
  },
  mode: { type: String, enum: ["Solo", "Team Relay"], index: true },
  topRuns: [{ playerId: String, timeMs: Number, rank: Number }],
});

DailyLeaderboardSchema.index(
  { date: 1 },
  { expireAfterSeconds: 8 * 24 * 3600 }
);

module.exports = mongoose.model("DailyLeaderboard", DailyLeaderboardSchema);
