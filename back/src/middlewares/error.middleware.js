const { Prisma } = require("@prisma/client");
const multer = require("multer");
const AppError = require("../utils/app-error");

function notFoundMiddleware(req, _res, next) {
  next(new AppError(`Route introuvable: ${req.originalUrl}`, 404));
}

function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Une erreur interne est survenue.";
  let erreurs = error.erreurs || null;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      statusCode = 409;
      message = "Une valeur unique existe deja.";
      erreurs = error.meta;
    }

    if (error.code === "P2025") {
      statusCode = 404;
      message = "La ressource demandee est introuvable.";
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "La requete envoyee est invalide.";
  }

  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    Object.prototype.hasOwnProperty.call(error, "body")
  ) {
    statusCode = 400;
    message = "Le corps JSON est invalide.";
  }

  if (error instanceof multer.MulterError) {
    statusCode = 400;
    message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Le fichier d'attestation depasse la taille maximale autorisee (5 Mo)."
        : "Le televersement du fichier a echoue.";
    erreurs = [
      {
        champ: "body.attestationDoctorant",
        message,
      },
    ];
  }

  if (!error.isOperational && statusCode === 500) {
    console.error(error);
  }

  return res.status(statusCode).json({
    succes: false,
    message,
    erreurs,
  });
}

module.exports = {
  notFoundMiddleware,
  errorHandler,
};
