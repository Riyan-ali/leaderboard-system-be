const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const registerLeaderboardSocket = require("./src/sockets/leaderboard.socket");

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Connect Mongo
const mongoose = require("mongoose");
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);

// Start server
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});
app.set("io", io); // Set io in app for use in controllers
registerLeaderboardSocket(io);

require("./src/jobs/dailySnapshot.job");

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
