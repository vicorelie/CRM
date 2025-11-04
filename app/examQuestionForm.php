<?php
/*******************************************************************
 *  examQuestionForm.php
 *******************************************************************/
session_start();
require 'config.php';
requireSubscription($pdo);
include 'includes/header.php';

if (!isset($_SESSION['user_uuid'])) { header('Location: login.php'); exit(); }
$userUuid = $_SESSION['user_uuid'];

$exam_questions_id = (int)($_GET['exam_questions_id'] ?? 0);
if ($exam_questions_id <= 0) die('ID manquant');

$stmt = $pdo->prepare("
    SELECT questions, answers
    FROM documentExamQuestions
    WHERE id = :id AND uuid = :u
");
$stmt->execute([':id'=>$exam_questions_id, ':u'=>$userUuid]);
$row = $stmt->fetch(PDO::FETCH_ASSOC) ?: die('Questions non trouvées');

$questions = json_decode($row['questions'], true);
$answers   = json_decode($row['answers'],   true);

$backUrl = (isset($_SERVER['HTTP_REFERER']) && str_contains($_SERVER['HTTP_REFERER'],'examList.php'))
          ? 'examList.php' : 'index.php';
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'he') ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= $lang_data['question_form_title'] ?? 'הגש מבחן' ?></title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">

</head>
<body class="list-container">

<!-- Barre de progression -->
<div class="progress-container">
  <div class="progress">
    <div id="progressBar" class="progress-bar bg-success" style="width:100%"></div>
  </div>
</div>

<div class="main-content container">
  <h1 class="mb-4 text-center"><?= $lang_data['question_form_title'] ?? 'Soumettre' ?></h1>

  <!-- Timer -->
  <div class="timer-container mb-4 container">
    <div class="card-body shadow-lg p-3 border-0"
         style="background:linear-gradient(135deg,var(--primary-color),var(--primary-hover));color:white;">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div class="d-flex align-items-center gap-2 flex-shrink-1">
          <i class="bi bi-clock-history fs-4"></i>
          <h5 class="fw-bold mb-0 text-nowrap text-white">
            <?= $lang_data['question_form_timer_label'] ?? 'Durée :' ?>
          </h5>
        </div>
        <div class="d-flex align-items-center gap-2 flex-grow-1 justify-content-end">
          <input id="timerDuration" type="number" value="1" min="1" max="120"
                 class="btn btn-light fw-bold shadow-sm"
                 style="max-width:80px;text-align:center">
          <button id="startTimer"
                  class="btn btn-light fw-bold shadow-sm"
                  style="color:var(--primary-color)">
            <i class="bi bi-play-fill"></i>
            <?= $lang_data['question_form_timer_start'] ?? 'Démarrer' ?>
          </button>
        </div>
      </div>
    </div>
  </div>

  <form id="questionForm" method="POST" action="examSubmit.php" novalidate>
    <input type="hidden" name="exam_questions_id" value="<?= $exam_questions_id ?>">

<?php
$randomOrders=[];
foreach ($questions as $i=>$qText):
    $ansObj  = $answers[$i] ?? [];
    $origOpt = $ansObj['options'] ?? [];
    $origCor = strtoupper($ansObj['correct'] ?? '');

    $tmp=[];
    foreach ($origOpt as $L=>$txt) $tmp[]=['letter'=>$L,'text'=>$txt];
    shuffle($tmp);
    $newCorIdx = array_search($origCor,array_column($tmp,'letter'));

    $randomOrders[$i]=['order'=>array_column($tmp,'letter'),'correct'=>$newCorIdx];
?>
    <div class="question-block mb-4">
      <p><strong><?= $lang_data['question_form_question_prefix'] ?? 'Question' ?> <?= $i+1 ?> :
        <?= htmlspecialchars($qText) ?></strong></p>
<?php foreach ($tmp as $idx=>$opt): ?>
      <div class="answer d-flex align-items-center mb-2"
           data-answer-group="<?= $i ?>">
        <input type="radio" id="q<?= $i ?>_<?= $idx ?>"
               name="answers[<?= $i ?>]" value="<?= $idx ?>" style="display:none">
        <span class="fw-bold me-2"><?= ['A','B','C','D'][$idx] ?>)</span>
        <span class="flex-grow-1"><?= htmlspecialchars($opt['text']) ?></span>
      </div>
<?php endforeach; ?>
    </div>
<?php endforeach; ?>

    <input type="hidden" name="randomOrderAll"
           value="<?= htmlspecialchars(json_encode($randomOrders)) ?>">

    <div class="text-center">
      <button class="btn btn-primary" type="submit">
        <?= $lang_data['question_form_submit'] ?? 'Soumettre' ?>
      </button>
    </div>
  </form>

  <div class="text-center mt-4">
    <a href="<?= $backUrl ?>" class="btn btn-primary">
      <i class="bi bi-arrow-left-circle me-2"></i>
      <?= $lang_data['back_to_quizList'] ?? 'Retour' ?>
    </a>
  </div>
</div>

<script>
document.addEventListener("DOMContentLoaded",()=>{
  const progressContainer=document.querySelector(".progress-container");
  const progressBar   = document.getElementById("progressBar");
  const startBtn      = document.getElementById("startTimer");
  const durationInput = document.getElementById("timerDuration");
  const form          = document.getElementById("questionForm");

  let total=0, remain=0, intervalId=null, state="initial";

  startBtn.addEventListener("click",()=>{
    if(state==="initial") start(); else if(state==="running") pause(); else resume();
  });

  function start(){
    const minutes = parseInt(durationInput.value,10);
    if(isNaN(minutes)||minutes<=0){ alert("Durée invalide");return; }
    total=remain=minutes*60;
    progressContainer.classList.add("visible");
    progressBar.style.backgroundColor="#28a745";
    updateBar();
    state="running"; toggleLabel();
    intervalId=setInterval(tick,1000);
  }
  function tick(){
    remain--;
    if(remain<=0){
      clearInterval(intervalId);
      progressBar.style.width="0%";
      progressBar.style.backgroundColor="#dc3545";
      alert("Temps écoulé !");
      form.submit();
      state="initial"; toggleLabel(); return;
    }
    updateBar();
  }
  function pause(){ clearInterval(intervalId); state="paused"; toggleLabel(); }
  function resume(){ state="running"; toggleLabel(); intervalId=setInterval(tick,1000); }
  function updateBar(){ progressBar.style.width=(remain/total*100)+"%"; }

  function toggleLabel(){
    const tStart='<?= addslashes($lang_data['question_form_timer_start'] ?? 'Start') ?>',
          tPause='<?= addslashes($lang_data['question_form_timer_pause'] ?? 'Pause') ?>',
          tRes  ='<?= addslashes($lang_data['question_form_timer_resume']?? 'Resume')?>';
    if(state==="running"){
       startBtn.innerHTML='<i class="bi bi-pause-fill"></i> '+tPause;
    }else if(state==="paused"){
       startBtn.innerHTML='<i class="bi bi-play-fill"></i> '+tRes;
    }else{
       startBtn.innerHTML='<i class="bi bi-play-fill"></i> '+tStart;
    }
  }

  /* sélection stylée */
  document.querySelectorAll(".answer").forEach(a=>{
    a.addEventListener("click",()=>{
       const grp=a.dataset.answerGroup;
       document.querySelectorAll(`.answer[data-answer-group="${grp}"]`)
         .forEach(el=>el.classList.remove("selected"));
       a.classList.add("selected");
       a.querySelector("input").checked=true;
    });
  });
});
</script>

<?php include 'includes/footer.php'; ?>
</body>
</html>
