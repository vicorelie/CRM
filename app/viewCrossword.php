<?php
// viewCrossword.php
require_once __DIR__.'/config.php';
requireSubscription($pdo);
include __DIR__.'/includes/header.php';

$u  = $_SESSION['user_uuid'] ?? '';
$sd = (int)($_GET['subject_document_id'] ?? 0);
if (!$u||!$sd) exit('Paramètres manquants');

$stmt = $pdo->prepare("
  SELECT subject,language,grid_json,across_json,down_json
  FROM documentCrossword
  WHERE uuid=:u AND subject_document_id=:sd AND grid_json<>''
  ORDER BY created_time DESC LIMIT 1
");
$stmt->execute([':u'=>$u,':sd'=>$sd]);
$row = $stmt->fetch()?:exit('Aucun crossword.');

$subject=htmlspecialchars($row['subject']);
$rtl    = in_array($row['language'], ['he','ar'], true);
$cells  = json_decode($row['grid_json'],   true);
$across = json_decode($row['across_json'], true);
$down   = json_decode($row['down_json'],   true);

// mapNum & cellMeta
$mapNum=[]; $cellMeta=[];
foreach($across as $w){
  $L=mb_strlen($w['answer'],'UTF-8');
  for($i=0;$i<$L;$i++){
    $cx=$rtl?$w['x']-$i:$w['x']+$i; $cy=$w['y'];
    $cellMeta["{$cy}_{$cx}"]=['num'=>$w['num'],'pos'=>$i];
  }
  $mapNum["{$w['y']}_{$w['x']}"]=$w['num'];
}
foreach($down as $w){
  $L=mb_strlen($w['answer'],'UTF-8');
  for($i=0;$i<$L;$i++){
    $cx=$w['x']; $cy=$w['y']+$i;
    $cellMeta["{$cy}_{$cx}"]=['num'=>$w['num'],'pos'=>$i];
  }
  $mapNum["{$w['y']}_{$w['x']}"]=$w['num'];
}
?>
<main class="container my-5">
  <h1 class="text-primary"><?=$subject?></h1>
  <div class="row gx-4 mt-4">

    <!-- grille -->
    <div class="col-lg-5 mb-4">
      <div class="card shadow-sm">
        <div class="card-body p-3 overflow-auto" style="background:#f9f9f9;">
          <style>
            #cw{border-collapse:collapse;margin:auto;}
            #cw td{width:32px;height:32px;border:1px solid #0097b2;padding:0;position:relative;}
            #cw td.blank{background:#0097b2;border-color:#0097b2;}
            #cw input{width:100%;height:100%;border:none;text-align:center;
                      font-family:monospace;font-weight:bold;text-transform:uppercase;
                      outline:none;}
            #cw td.selected{background:#d8f0ff!important;}
            #cw td.correct input{background:#c7f5d1;}
            #cw td.incorrect input{background:#f8d7da;}
            .cell-num{position:absolute;top:2px;left:2px;font-size:0.6rem;color:#555;}
          </style>
          <table id="cw" dir="<?=$rtl?'rtl':'ltr'?>">
            <?php for($y=0;$y<count($cells);$y++): ?>
            <tr>
              <?php for($x=0;$x<count($cells[$y]);$x++):
                $ch=$cells[$y][$x];
                if($ch===null||$ch===''): ?>
                  <td class="blank"></td>
                <?php else:
                  $key="{$y}_{$x}";
                  $num=$cellMeta[$key]['num']??null;
                  $pos=$cellMeta[$key]['pos']??null;
                ?>
                  <td data-num="<?=$num?>" data-pos="<?=$pos?>" data-x="<?=$x?>" data-y="<?=$y?>">
                    <?php if(isset($mapNum[$key])): ?>
                      <div class="cell-num"><?=$mapNum[$key]?></div>
                    <?php endif;?>
                    <input maxlength="1" data-solution="<?=htmlspecialchars($ch)?>">
                  </td>
                <?php endif;
              endfor; ?>
            </tr>
            <?php endfor; ?>
          </table>
        </div>
        <div class="card-footer bg-white text-end">
          <button id="revealBtn" class="btn btn-primary">
            <?=$rtl?'הצג פתרון':'Afficher réponses'?>
          </button>
        </div>
      </div>
    </div>

    <!-- indices -->
    <div class="col-lg-7">
      <div class="card shadow-sm">
        <div class="card-header bg-white">
          <h5 class="mb-0"><?=$rtl?'רמזים':'Indices'?></h5>
        </div>
        <div class="card-body">
          <h6 class="text-muted"><?=$rtl?'אופקי':'Horizontal'?></h6>
          <ul class="list-group mb-3">
            <?php foreach($across as $w):?>
            <li class="list-group-item clue d-flex justify-content-between" data-num="<?=$w['num']?>">
              <span>
                <strong><?=$w['num']?>.</strong>
                <?=htmlspecialchars($w['clue'])?>
                <small class="text-muted ms-1"><?=$w['pattern']?></small>
              </span>
              <button class="btn btn-sm btn-outline-secondary eye" data-num="<?=$w['num']?>">👁️</button>
            </li>
            <?php endforeach;?>
          </ul>
          <h6 class="text-muted"><?=$rtl?'אנכי':'Vertical'?></h6>
          <ul class="list-group">
            <?php foreach($down as $w):?>
            <li class="list-group-item clue d-flex justify-content-between" data-num="<?=$w['num']?>">
              <span>
                <strong><?=$w['num']?>.</strong>
                <?=htmlspecialchars($w['clue'])?>
                <small class="text-muted ms-1"><?=$w['pattern']?></small>
              </span>
              <button class="btn btn-sm btn-outline-secondary eye" data-num="<?=$w['num']?>">👁️</button>
            </li>
            <?php endforeach;?>
          </ul>
        </div>
      </div>
    </div>

  </div>
</main>
<?php include __DIR__.'/includes/footer.php'; ?>

<script>
(() => {
  const RTL    = <?=$rtl?'true':'false'?>;
  const across = <?=json_encode($across,JSON_UNESCAPED_UNICODE)?>;
  const down   = <?=json_encode($down,  JSON_UNESCAPED_UNICODE)?>;
  const words  = {};

  // 1) Construire words[num]
  across.forEach(w=>{
    const clean = w.answer.replace(/ /g,'').toUpperCase();
    words[w.num] = { clean, cells: [] };
  });
  down.forEach(w=>{
    const clean = w.answer.replace(/ /g,'').toUpperCase();
    words[w.num] = { clean, cells: [] };
  });

  // 2) Remplir cells[]
  Object.entries(words).forEach(([num,w])=>{
    const def = across.find(d=>d.num==num) || down.find(d=>d.num==num);
    const L   = w.clean.length;
    for(let i=0;i<L;i++){
      let x,y;
      if(def.dir==='across'){
        x = RTL? def.x - i : def.x + i;
        y = def.y;
      } else {
        x = def.x;
        y = def.y + i;
      }
      const inp = document.querySelector(`#cw td[data-x="${x}"][data-y="${y}"] input`);
      w.cells[i] = inp;
    }
  });

  // 3) Sélection indices
  document.querySelectorAll('.clue').forEach(li=>{
    li.onclick = () => {
      const n = +li.dataset.num;
      document.querySelectorAll('#cw td').forEach(td=>td.classList.remove('selected'));
      words[n].cells.forEach(inp=>inp.parentElement.classList.add('selected'));
      words[n].cells[0].focus();
    };
  });

  // 4) Saisie & validation
  document.querySelectorAll('#cw input').forEach(inp=>{
    inp.oninput = ()=>{
      inp.value = inp.value.toUpperCase();
      const sol = inp.dataset.solution;
      if(inp.value===sol){
        inp.parentElement.classList.add('correct');
        inp.parentElement.classList.remove('incorrect');
      } else {
        inp.parentElement.classList.add('incorrect');
        inp.parentElement.classList.remove('correct');
      }
      const td  = inp.parentElement;
      const num = +td.dataset.num;
      const pos = +td.dataset.pos;
      const arr = words[num].cells;
      if(arr[pos+1]) arr[pos+1].focus();
    };
    inp.onkeydown = e=>{
      if(e.key==='Backspace' && !inp.value){
        const td  = inp.parentElement;
        const num = +td.dataset.num;
        const pos = +td.dataset.pos;
        const arr = words[num].cells;
        if(arr[pos-1]) arr[pos-1].focus();
      }
    };
  });

  // 5) Œil : reveal/mask
  document.querySelectorAll('.eye').forEach(btn=>{
    btn.onclick = e=>{
      e.stopPropagation();
      const n = +btn.dataset.num;
      const w = words[n];
      const show = btn.classList.toggle('revealed');
      w.cells.forEach((inp,i)=>{
        inp.value = show ? w.clean[i] : '';
        inp.parentElement.classList.toggle('correct', show);
      });
    };
  });

  // 6) Bouton reveal all
  document.getElementById('revealBtn').onclick = ()=>{
    Object.values(words).forEach(w=>{
      w.cells.forEach((inp,i)=>{
        inp.value = w.clean[i];
        inp.parentElement.classList.add('correct');
      });
    });
  };
})();
</script>
