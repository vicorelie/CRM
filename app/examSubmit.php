<?php
session_start();
require 'config.php';

if (!isset($_SESSION['user_uuid'])) { header('Location: login.php'); exit(); }

$exam_questions_id = (int)($_POST['exam_questions_id'] ?? 0);
$answersPost       = $_POST['answers'] ?? [];
$randomOrdersJson  = $_POST['randomOrderAll'] ?? '';

if ($exam_questions_id<=0 || !$randomOrdersJson) die('Erreur : données manquantes.');

$stmt = $pdo->prepare("SELECT answers FROM documentExamQuestions WHERE id=:id AND uuid=:u");
$stmt->execute([':id'=>$exam_questions_id, ':u'=>$_SESSION['user_uuid']]);
$row = $stmt->fetch(PDO::FETCH_ASSOC) ?: die('Erreur : examen introuvable.');

$corrects     = json_decode($row['answers'], true);
$randomOrders = json_decode($randomOrdersJson, true);

$total = count($corrects);
$good  = 0; $userLetters=[];

foreach ($corrects as $i=>$ans) {
    $order = $randomOrders[$i]['order'] ?? [];
    $corrIdx = (int)($randomOrders[$i]['correct'] ?? -1);
    $corrLet = $order[$corrIdx] ?? '';
    if (isset($answersPost[$i])) {
        $uIdx = (int)$answersPost[$i];
        $uLet = $order[$uIdx] ?? 'NA';
    } else $uLet = 'NA';
    if ($uLet !== 'NA' && strtoupper($uLet)===strtoupper($corrLet)) $good++;
    $userLetters[]=$uLet;
}

$pdo->prepare("INSERT INTO examSubmit
        (uuid, exam_questions_id, submitAnswer, submitNote, randomOrder, created_time)
        VALUES (:u,:eq,:ans,:note,:rnd,NOW())")
     ->execute([
         ':u'   => $_SESSION['user_uuid'],
         ':eq'  => $exam_questions_id,
         ':ans' => implode(',',$userLetters),
         ':note'=> $good,
         ':rnd' => $randomOrdersJson
     ]);

header('Location: examResult.php?exam_questions_id='.$exam_questions_id);
exit;
