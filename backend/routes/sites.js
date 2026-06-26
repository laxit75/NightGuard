const express = require("express");
const Site = require("../models/Site");
const Zone = require("../models/Zone");
const Guard = require("../models/Guard");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const sites = await Site.find();
    res.json(sites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const site = await Site.create({
      name: req.body.name,
    });

    res.status(201).json(site);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const site = await Site.create({
      name: req.body.name,
    });

    res.status(201).json(site);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE SITE
router.delete("/:id", async (req, res) => {
  try {
    const site = await Site.findByIdAndDelete(req.params.id);

    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    res.json({ message: "Site deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
