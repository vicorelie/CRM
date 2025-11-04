<?php
// viewTrueFalse.php
session_start();
require 'config.php';

$isRTL = in_array($_SESSION['lang'] ?? 'fr', ['he','ar','fa','ur']);

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php'); exit();
}
include 'includes/header.php';

$subjectId = (int)($_GET['subject_document_id'] ?? 0);
if (!$subjectId) die("ID manquant.");

$stmt = $pdo->prepare("
    SELECT text_content
    FROM documentTrueFalse
    WHERE subject_document_id = :id AND uuid = :uuid
    ORDER BY created_time DESC
    LIMIT 1
");
$stmt->execute(['id'=>$subjectId,'uuid'=>$_SESSION['user_uuid']]);
$row = $stmt->fetch(PDO::FETCH_ASSOC) ?: die("Aucun quiz V/F trouvé.");

$data = json_decode($row['text_content'], true);
if (json_last_error()!==JSON_ERROR_NONE) die("JSON invalide.");
shuffle($data);

// Déterminer l'URL de retour selon la provenance
if (isset($_SERVER['HTTP_REFERER']) && strpos($_SERVER['HTTP_REFERER'], 'studyList.php') !== false) {
  $backUrl = 'studyList.php';
} else {
  $backUrl = 'trueFalseList.php';
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>" dir="<?= $isRTL?'rtl':'ltr' ?>">
<head>
<meta charset="UTF-8">
<title><?= htmlspecialchars($lang_data['tf_view_title'] ?? 'Vrai / Faux') ?></title>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

<style>
  html, body {
  overflow-x: hidden;
}
/* --- Carte principale --- */
.card-tf      {  will-change: transform;  border-top:15px solid #0097b2;box-shadow:0 2px 5px rgba(0,0,0,.2);
               border-radius:4px;padding:25px;margin:60px auto;max-width:650px;
               min-height:300px;display:flex;flex-direction:column;justify-content:center;}
.card-tf.correct   {border-color:#2ecc71}
.card-tf.incorrect {border-color:#e74c3c}

/* --- Boutons Vrai / Faux --- */
.answer-btn           {padding:12px 30px;margin:8px;font-weight:600;border-radius:4px;
                       color:#fff;border:1px solid transparent;cursor:pointer;transition:.25s;}
.answer-btn.true      {background:#0097b2;border-color:#0097b2;}
.answer-btn.false     {background:#19d1f1;border-color:#19d1f1;}
.answer-btn.true:hover  {background:#007a91;}
.answer-btn.false:hover {background:#17bdda;}

/* --- Explication affichée après mauvaise réponse --- */
.explanation{margin-top:18px;font-style:italic;color:#555;display:none;}

/* --- Navigation flèches --- */
.nav-btn    {background:none;border:none;font-size:3.2em;color:#0097b2;cursor:pointer;padding:0 40px;}
.nav-btn:hover{color:#007a91}

/* --- Animations avec 0,3s de durée --- */
@keyframes slideOutL {  
  0%   { transform: translateX(0);    opacity: 1; }  
  100% { transform: translateX(-100%); opacity: 0; }
}
@keyframes slideInR  {  
  0%   { transform: translateX(100%); opacity: 0; }  
  100% { transform: translateX(0);     opacity: 1; }
}
@keyframes slideOutR {  
  0%   { transform: translateX(0);    opacity: 1; }  
  100% { transform: translateX(100%); opacity: 0; }
}
@keyframes slideInL  {  
  0%   { transform: translateX(-100%); opacity: 0; }  
  100% { transform: translateX(0);     opacity: 1; }
}

.slide-out-l { animation: slideOutL .3s forwards; }
.slide-in-r  { animation: slideInR  .3s forwards; }
.slide-out-r { animation: slideOutR .3s forwards; }
.slide-in-l  { animation: slideInL  .3s forwards; }

</style>
</head>
<body>
<div class="container text-center">
  <h1 class="mt-4"><?= htmlspecialchars($lang_data['tf_view_title'] ?? 'Vrai / Faux') ?></h1>

  <div id="tf-card" class="card-tf"></div>

  <div class="mt-3">
    <button id="prev" class="nav-btn">
      <?= $isRTL?'<i class="fa-solid fa-caret-right"></i>':'<i class="fa-solid fa-caret-left"></i>' ?>
    </button>
    <button id="next" class="nav-btn">
      <?= $isRTL?'<i class="fa-solid fa-caret-left"></i>':'<i class="fa-solid fa-caret-right"></i>' ?>
    </button>
  </div>
</div>
<!-- Bouton pour retourner à la liste -->
<div class="text-center mt-4">
    <a href="<?= $backUrl ?>" class="btn btn-primary">
        <i class="bi bi-arrow-left-circle me-2"></i>
        <?= $lang_data['back_to_summaryList'] ?? 'Back to summary list' ?>
    </a>
</div>
<script>
const items = <?= json_encode($data, JSON_UNESCAPED_UNICODE) ?>;
let idx = 0, anim = false, rtl = <?= $isRTL?'true':'false' ?>;

function show(i){
  const card = document.getElementById('tf-card');
  card.className = 'card-tf';                // reset couleurs
  const s = items[i];

  card.innerHTML = `
    <p style="font-size:1.3rem;margin-bottom:28px;">${s.statement}</p>
    <div>
      <button class="answer-btn true"  data-val="true">
        <i class="fa-solid fa-check me-1"></i><?= addslashes($lang_data['true'] ?? 'Vrai') ?>
      </button>
      <button class="answer-btn false" data-val="false">
        <i class="fa-solid fa-xmark me-1"></i><?= addslashes($lang_data['false'] ?? 'Faux') ?>
      </button>
    </div>
    <p class="explanation">${s.explanation ?? ''}</p>
  `;

  card.querySelectorAll('.answer-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const good = String(s.is_true) === btn.dataset.val;
      card.classList.add(good ? 'correct' : 'incorrect');
      if(!good && s.explanation){
        card.querySelector('.explanation').style.display = 'block';
      }
    }, { once:true });
  });
}

function slide(outCls, inCls, newIdx){
  if (anim) return;
  anim = true;
  const c = document.getElementById('tf-card');
  c.classList.add(outCls);
  c.addEventListener('animationend', function h(){
    c.removeEventListener('animationend', h);
    idx = newIdx;
    show(idx);
    c.classList.remove(outCls);
    c.classList.add(inCls);
    c.addEventListener('animationend', ()=>{ c.classList.remove(inCls); anim=false; }, {once:true});
  });
}

document.getElementById('next').onclick = ()=> slide(rtl?'slide-out-l':'slide-out-r', rtl?'slide-in-r':'slide-in-l', (idx+1)%items.length);
document.getElementById('prev').onclick = ()=> slide(rtl?'slide-out-r':'slide-out-l', rtl?'slide-in-l':'slide-in-r', (idx-1+items.length)%items.length);
const nextBtn = document.getElementById('next');
const prevBtn = document.getElementById('prev');
let touchStartX = 0;
const swipeThreshold = 40;  // distance minimale en px pour considérer un swipe

const cardContainer = document.getElementById('tf-card');
cardContainer.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].clientX;
}, {passive: true});

cardContainer.addEventListener('touchend', e => {
  const touchEndX = e.changedTouches[0].clientX;
  const dx = touchEndX - touchStartX;
  if (Math.abs(dx) > swipeThreshold) {
    if (dx < 0) {
      // swipe vers la gauche → suivant
      nextBtn.click();
    } else {
      // swipe vers la droite → précédent
      prevBtn.click();
    }
  }
}, {passive: true});

show(idx);
</script>
<?php include 'includes/footer.php'; ?>
</body>
</html>
