const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

function passwordFingerprint(motDePasseHash) {
  return crypto
    .createHash("sha256")
    .update(String(motDePasseHash))
    .digest("hex")
    .slice(0, 16);
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email_institutionnel,
      nom: user.nom,
      prenom: user.prenom,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
}

function signResetToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      purpose: "reset-password",
      version: passwordFingerprint(user.mot_de_passe_hash),
    },
    env.jwtSecret,
    { expiresIn: "30m" },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function verifyResetToken(token) {
  const payload = jwt.verify(token, env.jwtSecret);

  if (payload.purpose !== "reset-password") {
    throw new Error("Token de reinitialisation invalide.");
  }

  return payload;
}

module.exports = {
  signAccessToken,
  signResetToken,
  verifyAccessToken,
  verifyResetToken,
  passwordFingerprint,
};
