const adminService = require("./admin.service");

module.exports = {
  listerArticlesModeration: adminService.listerArticlesEnAttente,
  validerArticle: adminService.validerArticle,
  refuserArticle: adminService.refuserArticle,
  publierArticle: adminService.publierArticle,
  listerActualites: adminService.listerActualitesAdmin,
  creerActualite: adminService.creerActualite,
  modifierActualite: adminService.modifierActualite,
  supprimerActualite: adminService.supprimerActualite,
};
