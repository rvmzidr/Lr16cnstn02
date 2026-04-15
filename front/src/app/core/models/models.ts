export type Role = 'MEMBRE' | 'ADMINISTRATEUR' | 'CHEF_LABO';
export type AccountStatus = 'EN_ATTENTE' | 'ACTIF' | 'REJETE' | 'DESACTIVE';
export type Genre = 'HOMME' | 'FEMME' | 'AUTRE';
export type ArticleStatus =
  | 'BROUILLON'
  | 'SOUMIS'
  | 'VALIDE'
  | 'REJETE'
  | 'PUBLIE';
export type NewsStatus = 'BROUILLON' | 'PUBLIEE' | 'ARCHIVEE';
export type ProjectStatus = 'EN_COURS' | 'TERMINE' | 'ARCHIVE';
export type PurchaseRequestStatus =
  | 'EN_ATTENTE'
  | 'ACCEPTEE'
  | 'REJETEE'
  | 'EN_COURS_TRAITEMENT'
  | 'COMMANDEE'
  | 'LIVREE';

export interface AdminDashboardKPIs {
  inscriptionsEnAttente: number;
  comptesActifs: number;
  comptesDesactives: number;
  totalUtilisateurs: number;
  alertesSysteme: number;
  kpis: {
    pendingRegistrations: number;
    activeAccounts: number;
    roleChangesLast30Days: number;
    unreadNotifications: number;
    unreadMessages: number;
  };
  charts: {
    accountsByStatus: Array<{
      status: AccountStatus;
      label: string;
      value: number;
    }>;
    rolesDistribution: Array<{
      role: Role | 'SANS_ROLE';
      label: string;
      value: number;
    }>;
    newAccountsPerMonth: Array<{
      label: string;
      value: number;
    }>;
  };
  recentActivity: Array<{
    id: string;
    type: 'INSCRIPTION' | 'COMPTE' | 'ROLE' | 'MESSAGE';
    label: string;
    timestamp: string;
    link: string | null;
  }>;
  dernieresInscriptions: {
    elements: UtilisateurComplet[];
  };
}

export interface LabHeadDashboardKPIs {
  articlesEnAttente: number;
  articlesPublies: number;
  actualitesPubliees: number;
  projetsActifs: number;
  demandesAchatEnAttente: number;
  kpis: {
    articlesPendingReview: number;
    activeManagedProjects: number;
    purchaseRequestsAwaitingDecision: number;
    teamMembers: number;
  };
  priorityQueue: {
    articles: Array<{
      id: number;
      title: string;
      author: string;
      submittedDate: string | null;
      link: string;
    }>;
    purchaseRequests: Array<{
      id: number;
      title: string;
      projectName: string | null;
      requester: string;
      amount: number | null;
      createdAt: string;
      link: string;
    }>;
  };
  projectStatusOverview: Array<{
    id: number;
    name: string;
    status: ProjectStatus;
    membersCount: number;
    endDate: string | null;
    progress: number;
  }>;
  recentArticleDecisions: Array<{
    id: number;
    title: string;
    decision: 'VALIDE' | 'REFUSE' | 'PUBLIE' | 'BROUILLON' | 'SOUMIS' | 'REJETE';
    date: string | null;
  }>;
}

export interface ApiEnvelope<T> {
  succes: boolean;
  message: string;
  donnees: T;
}

