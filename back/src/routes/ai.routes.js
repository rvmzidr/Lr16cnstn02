const express = require("express");
const aiController = require("../controllers/ai.controller");
// Assuming we have some generic auth middleware, but for demo we can leave it open or use verifyToken.
// const { verifyToken } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/chat", aiController.chat);
router.post("/resume", aiController.summarizeArticle);
router.post("/search", aiController.semanticSearch);

module.exports = router;
