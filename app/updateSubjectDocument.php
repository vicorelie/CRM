<?php
// updateSubjectDocument.php

session_start();
require 'config.php';
requireSubscription($pdo);

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $subject_document_id = $_POST['subject_document_id'] ?? null;
    $study_subjects_id   = trim($_POST['study_subjects_id'] ?? '');
    $topic               = trim($_POST['topic'] ?? '');
    $sub_topic           = trim($_POST['sub_topic'] ?? '');

    if ($subject_document_id && $study_subjects_id !== '' && $topic !== '') {
        try {
            // Vérifier que le document appartient à l'utilisateur
            $checkQuery = "SELECT COUNT(*) FROM subjectDocuments WHERE id = :doc_id AND uuid = :uuid";
            $stmtCheck = $pdo->prepare($checkQuery);
            $stmtCheck->execute([
                ':doc_id' => $subject_document_id,
                ':uuid'   => $_SESSION['user_uuid']
            ]);
            if ($stmtCheck->fetchColumn() == 1) {
                // Mettre à jour le document
                $updateQuery = "UPDATE subjectDocuments 
                                SET study_subjects_id = :study_subjects_id, topic = :topic, sub_topic = :sub_topic
                                WHERE id = :doc_id AND uuid = :uuid";
                $stmtUpdate = $pdo->prepare($updateQuery);
                $stmtUpdate->execute([
                    ':study_subjects_id' => $study_subjects_id,
                    ':topic'             => $topic,
                    ':sub_topic'         => $sub_topic,
                    ':doc_id'            => $subject_document_id,
                    ':uuid'              => $_SESSION['user_uuid']
                ]);
            }
        } catch (PDOException $e) {
            die("Erreur lors de la mise à jour : " . htmlspecialchars($e->getMessage()));
        }
    }
}

header("Location: subjectList.php");
exit();
?>
