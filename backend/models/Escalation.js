const mongoose = require("mongoose");

const escalationSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },
    name: { type: String, required: true }, // e.g. "Supervisor"
    designation: { type: String, default: "" }, // e.g. "Site Manager"
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    missedThreshold: { type: Number, default: 3 }, // trigger after N missed alerts
    notifyBySMS: { type: Boolean, default: true },
    notifyByCall: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Escalation", escalationSchema);
