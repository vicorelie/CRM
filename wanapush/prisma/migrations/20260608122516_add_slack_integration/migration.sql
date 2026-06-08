-- CreateTable
CREATE TABLE `SlackIntegration` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `webhookUrl` TEXT NOT NULL,
    `channelName` VARCHAR(100) NULL,
    `receiveAnomalyAlerts` BOOLEAN NOT NULL DEFAULT true,
    `receiveWeeklyDigest` BOOLEAN NOT NULL DEFAULT true,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `totalSent` INTEGER NOT NULL DEFAULT 0,
    `totalFails` INTEGER NOT NULL DEFAULT 0,
    `lastSentAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SlackIntegration_userId_enabled_idx`(`userId`, `enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SlackIntegration` ADD CONSTRAINT `SlackIntegration_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
