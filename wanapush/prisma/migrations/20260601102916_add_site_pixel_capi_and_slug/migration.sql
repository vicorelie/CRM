-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : Marketing tracking — Meta Pixel + Conversions API server-side
-- Date     : 2026-06-01
-- Sprint 1 — J1 du chantier "Pixel auto-install sur sites générés"
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Ajouter la colonne `slug` à GeneratedSite (nullable pour permettre le backfill)
ALTER TABLE `GeneratedSite` ADD COLUMN `slug` VARCHAR(191) NULL;

-- 2) Backfill : extraire les slugs existants depuis meta.siteSlug (JSON)
--    9 sites existants au 2026-06-01, dont 8 ont un slug dans meta.siteSlug.
--    Le 9ème site (sans slug) restera à NULL — comportement OK car le champ est nullable.
UPDATE `GeneratedSite`
SET `slug` = JSON_UNQUOTE(JSON_EXTRACT(`meta`, '$.siteSlug'))
WHERE `slug` IS NULL
  AND `meta` IS NOT NULL
  AND JSON_EXTRACT(`meta`, '$.siteSlug') IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(`meta`, '$.siteSlug')) <> 'null';

-- 3) Créer la table SitePixel (config Pixel/CAPI par site généré)
CREATE TABLE `SitePixel` (
    `id` VARCHAR(191) NOT NULL,
    `generatedSiteId` VARCHAR(191) NOT NULL,
    `adAccountId` VARCHAR(191) NOT NULL,
    `pixelId` VARCHAR(191) NOT NULL,
    `pixelName` VARCHAR(191) NULL,
    `capiAccessToken` TEXT NOT NULL,
    `testEventCode` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `events` JSON NOT NULL,
    `consentRequired` BOOLEAN NOT NULL DEFAULT false,
    `lastEventAt` DATETIME(3) NULL,
    `lastErrorAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SitePixel_generatedSiteId_key`(`generatedSiteId`),
    INDEX `SitePixel_adAccountId_idx`(`adAccountId`),
    INDEX `SitePixel_enabled_lastEventAt_idx`(`enabled`, `lastEventAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4) Créer la table CapiEvent (audit log events CAPI envoyés, PII toujours hashed)
CREATE TABLE `CapiEvent` (
    `id` VARCHAR(191) NOT NULL,
    `sitePixelId` VARCHAR(191) NOT NULL,
    `eventName` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `eventTime` DATETIME(3) NOT NULL,
    `eventSourceUrl` TEXT NULL,
    `userDataHashed` JSON NULL,
    `customData` JSON NULL,
    `status` ENUM('SENT', 'FAILED', 'RETRIED') NOT NULL DEFAULT 'SENT',
    `metaResponse` JSON NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CapiEvent_sitePixelId_createdAt_idx`(`sitePixelId`, `createdAt`),
    INDEX `CapiEvent_eventName_createdAt_idx`(`eventName`, `createdAt`),
    INDEX `CapiEvent_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5) Index unique sur GeneratedSite.slug
--    Appliqué APRÈS le backfill pour éviter l'échec en cas de duplicates
--    (vérifié manuellement : 0 duplicate au 2026-06-01)
CREATE UNIQUE INDEX `GeneratedSite_slug_key` ON `GeneratedSite`(`slug`);

-- 6) Foreign keys
ALTER TABLE `SitePixel`
    ADD CONSTRAINT `SitePixel_generatedSiteId_fkey`
    FOREIGN KEY (`generatedSiteId`) REFERENCES `GeneratedSite`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SitePixel`
    ADD CONSTRAINT `SitePixel_adAccountId_fkey`
    FOREIGN KEY (`adAccountId`) REFERENCES `AdAccount`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CapiEvent`
    ADD CONSTRAINT `CapiEvent_sitePixelId_fkey`
    FOREIGN KEY (`sitePixelId`) REFERENCES `SitePixel`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
