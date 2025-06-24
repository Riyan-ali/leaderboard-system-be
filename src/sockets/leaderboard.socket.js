const { submitRun } = require("../services/leaderboard.service");

function registerLeaderboardSocket(io) {
  io.on("connection", (socket) => {
    socket.on("submitRun", async (data) => {
      await submitRun(data, io); // submitRun now emits the event
    });
  });
}

module.exports = registerLeaderboardSocket;
