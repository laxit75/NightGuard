require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Guard = require("./models/Guard");
const Config = require("./models/Config");

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    const salt = await bcrypt.genSalt(10);
    const guards = [
      {
        id: "G001",
        name: "Ravi Kumar",
        location: "Gate 1",
        mobile: "9876543210",
        siteId: "site1",
        zoneId: "zone1",
        shiftId: "morning",
        alertGroupId: "g1",
        password: await bcrypt.hash("1234", salt),
        alertInterval: 30,
      },
      {
        id: "G002",
        name: "Suresh Yadav",
        location: "Block A",
        mobile: "9876543211",
        siteId: "site1",
        zoneId: "zone2",
        shiftId: "evening",
        alertGroupId: "g2",
        password: await bcrypt.hash("1234", salt),
        alertInterval: 60,
      },
      {
        id: "G003",
        name: "Amit Singh",
        location: "Gate 2",
        mobile: "9876543212",
        siteId: "site1",
        zoneId: "zone1",
        shiftId: "night",
        alertGroupId: "g3",
        password: await bcrypt.hash("1234", salt),
      },
      {
        id: "G004",
        name: "Priya Patel",
        location: "Block B",
        mobile: "9876543213",
        siteId: "site2",
        zoneId: "zone3",
        shiftId: "morning",
        alertGroupId: "g1",
        password: await bcrypt.hash("1234", salt),
        alertInterval: 30,
      },
    ];
    await Guard.insertMany(guards);
    console.log("Guards seeded");

    let config = await Config.findOne();
    if (!config) {
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
      console.log("Config seeded");
    }

    process.exit();
  })
  .catch((err) => console.error(err));
