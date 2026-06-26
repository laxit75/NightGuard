const mongoose = require("mongoose");

const guardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // "G001"
    name: String,
    location: String,
    mobile: String,
    siteId: String,
    zoneId: String,
    shiftId: String,
    alertGroupId: String,
    totalAlerts: { type: Number, default: 0 },
    respondedAlerts: { type: Number, default: 0 },
    missedAlerts: { type: Number, default: 0 },
    shiftStarted: { type: Boolean, default: false },
    shiftStartTime: String,
    shiftEndTime: String,
    isActive: { type: Boolean, default: false },
    password: { type: String, required: true },
    activityPhotos: [String],
    alertInterval: Number,

    alertGroupType: {
      type: String,
      default: "FIXED",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: "guard",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Guard", guardSchema);
