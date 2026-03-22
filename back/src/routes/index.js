const express = require("express");
const publicRoutes = require("./public.routes");
const authRoutes = require("./auth.routes");
const memberRoutes = require("./member.routes");
const adminRoutes = require("./admin.routes");
const labHeadRoutes = require("./lab-head.routes");

const router = express.Router();

router.use("/public", publicRoutes);
router.use("/auth", authRoutes);
router.use("/membre", memberRoutes);
router.use("/admin", adminRoutes);
router.use("/chef-labo", labHeadRoutes);

module.exports = router;
