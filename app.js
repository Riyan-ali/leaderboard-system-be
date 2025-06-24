const express = require("express");
const mongoose = require("mongoose");
const leaderboardController = require("./src/controllers/leaderboard.controller");
require("dotenv").config();

const app = express();
app.use(express.json());

// REST routes
app.get("/", (req, res) => {
  res.send("Welcome to the Leaderboard System API");
});
app.post("/api/players", leaderboardController.addPlayer);
app.post("/api/players/bulk", leaderboardController.addPlayersBulk);
app.post("/api/runs", leaderboardController.addRun);
app.post("/api/runs/bulk", leaderboardController.addRunsBulk);
app.get("/api/players", leaderboardController.getPlayers);
app.put("/api/players/:id", leaderboardController.updatePlayer);
app.put("/api/runs/:id", leaderboardController.updateRun);
app.delete("/api/players/:id", leaderboardController.deletePlayer);
app.delete("/api/runs/:id", leaderboardController.deleteRun);
app.get("/api/leaderboard", leaderboardController.getLeaderboard);
app.get("/api/daily-leaderboard", leaderboardController.getDailyLeaderboard);

module.exports = app;
