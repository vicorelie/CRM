<?php
session_start();
require 'config.php';
requireSubscription($pdo);
include 'includes/header.php';

if (!isset($_SESSION['user_uuid'])) { header('Location: login.php'); exit(); }

$exam_questions_id = (int)($_GET['exam_questions_id'] ?? 0);
if ($exam_questions_id<=0) die('ID manquant');

$submissions = $pdo->prepare("
    SELECT * FROM examSubmit
    WHERE exam_questions_id=:eq AND uuid=:u
    ORDER BY created_time DESC
");
$submissions->execute([':eq'=>$exam_questions_id, ':u'=>$_SESSION['user_uuid']]);
$subs = $submissions->fetchAll(PDO::FETCH_ASSOC) ?: die('Aucune soumission.');

$current = $subs[0];                                 // dernière tentative
$random  = json_decode($current['randomOrder'],true);
$userAns = explode(',',$current['submitAnswer']);

$stmt = $pdo->prepare("SELECT questions,answers FROM documentExamQuestions WHERE id=:id");
$stmt->execute([':id'=>$exam_questions_id]);
$qa   = $stmt->fetch(PDO::FETCH_ASSOC);
$questions = json_decode($qa['questions'],true);
$answers   = json_decode($qa['answers'],true);
$totalQ    = count($questions);
?>
<!DOCTYPE html>
<html lang="he">
<head>
 <meta charset="UTF-8">
 <title>תוצאה</title>
 <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
</head>
<body>
<div class="container py-5">
 <h2 class="mb-4 text-center">התוצאה שלך: <?= $current['submitNote'].' / '.$totalQ ?></h2>

 <?php foreach ($questions as $i=>$q):
    $ord   = $random[$i]['order'];
    $corrI = $random[$i]['correct'];
    $corrL = $ord[$corrI] ?? '';
    $uL    = $userAns[$i] ?? 'NA'; ?>
  <div class="mb-4 p-3 border rounded">
    <p><strong><?= $i+1 ?>. <?= htmlspecialchars($q) ?></strong></p>
    <?php foreach ($ord as $idx=>$L):
        $txt = $answers[$i]['options'][$L];
        $cl  = ($L==$corrL)?'alert-success':(($L==$uL)?'alert-danger':'');
        ?>
        <div class="alert <?= $cl ?> p-2 mb-2"><?= $L ?>) <?= htmlspecialchars($txt) ?></div>
    <?php endforeach; ?>
  </div>
 <?php endforeach; ?>

 <div class="text-center">
   <a href="examList.php" class="btn btn-primary"><i class="bi bi-arrow-left-circle me-2"></i>חזרה</a>
 </div>
</div>
<?php include 'includes/footer.php'; ?>
</body>
</html>
