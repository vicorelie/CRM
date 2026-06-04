/*
  Warnings:

  - A unique constraint covering the columns `[userId,platform,accountId]` on the table `SocialAccount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `SocialAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `SocialAccount` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `SocialAccount` DROP FOREIGN KEY `SocialAccount_businessId_fkey`;

-- AlterTable
ALTER TABLE `SocialAccount` ADD COLUMN `avatarUrl` TEXT NULL,
    ADD COLUMN `displayName` VARCHAR(191) NULL,
    ADD COLUMN `lastError` TEXT NULL,
    ADD COLUMN `meta` JSON NULL,
    ADD COLUMN `scopes` TEXT NULL,
    ADD COLUMN `status` ENUM('CONNECTED', 'EXPIRED', 'REVOKED', 'ERROR') NOT NULL DEFAULT 'CONNECTED',
    ADD COLUMN `tokenExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `userId` VARCHAR(191) NOT NULL,
    MODIFY `businessId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ScheduledPost` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `caption` TEXT NOT NULL,
    `mediaUrls` JSON NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'SCHEDULED',
    `publishedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `options` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ScheduledPost_userId_idx`(`userId`),
    INDEX `ScheduledPost_status_scheduledAt_idx`(`status`, `scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduledPostTarget` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'LINKEDIN', 'TWITTER', 'PINTEREST') NOT NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'SCHEDULED',
    `externalId` VARCHAR(191) NULL,
    `externalUrl` TEXT NULL,
    `publishedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,

    INDEX `ScheduledPostTarget_postId_idx`(`postId`),
    INDEX `ScheduledPostTarget_accountId_idx`(`accountId`),
    INDEX `ScheduledPostTarget_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostAnalytics` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'LINKEDIN', 'TWITTER', 'PINTEREST') NOT NULL,
    `externalId` VARCHAR(191) NOT NULL,
    `metrics` JSON NOT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PostAnalytics_accountId_idx`(`accountId`),
    INDEX `PostAnalytics_platform_fetchedAt_idx`(`platform`, `fetchedAt`),
    UNIQUE INDEX `PostAnalytics_accountId_externalId_fetchedAt_key`(`accountId`, `externalId`, `fetchedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `SocialAccount_userId_idx` ON `SocialAccount`(`userId`);

-- CreateIndex
CREATE UNIQUE INDEX `SocialAccount_userId_platform_accountId_key` ON `SocialAccount`(`userId`, `platform`, `accountId`);

-- AddForeignKey
ALTER TABLE `SocialAccount` ADD CONSTRAINT `SocialAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocialAccount` ADD CONSTRAINT `SocialAccount_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduledPost` ADD CONSTRAINT `ScheduledPost_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduledPostTarget` ADD CONSTRAINT `ScheduledPostTarget_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `ScheduledPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduledPostTarget` ADD CONSTRAINT `ScheduledPostTarget_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `SocialAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostAnalytics` ADD CONSTRAINT `PostAnalytics_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `SocialAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
