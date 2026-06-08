-- CreateTable
CREATE TABLE `McpApiKey` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `tokenPrefix` VARCHAR(20) NOT NULL,
    `scopes` VARCHAR(50) NOT NULL DEFAULT 'read',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `totalCalls` INTEGER NOT NULL DEFAULT 0,
    `lastUsedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `McpApiKey_tokenHash_key`(`tokenHash`),
    INDEX `McpApiKey_userId_enabled_idx`(`userId`, `enabled`),
    INDEX `McpApiKey_tokenHash_idx`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `McpApiKey` ADD CONSTRAINT `McpApiKey_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
