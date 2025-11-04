<?php
// getSubjects.php

session_start();
require 'config.php';

$type = $_GET['type'] ?? '';
if ($type === 'academic') {
    $sql = "SELECT subject_name FROM academicSubjectList ORDER BY subject_name ASC";
} elseif ($type === 'school') {
    $sql = "SELECT subject_name FROM schoolSubjectList ORDER BY subject_name ASC";
} else {
    echo json_encode([]);
    exit;
}

$stmt = $pdo->prepare($sql);
$stmt->execute();
$subjects = $stmt->fetchAll(PDO::FETCH_COLUMN);

echo json_encode($subjects);
