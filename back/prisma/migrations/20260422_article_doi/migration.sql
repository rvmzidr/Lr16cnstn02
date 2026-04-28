SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'articles'
        AND COLUMN_NAME = 'lien_doi'
    ),
    'SELECT 1',
    'ALTER TABLE `articles` ADD COLUMN `lien_doi` VARCHAR(1024) NULL AFTER `contenu`'
  )
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
