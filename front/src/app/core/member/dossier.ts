import type {
  LaboratoryDefaults,
  RegistrationPayload,
  RegistrationReferences,
  UtilisateurComplet,
} from "../models/models";

export type DossierErrorMap = Partial<Record<keyof RegistrationPayload | "attestationDoctorant", string>>;

function blankString(value?: string | null) {
  return value ?? "";
}

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function createEmptyRegistrationPayload(
  laboratoire?: LaboratoryDefaults | null
): RegistrationPayload {
  return {
    nom: "",
    prenom: "",
    nomJeuneFille: "",
    dateNaissance: "",
    lieuNaissance: "",
    sexe: "FEMME",
    cin: "",
    passeport: "",
    emailInstitutionnel: "",
    telephone: "",
    adresse: "",
    grade: "",
    institutionAffectationId: "",
    dernierDiplomeLibre: "",
    dateObtentionDiplome: "",
    etablissementDiplome: "",
    orcid: "",
    equipeRechercheId: "",
    laboratoireDenomination: laboratoire?.denomination || "LR16CNSTN02",
    laboratoireEtablissement: laboratoire?.etablissement || "",
    laboratoireUniversite: laboratoire?.universite || "",
    laboratoireResponsable: laboratoire?.responsable || "",
    estDoctorant: false,
    sujetRecherche: "",
    pourcentageAvancement: "",
    anneeUniversitairePremiereInscription: "",
    universiteInscription: "",
    directeurThese: "",
    motDePasse: "",
    confirmationMotDePasse: "",
    conditionsAcceptees: false,
  };
}

