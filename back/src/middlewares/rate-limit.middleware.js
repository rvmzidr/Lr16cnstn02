const rateLimit = require("express-rate-limit");

function buildLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      succes: false,
      message,
      erreurs: null,
    },
  });
}

const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Trop de tentatives d'authentification. Reessayez dans 15 minutes.",
});

const passwordResetLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message:
    "Trop de demandes de reinitialisation. Reessayez dans une heure.",
});

const contactLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Trop de messages envoyes. Reessayez plus tard.",
});

module.exports = {
  authLimiter,
  passwordResetLimiter,
  contactLimiter,
};
