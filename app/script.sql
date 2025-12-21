-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost:3306
-- Généré le : mer. 01 jan. 2025 à 15:50
-- Version du serveur : 10.6.20-MariaDB
-- Version de PHP : 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `vicorelie_qcm`
--

-- --------------------------------------------------------

--
-- Structure de la table `documentQuestions`
--

CREATE TABLE `documentQuestions` (
  `id` int(11) NOT NULL,
  `uuid` char(36) NOT NULL,
  `created_time` datetime DEFAULT current_timestamp(),
  `questions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`questions`)),
  `answers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`answers`)),
  `document_id` int(11) NOT NULL,
  `openaiCost` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `documentResumes`
--

CREATE TABLE `documentResumes` (
  `id` int(11) NOT NULL,
  `uuid` char(36) NOT NULL,
  `created_time` datetime DEFAULT current_timestamp(),
  `document_id` int(11) NOT NULL,
  `resume_content` text DEFAULT NULL,
  `openaiCost` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `Documents`
--

CREATE TABLE `Documents` (
  `id` int(11) NOT NULL,
  `uuid` char(36) NOT NULL,
  `created_time` datetime DEFAULT current_timestamp(),
  `filename` varchar(255) NOT NULL,
  `path` varchar(500) NOT NULL,
  `language` varchar(100) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `extract_content` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `qcmSubmit`
--

CREATE TABLE `qcmSubmit` (
  `id` int(11) NOT NULL,
  `uuid` char(36) NOT NULL,
  `created_time` datetime DEFAULT current_timestamp(),
  `document_id` int(11) NOT NULL,
  `submitAnswer` varchar(255) NOT NULL,
  `submitNote` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `Users`
--

CREATE TABLE `Users` (
  `uuid` char(36) NOT NULL,
  `totalCost` decimal(10,2) NOT NULL DEFAULT 0.00,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `Status` varchar(50) NOT NULL DEFAULT 'active',
  `password_hash` varchar(255) NOT NULL,
  `monthly_limit` decimal(10,2) DEFAULT 0.00,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `documentQuestions`
--
ALTER TABLE `documentQuestions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `document_id` (`document_id`),
  ADD KEY `uuid` (`uuid`);

--
-- Index pour la table `documentResumes`
--
ALTER TABLE `documentResumes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `document_id` (`document_id`),
  ADD KEY `uuid` (`uuid`);

--
-- Index pour la table `Documents`
--
ALTER TABLE `Documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uuid` (`uuid`);

--
-- Index pour la table `qcmSubmit`
--
ALTER TABLE `qcmSubmit`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uuid` (`uuid`),
  ADD KEY `document_id` (`document_id`);

--
-- Index pour la table `Users`
--
ALTER TABLE `Users`
  ADD PRIMARY KEY (`uuid`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `documentQuestions`
--
ALTER TABLE `documentQuestions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `documentResumes`
--
ALTER TABLE `documentResumes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `Documents`
--
ALTER TABLE `Documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `qcmSubmit`
--
ALTER TABLE `qcmSubmit`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `documentQuestions`
--
ALTER TABLE `documentQuestions`
  ADD CONSTRAINT `documentQuestions_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `Documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `documentQuestions_ibfk_2` FOREIGN KEY (`uuid`) REFERENCES `Users` (`uuid`) ON DELETE CASCADE;

--
-- Contraintes pour la table `documentResumes`
--
ALTER TABLE `documentResumes`
  ADD CONSTRAINT `documentResumes_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `Documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `documentResumes_ibfk_2` FOREIGN KEY (`uuid`) REFERENCES `Users` (`uuid`) ON DELETE CASCADE;

--
-- Contraintes pour la table `Documents`
--
ALTER TABLE `Documents`
  ADD CONSTRAINT `Documents_ibfk_1` FOREIGN KEY (`uuid`) REFERENCES `Users` (`uuid`) ON DELETE CASCADE;

--
-- Contraintes pour la table `qcmSubmit`
--
ALTER TABLE `qcmSubmit`
  ADD CONSTRAINT `qcmSubmit_ibfk_1` FOREIGN KEY (`uuid`) REFERENCES `Users` (`uuid`) ON DELETE CASCADE,
  ADD CONSTRAINT `qcmSubmit_ibfk_2` FOREIGN KEY (`document_id`) REFERENCES `Documents` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
