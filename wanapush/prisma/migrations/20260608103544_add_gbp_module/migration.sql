-- CreateTable
CREATE TABLE `GbpAccount` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `googleAccountId` VARCHAR(255) NOT NULL,
    `accountName` VARCHAR(255) NULL,
    `accountType` VARCHAR(50) NULL,
    `accessToken` TEXT NOT NULL,
    `refreshToken` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `scopes` TEXT NOT NULL,
    `status` ENUM('CONNECTED', 'EXPIRED', 'REVOKED', 'ERROR') NOT NULL DEFAULT 'CONNECTED',
    `lastSyncAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GbpAccount_userId_status_idx`(`userId`, `status`),
    UNIQUE INDEX `GbpAccount_userId_googleAccountId_key`(`userId`, `googleAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GbpLocation` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `googleLocationId` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `address` TEXT NULL,
    `phoneNumber` VARCHAR(50) NULL,
    `websiteUri` VARCHAR(500) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `primaryCategory` VARCHAR(255) NULL,
    `auditScore` INTEGER NULL,
    `regularHours` JSON NULL,
    `reviewsCount` INTEGER NOT NULL DEFAULT 0,
    `averageRating` DOUBLE NULL,
    `lastSyncAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GbpLocation_accountId_idx`(`accountId`),
    UNIQUE INDEX `GbpLocation_accountId_googleLocationId_key`(`accountId`, `googleLocationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GbpPost` (
    `id` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `googlePostId` VARCHAR(500) NULL,
    `topicType` VARCHAR(50) NOT NULL,
    `summary` TEXT NOT NULL,
    `callToAction` JSON NULL,
    `eventDetails` JSON NULL,
    `imageUrl` TEXT NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED') NOT NULL DEFAULT 'DRAFT',
    `scheduledAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GbpPost_locationId_status_idx`(`locationId`, `status`),
    INDEX `GbpPost_scheduledAt_idx`(`scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GbpReview` (
    `id` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `googleReviewId` VARCHAR(500) NOT NULL,
    `reviewerName` VARCHAR(255) NULL,
    `reviewerPhotoUrl` TEXT NULL,
    `starRating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `createTime` DATETIME(3) NOT NULL,
    `updateTime` DATETIME(3) NOT NULL,
    `replyText` TEXT NULL,
    `replyUpdateTime` DATETIME(3) NULL,
    `replyStatus` ENUM('PENDING', 'AUTO_REPLIED', 'MANUAL_REPLIED', 'SKIPPED') NULL,
    `replyAiConfidence` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GbpReview_locationId_starRating_idx`(`locationId`, `starRating`),
    INDEX `GbpReview_locationId_replyStatus_idx`(`locationId`, `replyStatus`),
    UNIQUE INDEX `GbpReview_locationId_googleReviewId_key`(`locationId`, `googleReviewId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GbpInsight` (
    `id` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `websiteClicks` INTEGER NOT NULL DEFAULT 0,
    `callClicks` INTEGER NOT NULL DEFAULT 0,
    `directionClicks` INTEGER NOT NULL DEFAULT 0,
    `bookings` INTEGER NOT NULL DEFAULT 0,
    `raw` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GbpInsight_locationId_date_idx`(`locationId`, `date`),
    UNIQUE INDEX `GbpInsight_locationId_date_key`(`locationId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GbpAccount` ADD CONSTRAINT `GbpAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GbpLocation` ADD CONSTRAINT `GbpLocation_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `GbpAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GbpPost` ADD CONSTRAINT `GbpPost_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `GbpLocation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GbpReview` ADD CONSTRAINT `GbpReview_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `GbpLocation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GbpInsight` ADD CONSTRAINT `GbpInsight_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `GbpLocation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
