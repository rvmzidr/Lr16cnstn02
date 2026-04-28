SET @fk_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'demandes_achat'
    AND CONSTRAINT_NAME = 'fk_demandes_achat_projet'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @ddl := IF(
  @fk_exists > 0,
  'ALTER TABLE `demandes_achat` DROP FOREIGN KEY `fk_demandes_achat_projet`',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE `demandes_achat`
  MODIFY COLUMN `projet_id` BIGINT NULL;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'demandes_achat'
    AND CONSTRAINT_NAME = 'fk_demandes_achat_projet'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @ddl := IF(
  @fk_exists = 0,
  'ALTER TABLE `demandes_achat` ADD CONSTRAINT `fk_demandes_achat_projet` FOREIGN KEY (`projet_id`) REFERENCES `projets`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
