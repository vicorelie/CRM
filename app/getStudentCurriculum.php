<?php
// getStudentCurriculum.php
session_start();
require 'config.php';

if (!isset($_SESSION['user_uuid'])) {
    echo json_encode([]);
    exit;
}

$uuid = $_SESSION['user_uuid'];

$stmt = $pdo->prepare("
    SELECT student_academic_course_1, student_academic_course_2, student_academic_course_3
    FROM studentCurriculum
    WHERE uuid = :uuid
    LIMIT 1
");
$stmt->execute([':uuid' => $uuid]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    echo json_encode([]);
    exit;
}

$courses = [];
if (!empty($row['student_academic_course_1'])) {
    $courses[] = $row['student_academic_course_1'];
}
if (!empty($row['student_academic_course_2'])) {
    $courses[] = $row['student_academic_course_2'];
}
if (!empty($row['student_academic_course_3'])) {
    $courses[] = $row['student_academic_course_3'];
}

echo json_encode($courses);
?>
