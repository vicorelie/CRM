<?php
// getAcademicYear.php

require 'config.php';

if (!isset($_GET['country'])) {
    echo json_encode([]);
    exit;
}

$country = $_GET['country'];

// On récupère à la fois la colonne diploma_name et study_year
$sql = "
    SELECT DISTINCT diploma_name, study_year
    FROM academicYearList
    WHERE country = :country
    ORDER BY diploma_name ASC
";
$stmt = $pdo->prepare($sql);
$stmt->execute([':country' => $country]);

// On récupère en mode associatif pour pouvoir renvoyer un tableau d'objets
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($rows);
?>