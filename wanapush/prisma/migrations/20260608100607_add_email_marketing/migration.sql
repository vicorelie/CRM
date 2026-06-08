-- CreateTable
CREATE TABLE `EmailContact` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `tags` JSON NULL,
    `attributes` JSON NULL,
    `source` VARCHAR(255) NULL,
    `status` ENUM('ACTIVE', 'PENDING', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED') NOT NULL DEFAULT 'ACTIVE',
    `consentedAt` DATETIME(3) NULL,
    `unsubscribedAt` DATETIME(3) NULL,
    `lastEngagedAt` DATETIME(3) NULL,
    `bounceReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EmailContact_userId_status_idx`(`userId`, `status`),
    INDEX `EmailContact_userId_source_idx`(`userId`, `source`),
    UNIQUE INDEX `EmailContact_userId_email_key`(`userId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `preheader` VARCHAR(255) NULL,
    `fromName` VARCHAR(100) NOT NULL,
    `fromEmail` VARCHAR(255) NOT NULL,
    `replyTo` VARCHAR(255) NULL,
    `bodyMarkdown` MEDIUMTEXT NOT NULL,
    `bodyHtmlSnapshot` MEDIUMTEXT NULL,
    `segmentJson` JSON NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `scheduledAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `stats` JSON NULL,
    `abVariantSubject` VARCHAR(255) NULL,
    `abSamplePercent` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EmailCampaign_userId_status_idx`(`userId`, `status`),
    INDEX `EmailCampaign_userId_sentAt_idx`(`userId`, `sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailSend` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `abVariant` VARCHAR(1) NULL,
    `resendId` VARCHAR(64) NULL,
    `status` ENUM('QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'COMPLAINED', 'UNSUBSCRIBED', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `openCount` INTEGER NOT NULL DEFAULT 0,
    `clickCount` INTEGER NOT NULL DEFAULT 0,
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `firstOpenedAt` DATETIME(3) NULL,
    `firstClickedAt` DATETIME(3) NULL,
    `bouncedAt` DATETIME(3) NULL,
    `unsubscribedAt` DATETIME(3) NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmailSend_campaignId_status_idx`(`campaignId`, `status`),
    INDEX `EmailSend_contactId_idx`(`contactId`),
    INDEX `EmailSend_resendId_idx`(`resendId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EmailContact` ADD CONSTRAINT `EmailContact_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailCampaign` ADD CONSTRAINT `EmailCampaign_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailSend` ADD CONSTRAINT `EmailSend_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `EmailCampaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailSend` ADD CONSTRAINT `EmailSend_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `EmailContact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
