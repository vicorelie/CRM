<?php
// deleteSubject.php

require 'config.php';
requireSubscription($pdo);
csrf_protect_post();

// Vérifier que l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['subject_id'])) {
    $subject_id = (int)$_POST['subject_id'];

    $sql = "
        DELETE FROM studySubjects
        WHERE id = :id
          AND uuid = :uuid
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id'   => $subject_id,
        ':uuid' => $_SESSION['user_uuid']
    ]);

    header("Location: studyList.php?deleteSuccess=1");
    exit();
} else {
    header("Location: studyList.php");
    exit();
}
