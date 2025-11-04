<?php
require 'config.php';
requireSubscription($pdo);
csrf_protect_post();

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// Vérifier que le formulaire a été soumis
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Récupérer et nettoyer les données
    $study_country  = trim($_POST['study_country'] ?? '');
    $student_status = trim($_POST['student_status'] ?? '');
    // Selon le statut, récupérer la donnée appropriée :
    // Pour lycéen, on attend 'class_name' ; pour étudiant, 'student_year'
    if ($student_status === 'lyceen') {
        $student_level = ''; // on n'utilise pas student_level pour lycéen
        $student_year  = trim($_POST['class_name'] ?? '');
    } elseif ($student_status === 'etudiant') {
        $student_level = trim($_POST['student_level'] ?? ''); // facultatif ou non
        $student_year  = trim($_POST['student_year'] ?? '');
    } else {
        $student_level = '';
        $student_year  = '';
    }
    
    // Mise à jour dans la base
    $updateSql = "UPDATE Users 
                  SET study_country = :study_country,
                      student_status = :student_status,
                      student_level = :student_level,
                      student_year = :student_year
                  WHERE uuid = :uuid";
    $stmtUpdate = $pdo->prepare($updateSql);
    $stmtUpdate->execute([
        ':study_country'  => $study_country,
        ':student_status' => $student_status,
        ':student_level'  => $student_level,
        ':student_year'   => $student_year,
        ':uuid'           => $_SESSION['user_uuid']
    ]);
    
    // Redirection vers la page principale
    header("Location: generalLearn.php");
    exit();
} else {
    // Si le formulaire n'est pas soumis correctement, on redirige
    header("Location: generalLearn.php");
    exit();
}
