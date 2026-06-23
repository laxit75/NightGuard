const express = require("express");
const router = express.Router();

console.log("ESCALATION ROUTE LOADED");

const Escalation = require("../models/Escalation");

router.get("/", async (req, res) => {
  const data = await Escalation.find().sort("level");
  res.json(data);
});
router.get("/", async (req, res) => {
  console.log("ESCALATION GET HIT");

  const data = await Escalation.find().sort("level");
  res.json(data);
});

router.post("/", async (req, res) => {
  const item = await Escalation.create(req.body);
  res.json(item);
});

router.put("/:id", async (req, res) => {
  const item = await Escalation.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  res.json(item);
});

router.delete("/:id", async (req, res) => {
  await Escalation.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
