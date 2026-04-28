const express = require("express");
const requireAuth = require("../middlewares/auth.middleware");
const accessControlController = require("../controllers/access-control.controller");

const router = express.Router();

router.use(requireAuth);
router.get("/context/me", accessControlController.getMyAccessContext);

module.exports = router;
