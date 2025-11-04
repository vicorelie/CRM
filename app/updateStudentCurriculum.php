<?php
// updateStudentCurriculum.php

require 'config.php';
csrf_protect_post();

// Vérifier que l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// Déterminer la page d'origine (pour la redirection)
$fromPage = $_POST['from_page'] ?? 'studyList'; // Valeur par défaut

// Récupérer les champs du formulaire
$uuid            = $_SESSION['user_uuid']; 
$student_country = $_POST['student_country'] ?? '';
$student_type    = $_POST['student_type']    ?? '';

try {
    // Vérifier si un enregistrement existe déjà
    $stmtCheck = $pdo->prepare("SELECT id FROM studentCurriculum WHERE uuid = :uuid LIMIT 1");
    $stmtCheck->execute([':uuid' => $uuid]);
    $row = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if ($student_type === 'school') {
        $school_class = $_POST['student_school_class'] ?? '';
        // Pour le type "school", on insère/actualise en mettant les colonnes académiques à NULL
        $sql = "
            INSERT INTO studentCurriculum (
                uuid, student_type, student_country, student_school_class,
                student_academic_course_1, student_academic_diploma_1, student_academic_year_1,
                student_academic_course_2, student_academic_diploma_2, student_academic_year_2,
                student_academic_course_3, student_academic_diploma_3, student_academic_year_3
            ) 
            VALUES (
                :uuid, :student_type, :student_country, :student_school_class,
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
            )
            ON DUPLICATE KEY UPDATE
                student_type = VALUES(student_type),
                student_country = VALUES(student_country),
                student_school_class = VALUES(student_school_class),
                student_academic_course_1 = NULL,
                student_academic_diploma_1 = NULL,
                student_academic_year_1 = NULL,
                student_academic_course_2 = NULL,
                student_academic_diploma_2 = NULL,
                student_academic_year_2 = NULL,
                student_academic_course_3 = NULL,
                student_academic_diploma_3 = NULL,
                student_academic_year_3 = NULL
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':uuid'                  => $uuid,
            ':student_type'          => $student_type,
            ':student_country'       => $student_country,
            ':student_school_class'  => $school_class
        ]);

    } else {
        // Pour le type "academic"
        $course1  = $_POST['student_academic_course_1']  ?? '';
        $diploma1 = $_POST['student_academic_diploma_1'] ?? '';
        $year1    = $_POST['student_academic_year_1']    ?? '';

        $course2  = $_POST['student_academic_course_2']  ?? '';
        $diploma2 = $_POST['student_academic_diploma_2'] ?? '';
        $year2    = $_POST['student_academic_year_2']    ?? '';

        $course3  = $_POST['student_academic_course_3']  ?? '';
        $diploma3 = $_POST['student_academic_diploma_3'] ?? '';
        $year3    = $_POST['student_academic_year_3']    ?? '';

        // Pour le type "academic", on met la colonne student_school_class à NULL
        $sql = "
            INSERT INTO studentCurriculum (
                uuid, student_type, student_country, student_school_class,
                student_academic_course_1, student_academic_diploma_1, student_academic_year_1,
                student_academic_course_2, student_academic_diploma_2, student_academic_year_2,
                student_academic_course_3, student_academic_diploma_3, student_academic_year_3
            )
            VALUES (
                :uuid, :student_type, :student_country, NULL,
                :course1, :diploma1, :year1,
                :course2, :diploma2, :year2,
                :course3, :diploma3, :year3
            )
            ON DUPLICATE KEY UPDATE
                student_type = VALUES(student_type),
                student_country = VALUES(student_country),
                student_school_class = NULL,
                student_academic_course_1 = VALUES(student_academic_course_1),
                student_academic_diploma_1 = VALUES(student_academic_diploma_1),
                student_academic_year_1 = VALUES(student_academic_year_1),
                student_academic_course_2 = VALUES(student_academic_course_2),
                student_academic_diploma_2 = VALUES(student_academic_diploma_2),
                student_academic_year_2 = VALUES(student_academic_year_2),
                student_academic_course_3 = VALUES(student_academic_course_3),
                student_academic_diploma_3 = VALUES(student_academic_diploma_3),
                student_academic_year_3 = VALUES(student_academic_year_3)
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':uuid'            => $uuid,
            ':student_type'    => $student_type,
            ':student_country' => $student_country,
            ':course1'         => $course1,
            ':diploma1'        => $diploma1,
            ':year1'           => $year1,
            ':course2'         => $course2,
            ':diploma2'        => $diploma2,
            ':year2'           => $year2,
            ':course3'         => $course3,
            ':diploma3'        => $diploma3,
            ':year3'           => $year3,
        ]);
    }

    // Redirection en fonction de la page d'origine
    if ($fromPage === 'studyList') {
        // Par défaut, on suppose subjectList
        header('Location: studyList.php?updateStudent=success');
    } elseif ($fromPage === 'documentsList') {
        header('Location: documentsList.php?updateStudent=success');
    } else {
        header('Location: subjectList.php?updateStudent=success');
    }
    exit();

} catch (PDOException $e) {
    if ($fromPage === 'studyList') {
        header('Location: studyList.php?updateStudentError=' . urlencode($e->getMessage()));
    } elseif ($fromPage === 'documentsList'){
        header('Location: documentsList.php?updateStudentError=' . urlencode($e->getMessage()));
    } else{
        header('Location: subjectList.php?updateStudentError=' . urlencode($e->getMessage()));
    }
    exit();
}
?>
