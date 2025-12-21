-- ============================================
-- Base de données pour le comparateur de déménagement
-- ============================================

CREATE DATABASE IF NOT EXISTS `comparateur_demenagement`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `comparateur_demenagement`;

-- ============================================
-- Table: demandes_devis
-- Stocke toutes les demandes de devis clients
-- ============================================

CREATE TABLE IF NOT EXISTS `demandes_devis` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(32) NOT NULL COMMENT 'Identifiant unique de la demande',

    -- Informations du déménagement
    `ville_depart` VARCHAR(255) NOT NULL COMMENT 'Code postal ou ville de départ',
    `ville_arrivee` VARCHAR(255) NOT NULL COMMENT 'Code postal ou ville d\'arrivée',
    `date_demenagement` DATE NOT NULL COMMENT 'Date souhaitée du déménagement',
    `type_logement` ENUM('studio', 't2', 't3', 't4+') NOT NULL COMMENT 'Type de logement actuel',
    `surface` INT(11) DEFAULT NULL COMMENT 'Surface en m²',
    `services_additionnels` JSON DEFAULT NULL COMMENT 'Services demandés (emballage, démontage, etc.)',

    -- Informations client
    `nom_client` VARCHAR(255) NOT NULL COMMENT 'Nom complet du client',
    `email_client` VARCHAR(255) NOT NULL COMMENT 'Email du client',
    `telephone_client` VARCHAR(20) NOT NULL COMMENT 'Téléphone du client',

    -- Gestion de la demande
    `statut` ENUM('nouveau', 'en_cours', 'devis_envoyes', 'termine', 'annule') NOT NULL DEFAULT 'nouveau' COMMENT 'Statut de la demande',
    `nombre_devis_recus` INT(11) NOT NULL DEFAULT 0 COMMENT 'Nombre de devis reçus',
    `notes_internes` TEXT DEFAULT NULL COMMENT 'Notes internes pour le suivi',

    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date de création',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Date de mise à jour',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uuid` (`uuid`),
    KEY `idx_email` (`email_client`),
    KEY `idx_date` (`date_demenagement`),
    KEY `idx_statut` (`statut`),
    KEY `idx_created` (`created_at`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Demandes de devis des clients';


-- ============================================
-- Table: demenageurs
-- Stocke les informations des déménageurs partenaires
-- ============================================

CREATE TABLE IF NOT EXISTS `demenageurs` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(32) NOT NULL COMMENT 'Identifiant unique',

    -- Informations entreprise
    `nom_entreprise` VARCHAR(255) NOT NULL COMMENT 'Nom de l\'entreprise',
    `siret` VARCHAR(14) DEFAULT NULL COMMENT 'Numéro SIRET',
    `email` VARCHAR(255) NOT NULL COMMENT 'Email de contact',
    `telephone` VARCHAR(20) NOT NULL COMMENT 'Téléphone',
    `adresse` TEXT DEFAULT NULL COMMENT 'Adresse complète',
    `ville` VARCHAR(255) DEFAULT NULL COMMENT 'Ville principale',
    `code_postal` VARCHAR(5) DEFAULT NULL COMMENT 'Code postal',
    `zone_intervention` JSON DEFAULT NULL COMMENT 'Départements ou villes couverts',

    -- Informations métier
    `certifications` JSON DEFAULT NULL COMMENT 'Certifications (ISO, etc.)',
    `assurance` VARCHAR(255) DEFAULT NULL COMMENT 'Assurance professionnelle',
    `note_moyenne` DECIMAL(3,2) DEFAULT 0.00 COMMENT 'Note moyenne /5',
    `nombre_avis` INT(11) DEFAULT 0 COMMENT 'Nombre d\'avis',

    -- Statut
    `actif` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Déménageur actif',
    `verifie` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Déménageur vérifié par l\'équipe',

    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uuid` (`uuid`),
    UNIQUE KEY `email` (`email`),
    KEY `idx_ville` (`ville`),
    KEY `idx_actif` (`actif`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Déménageurs partenaires';


-- ============================================
-- Table: devis
-- Stocke les devis envoyés par les déménageurs
-- ============================================

CREATE TABLE IF NOT EXISTS `devis` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(32) NOT NULL COMMENT 'Identifiant unique',

    -- Relations
    `id_demande` INT(11) UNSIGNED NOT NULL COMMENT 'ID de la demande de devis',
    `id_demenageur` INT(11) UNSIGNED NOT NULL COMMENT 'ID du déménageur',

    -- Détails du devis
    `montant_ht` DECIMAL(10,2) NOT NULL COMMENT 'Montant HT en euros',
    `montant_ttc` DECIMAL(10,2) NOT NULL COMMENT 'Montant TTC en euros',
    `tva` DECIMAL(5,2) NOT NULL DEFAULT 20.00 COMMENT 'Taux de TVA',
    `details` JSON DEFAULT NULL COMMENT 'Détails du devis (prestations, quantités, etc.)',
    `conditions` TEXT DEFAULT NULL COMMENT 'Conditions générales',
    `validite_jours` INT(11) DEFAULT 30 COMMENT 'Durée de validité en jours',

    -- Statut
    `statut` ENUM('envoye', 'lu', 'accepte', 'refuse', 'expire') NOT NULL DEFAULT 'envoye' COMMENT 'Statut du devis',
    `date_envoi` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date d\'envoi',
    `date_lecture` TIMESTAMP NULL DEFAULT NULL COMMENT 'Date de première lecture',
    `date_reponse` TIMESTAMP NULL DEFAULT NULL COMMENT 'Date d\'acceptation/refus',

    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uuid` (`uuid`),
    KEY `idx_demande` (`id_demande`),
    KEY `idx_demenageur` (`id_demenageur`),
    KEY `idx_statut` (`statut`),

    FOREIGN KEY (`id_demande`) REFERENCES `demandes_devis`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`id_demenageur`) REFERENCES `demenageurs`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Devis envoyés par les déménageurs';


-- ============================================
-- Table: avis
-- Stocke les avis clients sur les déménageurs
-- ============================================

CREATE TABLE IF NOT EXISTS `avis` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(32) NOT NULL COMMENT 'Identifiant unique',

    -- Relations
    `id_demande` INT(11) UNSIGNED NOT NULL COMMENT 'ID de la demande',
    `id_demenageur` INT(11) UNSIGNED NOT NULL COMMENT 'ID du déménageur',

    -- Contenu de l'avis
    `note` INT(1) NOT NULL COMMENT 'Note de 1 à 5',
    `titre` VARCHAR(255) DEFAULT NULL COMMENT 'Titre de l\'avis',
    `commentaire` TEXT DEFAULT NULL COMMENT 'Commentaire',

    -- Critères détaillés
    `note_ponctualite` INT(1) DEFAULT NULL COMMENT 'Note ponctualité (1-5)',
    `note_professionnalisme` INT(1) DEFAULT NULL COMMENT 'Note professionnalisme (1-5)',
    `note_rapport_qualite_prix` INT(1) DEFAULT NULL COMMENT 'Note rapport qualité/prix (1-5)',
    `recommande` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Client recommande ou non',

    -- Modération
    `modere` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Avis modéré par l\'équipe',
    `publie` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Avis publié sur le site',

    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uuid` (`uuid`),
    KEY `idx_demenageur` (`id_demenageur`),
    KEY `idx_note` (`note`),
    KEY `idx_publie` (`publie`),

    FOREIGN KEY (`id_demande`) REFERENCES `demandes_devis`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`id_demenageur`) REFERENCES `demenageurs`(`id`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Avis clients sur les déménageurs';


-- ============================================
-- Données de test
-- ============================================

-- Insérer quelques déménageurs de test
INSERT INTO `demenageurs` (
    `uuid`, `nom_entreprise`, `email`, `telephone`, `ville`, `code_postal`,
    `zone_intervention`, `note_moyenne`, `nombre_avis`, `actif`, `verifie`
) VALUES
    (MD5(RAND()), 'DéménExpress Paris', 'contact@demenexpress.fr', '0123456789', 'Paris', '75001', JSON_ARRAY('75', '92', '93', '94'), 4.8, 156, TRUE, TRUE),
    (MD5(RAND()), 'MobiTransport Lyon', 'info@mobitransport.fr', '0412345678', 'Lyon', '69001', JSON_ARRAY('69', '01', '42'), 4.6, 98, TRUE, TRUE),
    (MD5(RAND()), 'SecurDém Marseille', 'contact@securdem.fr', '0487654321', 'Marseille', '13001', JSON_ARRAY('13', '83', '84'), 4.7, 132, TRUE, TRUE),
    (MD5(RAND()), 'ProMove Bordeaux', 'hello@promove.fr', '0556789012', 'Bordeaux', '33000', JSON_ARRAY('33', '24', '47'), 4.5, 76, TRUE, TRUE),
    (MD5(RAND()), 'TransFrance National', 'contact@transfrance.fr', '0800123456', 'Paris', '75010', JSON_ARRAY('*'), 4.9, 234, TRUE, TRUE);


-- ============================================
-- Vues utiles
-- ============================================

-- Vue: Statistiques globales
CREATE OR REPLACE VIEW `stats_globales` AS
SELECT
    COUNT(*) as total_demandes,
    COUNT(CASE WHEN statut = 'nouveau' THEN 1 END) as demandes_nouvelles,
    COUNT(CASE WHEN statut = 'termine' THEN 1 END) as demandes_terminees,
    AVG(nombre_devis_recus) as moyenne_devis_par_demande,
    (SELECT COUNT(*) FROM demenageurs WHERE actif = TRUE) as demenageurs_actifs
FROM demandes_devis;

-- Vue: Demandes récentes avec détails
CREATE OR REPLACE VIEW `demandes_recentes` AS
SELECT
    d.id,
    d.uuid,
    d.ville_depart,
    d.ville_arrivee,
    d.date_demenagement,
    d.type_logement,
    d.nom_client,
    d.email_client,
    d.statut,
    d.nombre_devis_recus,
    d.created_at
FROM demandes_devis d
ORDER BY d.created_at DESC
LIMIT 50;

COMMIT;
