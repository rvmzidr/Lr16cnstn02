CREATE TABLE IF NOT EXISTS `user_access_preferences` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `utilisateur_id` CHAR(36) NOT NULL,
  `page_accueil_override` VARCHAR(255) NOT NULL,
  `cree_par` CHAR(36) NULL,
  `cree_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `modifie_le` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_access_preferences_user` (`utilisateur_id`),
  KEY `idx_user_access_preferences_admin` (`cree_par`),
  CONSTRAINT `fk_user_access_preferences_user` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `fk_user_access_preferences_admin` FOREIGN KEY (`cree_par`) REFERENCES `utilisateurs`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
