-- AlterTable
ALTER TABLE `FormSubmission` ADD COLUMN `ecError` TEXT NULL,
    ADD COLUMN `ecSentAt` DATETIME(3) NULL,
    ADD COLUMN `ecStatus` ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED') NULL,
    ADD COLUMN `gbraid` VARCHAR(255) NULL,
    ADD COLUMN `gclid` VARCHAR(255) NULL,
    ADD COLUMN `wbraid` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `Order` ADD COLUMN `ecError` TEXT NULL,
    ADD COLUMN `ecSentAt` DATETIME(3) NULL,
    ADD COLUMN `ecStatus` ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED') NULL,
    ADD COLUMN `gbraid` VARCHAR(255) NULL,
    ADD COLUMN `gclid` VARCHAR(255) NULL,
    ADD COLUMN `wbraid` VARCHAR(255) NULL;

-- CreateIndex
CREATE INDEX `FormSubmission_ecStatus_idx` ON `FormSubmission`(`ecStatus`);

-- CreateIndex
CREATE INDEX `Order_ecStatus_idx` ON `Order`(`ecStatus`);
