ALTER TABLE lr16cnstn02.utilisateurs
  ADD COLUMN IF NOT EXISTS nom_jeune_fille VARCHAR(120),
  ADD COLUMN IF NOT EXISTS cin VARCHAR(60),
  ADD COLUMN IF NOT EXISTS passeport VARCHAR(60);

CREATE UNIQUE INDEX IF NOT EXISTS uq_utilisateurs_cin
  ON lr16cnstn02.utilisateurs (cin);

CREATE UNIQUE INDEX IF NOT EXISTS uq_utilisateurs_passeport
  ON lr16cnstn02.utilisateurs (passeport);

ALTER TABLE lr16cnstn02.profils_utilisateur
  ADD COLUMN IF NOT EXISTS est_doctorant BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS laboratoire_denomination VARCHAR(255),
  ADD COLUMN IF NOT EXISTS laboratoire_etablissement VARCHAR(255),
  ADD COLUMN IF NOT EXISTS laboratoire_universite VARCHAR(255),
  ADD COLUMN IF NOT EXISTS laboratoire_responsable VARCHAR(255);

ALTER TABLE lr16cnstn02.informations_doctorales
  ADD COLUMN IF NOT EXISTS annee_universitaire_premiere_inscription VARCHAR(20),
  ADD COLUMN IF NOT EXISTS attestation_nom_original VARCHAR(255),
  ADD COLUMN IF NOT EXISTS attestation_nom_stocke VARCHAR(255),
  ADD COLUMN IF NOT EXISTS attestation_chemin TEXT,
  ADD COLUMN IF NOT EXISTS attestation_type_mime VARCHAR(150),
  ADD COLUMN IF NOT EXISTS attestation_taille_octets BIGINT,
  ADD COLUMN IF NOT EXISTS attestation_deposee_le TIMESTAMP(6);

UPDATE lr16cnstn02.profils_utilisateur profil
SET est_doctorant = TRUE
WHERE EXISTS (
    SELECT 1
    FROM lr16cnstn02.informations_doctorales doctorat
    WHERE doctorat.utilisateur_id = profil.utilisateur_id
  )
  OR LOWER(COALESCE(profil.grade, '')) LIKE '%doctorant%';

UPDATE lr16cnstn02.informations_doctorales
SET annee_universitaire_premiere_inscription =
  annee_premiere_inscription::text || '/' || (annee_premiere_inscription + 1)::text
WHERE annee_premiere_inscription IS NOT NULL
  AND (annee_universitaire_premiere_inscription IS NULL OR annee_universitaire_premiere_inscription = '');
