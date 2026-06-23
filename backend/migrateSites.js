require("dotenv").config();
const mongoose = require("mongoose");

const Config = require("./models/Config");
const Site = require("./models/Site");
const Zone = require("./models/Zone");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);

  const config = await Config.findOne();

  if (!config) {
    console.log("No config found");
    process.exit();
  }

  await Site.deleteMany({});
  await Zone.deleteMany({});

  for (const oldSite of config.sites) {
    const site = await Site.create({
      name: oldSite.name,
    });

    for (const oldZone of oldSite.zones || []) {
      await Zone.create({
        name: oldZone.name,
        siteId: site._id,
      });
    }
  }

  console.log("Migration complete");
  process.exit();
}

migrate();