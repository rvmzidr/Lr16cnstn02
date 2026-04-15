const adminService = require("../services/admin.service");
const { successResponse } = require("../utils/api-response");
const asyncHandler = require("../utils/async-handler");

const getDashboardKPIs = asyncHandler(async (req, res) => {
  const donnees = await adminService.recupererKPITechnique(req.auth.userId);
  successResponse(res, "KPI du dashboard administrateur recuperes.", donnees);
});

const listInscriptions = asyncHandler(async (req, res) => {
  const donnees = await adminService.listerInscriptions(req.query);
  successResponse(res, "Demandes d'inscription recuperees.", donnees);
});

const getInscriptionDetail = asyncHandler(async (req, res) => {
  const donnees = await adminService.recupererInscriptionDetail(req.params.id);
  successResponse(res, "Detail de l'inscription recupere.", donnees);
});

const validerInscription = asyncHandler(async (req, res) => {
  const donnees = await adminService.validerInscription(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Inscription validee avec succes.", donnees);
});

const refuserInscription = asyncHandler(async (req, res) => {
  const donnees = await adminService.refuserInscription(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Inscription refusee avec succes.", donnees);
});

const listComptes = asyncHandler(async (req, res) => {
  const donnees = await adminService.listerComptes(req.query);
  successResponse(res, "Comptes recuperes.", donnees);
});

const activerCompte = asyncHandler(async (req, res) => {
  const donnees = await adminService.activerCompte(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Compte active avec succes.", donnees);
});

const desactiverCompte = asyncHandler(async (req, res) => {
  const donnees = await adminService.desactiverCompte(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Compte desactive avec succes.", donnees);
});

const changerRole = asyncHandler(async (req, res) => {
  const donnees = await adminService.changerRoleCompte(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Role du compte mis a jour.", donnees);
});

const listNotifications = asyncHandler(async (req, res) => {
  const donnees = await adminService.listerNotificationsAdmin(
    req.auth.userId,
    req.query,
  );
  successResponse(res, "Notifications admin recuperees.", donnees);
});

const getUnreadNotificationsCount = asyncHandler(async (req, res) => {
  const donnees = await adminService.recupererCompteurNotificationsAdmin(
    req.auth.userId,
  );
  successResponse(res, "Compteur des notifications admin recupere.", donnees);
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
  const donnees = await adminService.marquerNotificationAdminLue(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Notification marquee comme lue.", donnees);
});

const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const donnees = await adminService.marquerToutesNotificationsAdminLues(
    req.auth.userId,
  );
  successResponse(res, "Notifications admin marquees comme lues.", donnees);
});

const getAdminProfile = asyncHandler(async (req, res) => {
  const donnees = await adminService.recupererProfilAdmin(req.auth.userId);
  successResponse(res, "Profil administrateur recupere.", donnees);
});

const updateAdminProfile = asyncHandler(async (req, res) => {
  const donnees = await adminService.mettreAJourProfilAdmin(
    req.auth.userId,
    req.body,
  );
  successResponse(res, "Profil administrateur mis a jour.", donnees);
});

const updateAdminPassword = asyncHandler(async (req, res) => {
  const donnees = await adminService.modifierMotDePasseAdmin(
    req.auth.userId,
    req.body,
  );
  successResponse(res, "Mot de passe administrateur mis a jour.", donnees);
});

const getAdminPreferences = asyncHandler(async (req, res) => {
  const donnees = await adminService.recupererPreferencesNotificationAdmin(
    req.auth.userId,
  );
  successResponse(res, "Preferences administrateur recuperees.", donnees);
});

const updateAdminPreferences = asyncHandler(async (req, res) => {
  const donnees = await adminService.mettreAJourPreferencesNotificationAdmin(
    req.auth.userId,
    req.body,
  );
  successResponse(res, "Preferences administrateur mises a jour.", donnees);
});

const downloadDoctorantAttestation = asyncHandler(async (req, res) => {
  const file = await adminService.telechargerAttestationDoctorantAdmin(
    req.params.id,
  );
  res.type(file.mimeType);
  res.download(file.path, file.downloadName);
});

module.exports = {
  getDashboardKPIs,
  listInscriptions,
  getInscriptionDetail,
  validerInscription,
  refuserInscription,
  listComptes,
  activerCompte,
  desactiverCompte,
  changerRole,
  listNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
  getAdminPreferences,
  updateAdminPreferences,
  downloadDoctorantAttestation,
};
