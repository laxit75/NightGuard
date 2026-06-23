const mongoose = require("mongoose");

const escalationSchema = new mongoose.Schema(
  {
    level: Number,
    designation: String,
    phone: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Escalation", escalationSchema);
