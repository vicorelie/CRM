-- phpMyAdmin SQL Dump
-- Base de données : `comparateur_demenagement`

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `comparateur_demenagement` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `comparateur_demenagement`;

-- Structure de la table `avis`
CREATE TABLE IF NOT EXISTS `avis` (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Identifiant unique',
  `id_demande` int(11) UNSIGNED NOT NULL COMMENT 'ID de la demande',
  `id_demenageur` int(11) UNSIGNED NOT NULL COMMENT 'ID du déménageur',
  `note` int(1) NOT NULL COMMENT 'Note de 1 à 5',
  `titre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Titre de l''avis',
  `commentaire` text COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Commentaire',
  `note_ponctualite` int(1) DEFAULT NULL COMMENT 'Note ponctualité (1-5)',
  `note_professionnalisme` int(1) DEFAULT NULL COMMENT 'Note professionnalisme (1-5)',
  `note_rapport_qualite_prix` int(1) DEFAULT NULL COMMENT 'Note rapport qualité/prix (1-5)',
  `recommande` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Client recommande ou non',
  `modere` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Avis modéré par l''équipe',
  `publie` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Avis publié sur le site',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `idx_demenageur` (`id_demenageur`),
  KEY `idx_note` (`note`),
  KEY `idx_publie` (`publie`),
  KEY `id_demande` (`id_demande`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Avis clients sur les déménageurs';

-- Structure de la table `demandes_devis`
CREATE TABLE IF NOT EXISTS `demandes_devis` (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Identifiant unique de la demande',
  `ville_depart` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Code postal ou ville de départ',
  `ville_arrivee` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Code postal ou ville d''arrivée',
  `date_demenagement` date NOT NULL COMMENT 'Date souhaitée du déménagement',
  `type_logement` enum('studio','t2','t3','t4+') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Type de logement actuel',
  `surface` int(11) DEFAULT NULL COMMENT 'Surface en m²',
  `services_additionnels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Services demandés (emballage, démontage, etc.)' CHECK (json_valid(`services_additionnels`)),
  `nom_client` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nom complet du client',
  `email_client` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Email du client',
  `telephone_client` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Téléphone du client',
  `statut` enum('nouveau','en_cours','devis_envoyes','termine','annule') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'nouveau' COMMENT 'Statut de la demande',
  `nombre_devis_recus` int(11) NOT NULL DEFAULT 0 COMMENT 'Nombre de devis reçus',
  `notes_internes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Notes internes pour le suivi',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Date de création',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Date de mise à jour',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `idx_email` (`email_client`),
  KEY `idx_date` (`date_demenagement`),
  KEY `idx_statut` (`statut`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Demandes de devis des clients';

-- Structure de la table `demenageurs`
CREATE TABLE IF NOT EXISTS `demenageurs` (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Identifiant unique',
  `nom_entreprise` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nom de l''entreprise',
  `siret` varchar(14) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Numéro SIRET',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Email de contact',
  `telephone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Téléphone',
  `adresse` text COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Adresse complète',
  `ville` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Ville principale',
  `code_postal` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Code postal',
  `zone_intervention` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Départements ou villes couverts' CHECK (json_valid(`zone_intervention`)),
  `certifications` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Certifications (ISO, etc.)' CHECK (json_valid(`certifications`)),
  `assurance` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Assurance professionnelle',
  `note_moyenne` decimal(3,2) DEFAULT 0.00 COMMENT 'Note moyenne /5',
  `nombre_avis` int(11) DEFAULT 0 COMMENT 'Nombre d''avis',
  `actif` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Déménageur actif',
  `verifie` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Déménageur vérifié par l''équipe',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_ville` (`ville`),
  KEY `idx_actif` (`actif`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Déménageurs partenaires';

-- Déchargement des données de la table `demenageurs`
INSERT INTO `demenageurs` (`id`, `uuid`, `nom_entreprise`, `siret`, `email`, `telephone`, `adresse`, `ville`, `code_postal`, `zone_intervention`, `certifications`, `assurance`, `note_moyenne`, `nombre_avis`, `actif`, `verifie`, `created_at`, `updated_at`) VALUES
(1, '7fea92a43411518d2459ff4770ffe67d', 'DéménExpress Paris', NULL, 'contact@demenexpress.fr', '0123456789', NULL, 'Paris', '75001', '[\"75\", \"92\", \"93\", \"94\"]', NULL, NULL, '4.80', 156, 1, 1, '2025-11-10 13:42:02', '2025-11-10 13:42:02'),
(2, '951d73529fd84081899d3b910d4a0d26', 'MobiTransport Lyon', NULL, 'info@mobitransport.fr', '0412345678', NULL, 'Lyon', '69001', '[\"69\", \"01\", \"42\"]', NULL, NULL, '4.60', 98, 1, 1, '2025-11-10 13:42:02', '2025-11-10 13:42:02'),
(3, 'ca23bdd829ec4f22f7e3549ae9208550', 'SecurDém Marseille', NULL, 'contact@securdem.fr', '0487654321', NULL, 'Marseille', '13001', '[\"13\", \"83\", \"84\"]', NULL, NULL, '4.70', 132, 1, 1, '2025-11-10 13:42:02', '2025-11-10 13:42:02'),
(4, 'e6f34847e86639ce986e1e90aa264e50', 'ProMove Bordeaux', NULL, 'hello@promove.fr', '0556789012', NULL, 'Bordeaux', '33000', '[\"33\", \"24\", \"47\"]', NULL, NULL, '4.50', 76, 1, 1, '2025-11-10 13:42:02', '2025-11-10 13:42:02'),
(5, 'bf5d0e713965a5fadc6d0281dc25308e', 'TransFrance National', NULL, 'contact@transfrance.fr', '0800123456', NULL, 'Paris', '75010', '[\"*\"]', NULL, NULL, '4.90', 234, 1, 1, '2025-11-10 13:42:02', '2025-11-10 13:42:02');

-- Structure de la table `devis`
CREATE TABLE IF NOT EXISTS `devis` (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Identifiant unique',
  `id_demande` int(11) UNSIGNED NOT NULL COMMENT 'ID de la demande de devis',
  `id_demenageur` int(11) UNSIGNED NOT NULL COMMENT 'ID du déménageur',
  `montant_ht` decimal(10,2) NOT NULL COMMENT 'Montant HT en euros',
  `montant_ttc` decimal(10,2) NOT NULL COMMENT 'Montant TTC en euros',
  `tva` decimal(5,2) NOT NULL DEFAULT 20.00 COMMENT 'Taux de TVA',
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Détails du devis (prestations, quantités, etc.)' CHECK (json_valid(`details`)),
  `conditions` text COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Conditions générales',
  `validite_jours` int(11) DEFAULT 30 COMMENT 'Durée de validité en jours',
  `statut` enum('envoye','lu','accepte','refuse','expire') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'envoye' COMMENT 'Statut du devis',
  `date_envoi` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Date d''envoi',
  `date_lecture` timestamp NULL DEFAULT NULL COMMENT 'Date de première lecture',
  `date_reponse` timestamp NULL DEFAULT NULL COMMENT 'Date d''acceptation/refus',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `idx_demande` (`id_demande`),
  KEY `idx_demenageur` (`id_demenageur`),
  KEY `idx_statut` (`statut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Devis envoyés par les déménageurs';

-- Structure de la vue `demandes_recentes`
CREATE OR REPLACE VIEW `demandes_recentes` AS
SELECT `d`.`id` AS `id`, `d`.`uuid` AS `uuid`, `d`.`ville_depart` AS `ville_depart`, `d`.`ville_arrivee` AS `ville_arrivee`, `d`.`date_demenagement` AS `date_demenagement`, `d`.`type_logement` AS `type_logement`, `d`.`nom_client` AS `nom_client`, `d`.`email_client` AS `email_client`, `d`.`statut` AS `statut`, `d`.`nombre_devis_recus` AS `nombre_devis_recus`, `d`.`created_at` AS `created_at`
FROM `demandes_devis` AS `d`
ORDER BY `d`.`created_at` DESC LIMIT 50;

-- Structure de la vue `stats_globales`
CREATE OR REPLACE VIEW `stats_globales` AS
SELECT count(0) AS `total_demandes`,
count(case when `demandes_devis`.`statut` = 'nouveau' then 1 end) AS `demandes_nouvelles`,
count(case when `demandes_devis`.`statut` = 'termine' then 1 end) AS `demandes_terminees`,
avg(`demandes_devis`.`nombre_devis_recus`) AS `moyenne_devis_par_demande`,
(select count(0) from `demenageurs` where `demenageurs`.`actif` = 1) AS `demenageurs_actifs`
FROM `demandes_devis`;

-- Contraintes pour la table `avis`
ALTER TABLE `avis`
  ADD CONSTRAINT `avis_ibfk_1` FOREIGN KEY (`id_demande`) REFERENCES `demandes_devis` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `avis_ibfk_2` FOREIGN KEY (`id_demenageur`) REFERENCES `demenageurs` (`id`) ON DELETE CASCADE;

-- Contraintes pour la table `devis`
ALTER TABLE `devis`
  ADD CONSTRAINT `devis_ibfk_1` FOREIGN KEY (`id_demande`) REFERENCES `demandes_devis` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `devis_ibfk_2` FOREIGN KEY (`id_demenageur`) REFERENCES `demenageurs` (`id`) ON DELETE CASCADE;

COMMIT;
