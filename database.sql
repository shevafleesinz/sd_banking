
ALTER TABLE `users`
ADD COLUMN IF NOT EXISTS `pin` VARCHAR(4) DEFAULT NULL;


CREATE TABLE IF NOT EXISTS `bank_transactions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `identifier` VARCHAR(64) NOT NULL,
  `type` VARCHAR(20) NOT NULL,       
  `amount` INT NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `identifier_idx` (`identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
