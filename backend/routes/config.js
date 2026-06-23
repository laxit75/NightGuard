const express = require("express");
const Config = require("../models/Config");
const auth = require("../middleware/auth");
const router = express.Router();

// Get entire config (admin)
router.get("/", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Forbidden" });
  try {
    let config = await Config.findOne();
    if (!config) {
      // Seed with mock data
      config = new Config({
        sites: [
          {
            name: "Main Facility",
            zones: [{ name: "Gate 1" }, { name: "Block A" }],
          },
          {
            name: "Warehouse",
            zones: [{ name: "Block B" }, { name: "Main Entrance" }],
          },
        ],
        shifts: [
          { name: "Morning", startTime: "06:00", endTime: "14:00" },
          { name: "Evening", startTime: "14:00", endTime: "22:00" },
          { name: "Night", startTime: "22:00", endTime: "06:00" },
        ],
        alertGroups: [
          { name: "Group A (30 min)", type: "FIXED", fixedInterval: 1800 },
          { name: "Group B (60 min)", type: "FIXED", fixedInterval: 3600 },
          {
            name: "Group C (Random)",
            type: "RANDOM",
            randomMin: 1800,
            randomMax: 7200,
          },
        ],
        escalationLevels: [
          {
            level: 1,
            name: "Site Supervisor",
            phone: "+91 9999911111",
            missedThreshold: 1,
          },
          {
            level: 2,
            name: "Security Officer",
            phone: "+91 9999922222",
            missedThreshold: 2,
          },
          {
            level: 3,
            name: "Area Manager",
            phone: "+91 9999933333",
            missedThreshold: 3,
          },
          {
            level: 4,
            name: "Guard Force HQ",
            phone: "+91 9999944444",
            missedThreshold: 4,
          },
        ],
      });
      await config.save();
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update full config (admin)
router.put("/", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Forbidden" });

  console.log("CONFIG UPDATE");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const config = await Config.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
    });

    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
router.get("/sites", auth, async (req, res) => {
  try {
    const config = await Config.findOne();

    res.json(config?.sites || []);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

module.exports = router;
