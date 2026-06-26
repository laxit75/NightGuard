const express = require("express");
const Site = require("../models/Site");
const Zone = require("../models/Zone");
const Guard = require("../models/Guard");
const auth = require("../middleware/auth");

const router = express.Router();

// GET all sites
router.get("/", async (req, res) => {
  try {
    const sites = await Site.find();
    res.json(sites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create site
router.post("/", auth, async (req, res) => {
  try {
    const site = await Site.create({ name: req.body.name });
    res.status(201).json(site);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update site name
router.put("/:id", auth, async (req, res) => {
  try {
    const site = await Site.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true },
    );
    if (!site) return res.status(404).json({ message: "Site not found" });
    res.json(site);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE site (cascade deletes all its zones)
router.delete("/:id", auth, async (req, res) => {
  try {
    const site = await Site.findByIdAndDelete(req.params.id);
    if (!site) return res.status(404).json({ message: "Site not found" });

    // Cascade: delete all zones belonging to this site
    await Zone.deleteMany({ siteId: req.params.id });

    res.json({ message: "Site and its zones deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
