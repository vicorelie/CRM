<?php
// addSubjectDocument.php

require 'config.php';
requireSubscription($pdo);
csrf_protect_post();

// Vérifier que l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $studySubjectId = trim($_POST['study_subjects_id'] ?? '');
    $topic    = trim($_POST['topic']    ?? '');
    $subtopic = trim($_POST['sub_topic']?? '');
    $language = trim($_POST['language'] ?? 'fr');

    // topic est obligatoire, study_subjects_id doit être présent
    if (empty($studySubjectId) || empty($topic)) {
        // Redirection ou message d'erreur
        header('Location: studyList.php?docAddError=missing_data');
        exit();
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO subjectDocuments 
                (uuid, created_time, language, study_subjects_id, topic, sub_topic)
            VALUES 
                (:uuid, NOW(), :language, :study_subjects_id, :topic, :sub_topic)
        ");
        $stmt->execute([
            ':uuid'     => $_SESSION['user_uuid'],
            ':language' => $language,
            ':study_subjects_id'  => $studySubjectId,
            ':topic'    => $topic,
            ':sub_topic'=> $subtopic
        ]);

        // Redirection succès
        header('Location: studyList.php?docAddSuccess=1#documentsContainer');
        exit();

    } catch (PDOException $e) {
        // Gérer l'erreur
        header('Location: studyList.php?docAddError=' . urlencode($e->getMessage()));
        exit();
    }

} else {
    // Si on accède à ce fichier autrement que POST
    header('Location: studyList.php');
    exit();
}
