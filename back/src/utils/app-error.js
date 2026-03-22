class AppError extends Error {
  constructor(message, statusCode = 500, erreurs = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.erreurs = erreurs;
    this.isOperational = true;
  }
}

module.exports = AppError;
