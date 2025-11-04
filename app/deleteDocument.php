<?php
// deleteDocument.php

require 'config.php';

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['document_id'])) {
    $documentId = $_POST['document_id'];

    try {
        // Supprimer le document et toutes les entrées liées grâce aux contraintes de clés étrangères
        $stmt = $pdo->prepare("
            DELETE FROM Documents
            WHERE id = :document_id
              AND uuid = :uuid
        ");
        $stmt->execute([
            'document_id' => $documentId,
            'uuid'        => $_SESSION['user_uuid']
        ]);

        // Suppression réussie, redirection
        header('Location: documentsList.php');
        exit();
    } catch (PDOException $e) {
        die("Erreur lors de la suppression du document : " . $e->getMessage());
    }
}

die("Erreur : Requête invalide.");
?>
