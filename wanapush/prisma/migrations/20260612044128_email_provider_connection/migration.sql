-- CreateTable
CREATE TABLE `EmailProviderConnection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(40) NOT NULL,
    `apiKey` TEXT NOT NULL,
    `accountEmail` VARCHAR(255) NULL,
    `accountName` VARCHAR(255) NULL,
    `plan` VARCHAR(120) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'CONNECTED',
    `lastSyncAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EmailProviderConnection_userId_status_idx`(`userId`, `status`),
    UNIQUE INDEX `EmailProviderConnection_userId_provider_key`(`userId`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EmailProviderConnection` ADD CONSTRAINT `EmailProviderConnection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
