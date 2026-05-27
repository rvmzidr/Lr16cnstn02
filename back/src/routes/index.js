const express = require("express");
const publicRoutes = require("./public.routes");
const authRoutes = require("./auth.routes");
const memberRoutes = require("./member.routes");
const adminRoutes = require("./admin.routes");
const adminAccessControlRoutes = require("./admin-access-control.routes");
const adminSupportRoutes = require("./admin-support.routes");
const accessRoutes = require("./access.routes");
const labHeadRoutes = require("./lab-head.routes");
const messagesRoutes = require("./messages.routes");
const supportRoutes = require("./support.routes");

const router = express.Router();
const aiRoutes = require("./ai.routes");

router.use("/public", publicRoutes);
router.use("/auth", authRoutes);
router.use("/membre", memberRoutes);
router.use("/admin", adminRoutes);
router.use("/admin", adminAccessControlRoutes);
router.use("/admin/support", adminSupportRoutes);
router.use("/access", accessRoutes);
router.use("/chef-labo", labHeadRoutes);
router.use("/messages", messagesRoutes);
router.use("/support", supportRoutes);
router.use("/ai", aiRoutes);

module.exports = router;
