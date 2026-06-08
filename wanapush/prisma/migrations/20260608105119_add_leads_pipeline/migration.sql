-- AlterTable
ALTER TABLE `FormSubmission` ADD COLUMN `emailContactId` VARCHAR(191) NULL,
    ADD COLUMN `enrichmentJson` JSON NULL,
    ADD COLUMN `leadScore` INTEGER NULL,
    ADD COLUMN `leadScoreReason` TEXT NULL,
    ADD COLUMN `leadStatus` ENUM('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'DISQUALIFIED') NOT NULL DEFAULT 'NEW',
    ADD COLUMN `leadTemperature` ENUM('HOT', 'WARM', 'COLD', 'INVALID') NULL,
    ADD COLUMN `notifiedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `LeadWebhook` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `secret` TEXT NOT NULL,
    `siteSlug` VARCHAR(191) NULL,
    `minTemperature` ENUM('HOT', 'WARM', 'COLD', 'INVALID') NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `totalFires` INTEGER NOT NULL DEFAULT 0,
    `totalFails` INTEGER NOT NULL DEFAULT 0,
    `lastFiredAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LeadWebhook_userId_enabled_idx`(`userId`, `enabled`),
    INDEX `LeadWebhook_siteSlug_idx`(`siteSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `FormSubmission_leadStatus_idx` ON `FormSubmission`(`leadStatus`);

-- CreateIndex
CREATE INDEX `FormSubmission_leadTemperature_idx` ON `FormSubmission`(`leadTemperature`);

-- AddForeignKey
ALTER TABLE `LeadWebhook` ADD CONSTRAINT `LeadWebhook_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
