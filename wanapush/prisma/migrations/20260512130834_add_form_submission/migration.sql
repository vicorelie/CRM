-- CreateTable
CREATE TABLE `FormSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `siteSlug` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `data` JSON NOT NULL,
    `email` VARCHAR(191) NULL,
    `pageUrl` VARCHAR(191) NULL,
    `ipHash` VARCHAR(191) NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FormSubmission_siteSlug_createdAt_idx`(`siteSlug`, `createdAt`),
    INDEX `FormSubmission_siteSlug_read_idx`(`siteSlug`, `read`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
