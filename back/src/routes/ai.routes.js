const express = require("express");
const aiController = require("../controllers/ai.controller");
const requireAuth = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/chat", aiController.chat);
router.post("/resume", requireAuth, aiController.summarizeArticle);
router.post("/search", requireAuth, aiController.semanticSearch);

module.exports = router;
