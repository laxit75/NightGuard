const express = require("express");
const Zone = require("../models/Zone");
const auth = require("../middleware/auth");

const router = express.Router();

// GET all zones
router.get("/", async (req, res) => {
  try {
    const zones = await Zone.find();
    res.json(zones);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create zone
router.post("/", auth, async (req, res) => {
  try {
    const zone = await Zone.create({
      name: req.body.name,
      siteId: req.body.siteId,
    });
    res.status(201).json(zone);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update zone
router.put("/:id", auth, async (req, res) => {
  try {
    const zone = await Zone.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name, siteId: req.body.siteId },
      { new: true },
    );
    if (!zone) return res.status(404).json({ message: "Zone not found" });
    res.json(zone);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE zone
router.delete("/:id", auth, async (req, res) => {
  try {
    const zone = await Zone.findByIdAndDelete(req.params.id);
    if (!zone) return res.status(404).json({ message: "Zone not found" });
    res.json({ message: "Zone deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