export interface ApiErrorPayload {
  succes?: boolean;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UtilisateurResume {
  id: string;
  nom: string;
  prenom: string;
  nomComplet: string;
  emailInstitutionnel: string;
  role: Role | null;
  statut: AccountStatus;
  actif: boolean;
}

export interface DegreeLevel {
  id: number;
  libelle: string;
}

export interface Category {
  id: number;
  libelle: string;
}

export interface ResearchTeam {
  id: number;
  code: string;
  nom: string;
  description: string | null;
  actif: boolean;
}

export interface Institution {
  id: number;
  nom: string;
  adresse: string | null;
  ville: string | null;
  pays: string | null;
}

export interface DoctorantAttestation {
  disponible: boolean;
  nomOriginal: string | null;
  nomStocke: string | null;
  typeMime: string | null;
  tailleOctets: number | null;
  deposeeLe: string | null;
}

export interface DoctorantInfo {
  sujetRecherche: string | null;
  pourcentageAvancement: number | null;
  anneePremiereInscription: number | null;
  anneeUniversitairePremiereInscription: string | null;
  universiteInscription: string | null;
  directeurThese: string | null;
  attestation: DoctorantAttestation | null;
}

export interface ProfilUtilisateur {
  grade: string | null;
  institutionAffectationId: number | null;
  institutionAffectation: Institution | null;
  estDoctorant: boolean;
  dernierDiplomeLibre: string | null;
  niveauDiplomeId: number | null;
  niveauDiplome: DegreeLevel | null;
  dateObtentionDiplome: string | null;
  etablissementDiplome: string | null;
  laboratoireDenomination: string | null;
  laboratoireEtablissement: string | null;
  laboratoireUniversite: string | null;
  laboratoireResponsable: string | null;
  orcid: string | null;
  equipeRechercheId: number | null;
  equipeRecherche: ResearchTeam | null;
  biographie: string | null;
  photoUrl: string | null;
}

export interface UtilisateurComplet extends UtilisateurResume {
  nomJeuneFille: string | null;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  genre: Genre | null;
  sexe: Genre | null;
  cin: string | null;
  passeport: string | null;
  emailSecondaire: string | null;
  telephone: string | null;
  adresse: string | null;
  roleDemande: Role | null;
  conditionsAcceptees: boolean;
  derniereConnexionLe: string | null;
  valideLe: string | null;
  motifRejet: string | null;
  creeLe: string;
  modifieLe: string;
  validateurCompte: UtilisateurResume | null;
  profil: ProfilUtilisateur | null;
  doctorat: DoctorantInfo | null;
}

export interface ArticleCoAuthor {
  utilisateurId: string;
  ordreAuteur: number;
  auteurCorrespondant: boolean;
  utilisateur: UtilisateurResume | null;
}

export interface Article {
  id: number;
  titre: string;
  resume: string;
  contenu: string;
  statut: ArticleStatus;
  dateSoumission: string | null;
  dateValidation: string | null;
  motifRejet: string | null;
  publieLe: string | null;
  creeLe: string;
  modifieLe: string;
  editableParAuteur: boolean;
  categorieId: number | null;
  categorie: Category | null;
  deposant: UtilisateurResume | null;
  validateur: UtilisateurResume | null;
  articlePdf: {
    id: number;
    nomFichier: string;
    typeMime: string | null;
    tailleOctets: number | null;
  } | null;
  coAuteurs: ArticleCoAuthor[];
  derniereVersion: {
    numeroVersion: number;
    creeLe: string;
  } | null;
}

export interface Actualite {
  id: number;
  titre: string;
  resume: string | null;
  contenu: string;
  statut: NewsStatus;
  publieeLe: string | null;
  creeLe: string;
  modifieLe: string;
  auteur: UtilisateurResume | null;
  equipeRecherche: ResearchTeam | null;
}

export interface LaboratoryDefaults {
  denomination: string | null;
  etablissement: string | null;
  universite: string | null;
  responsable: string | null;
}

export interface UploadConstraints {
  formats: string[];
  tailleMaxOctets: number;
}

export interface RegistrationReferences {
  institutions: Institution[];
  niveauxDiplome: DegreeLevel[];
  equipesRecherche: ResearchTeam[];
  categoriesArticle: Category[];
  laboratoireParDefaut: LaboratoryDefaults;
  televersementAttestation?: UploadConstraints;
}

export interface RegistrationPayload {
  nom: string;
  prenom: string;
  nomJeuneFille: string;
  dateNaissance: string;
  lieuNaissance: string;
  sexe: Genre;
  cin: string;
  passeport: string;
  emailInstitutionnel: string;
  telephone: string;
  adresse: string;
  grade: string;
  institutionAffectationId: number | '';
  dernierDiplomeLibre: string;
  dateObtentionDiplome: string;
  etablissementDiplome: string;
  orcid: string;
  equipeRechercheId: number | '';
  laboratoireDenomination: string;
  laboratoireEtablissement: string;
  laboratoireUniversite: string;
  laboratoireResponsable: string;
  estDoctorant: boolean;
  sujetRecherche: string;
  pourcentageAvancement: string;
  anneeUniversitairePremiereInscription: string;
  universiteInscription: string;
  directeurThese: string;
  motDePasse: string;
  confirmationMotDePasse: string;
  conditionsAcceptees: boolean;
}

export interface ArticlePayload {
  titre: string;
  resume: string;
  contenu: string;
  categorieId?: number | null;
  action?: 'BROUILLON' | 'SOUMETTRE';
}

export interface ArticleSearchFilters {
  q?: string;
  categorieId?: number | '';
  equipeRechercheId?: number | '';
  auteurId?: string;
  statut?: ArticleStatus | '';
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  limit?: number;
}

export interface HomeData {
  hero: {
    titre: string;
    sousTitre: string;
    accroche: string;
  };
  piliers: Array<{
    titre: string;
    description: string;
  }>;
  chiffres: Array<{
    libelle: string;
    valeur: number;
  }>;
  articlesRecents: Article[];
  actualitesRecentes: Actualite[];
}

export interface AboutData {
  presentation: string;
  missions: string[];
  institutions: Institution[];
  equipesRecherche: ResearchTeam[];
  categoriesArticle: Category[];
}

export interface ContactData {
  email: string;
  telephone: string;
  adresse: string;
  horaires: string;
  institution: Institution | null;
}

export interface PublicContactResponse {
  id: number;
  creeLe: string;
  traite: boolean;
}

export interface MemberProfileData {
  utilisateur: UtilisateurComplet;
  references: RegistrationReferences;
}

export interface MemberArticlesData {
  articles: Article[];
  statistiques: {
    total: number;
    parStatut: Partial<Record<ArticleStatus, number>>;
  };
  references: RegistrationReferences;
}

export interface ArticleSearchResultsData {
  elements: Article[];
  meta: PaginationMeta;
}

export interface MemberLookupData {
  elements: UtilisateurComplet[];
}

export interface LoginResponse {
  accessToken: string;
  utilisateur: UtilisateurComplet;
}

export interface ForgotPasswordResponse {
  resetToken: string | null;
  resetUrl: string | null;
  expireDansMinutes: number;
}

export interface AdminRegistrationList {
  inscriptions: UtilisateurComplet[];
  rolesDisponibles: Role[];
  meta: PaginationMeta;
  statistiques: {
    enAttente: number;
    actives: number;
    refusees: number;
    total: number;
    doctorantsEnAttente: number;
    attestationsDisponibles: number;
  };
}

export interface AdminAccountsList {
  comptes: UtilisateurComplet[];
  meta: PaginationMeta;
  statistiques: {
    actifs: number;
    desactives: number;
    doctorants: number;
    total: number;
  };
}

export interface LabHeadArticlesData {
  articles: Article[];
  articlesValides: Article[];
  statistiques: {
    enAttente: number;
    valides: number;
    rejetes: number;
    publies: number;
  };
}

export interface NewsManagementList {
  actualites: Actualite[];
  meta: PaginationMeta;
}

export interface AuthSession {
  accessToken: string;
  utilisateur: UtilisateurComplet;
}

export interface ConversationMessage {
  id: number;
  conversationId: number;
  contenu: string;
  creeLe: string;
  expediteur: UtilisateurResume | null;
  lu: boolean;
  luLe: string | null;
  pieceJointe: {
    id: number;
    nomFichier: string;
    typeMime: string | null;
    tailleOctets: number | null;
  } | null;
}

export interface ConversationSummary {
  id: number;
  sujet: string | null;
  estGroupe: boolean;
  creePar: string;
  creeLe: string;
  modifieLe: string;
  participants: Array<UtilisateurResume | null>;
  unreadCount: number;
  dernierMessage: {
    id: number;
    contenu: string;
    creeLe: string;
    expediteur: UtilisateurResume | null;
    pieceJointe: {
      id: number;
      nomFichier: string;
      typeMime: string | null;
      tailleOctets: number | null;
    } | null;
  } | null;
}

export interface ConversationDetail {
  conversation: {
    id: number;
    sujet: string | null;
    estGroupe: boolean;
    creePar: string;
    creeLe: string;
    modifieLe: string;
  };
  participants: Array<{
    utilisateur: UtilisateurResume | null;
    rejointLe: string;
    quitteLe?: string | null;
  }>;
  messages: ConversationMessage[];
}

export interface MessagingUserSummary {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}

export interface Project {
  id: number;
  titre: string;
  description: string;
  objectifs: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  statut: ProjectStatus;
  archive: boolean;
  creeLe: string;
  modifieLe: string;
  createur: UtilisateurResume | null;
  equipes: Array<{ id: number }>;
  membres: Array<{
    utilisateur: UtilisateurResume | null;
    roleDansProjet: string | null;
    ajouteLe: string;
  }>;
}

export interface PurchaseRequest {
  id: number;
  projetId: number;
  projetTitre: string | null;
  creePar: UtilisateurResume | null;
  decideePar: UtilisateurResume | null;
  objet: string;
  description: string;
  quantite: number;
  estimationCout: number | null;
  justificationScientifique: string;
  statut: PurchaseRequestStatus;
  urgente: boolean;
  dateDecision: string | null;
  motifRejet: string | null;
  dateLivraison: string | null;
  creeLe: string;
  modifieLe: string;
  pieceJointe: {
    id: number;
    nomFichier: string;
    typeMime: string | null;
    tailleOctets: number | null;
  } | null;
}

export type AdminNotificationCategory =
  | 'registration'
  | 'account'
  | 'message'
  | 'role';

export interface NotificationItem {
  id: number;
  typeNotification: string;
  categorie?: AdminNotificationCategory | null;
  titre: string;
  message: string;
  projetId: number | null;
  demandeAchatId: number | null;
  articleId: number | null;
  conversationId: number | null;
  messageId: number | null;
  estLue: boolean;
  lueLe: string | null;
  lienDirect: string | null;
  creeLe: string;
}

export interface NotificationPreferences {
  canalApplication: boolean;
  canalEmail: boolean;
  notifComptes: boolean;
  notifArticles: boolean;
  notifMessages: boolean;
  notifProjets: boolean;
  notifDemandesAchat: boolean;
  notifLivraisons: boolean;
  creeLe: string;
  modifieLe: string;
}

export interface AdminProfileSettings {
  id: string;
  nomComplet: string;
  emailInstitutionnel: string;
  role: Role | null;
}

export interface AdminPasswordUpdatePayload {
  motDePasseActuel: string;
  nouveauMotDePasse: string;
  confirmationMotDePasse: string;
}
