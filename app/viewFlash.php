<?php
// viewFlash.php

session_start();
require 'config.php';

$isRTL = in_array($_SESSION['lang'] ?? 'fr', ['ar','he','fa','ur']);

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php'); exit;
}
include 'includes/header.php';

if (isset($_GET['document_id'])) {
    $id = (int)$_GET['document_id'];
    $stmt = $pdo->prepare("SELECT text_content FROM documentFlash WHERE document_id = :id AND uuid = :uuid ORDER BY created_time DESC LIMIT 1");
    $stmt->execute(['id'=>$id,'uuid'=>$_SESSION['user_uuid']]);
} elseif (isset($_GET['subject_document_id'])) {
    $id = (int)$_GET['subject_document_id'];
    $stmt = $pdo->prepare("SELECT text_content FROM documentFlash WHERE subject_document_id = :id AND uuid = :uuid ORDER BY created_time DESC LIMIT 1");
    $stmt->execute(['id'=>$id,'uuid'=>$_SESSION['user_uuid']]);
} else {
    die($lang_data['error_document_id_missing'] ?? "Erreur : Document ID manquant.");
}

$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    die($lang_data['no_flashcards'] ?? "Aucune flash card trouvée.");
}

$flashCards = json_decode($row['text_content'], true);
if (!is_array($flashCards)) {
    die($lang_data['error_invalid_json'] ?? "Format JSON invalide.");
}

