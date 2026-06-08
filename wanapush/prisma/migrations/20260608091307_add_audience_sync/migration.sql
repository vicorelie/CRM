-- CreateTable
CREATE TABLE `AudienceSync` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `platform` ENUM('META_ADS', 'GOOGLE_ADS', 'TIKTOK_ADS', 'LINKEDIN_ADS') NOT NULL,
    `source` ENUM('CUSTOMERS', 'LEADS', 'LOOKALIKE') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NULL,
    `siteSlug` VARCHAR(191) NULL,
    `externalId` VARCHAR(255) NULL,
    `seedSyncId` VARCHAR(191) NULL,
    `syncedCount` INTEGER NOT NULL DEFAULT 0,
    `lookalikeRatio` DOUBLE NULL,
    `countryCode` VARCHAR(2) NULL,
    `status` ENUM('PENDING', 'SYNCED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `lastSyncedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AudienceSync_userId_platform_idx`(`userId`, `platform`),
    INDEX `AudienceSync_shopId_idx`(`shopId`),
    INDEX `AudienceSync_siteSlug_idx`(`siteSlug`),
    INDEX `AudienceSync_status_idx`(`status`),
    UNIQUE INDEX `AudienceSync_userId_platform_source_name_key`(`userId`, `platform`, `source`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AudienceSync` ADD CONSTRAINT `AudienceSync_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AudienceSync` ADD CONSTRAINT `AudienceSync_seedSyncId_fkey` FOREIGN KEY (`seedSyncId`) REFERENCES `AudienceSync`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
