const express = require("express");
const publicController = require("../controllers/public.controller");
const validate = require("../middlewares/validate.middleware");
const {
  actualiteListQuerySchema,
  articleListQuerySchema,
  bigIntIdParamSchema,
  contactMessageBodySchema,
} = require("../validators/public.validators");

const router = express.Router();

router.get("/accueil", publicController.getAccueil);
router.get("/a-propos", publicController.getAPropos);
router.get("/contact", publicController.getContact);
router.post(
  "/contact",
  validate({ body: contactMessageBodySchema }),
  publicController.postContact
);
router.get(
  "/articles",
  validate({ query: articleListQuerySchema }),
  publicController.listArticles
);
router.get(
  "/articles/:id",
  validate({ params: bigIntIdParamSchema }),
  publicController.getArticle
);
router.get(
  "/actualites",
  validate({ query: actualiteListQuerySchema }),
  publicController.listActualites
);
router.get(
  "/actualites/:id",
  validate({ params: bigIntIdParamSchema }),
  publicController.getActualite
);

module.exports = router;
