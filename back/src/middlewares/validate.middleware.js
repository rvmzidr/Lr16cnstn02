const AppError = require("../utils/app-error");

function validate(schemas) {
  return (req, _res, next) => {
    const erreurs = [];

    for (const [target, schema] of Object.entries(schemas)) {
      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[target]);

      if (!result.success) {
        erreurs.push(
          ...result.error.issues.map((issue) => ({
            champ: `${target}.${issue.path.join(".") || "racine"}`,
            message: issue.message,
          }))
        );
      } else {
        req[target] = result.data;
      }
    }

    if (erreurs.length > 0) {
      return next(
        new AppError("Les donnees fournies sont invalides.", 400, erreurs)
      );
    }

    return next();
  };
}

module.exports = validate;
