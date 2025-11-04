<?php
// addSubject.php

require 'config.php';
requireSubscription($pdo);

// Protection CSRF
csrf_protect_post();

// Vérifier que l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Récupérer le nom du sujet
    $subjectName = '';
    if (isset($_POST['subject_name']) && $_POST['subject_name'] !== 'other') {
        $subjectName = trim($_POST['subject_name']);
    } elseif (isset($_POST['manual_subject'])) {
        $subjectName = trim($_POST['manual_subject']);
    }
    if (empty($subjectName)) {
        header("Location: studyList.php?addSubjectError=1");
        exit();
    }

    // Vérifier si la matière a déjà été ajoutée
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM studySubjects WHERE uuid = :uuid AND LOWER(subject_name) = :sname");
    $stmt->execute([
        ':uuid'  => $_SESSION['user_uuid'],
        ':sname' => strtolower($subjectName)
    ]);
    if ($stmt->fetchColumn() > 0) {
        header("Location: studyList.php?subjectAlreadyExists=1");
        exit();
    }

    // Récupérer le type d'étudiant depuis la table studentCurriculum
    $stmtType = $pdo->prepare("SELECT student_type FROM studentCurriculum WHERE uuid = :uuid LIMIT 1");
    $stmtType->execute([':uuid' => $_SESSION['user_uuid']]);
    $rowType = $stmtType->fetch(PDO::FETCH_ASSOC);
    $studentType = $rowType['student_type'] ?? '';

    $subjectUnit = null;
    $courseName  = null;
    if ($studentType === 'school') {
        // Pour les étudiants school, on attend un coefficient (subject_unit)
        $subjectUnit = trim($_POST['subject_unit'] ?? '');
        if (empty($subjectUnit)) {
            header("Location: studyList.php?addSubjectError=Coefficient manquant");
            exit();
        }
    } elseif ($studentType === 'academic') {
        // Pour les étudiants academic, on attend la sélection du course (course_name)
        $courseName = trim($_POST['course_name'] ?? '');
        if (empty($courseName)) {
            header("Location: studyList.php?addSubjectError=Course manquant");
            exit();
        }
    }

    // Insertion dans la table studySubjects
    $sql = "INSERT INTO studySubjects (uuid, created_time, subject_name, subject_unit, course_name)
            VALUES (:uuid, NOW(), :subject_name, :subject_unit, :course_name)";
    $stmtInsert = $pdo->prepare($sql);
    $stmtInsert->execute([
        ':uuid'         => $_SESSION['user_uuid'],
        ':subject_name' => $subjectName,
        ':subject_unit' => $subjectUnit,
        ':course_name'  => $courseName
    ]);

    header("Location: studyList.php?addSubjectSuccess=1");
    exit();
} else {
    header("Location: studyList.php");
    exit();
}
?>
