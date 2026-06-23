const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const Admin = require("./models/Admin");

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const existing = await Admin.findOne({
      username: process.env.ADMIN_ID,
    });

    if (existing) {
      console.log("Admin already exists");
      process.exit();
    }

    const passwordHash = await bcrypt.hash(
      process.env.ADMIN_PASSWORD,
      10
    );

    await Admin.create({
      username: process.env.ADMIN_ID,
      passwordHash,
    });

    console.log("Admin created successfully");
    process.exit();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });