<?php
require 'config.php';
requireSubscription($pdo);
csrf_protect_post();

// Vérifier que l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $document_id = $_POST['document_id'] ?? null;
    $filename    = trim($_POST['filename'] ?? '');
    $theme       = trim($_POST['theme'] ?? '');

    if ($document_id && $filename !== '') {
        try {
            // Vérifier que le document appartient bien à l'utilisateur
            $checkQuery = "SELECT COUNT(*) FROM Documents 
                           WHERE id = :doc_id AND uuid = :uuid";
            $stmtCheck = $pdo->prepare($checkQuery);
            $stmtCheck->execute([
                ':doc_id' => $document_id,
                ':uuid'   => $_SESSION['user_uuid']
            ]);
            $count = $stmtCheck->fetchColumn();

            if ($count == 1) {
                // Mettre à jour nom + thème
                $updateQuery = "UPDATE Documents
                                SET filename = :filename, theme = :theme
                                WHERE id = :doc_id AND uuid = :uuid";
                $stmtUpdate = $pdo->prepare($updateQuery);
                $stmtUpdate->execute([
                    ':filename' => $filename,
                    ':theme'    => $theme,
                    ':doc_id'   => $document_id,
                    ':uuid'     => $_SESSION['user_uuid']
                ]);
            }
        } catch (PDOException $e) {
            // Gérer l'erreur si besoin
            die("Erreur lors de la mise à jour : " . htmlspecialchars($e->getMessage()));
        }
    }
}

// Rediriger vers la liste des documents
header("Location: documentsList.php");
exit();
