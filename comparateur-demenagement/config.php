<?php
/**
 * Configuration pour le Comparateur de Déménagement
 *
 * Ce fichier contient les paramètres de connexion à la base de données
 * et autres configurations nécessaires au fonctionnement de l'application.
 */

// Désactiver l'affichage des erreurs en production
// En développement, vous pouvez mettre ini_set('display_errors', 1);
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Configuration de la base de données
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'comparateur_demenagement');
define('DB_USER', 'vicorelie_wanatest');  // À MODIFIER selon votre configuration
define('DB_PASS', 'Gru7xVqy3RbyN2rHRIjhKozR');  // À MODIFIER selon votre configuration

// Fuseau horaire
date_default_timezone_set('Europe/Paris');

// Configuration des sessions
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Configuration des emails (pour les notifications futures)
define('SMTP_HOST', '');  // À configurer
define('SMTP_PORT', 587);
define('SMTP_USER', '');  // À configurer
define('SMTP_PASS', '');  // À configurer
define('SMTP_FROM_EMAIL', 'noreply@comparateur-demenagement.fr');
define('SMTP_FROM_NAME', 'Comparateur Déménagement');

// URL de base du site
define('BASE_URL', 'https://spots101.spotifone.com/comparateur-demenagement/');

// Activer/désactiver le mode debug
define('DEBUG_MODE', false);

/**
 * Fonction pour logger les erreurs
 */
function logError($message, $context = []) {
    $logFile = __DIR__ . '/logs/error.log';
    $logDir = dirname($logFile);

    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }

    $timestamp = date('Y-m-d H:i:s');
    $contextStr = !empty($context) ? ' | Context: ' . json_encode($context) : '';
    $logMessage = "[$timestamp] $message$contextStr" . PHP_EOL;

    error_log($logMessage, 3, $logFile);
}

/**
 * Fonction pour gérer les erreurs fatales
 */
function handleError($errno, $errstr, $errfile, $errline) {
    logError("Error [$errno]: $errstr in $errfile on line $errline");

    if (DEBUG_MODE) {
        echo "<b>Error [$errno]:</b> $errstr in <b>$errfile</b> on line <b>$errline</b><br>";
    } else {
        echo "Une erreur est survenue. Veuillez réessayer plus tard.";
    }
}

set_error_handler('handleError');

/**
 * Fonction pour créer une connexion PDO
 *
 * @return PDO Instance de connexion PDO
 * @throws Exception Si la connexion échoue
 */
function getDbConnection() {
    try {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        logError('Database connection failed: ' . $e->getMessage());
        throw new Exception('Impossible de se connecter à la base de données');
    }
}
