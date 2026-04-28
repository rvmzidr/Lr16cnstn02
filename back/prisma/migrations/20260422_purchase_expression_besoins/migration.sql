ALTER TABLE `demandes_achat`
  MODIFY COLUMN `statut` ENUM(
    'BROUILLON',
    'PDF_GENERE',
    'TELECHARGEE',
    'EN_ATTENTE_SIGNATURE_CHEF',
    'SIGNEE',
    'TRANSMISE_ADMINISTRATION',
    'EN_ATTENTE',
    'ACCEPTEE',
    'REJETEE',
    'EN_COURS_TRAITEMENT',
    'COMMANDEE',
    'LIVREE',
    'ANNULEE'
  ) NOT NULL DEFAULT 'EN_ATTENTE';

ALTER TABLE `historiques_demande`
  MODIFY COLUMN `ancien_statut` ENUM(
    'BROUILLON',
    'PDF_GENERE',
    'TELECHARGEE',
    'EN_ATTENTE_SIGNATURE_CHEF',
    'SIGNEE',
    'TRANSMISE_ADMINISTRATION',
    'EN_ATTENTE',
    'ACCEPTEE',
    'REJETEE',
    'EN_COURS_TRAITEMENT',
    'COMMANDEE',
    'LIVREE',
    'ANNULEE'
  ) NULL,
  MODIFY COLUMN `nouveau_statut` ENUM(
    'BROUILLON',
    'PDF_GENERE',
    'TELECHARGEE',
    'EN_ATTENTE_SIGNATURE_CHEF',
    'SIGNEE',
    'TRANSMISE_ADMINISTRATION',
    'EN_ATTENTE',
    'ACCEPTEE',
    'REJETEE',
    'EN_COURS_TRAITEMENT',
    'COMMANDEE',
    'LIVREE',
    'ANNULEE'
  ) NOT NULL;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'date_demande'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `date_demande` DATE NULL AFTER `justification_scientifique`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'rubrique_budgetaire'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `rubrique_budgetaire` VARCHAR(120) NULL AFTER `date_demande`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'demandeur_nom'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `demandeur_nom` VARCHAR(120) NULL AFTER `rubrique_budgetaire`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'demandeur_prenom'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `demandeur_prenom` VARCHAR(120) NULL AFTER `demandeur_nom`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'direction_service_labo'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `direction_service_labo` VARCHAR(255) NULL AFTER `demandeur_prenom`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'expression_details'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `expression_details` JSON NULL AFTER `direction_service_labo`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'total_general'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `total_general` DECIMAL(14,3) NULL AFTER `expression_details`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'types_pieces_jointes'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `types_pieces_jointes` JSON NULL AFTER `total_general`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'autre_piece_jointe'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `autre_piece_jointe` VARCHAR(255) NULL AFTER `types_pieces_jointes`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'nombre_pieces_jointes'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `nombre_pieces_jointes` INT NOT NULL DEFAULT 0 AFTER `autre_piece_jointe`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'pdf_nom_fichier'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `pdf_nom_fichier` VARCHAR(255) NULL AFTER `nombre_pieces_jointes`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'pdf_chemin_fichier'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `pdf_chemin_fichier` TEXT NULL AFTER `pdf_nom_fichier`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'pdf_type_mime'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `pdf_type_mime` VARCHAR(150) NULL AFTER `pdf_chemin_fichier`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'pdf_taille_octets'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `pdf_taille_octets` BIGINT NULL AFTER `pdf_type_mime`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'pdf_genere_le'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `pdf_genere_le` TIMESTAMP(6) NULL AFTER `pdf_taille_octets`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'demandes_achat'
        AND COLUMN_NAME = 'pdf_telecharge_le'
    ),
    'SELECT 1',
    'ALTER TABLE `demandes_achat` ADD COLUMN `pdf_telecharge_le` TIMESTAMP(6) NULL AFTER `pdf_genere_le`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