if (isset($_SERVER['HTTP_REFERER']) && strpos($_SERVER['HTTP_REFERER'],'studyList.php')!==false) {
    $backUrl = 'studyList.php';
} else {
    $backUrl = 'flashList.php';
}
?>
<!DOCTYPE html>
<html lang="<?=htmlspecialchars($_SESSION['lang']??'fr')?>" dir="<?=$isRTL?'rtl':'ltr'?>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?=htmlspecialchars($lang_data['flashcards_view_title']??'Flash Cards')?></title>

  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

  <!-- SweetAlert2 -->
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

  <style>
    .flash-container { margin:50px auto; max-width:700px; text-align:center; }
    .flash-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .flash-card { perspective:1000px; cursor:pointer; position:relative; width:100%; max-width:600px; height:400px; margin:0 auto; display:flex; justify-content:center; align-items:center; padding:15px; overflow:hidden; }
    @media(max-width:600px){ .flash-card { height:calc(100vw*2/3); } }
    .flash-card-inner { position:relative; width:100%; height:100%; transform-style:preserve-3d; transition:transform .5s; }
    .flash-card.flipped .flash-card-inner { transform:rotateY(180deg); }
    .flash-card-front,.flash-card-back { position:absolute; width:100%; height:100%; backface-visibility:hidden; box-shadow:0 2px 5px rgba(0,0,0,.2); border-radius:8px; display:flex; justify-content:center; align-items:center; padding:20px; font-size:1.2em; }
    .flash-card-front { background:#f8f9fa; border-top:15px solid #0097b2; }
    .flash-card-back  { background:#eee;      border-top:15px solid #19d1f1; transform:rotateY(180deg); }
    .navigation-buttons { margin-top:20px; display:flex; justify-content:center; gap:50px; }
    .arrow-btn { background:none; border:none; font-size:3em; color:#0097b2; cursor:pointer; }
    .arrow-btn:hover { color:#007a91; }
    @keyframes slideOutLeft{to{transform:translateX(-100%);opacity:0}}
    @keyframes slideInRight{from{transform:translateX(100%);opacity:0}}
    @keyframes slideOutRight{to{transform:translateX(100%);opacity:0}}
    @keyframes slideInLeft{from{transform:translateX(-100%);opacity:0}}
    .slide-out-left { animation:slideOutLeft .3s forwards; }
    .slide-in-right{ animation:slideInRight .3s forwards; }
    .slide-out-right{ animation:slideOutRight .3s forwards; }
    .slide-in-left { animation:slideInLeft .3s forwards; }
  </style>
</head>
<body>
<div class="container flash-container">

  <!-- entête avec icônes + et corbeille -->

    <h1><?=htmlspecialchars($lang_data['flashcards_view_title']??'Flash Cards')?></h1>


  <div>
      <button id="add-card-btn"    class="btn btn-primary me-2"><i class="fas fa-plus"></i></button>
      <button id="delete-card-btn" class="btn btn-outline-secondary"><i class="fas fa-trash"></i></button>
    </div>
  <!-- carte -->
  <div id="flash-card-display" class="flash-card">
    <div class="flash-card-inner">
      <div class="flash-card-front" id="card-front"></div>
      <div class="flash-card-back"  id="card-back" ></div>
    </div>
  </div>

  <!-- navigation -->
  <div class="navigation-buttons">
    <button id="prev-btn" class="arrow-btn">
      <?=$isRTL?'<i class="fa-solid fa-caret-right"></i>':'<i class="fa-solid fa-caret-left"></i>'?>
    </button>
    <button id="next-btn" class="arrow-btn">
      <?=$isRTL?'<i class="fa-solid fa-caret-left"></i>':'<i class="fa-solid fa-caret-right"></i>'?>
    </button>
  </div>

  <!-- lien retour -->
  <div class="text-center mt-4">
    <a href="<?=$backUrl?>" class="btn btn-primary">
      <i class="bi bi-arrow-left-circle me-2"></i>
      <?=htmlspecialchars($lang_data['back_to_summaryList']??'Retour')?>
    </a>
  </div>
</div>

<!-- Modal d'ajout manuel -->
<div class="modal fade" id="addFlashModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <form id="addFlashForm" class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title"><?=htmlspecialchars($lang_data['flash_modal_title'])?></h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label"><?=htmlspecialchars($lang_data['flash_recto_label']??'Recto')?></label>
          <textarea id="new-recto" class="form-control" rows="2" required></textarea>
        </div>
        <div class="mb-3">
          <label class="form-label"><?=htmlspecialchars($lang_data['flash_verso_label']??'Verso')?></label>
          <textarea id="new-verso" class="form-control" rows="3" required></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <?=htmlspecialchars($lang_data['flash_cancel'])?>
        </button>
        <button type="submit" class="btn btn-primary">
          <?=htmlspecialchars($lang_data['flash_add'])?>
        </button>
      </div>
    </form>
  </div>
</div>

<script>
  const flashCards   = <?= json_encode($flashCards, JSON_UNESCAPED_UNICODE) ?>;
  let   currentIndex = 0;
  const isRTL        = <?=$isRTL?'true':'false'?>;
  const subjectId    = <?=$id?>;

  function displayCard(i) {
    if (i<0||i>=flashCards.length) return;
    document.getElementById('card-front').textContent = flashCards[i].recto || '';
    document.getElementById('card-back').textContent  = flashCards[i].verso  || '';
    document.getElementById('flash-card-display').classList.remove('flipped');
  }

  function animateCardTransition(slideOutClass, slideInClass, newIndex) {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    // 1) désactive les flèches
    prevBtn.disabled = true;
    nextBtn.disabled = true;

    const cardDisplay = document.getElementById('flash-card-display');
    cardDisplay.classList.add(slideOutClass);
    cardDisplay.addEventListener('animationend', function handler() {
        cardDisplay.removeEventListener('animationend', handler);
        currentIndex = newIndex;
        displayCard(currentIndex);

        // 2) on passe à l’anim d’entrée
        cardDisplay.classList.replace(slideOutClass, slideInClass);
        cardDisplay.addEventListener('animationend', function handler2() {
            cardDisplay.removeEventListener('animationend', handler2);
            cardDisplay.classList.remove(slideInClass);

            // 3) réactive les flèches
            prevBtn.disabled = false;
            nextBtn.disabled = false;
        });
    });
}
  document.addEventListener('DOMContentLoaded', ()=> {
    displayCard(0);

    document.getElementById('next-btn').onclick = ()=>{
      if (currentIndex < flashCards.length-1)
        animateCardTransition(
          isRTL?'slide-out-right':'slide-out-left',
          isRTL?'slide-in-left':'slide-in-right',
          currentIndex+1
        );
    };
    document.getElementById('prev-btn').onclick = ()=>{
      if (currentIndex>0)
        animateCardTransition(
          isRTL?'slide-out-left':'slide-out-right',
          isRTL?'slide-in-right':'slide-in-left',
          currentIndex-1
        );
    };
    document.getElementById('flash-card-display').onclick = function(){
      this.classList.toggle('flipped');
    };

    // Ajout manuel
    document.getElementById('add-card-btn').onclick = ()=>{
      new bootstrap.Modal(document.getElementById('addFlashModal')).show();
    };
    document.getElementById('addFlashForm').onsubmit = async e=>{
      e.preventDefault();
      const recto = document.getElementById('new-recto').value.trim();
      const verso = document.getElementById('new-verso').value.trim();
      if(!recto||!verso) return;
      try {
        const res = await fetch('addFlashCardApi.php',{
          method:'POST',
          headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body: new URLSearchParams({subject_document_id:subjectId,recto,verso})
        });
        const data = await res.json();
        if(!data.success) throw new Error(data.error||'Erreur');
        bootstrap.Modal.getInstance(document.getElementById('addFlashModal')).hide();
        Swal.fire({
          icon: 'success',
          title: '<?= $lang_data['flash_add_success_title'] ?>',
          text:  '<?= $lang_data['flash_add_success_text'] ?>',
          confirmButtonColor: '#0097B2',
          timer:1500,
          showConfirmButton:false
        }).then(()=>window.location.reload());
      } catch(err) {
        Swal.fire('<?= $lang_data['error']??"Erreur" ?>', err.message,'error');
      }
    };

    // Suppression
    document.getElementById('delete-card-btn').onclick = ()=>{
      Swal.fire({
        title:             '<?= $lang_data['flash_delete_confirm_title'] ?>',
        text:              '<?= $lang_data['flash_delete_confirm_text'] ?>',
        icon:              'warning',
        showCancelButton:  true,
        confirmButtonText: '<?= $lang_data['flash_delete_confirm_confirm_button'] ?>',
        cancelButtonText:  '<?= $lang_data['flash_delete_confirm_cancel_button'] ?>',
        confirmButtonColor:'#0097B2',
        cancelButtonColor: '#19D1F1'
      }).then(async result=>{
        if(!result.isConfirmed) return;
        try {
          const res = await fetch('deleteFlashCardApi.php',{
            method:'POST',
            headers:{'Content-Type':'application/x-www-form-urlencoded'},
            body: new URLSearchParams({subject_document_id:subjectId,card_index:currentIndex})
          });
          const data = await res.json();
          if(!data.success) throw new Error(data.error||'Erreur');
          Swal.fire({
            icon:'success',
            title:'<?= $lang_data['flash_delete_success_title'] ?>',
            text: '<?= $lang_data['flash_delete_success_text'] ?>',
            confirmButtonColor:'#0097B2',
            timer:1500,
            showConfirmButton:false
          }).then(()=>{
            if(flashCards.length===1) location.href='studyList.php';
            else location.reload();
          });
        } catch(err) {
          Swal.fire('<?= $lang_data['error']??"Erreur" ?>', err.message,'error');
        }
      });
    };
  });
</script>
<?php include 'includes/footer.php'; ?>
</body>
</html>
