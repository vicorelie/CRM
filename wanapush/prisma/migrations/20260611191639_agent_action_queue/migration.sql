-- CreateTable
CREATE TABLE `AgentAction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `dedupKey` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'anomaly',
    `title` TEXT NOT NULL,
    `rationale` TEXT NOT NULL,
    `evidence` JSON NULL,
    `deepLink` VARCHAR(191) NULL,
    `impactScore` INTEGER NOT NULL DEFAULT 50,
    `effortScore` INTEGER NOT NULL DEFAULT 50,
    `confidence` INTEGER NOT NULL DEFAULT 50,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `autonomyTier` VARCHAR(191) NOT NULL DEFAULT 'one_by_one',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PROPOSED',
    `resolvedAt` DATETIME(3) NULL,
    `resolvedBy` VARCHAR(191) NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AgentAction_userId_status_priority_idx`(`userId`, `status`, `priority`),
    UNIQUE INDEX `AgentAction_userId_dedupKey_key`(`userId`, `dedupKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AgentAction` ADD CONSTRAINT `AgentAction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
