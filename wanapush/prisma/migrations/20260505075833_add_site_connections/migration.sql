-- CreateTable
CREATE TABLE `SiteConnection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `platform` ENUM('WORDPRESS', 'SHOPIFY', 'WEBFLOW', 'SQUARESPACE', 'CUSTOM_HTML', 'OTHER') NOT NULL,
    `label` VARCHAR(191) NULL,
    `credentials` TEXT NOT NULL,
    `status` ENUM('PENDING', 'CONNECTED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `lastTestAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `meta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SiteConnection_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SiteConnection` ADD CONSTRAINT `SiteConnection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
