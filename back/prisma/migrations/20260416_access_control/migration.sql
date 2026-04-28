CREATE TABLE IF NOT EXISTS `access_profiles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `nom` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `role_parent` ENUM('MEMBRE', 'ADMINISTRATEUR', 'CHEF_LABO') NOT NULL,
  `actif` BOOLEAN NOT NULL DEFAULT TRUE,
  `page_accueil_defaut` VARCHAR(255) NOT NULL DEFAULT '/dashboard',
  `langues_autorisees` TEXT NULL,
  `langue_par_defaut` VARCHAR(8) NULL,
  `rtl_force_arabe` BOOLEAN NOT NULL DEFAULT TRUE,
  `cree_par` CHAR(36) NULL,
  `cree_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `modifie_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_access_profiles_nom_role` (`nom`, `role_parent`),
  KEY `idx_access_profiles_role_parent` (`role_parent`),
  KEY `idx_access_profiles_actif` (`actif`),
  CONSTRAINT `fk_access_profiles_createur` FOREIGN KEY (`cree_par`) REFERENCES `utilisateurs`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `access_profile_modules` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `profile_id` BIGINT NOT NULL,
  `module_key` VARCHAR(80) NOT NULL,
  `est_visible` BOOLEAN NOT NULL DEFAULT TRUE,
  `cree_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `modifie_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_access_profile_modules_profile_module` (`profile_id`, `module_key`),
  KEY `idx_access_profile_modules_key` (`module_key`),
  CONSTRAINT `fk_access_profile_modules_profile` FOREIGN KEY (`profile_id`) REFERENCES `access_profiles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `access_profile_permissions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `profile_id` BIGINT NOT NULL,
  `permission_key` VARCHAR(120) NOT NULL,
  `est_autorise` BOOLEAN NOT NULL DEFAULT FALSE,
  `cree_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `modifie_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_access_profile_permissions_profile_permission` (`profile_id`, `permission_key`),
  KEY `idx_access_profile_permissions_key` (`permission_key`),
  CONSTRAINT `fk_access_profile_permissions_profile` FOREIGN KEY (`profile_id`) REFERENCES `access_profiles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `access_profile_widgets` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `profile_id` BIGINT NOT NULL,
  `widget_key` VARCHAR(80) NOT NULL,
  `est_visible` BOOLEAN NOT NULL DEFAULT TRUE,
  `cree_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `modifie_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_access_profile_widgets_profile_widget` (`profile_id`, `widget_key`),
  KEY `idx_access_profile_widgets_key` (`widget_key`),
  CONSTRAINT `fk_access_profile_widgets_profile` FOREIGN KEY (`profile_id`) REFERENCES `access_profiles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `access_profile_user_assignments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `utilisateur_id` CHAR(36) NOT NULL,
  `profile_id` BIGINT NOT NULL,
  `assigne_par` CHAR(36) NULL,
  `cree_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `modifie_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_access_profile_assignments_user` (`utilisateur_id`),
  KEY `idx_access_profile_assignments_profile` (`profile_id`),
  CONSTRAINT `fk_access_profile_assignments_user` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `fk_access_profile_assignments_profile` FOREIGN KEY (`profile_id`) REFERENCES `access_profiles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `fk_access_profile_assignments_admin` FOREIGN KEY (`assigne_par`) REFERENCES `utilisateurs`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_access_overrides` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `utilisateur_id` CHAR(36) NOT NULL,
  `module_key` VARCHAR(80) NULL,
  `permission_key` VARCHAR(120) NULL,
  `widget_key` VARCHAR(80) NULL,
  `valeur_bool` BOOLEAN NOT NULL,
  `raison` TEXT NULL,
  `cree_par` CHAR(36) NULL,
  `cree_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `modifie_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_user_access_overrides_user` (`utilisateur_id`),
  KEY `idx_user_access_overrides_module` (`module_key`),
  KEY `idx_user_access_overrides_permission` (`permission_key`),
  KEY `idx_user_access_overrides_widget` (`widget_key`),
  CONSTRAINT `fk_user_access_overrides_user` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `fk_user_access_overrides_admin` FOREIGN KEY (`cree_par`) REFERENCES `utilisateurs`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_ticket_access_resolutions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `ticket_id` BIGINT NOT NULL,
  `admin_id` CHAR(36) NOT NULL,
  `utilisateur_id` CHAR(36) NOT NULL,
  `profile_id` BIGINT NULL,
  `notes` TEXT NULL,
  `cree_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `modifie_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_support_access_resolutions_ticket` (`ticket_id`),
  KEY `idx_support_access_resolutions_user` (`utilisateur_id`),
  KEY `idx_support_access_resolutions_profile` (`profile_id`),
  CONSTRAINT `fk_support_access_resolutions_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `fk_support_access_resolutions_admin` FOREIGN KEY (`admin_id`) REFERENCES `utilisateurs`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT `fk_support_access_resolutions_user` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT `fk_support_access_resolutions_profile` FOREIGN KEY (`profile_id`) REFERENCES `access_profiles`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `support_tickets`
  MODIFY COLUMN `categorie` ENUM(
    'LOGIN',
    'ACCOUNT',
    'ACCESS',
    'ROLE',
    'MODULE_VISIBILITY',
    'PERMISSION',
    'UI_BUG',
    'TRANSLATION',
    'MESSAGING',
    'NOTIFICATIONS',
    'ARTICLES',
    'SYSTEM',
    'OTHER'
  ) NOT NULL;
