<?php
// getSchoolYear.php

require 'config.php';

if (!isset($_GET['country'])) {
    echo json_encode([]);
    exit;
}

$country = $_GET['country'];

$sql = "SELECT DISTINCT class_name 
        FROM schoolYearList 
        WHERE country = :country 
        ORDER BY class_name ASC";
$stmt = $pdo->prepare($sql);
$stmt->execute([':country' => $country]);
$classes = $stmt->fetchAll(PDO::FETCH_COLUMN);

echo json_encode($classes);
?>