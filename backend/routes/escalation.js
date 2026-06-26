const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

console.log("ESCALATION ROUTE LOADED");

const Escalation = require("../models/Escalation");

// GET all escalation levels
router.get("/", async (req, res) => {
  try {
    const data = await Escalation.find().sort("level");
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create new escalation level
router.post("/", auth, async (req, res) => {
  try {
    const item = await Escalation.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update escalation level
router.put("/:id", auth, async (req, res) => {
  try {
    const item = await Escalation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!item) return res.status(404).json({ message: "Level not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE escalation level
router.delete("/:id", auth, async (req, res) => {
  try {
    await Escalation.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
