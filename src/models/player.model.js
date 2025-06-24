const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
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
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Player", PlayerSchema);
