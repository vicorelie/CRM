-- AlterTable
ALTER TABLE `AdAudience` ADD COLUMN `adAccountId` VARCHAR(191) NULL,
    ADD COLUMN `config` JSON NULL,
    ADD COLUMN `estimatedSize` INTEGER NULL,
    ADD COLUMN `externalId` VARCHAR(191) NULL,
    ADD COLUMN `metaStatus` VARCHAR(191) NULL,
    ADD COLUMN `platform` VARCHAR(191) NULL,
    ADD COLUMN `syncedAt` DATETIME(3) NULL,
    ADD COLUMN `type` ENUM('MANUAL', 'WEBSITE_TRAFFIC', 'CUSTOMER_LIST', 'LOOKALIKE') NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX `AdAudience_platform_adAccountId_idx` ON `AdAudience`(`platform`, `adAccountId`);
