const cron = require("node-cron");
const { snapshotDaily } = require("../services/leaderboard.service");

// runs every day at 00:00 UTC
cron.schedule("0 0 * * *", async () => {
  try {
    await snapshotDaily();
    console.log("Daily leaderboard snapshot complete");
  } catch (err) {
    console.error("Error in daily snapshot job", err);
  }
});
