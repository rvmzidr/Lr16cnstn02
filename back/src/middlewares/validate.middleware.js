const AppError = require("../utils/app-error");

function setValidatedTarget(req, target, data) {
  try {
    Object.defineProperty(req, target, {
      value: data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } catch (_error) {
    req[target] = data;
  }
}

function formatIssueMessage(issue) {
  if (issue.code === "custom" && issue.message) {
    return issue.message;
  }

  if (issue.code === "too_big") {
    if (issue.origin === "string") {
      return `Le texte doit contenir au maximum ${issue.maximum} caractères.`;
    }

    if (issue.origin === "array") {
      return `La liste ne peut pas contenir plus de ${issue.maximum} élément(s).`;
    }

    return `La valeur doit être inférieure ou égale à ${issue.maximum}.`;
  }

  if (issue.code === "too_small") {
    if (issue.origin === "string") {
      return `Le texte doit contenir au minimum ${issue.minimum} caractères.`;
    }

    if (issue.origin === "array") {
      return `La liste doit contenir au minimum ${issue.minimum} élément(s).`;
    }

    return `La valeur doit être supérieure ou égale à ${issue.minimum}.`;
  }

  if (issue.code === "invalid_type") {
    return "Le type de donnée fourni est invalide.";
  }

  if (issue.code === "invalid_value") {
    return "La valeur fournie ne correspond pas aux options autorisées.";
  }

  if (issue.code === "invalid_format") {
    return issue.message || "Le format fourni est invalide.";
  }

  return issue.message || "La valeur fournie est invalide.";
}

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
            message: formatIssueMessage(issue),
          })),
        );
      } else {
        setValidatedTarget(req, target, result.data);
      }
    }

    if (erreurs.length > 0) {
      return next(
        new AppError("Les données fournies sont invalides.", 400, erreurs),
      );
    }

    return next();
  };
}

module.exports = validate;
