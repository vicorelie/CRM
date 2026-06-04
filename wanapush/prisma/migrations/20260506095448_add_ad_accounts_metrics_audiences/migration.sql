-- AlterTable
ALTER TABLE `Campaign` ADD COLUMN `adAccountId` VARCHAR(191) NULL,
    ADD COLUMN `dailyBudget` DOUBLE NULL,
    ADD COLUMN `endDate` DATETIME(3) NULL,
    ADD COLUMN `externalId` VARCHAR(191) NULL,
    ADD COLUMN `lastSyncAt` DATETIME(3) NULL,
    ADD COLUMN `lifetimeBudget` DOUBLE NULL,
    ADD COLUMN `objective` VARCHAR(191) NULL,
    ADD COLUMN `startDate` DATETIME(3) NULL,
    ADD COLUMN `targeting` JSON NULL;

-- CreateTable
CREATE TABLE `AdAccount` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `platform` ENUM('META_ADS', 'GOOGLE_ADS', 'TIKTOK_ADS', 'LINKEDIN_ADS') NOT NULL,
    `externalId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NULL,
    `timezone` VARCHAR(191) NULL,
    `accessToken` TEXT NOT NULL,
    `refreshToken` TEXT NULL,
    `tokenExpiresAt` DATETIME(3) NULL,
    `scopes` TEXT NULL,
    `status` ENUM('CONNECTED', 'EXPIRED', 'REVOKED', 'ERROR') NOT NULL DEFAULT 'CONNECTED',
    `lastError` TEXT NULL,
    `meta` JSON NULL,
    `connectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AdAccount_userId_idx`(`userId`),
    INDEX `AdAccount_platform_idx`(`platform`),
    UNIQUE INDEX `AdAccount_userId_platform_externalId_key`(`userId`, `platform`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdMetrics` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `spend` DOUBLE NOT NULL DEFAULT 0,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `conversions` INTEGER NOT NULL DEFAULT 0,
    `revenue` DOUBLE NOT NULL DEFAULT 0,
    `raw` JSON NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdMetrics_campaignId_idx`(`campaignId`),
    INDEX `AdMetrics_date_idx`(`date`),
    UNIQUE INDEX `AdMetrics_campaignId_date_key`(`campaignId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdAudience` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `size` VARCHAR(191) NULL,
    `tags` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AdAudience_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Campaign_adAccountId_idx` ON `Campaign`(`adAccountId`);

-- CreateIndex
CREATE INDEX `Campaign_externalId_idx` ON `Campaign`(`externalId`);

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_adAccountId_fkey` FOREIGN KEY (`adAccountId`) REFERENCES `AdAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdAccount` ADD CONSTRAINT `AdAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdMetrics` ADD CONSTRAINT `AdMetrics_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdAudience` ADD CONSTRAINT `AdAudience_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
