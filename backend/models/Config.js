const mongoose = require("mongoose");

const siteSchema = new mongoose.Schema({
  name: String,
  zones: [{ name: String }],
});

const configSchema = new mongoose.Schema(
  {
    sites: [siteSchema],
    shifts: [{ name: String, startTime: String, endTime: String }],
    alertGroups: [
      {
        name: String,
        type: { type: String, enum: ["FIXED", "RANDOM"] },
        fixedInterval: Number,
        randomMin: Number,
        randomMax: Number,
      },
    ],
    escalationLevels: [
      {
        level: Number,
        name: String,
        phone: String,
        missedThreshold: Number,
      },
    ],
  },
  { collection: "config" },
);

module.exports = mongoose.model("Config", configSchema);
