-- AlterTable
ALTER TABLE `EmailProviderConnection` ADD COLUMN `statsJson` JSON NULL,
    ADD COLUMN `statsSyncedAt` DATETIME(3) NULL;
