require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const guardRoutes = require("./routes/guards");
const alertRoutes = require("./routes/alerts");
const configRoutes = require("./routes/config");
const siteRoutes = require("./routes/sites");
const zoneRoutes = require("./routes/zones");
const escalationRoutes = require("./routes/escalation");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/guards", guardRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/config", configRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/escalation", escalationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
