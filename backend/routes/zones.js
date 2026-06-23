const express = require("express");
const Zone = require("../models/Zone");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const zones = await Zone.find();
    res.json(zones);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
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

module.exports = router;