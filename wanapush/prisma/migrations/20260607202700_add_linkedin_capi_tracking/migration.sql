-- AlterTable
ALTER TABLE `FormSubmission` ADD COLUMN `liError` TEXT NULL,
    ADD COLUMN `liFatId` VARCHAR(255) NULL,
    ADD COLUMN `liSentAt` DATETIME(3) NULL,
    ADD COLUMN `liStatus` ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED') NULL;

-- AlterTable
ALTER TABLE `Order` ADD COLUMN `liError` TEXT NULL,
    ADD COLUMN `liFatId` VARCHAR(255) NULL,
    ADD COLUMN `liSentAt` DATETIME(3) NULL,
    ADD COLUMN `liStatus` ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED') NULL;

-- CreateIndex
CREATE INDEX `FormSubmission_liStatus_idx` ON `FormSubmission`(`liStatus`);

-- CreateIndex
CREATE INDEX `Order_liStatus_idx` ON `Order`(`liStatus`);
