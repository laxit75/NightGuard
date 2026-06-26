const Config = require("../models/Config");
const express = require("express");
const bcrypt = require("bcryptjs");
const Guard = require("../models/Guard");
const Alert = require("../models/Alert");
const auth = require("../middleware/auth");

const router = express.Router();

// Get all guards (admin)
router.put("/:id/unblock", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Forbidden" });
  try {
    const guard = await Guard.findOneAndUpdate(
      { id: req.params.id },
      { isBlocked: false },
      { new: true },
    );

    if (!guard) {
      return res.status(404).json({
        message: "Guard not found",
      });
    }

    res.json(guard);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});
router.put("/:id/block", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Forbidden" });
  try {
    const guard = await Guard.findOneAndUpdate(
      { id: req.params.id },
      { isBlocked: true },
      { new: true },
    );

    if (!guard) {
      return res.status(404).json({
        message: "Guard not found",
      });
    }

    res.json(guard);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});
router.get("/", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Forbidden" });
  try {
    const guards = await Guard.find();
    res.json(guards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add guard (admin)
router.post("/", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Forbidden" });
  try {
    const {
      id,
      name,
      location,
      mobile,
      siteId,
      zoneId,
      shiftId,
      alertGroupId,
      password,
    } = req.body;
    const config = await Config.findOne();

    const selectedGroup = config?.alertGroups?.find(
      (g) => g._id?.toString() === alertGroupId,
    );
    console.log("Incoming Group ID:", alertGroupId);

    console.log(
      "Config Groups:",
      config?.alertGroups?.map((g) => ({
        id: g._id?.toString(),
        name: g.name,
        type: g.type,
      })),
    );

    console.log("Selected Group:", selectedGroup);
    const existing = await Guard.findOne({ id });
    if (existing)
      return res.status(400).json({ message: "Guard ID already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || "1234", salt);
    let alertInterval = 1800;
    let alertGroupType = "FIXED";

    if (selectedGroup) {
      alertGroupType = selectedGroup.type;

      if (selectedGroup.type === "FIXED") {
        alertInterval = selectedGroup.fixedInterval;
      }
    }
    const guard = new Guard({
      id,
      name,
      location,
      mobile,
      siteId,
      zoneId,
      shiftId,
      alertGroupId,

      alertInterval,
      alertGroupType,

      password: hashedPassword,
    });
    console.log({
      guard: id,
      alertGroupType,
      alertInterval,
    });
    await guard.save();
    res.status(201).json(guard);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update guard
router.put("/:id", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Forbidden" });
  try {
    const guard = await Guard.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { returnDocument: "after" },
    );
    res.json(guard);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete guard
router.delete("/:id", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Forbidden" });
  try {
    await Guard.findOneAndDelete({ id: req.params.id });
    res.json({ message: "Guard deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start shift
router.post("/:id/shift/start", auth, async (req, res) => {
  try {
    const guard = await Guard.findOne({ id: req.params.id });
    if (!guard) return res.status(404).json({ message: "Guard not found" });
    const now = new Date();
    guard.shiftStarted = true;
    guard.isActive = true;
    guard.shiftStartTime = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    guard.shiftEndTime = new Date(
      now.getTime() + 8 * 60 * 60 * 1000,
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    await guard.save();
    res.json(guard);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// End shift
router.post("/:id/shift/end", auth, async (req, res) => {
  try {
    const guard = await Guard.findOne({ id: req.params.id });
    if (!guard) return res.status(404).json({ message: "Guard not found" });
    guard.shiftStarted = false;
    guard.isActive = false;
    guard.shiftStartTime = "";
    guard.shiftEndTime = "";
    guard.shiftStarted = false;
    guard.isActive = false;
    guard.shiftStartTime = "";
    guard.shiftEndTime = "";

    guard.totalAlerts = 0;
    guard.respondedAlerts = 0;
    guard.missedAlerts = 0;
    await guard.save();
    res.json(guard);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Record alert (from guard)
router.post("/:id/alerts", auth, async (req, res) => {
  try {
    const { status, alertType, responseTime, remarks, photoUri } = req.body;
    const guard = await Guard.findOne({ id: req.params.id });
    if (!guard) return res.status(404).json({ message: "Guard not found" });

    const alert = new Alert({
      guardId: guard.id,
      guardName: guard.name,
      status,
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      alertType,
      responseTime,
      remarks,
      photoUri,
    });
    await alert.save();

    guard.totalAlerts += 1;
    if (status === "Responded") guard.respondedAlerts += 1;
    else if (status === "Missed") guard.missedAlerts += 1;
    await guard.save();

    res.status(201).json({ alert, guard });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
