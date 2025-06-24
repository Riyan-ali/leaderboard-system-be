const mongoose = require("mongoose");

const RunSchema = new mongoose.Schema({
  playerId: { type: String, ref: "Player", required: true, index: true },
  timeMs: { type: Number, required: true },
  mode: { type: String, enum: ["Solo", "Team Relay"], index: true },
  trackId: { type: String, required: true },
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
  createdAt: { type: Date, default: Date.now, index: true },
});

RunSchema.index({ region: 1, mode: 1, createdAt: 1, timeMs: 1 });

module.exports = mongoose.model("Run", RunSchema);
