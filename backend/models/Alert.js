const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  guardId: String,
  guardName: String,
  status: { type: String, enum: ["Responded", "Missed", "Escalated"] },
  time: String,
  date: String,
  alertType: String,
  responseTime: Number,
  timestamp: { type: Date, default: Date.now },
  remarks: String,
  photoUri: String,
});

module.exports = mongoose.model("Alert", alertSchema);
