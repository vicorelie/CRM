<?php
// deleteSubjectDocument.php

require 'config.php';
csrf_protect_post();

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['subject_document_id'])) {
    $documentId = $_POST['subject_document_id'];

    try {
        // Supprimer le document et toutes les entrées liées grâce aux contraintes de clés étrangères
        $stmt = $pdo->prepare("
            DELETE FROM subjectDocuments
            WHERE id = :subject_document_id
              AND uuid = :uuid
        ");
        $stmt->execute([
            'subject_document_id' => $documentId,
            'uuid'        => $_SESSION['user_uuid']
        ]);

        // Suppression réussie, redirection
        header('Location: studyList.php');
        exit();
    } catch (PDOException $e) {
        die("Erreur lors de la suppression du document : " . $e->getMessage());
    }
}

die("Erreur : Requête invalide.");
?>
