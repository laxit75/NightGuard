const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Guard = require("../models/Guard");
const auth = require("../middleware/auth");
const Admin = require("../models/Admin");

const router = express.Router();

// Login
router.post("/login", async (req, res) => {
  try {
    console.log("LOGIN BODY:", req.body);

    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({
        message: "ID and password are required",
      });
    }

    // Admin login
   // Admin login
const admin = await Admin.findOne({ username: id });

if (admin) {
  const isAdminMatch = await bcrypt.compare(
    password,
    admin.passwordHash
  );

  if (isAdminMatch) {
    const token = jwt.sign(
      {
        id: admin.username,
        role: "admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      token,
      role: "admin",
      user: {
        id: admin.username,
        name: "Administrator",
      },
    });
  }
}
     

    // Guard login
    const guard = await Guard.findOne({ id });
    if (guard?.isBlocked) {
  return res.status(403).json({
    message: "Account is blocked. Contact supervisor.",
  });
}

    if (!guard) {
      console.log("Guard not found:", id);
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, guard.password);

    if (!isMatch) {
      console.log("Password mismatch for:", id);
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: guard.id, role: "guard" },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );

    console.log("Login successful:", id);

    return res.json({
      token,
      role: "guard",
      guard,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({
      message: "Server error",
    });
  }
});

// Current user
router.get("/me", auth, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.json({
        role: "admin",
        user: { id: "admin" },
      });
    }

    const guard = await Guard.findOne({ id: req.user.id });

    if (!guard) {
      return res.status(404).json({
        message: "Guard not found",
      });
    }

    return res.json({
      role: "guard",
      guard,
    });
  } catch (err) {
    console.error("ME ERROR:", err);
    return res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;
