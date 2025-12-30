<?php
/*
 * Script pour corriger automatiquement le lien entre Quotes et Potentials
 * À exécuter via un cron ou un event handler
 */

chdir(dirname(__FILE__));
require_once 'config.inc.php';

$conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);

if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

// Trouver tous les quotes qui ont une relation dans crmentityrel mais pas de potentialid
$query = "UPDATE vtiger_quotes q
    INNER JOIN vtiger_crmentityrel cr ON (cr.relcrmid = q.quoteid AND cr.module = 'Potentials')
    SET q.potentialid = cr.crmid
    WHERE q.potentialid IS NULL OR q.potentialid = 0";

$result = $conn->query($query);

if ($result) {
    echo "Mise à jour réussie. Lignes affectées: " . $conn->affected_rows . PHP_EOL;
} else {
    echo "Erreur: " . $conn->error . PHP_EOL;
}

$conn->close();