export function createRegistrationPayloadFromUser(
  utilisateur: UtilisateurComplet,
  references: RegistrationReferences
): RegistrationPayload {
  return {
    ...createEmptyRegistrationPayload(references.laboratoireParDefaut),
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    nomJeuneFille: blankString(utilisateur.nomJeuneFille),
    dateNaissance: toDateInput(utilisateur.dateNaissance),
    lieuNaissance: blankString(utilisateur.lieuNaissance),
    sexe: utilisateur.sexe || "FEMME",
    cin: blankString(utilisateur.cin),
    passeport: blankString(utilisateur.passeport),
    emailInstitutionnel: utilisateur.emailInstitutionnel,
    telephone: blankString(utilisateur.telephone),
    adresse: blankString(utilisateur.adresse),
    grade: blankString(utilisateur.profil?.grade),
    institutionAffectationId: utilisateur.profil?.institutionAffectationId || "",
    dernierDiplomeLibre: blankString(utilisateur.profil?.dernierDiplomeLibre),
    dateObtentionDiplome: toDateInput(utilisateur.profil?.dateObtentionDiplome),
    etablissementDiplome: blankString(utilisateur.profil?.etablissementDiplome),
    orcid: blankString(utilisateur.profil?.orcid),
    equipeRechercheId: utilisateur.profil?.equipeRechercheId || "",
    laboratoireDenomination:
      utilisateur.profil?.laboratoireDenomination ||
      references.laboratoireParDefaut.denomination ||
      "LR16CNSTN02",
    laboratoireEtablissement:
      utilisateur.profil?.laboratoireEtablissement ||
      references.laboratoireParDefaut.etablissement ||
      "",
    laboratoireUniversite:
      utilisateur.profil?.laboratoireUniversite ||
      references.laboratoireParDefaut.universite ||
      "",
    laboratoireResponsable:
      utilisateur.profil?.laboratoireResponsable ||
      references.laboratoireParDefaut.responsable ||
      "",
    estDoctorant: Boolean(utilisateur.profil?.estDoctorant),
    sujetRecherche: blankString(utilisateur.doctorat?.sujetRecherche),
    pourcentageAvancement:
      utilisateur.doctorat?.pourcentageAvancement === null ||
      utilisateur.doctorat?.pourcentageAvancement === undefined
        ? ""
        : String(utilisateur.doctorat.pourcentageAvancement),
    anneeUniversitairePremiereInscription: blankString(
      utilisateur.doctorat?.anneeUniversitairePremiereInscription
    ),
    universiteInscription: blankString(utilisateur.doctorat?.universiteInscription),
    directeurThese: blankString(utilisateur.doctorat?.directeurThese),
    motDePasse: "",
    confirmationMotDePasse: "",
    conditionsAcceptees: utilisateur.conditionsAcceptees,
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidAcademicYear(value: string) {
  return /^\d{4}\s*\/\s*\d{4}$/.test(value.trim());
}

export function validateRegistrationPayload(
  payload: RegistrationPayload,
  options: {
    mode: "registration" | "profile";
    hasExistingAttestation?: boolean;
  }
): DossierErrorMap {
  const errors: DossierErrorMap = {};

  if (!payload.nom.trim()) errors.nom = "Le nom est obligatoire.";
  if (!payload.prenom.trim()) errors.prenom = "Le prenom est obligatoire.";
  if (!payload.dateNaissance) errors.dateNaissance = "La date de naissance est obligatoire.";
  if (!payload.lieuNaissance.trim()) errors.lieuNaissance = "Le lieu de naissance est obligatoire.";
  if (!payload.emailInstitutionnel.trim()) {
    errors.emailInstitutionnel = "L'email institutionnel est obligatoire.";
  } else if (!isValidEmail(payload.emailInstitutionnel)) {
    errors.emailInstitutionnel = "L'email institutionnel est invalide.";
  }
  if (!payload.telephone.trim()) errors.telephone = "Le numero de telephone est obligatoire.";
  if (!payload.grade.trim()) errors.grade = "Le grade ou statut est obligatoire.";
  if (!payload.institutionAffectationId) {
    errors.institutionAffectationId = "L'etablissement d'affectation est obligatoire.";
  }
  if (!payload.dernierDiplomeLibre.trim()) {
    errors.dernierDiplomeLibre = "Le dernier diplome obtenu est obligatoire.";
  }
  if (!payload.dateObtentionDiplome) {
    errors.dateObtentionDiplome = "La date d'obtention du diplome est obligatoire.";
  }
  if (!payload.etablissementDiplome.trim()) {
    errors.etablissementDiplome = "L'etablissement du diplome est obligatoire.";
  }
  if (!payload.equipeRechercheId) {
    errors.equipeRechercheId = "L'equipe de recherche est obligatoire.";
  }
  if (!payload.cin.trim() && !payload.passeport.trim()) {
    errors.cin = "Le CIN tunisien ou le passeport est obligatoire.";
    errors.passeport = "Le CIN tunisien ou le passeport est obligatoire.";
  }

  if (payload.estDoctorant) {
    if (!payload.sujetRecherche.trim()) {
      errors.sujetRecherche = "Le sujet de recherche est obligatoire.";
    }
    if (!payload.pourcentageAvancement.trim()) {
      errors.pourcentageAvancement = "Le taux d'avancement est obligatoire.";
    }
    if (!payload.anneeUniversitairePremiereInscription.trim()) {
      errors.anneeUniversitairePremiereInscription =
        "L'annee universitaire de premiere inscription est obligatoire.";
    } else if (!isValidAcademicYear(payload.anneeUniversitairePremiereInscription)) {
      errors.anneeUniversitairePremiereInscription =
        "Le format attendu est YYYY/YYYY.";
    }
    if (!payload.universiteInscription.trim()) {
      errors.universiteInscription =
        "L'etablissement universitaire d'inscription est obligatoire.";
    }
    if (!payload.directeurThese.trim()) {
      errors.directeurThese = "Le directeur de these est obligatoire.";
    }
    if (!options.hasExistingAttestation) {
      errors.attestationDoctorant = "L'attestation d'inscription est obligatoire.";
    }
  }

  if (options.mode === "registration") {
    if (!payload.motDePasse) {
      errors.motDePasse = "Le mot de passe est obligatoire.";
    } else if (payload.motDePasse.length < 8) {
      errors.motDePasse = "Le mot de passe doit contenir au moins 8 caracteres.";
    }

    if (!payload.confirmationMotDePasse) {
      errors.confirmationMotDePasse = "La confirmation du mot de passe est obligatoire.";
    } else if (payload.confirmationMotDePasse !== payload.motDePasse) {
      errors.confirmationMotDePasse =
        "La confirmation du mot de passe ne correspond pas.";
    }

    if (!payload.conditionsAcceptees) {
      errors.conditionsAcceptees =
        "Vous devez accepter les conditions d'utilisation.";
    }
  }

  return errors;
}

export function appendRegistrationPayloadToFormData(
  formData: FormData,
  payload: RegistrationPayload,
  options: { includeAccountFields: boolean }
) {
  formData.set("nom", payload.nom);
  formData.set("prenom", payload.prenom);
  formData.set("nomJeuneFille", payload.nomJeuneFille);
  formData.set("dateNaissance", payload.dateNaissance);
  formData.set("lieuNaissance", payload.lieuNaissance);
  formData.set("sexe", payload.sexe);
  formData.set("cin", payload.cin);
  formData.set("passeport", payload.passeport);
  formData.set("emailInstitutionnel", payload.emailInstitutionnel);
  formData.set("telephone", payload.telephone);
  formData.set("adresse", payload.adresse);
  formData.set("grade", payload.grade);
  formData.set("institutionAffectationId", String(payload.institutionAffectationId || ""));
  formData.set("dernierDiplomeLibre", payload.dernierDiplomeLibre);
  formData.set("dateObtentionDiplome", payload.dateObtentionDiplome);
  formData.set("etablissementDiplome", payload.etablissementDiplome);
  formData.set("orcid", payload.orcid);
  formData.set("equipeRechercheId", String(payload.equipeRechercheId || ""));
  formData.set("laboratoireDenomination", payload.laboratoireDenomination);
  formData.set("laboratoireEtablissement", payload.laboratoireEtablissement);
  formData.set("laboratoireUniversite", payload.laboratoireUniversite);
  formData.set("laboratoireResponsable", payload.laboratoireResponsable);
  formData.set("estDoctorant", String(payload.estDoctorant));
  formData.set("sujetRecherche", payload.sujetRecherche);
  formData.set("pourcentageAvancement", payload.pourcentageAvancement);
  formData.set(
    "anneeUniversitairePremiereInscription",
    payload.anneeUniversitairePremiereInscription
  );
  formData.set("universiteInscription", payload.universiteInscription);
  formData.set("directeurThese", payload.directeurThese);

  if (options.includeAccountFields) {
    formData.set("motDePasse", payload.motDePasse);
    formData.set("confirmationMotDePasse", payload.confirmationMotDePasse);
    formData.set("conditionsAcceptees", String(payload.conditionsAcceptees));
  }
}
