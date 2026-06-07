-- AlterTable
ALTER TABLE `FormSubmission` ADD COLUMN `ttError` TEXT NULL,
    ADD COLUMN `ttSentAt` DATETIME(3) NULL,
    ADD COLUMN `ttStatus` ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED') NULL,
    ADD COLUMN `ttclid` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `Order` ADD COLUMN `ttError` TEXT NULL,
    ADD COLUMN `ttSentAt` DATETIME(3) NULL,
    ADD COLUMN `ttStatus` ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED') NULL,
    ADD COLUMN `ttclid` VARCHAR(255) NULL;

-- CreateIndex
CREATE INDEX `FormSubmission_ttStatus_idx` ON `FormSubmission`(`ttStatus`);

-- CreateIndex
CREATE INDEX `Order_ttStatus_idx` ON `Order`(`ttStatus`);
