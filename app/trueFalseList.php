<?php
// trueFalseList.php  — liste des quiz Vrai / Faux

session_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);

/* ----------------------------------------------------------------- */
/* 1)  Inclus & vérifications                                         */
/* ----------------------------------------------------------------- */
require 'config.php';
requireSubscription($pdo);

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php'); exit();
}
$userUuid = $_SESSION['user_uuid'];

require_once 'vendor/autoload.php';
include 'includes/header.php';

/* ----------------------------------------------------------------- */
/* 2)  Récupération du type d’étudiant (pour le filtre "study")       */
/* ----------------------------------------------------------------- */
$stmtCur = $pdo->prepare("
    SELECT student_type
    FROM studentCurriculum
    WHERE uuid = :uuid
    LIMIT 1
");
$stmtCur->execute([':uuid'=>$userUuid]);
$studentTypeInDb = $stmtCur->fetchColumn() ?: '';

/* ----------------------------------------------------------------- */
/* 3)  Préparation des listes de filtres                              */
/* ----------------------------------------------------------------- */
/* Matières */
$stmt = $pdo->prepare("
    SELECT DISTINCT subject_name
    FROM studySubjects
    WHERE uuid = :u AND subject_name <> ''
    ORDER BY subject_name ASC
");
$stmt->execute(['u'=>$userUuid]);
$distinctSubjects = $stmt->fetchAll(PDO::FETCH_COLUMN);

/* Topics */
$stmt = $pdo->prepare("
    SELECT DISTINCT topic
    FROM subjectDocuments
    WHERE uuid = :u AND topic <> ''
    ORDER BY topic ASC
");
$stmt->execute(['u'=>$userUuid]);
$distinctTopics = $stmt->fetchAll(PDO::FETCH_COLUMN);

/* Studies (si academic) */
$distinctStudies = [];
if ($studentTypeInDb === 'academic') {
    $stmt = $pdo->prepare("
        SELECT DISTINCT course_name
        FROM studySubjects
        WHERE uuid = :u AND course_name <> ''
        ORDER BY course_name ASC
    ");
    $stmt->execute(['u'=>$userUuid]);
    $distinctStudies = $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/* Récup param filtres */
$filterSubject = $_GET['filterSubject'] ?? '';
$topicFilter   = $_GET['topicFilter']   ?? '';
$filterDate    = $_GET['filterDate']    ?? '';
$generalSearch = $_GET['generalSearch'] ?? '';
$filterStudy   = ($studentTypeInDb==='academic') ? ($_GET['study'] ?? '') : '';

/* ----------------------------------------------------------------- */
/* 4)  Pagination                                                     */
/* ----------------------------------------------------------------- */
$limit  = 18;
$page   = (isset($_GET['page']) && is_numeric($_GET['page'])) ? (int)$_GET['page'] : 1;
$offset = ($page - 1)*$limit;

/* ----------------------------------------------------------------- */
/* 5)  Requêtes (count + liste)                                       */
/* ----------------------------------------------------------------- */
try {
    $params = [':uuid'=>$userUuid];
    /* --- COUNT --- */
    $countSql = "
        SELECT COUNT(DISTINCT dtf.id)
        FROM documentTrueFalse dtf
        INNER JOIN subjectDocuments SD ON dtf.subject_document_id = SD.id
        LEFT  JOIN studySubjects   SS ON SD.study_subjects_id      = SS.id
        WHERE dtf.uuid = :uuid
    ";
    if ($filterSubject!=='') {
        $countSql .= " AND LOWER(SS.subject_name) LIKE :filterSubject";
        $params[':filterSubject'] = '%'.strtolower($filterSubject).'%';
    }
    if ($topicFilter!=='') {
        $countSql .= " AND LOWER(SD.topic) LIKE :topicFilter";
        $params[':topicFilter'] = '%'.strtolower($topicFilter).'%';
    }
    if ($filterDate!=='') {
        $dates = explode(' to ', $filterDate);
        if (count($dates)===2) {
            $countSql .= " AND DATE(dtf.created_time) BETWEEN :start AND :end";
            $params[':start']=$dates[0]; $params[':end']=$dates[1];
        } else {
            $countSql .= " AND DATE(dtf.created_time) = :exact";
            $params[':exact']=$dates[0];
        }
    }
    if ($generalSearch!=='') {
        $countSql.="
          AND (
              LOWER(SD.topic)        LIKE :gs
           OR LOWER(SD.sub_topic)    LIKE :gs
           OR LOWER(SS.subject_name) LIKE :gs
          )
        ";
        $params[':gs'] = '%'.strtolower($generalSearch).'%';
    }
    if ($filterStudy!=='') {
        $countSql .= " AND LOWER(SS.course_name) LIKE :filterStudy";
        $params[':filterStudy'] = '%'.strtolower($filterStudy).'%';
    }
    $stmt=$pdo->prepare($countSql); $stmt->execute($params);
    $totalTF = $stmt->fetchColumn(); $totalPages = ceil($totalTF/$limit);

    /* --- LISTE --- */
    $listSql = "
        SELECT 
            SD.id                AS subject_document_id,
            SD.topic             AS sd_topic,
            SD.sub_topic         AS sd_sub_topic,
            SS.subject_name      AS ss_subject_name,
            SS.subject_unit      AS ss_subject_unit,
            SS.course_name       AS ss_course_name,
            MIN(dtf.created_time) AS first_tf_date,
            COUNT(dtf.id)        AS nb_tf,

            Doc.filename         AS doc_filename,
            Doc.type             AS doc_type,
            Doc.path             AS doc_path
        FROM documentTrueFalse dtf
        INNER JOIN subjectDocuments SD ON dtf.subject_document_id = SD.id
        LEFT  JOIN studySubjects   SS ON SD.study_subjects_id      = SS.id
        LEFT  JOIN Documents       Doc ON SD.documents_id          = Doc.id
        WHERE dtf.uuid = :uuid
    ";
    /* conditions identiques */
    if ($filterSubject!=='') $listSql .= " AND LOWER(SS.subject_name) LIKE :filterSubject";
    if ($topicFilter!=='')   $listSql .= " AND LOWER(SD.topic) LIKE :topicFilter";
    if ($filterDate!=='') {
        if (count($dates)===2) {
            $listSql.=" AND DATE(dtf.created_time) BETWEEN :start AND :end";
        } else {
            $listSql.=" AND DATE(dtf.created_time) = :exact";
        }
    }
    if ($generalSearch!=='') {
        $listSql.="
          AND (
              LOWER(SD.topic)        LIKE :gs
           OR LOWER(SD.sub_topic)    LIKE :gs
           OR LOWER(SS.subject_name) LIKE :gs
          )
        ";
    }
    if ($filterStudy!=='') $listSql.=" AND LOWER(SS.course_name) LIKE :filterStudy";

    $listSql.="
        GROUP BY SD.id
        ORDER BY first_tf_date DESC
        LIMIT :lim OFFSET :off
    ";

    $stmt=$pdo->prepare($listSql);
    foreach ($params as $k=>$v) $stmt->bindValue($k,$v, PDO::PARAM_STR);
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':off', $offset,PDO::PARAM_INT);
    $stmt->execute();
    $tfList=$stmt->fetchAll(PDO::FETCH_ASSOC);

} catch(PDOException $e) {
    die("Erreur SQL : ".htmlspecialchars($e->getMessage()));
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>">
<head>
<meta charset="UTF-8">
<title><?= htmlspecialchars($lang_data['truefalse_list_title'] ?? 'Liste Vrai/Faux') ?></title>

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

<style>
.hidden{display:none!important;}
.card{transition:transform .3s;overflow:hidden;}
.card:hover{transform:scale(1.02);}
.text-truncate{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
</style>
</head>
<body>
<div class="container py-5">

<h2 class="mb-4 text-center" style="font-size:36px;">
  <?= htmlspecialchars($lang_data['truefalse_list_title'] ?? 'Liste Vrai/Faux') ?>
</h2>

<!-- bouton filtrer -->
<div class="text-end mb-3">
  <button id="toggleFilters" class="btn btn-light">
    <i class="fas fa-filter"></i> <?= htmlspecialchars($lang_data['filter'] ?? 'Filtrer') ?>
  </button>
</div>

<!-- zone filtres (identique à missList) -->
<div id="filtersContainer" class="card mb-4 p-3 hidden">
  <div class="card-body">
    <form method="GET" action="trueFalseList.php" class="row g-3 align-items-center">
      <div class="col-md-<?= $studentTypeInDb==='academic'?'4':'6'?>">
        <select name="filterSubject" class="form-select">
          <option value=""><?= $lang_data['all_subjects']??'Toutes les matières'?></option>
          <?php foreach($distinctSubjects as $s): ?>
            <option value="<?= htmlspecialchars($s)?>" <?= $s==$filterSubject?'selected':''?>><?= htmlspecialchars($s)?></option>
          <?php endforeach;?>
        </select>
      </div>

      <div class="col-md-<?= $studentTypeInDb==='academic'?'4':'6'?>">
        <select name="topicFilter" class="form-select">
          <option value=""><?= $lang_data['all_topics']??'Tous les topics'?></option>
          <?php foreach($distinctTopics as $t): ?>
            <option value="<?= htmlspecialchars($t)?>" <?= $t==$topicFilter?'selected':''?>><?= htmlspecialchars($t)?></option>
          <?php endforeach;?>
        </select>
      </div>

      <?php if($studentTypeInDb==='academic'): ?>
      <div class="col-md-4">
        <select name="study" class="form-select">
          <option value=""><?= $lang_data['all_studies']??'Tous les studies'?></option>
          <?php foreach($distinctStudies as $st): ?>
            <option value="<?= htmlspecialchars($st)?>" <?= $st==$filterStudy?'selected':''?>><?= htmlspecialchars($st)?></option>
          <?php endforeach;?>
        </select>
      </div>
      <?php endif;?>

      <div class="col-md-6">
        <input type="text" name="filterDate" id="filterDate" class="form-control"
               placeholder="<?= $lang_data['filter_date_placeholder']??'Choisir une date ou période'?>"
               value="<?= htmlspecialchars($filterDate)?>" readonly>
      </div>
      <div class="col-md-6">
        <input type="text" name="generalSearch" class="form-control"
               placeholder="<?= $lang_data['search_placeholder']??'Recherche globale'?>"
               value="<?= htmlspecialchars($generalSearch)?>">
      </div>
      <div class="col-md-12 text-end mt-3">
        <button class="btn btn-primary"><i class="fas fa-search"></i> <?= $lang_data['apply']??'Appliquer'?></button>
        <button type="button" id="resetFilters" class="btn btn-outline-secondary <?= ($filterSubject||$topicFilter||$filterDate||$generalSearch||$filterStudy)?'':'hidden'?>">
          <i class="fas fa-redo"></i> <?= $lang_data['reset']??'Réinitialiser'?>
        </button>
      </div>
    </form>
  </div>
</div>

<!-- LISTE -->
<?php if(empty($tfList)): ?>
  <div class="alert alert-info text-center">
  <?= htmlspecialchars($lang_data['no-vf-finded'] ?? 'No true false finded') ?>
  </div>
<?php else: ?>
  <div class="row g-4">
  <?php foreach($tfList as $row):
        $sdId = $row['subject_document_id'];
        $topic = $row['sd_topic']??'Topic inconnu';
        $subTopic = $row['sd_sub_topic']??'';
        $subjectName=$row['ss_subject_name']??'';
        $unitOrCourse='';
        if(!empty($row['ss_subject_unit'])){
            $unitOrCourse=' ('.$lang_data['subject_unit_label'].' : '.$row['ss_subject_unit'].')';
        }elseif(!empty($row['ss_course_name'])){
            $unitOrCourse=' ('.$row['ss_course_name'].')';
        }
        $file=$row['doc_filename']??''; $type=strtolower($row['doc_type']??''); $path=$row['doc_path']??'';
        switch($type){
            case'pdf':$icon='fa-file-pdf';break;
            case'doc':case'docx':$icon='fa-file-word';break;
            case'xls':case'xlsx':$icon='fa-file-excel';break;
            case'ppt':case'pptx':$icon='fa-file-powerpoint';break;
            case'jpg':case'jpeg':case'png':$icon='fa-file-image';break;
            default:$icon='fa-file';
        }
  ?>
    <div class="col-lg-4 col-md-6">
      <div class="card shadow-sm h-100">
        <div class="card-body d-flex flex-column">
          <h5 class="mb-0 text-truncate" title="<?= htmlspecialchars($topic)?>"><?= htmlspecialchars($topic)?></h5>
          <p class="text-muted mb-1"><i class="far fa-calendar-alt"></i>
               <?= htmlspecialchars(date('d/m/Y H:i', strtotime($row['first_tf_date'])))?>
          </p>
          <?php if($subjectName): ?>
            <p class="mb-1"><strong><?= $lang_data['subject_label']??'Matière'?> :</strong>
              <?= htmlspecialchars($subjectName.$unitOrCourse)?>
            </p>
          <?php endif;?>
          <?php if($subTopic): ?>
            <p class="small text-muted">
              <?= $lang_data['sub_topic_label']??'Sous-topic'?> : <?= htmlspecialchars($subTopic)?>
            </p>
          <?php endif;?>

          <?php if($file): ?>
            <div class="d-flex align-items-center" style="max-width:300px;">
              <i class="fas <?= $icon?> me-2" style="font-size:1rem;"></i>
              <span class="text-truncate" style="max-width:200px;" title="<?= htmlspecialchars($file)?>">
                <?= htmlspecialchars($file)?>
              </span>
              <?php if($path): ?>
                <a href="<?= htmlspecialchars($path)?>" download="<?= htmlspecialchars($file)?>" class="ms-2" style="text-decoration:none;">
                  <i class="fas fa-download" style="font-size:1rem;"></i>
                </a>
              <?php endif;?>
            </div>
          <?php endif;?>

          <div class="mt-auto">
            <a href="viewTrueFalse.php?subject_document_id=<?= urlencode($sdId)?>"
               class="btn btn-primary btn-sm w-100">
              <i class="fas fa-check-square"></i> <?= $lang_data['view_truefalse']??'Voir Vrai/Faux'?>
            </a>
          </div>
        </div>
      </div>
    </div>
  <?php endforeach;?>
  </div>

  <!-- pagination -->
  <?php if($totalPages>1): ?>
    <nav aria-label="Page navigation" class="mt-5">
      <ul class="pagination justify-content-center">
        <li class="page-item <?= $page<=1?'disabled':''?>">
          <a class="page-link" href="?page=<?= max(1,$page-1) ?>
<?= $filterSubject?"&filterSubject=".urlencode($filterSubject):'' ?>
<?= $topicFilter?"&topicFilter=".urlencode($topicFilter):'' ?>
<?= $filterDate?"&filterDate=".urlencode($filterDate):'' ?>
<?= $generalSearch?"&generalSearch=".urlencode($generalSearch):'' ?>
<?= $filterStudy?"&study=".urlencode($filterStudy):'' ?>">
            &laquo;
          </a>
        </li>
        <?php
          $maxDisp=5; $start=max(1,$page-floor($maxDisp/2)); $end=min($totalPages,$start+$maxDisp-1);
          if($end-$start+1<$maxDisp) $start=max(1,$end-$maxDisp+1);
          for($p=$start;$p<=$end;$p++): ?>
          <li class="page-item <?= $p==$page?'active':''?>">
            <a class="page-link" href="?page=<?= $p ?>
<?= $filterSubject?"&filterSubject=".urlencode($filterSubject):'' ?>
<?= $topicFilter?"&topicFilter=".urlencode($topicFilter):'' ?>
<?= $filterDate?"&filterDate=".urlencode($filterDate):'' ?>
<?= $generalSearch?"&generalSearch=".urlencode($generalSearch):'' ?>
<?= $filterStudy?"&study=".urlencode($filterStudy):'' ?>"><?= $p ?></a>
          </li>
        <?php endfor;?>
        <li class="page-item <?= $page>=$totalPages?'disabled':''?>">
          <a class="page-link" href="?page=<?= min($totalPages,$page+1) ?>
<?= $filterSubject?"&filterSubject=".urlencode($filterSubject):'' ?>
<?= $topicFilter?"&topicFilter=".urlencode($topicFilter):'' ?>
<?= $filterDate?"&filterDate=".urlencode($filterDate):'' ?>
<?= $generalSearch?"&generalSearch=".urlencode($generalSearch):'' ?>
<?= $filterStudy?"&study=".urlencode($filterStudy):'' ?>">
            &raquo;
          </a>
        </li>
      </ul>
    </nav>
  <?php endif;?>
<?php endif;?>
</div>

<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script>
document.addEventListener('DOMContentLoaded',()=>{
  const t=document.getElementById('toggleFilters'),f=document.getElementById('filtersContainer');
  if(t&&f) t.addEventListener('click',()=>f.classList.toggle('hidden'));
  const r=document.getElementById('resetFilters');
  if(r) r.addEventListener('click',()=>window.location.href='trueFalseList.php');
  flatpickr('#filterDate',{mode:'range',dateFormat:'Y-m-d'});
});
</script>

</body>
</html>
<?php include 'includes/footer.php'; ?>
