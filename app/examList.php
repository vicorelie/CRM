<?php
// examList.php
session_start();
require 'config.php';
requireSubscription($pdo);
include 'includes/header.php';

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}
$userUuid = $_SESSION['user_uuid'];

/* --- récupérer les examens --- */
$stmt = $pdo->prepare("
    SELECT id, exam_type, created_time,
           JSON_LENGTH(questions) AS nb_questions
    FROM documentExamQuestions
    WHERE uuid = :u
    ORDER BY created_time DESC
");
$stmt->execute([':u'=>$userUuid]);
$exams = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'he') ?>">
<head>
<meta charset="UTF-8">
<title>Exam IL – WanaTest</title>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
<style>
    /* spinner plein-écran */
    #spinner{
        display:none;position:fixed;inset:0;background:rgba(255,255,255,.8);
        z-index:2000;align-items:center;justify-content:center
    }
</style>
</head>
<body>
<!-- Spinner global -->
<div id="spinner">
  <div class="spinner-border text-primary" style="width:4rem;height:4rem;" role="status"></div>
</div>

<div class="container py-5">
  <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
      <h2 class="m-0"><i class="fas fa-file-alt me-2"></i> מבחני ישראל (Exam IL)</h2>
      <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#generateExamModal">
          <i class="fas fa-plus"></i> יצירת מבחן חדש
      </button>
  </div>

  <?php if (!$exams): ?>
    <div class="alert alert-info text-center">אין עדיין מבחנים. לחץ על “יצירת מבחן חדש”.</div>
  <?php else: ?>
    <div class="row g-4">
      <?php foreach ($exams as $exam): ?>
        <div class="col-sm-6 col-lg-4">
          <div class="card h-100 shadow-sm">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title text-capitalize"><?= htmlspecialchars($exam['exam_type']) ?></h5>
              <p class="text-muted mb-1"><i class="far fa-calendar-alt"></i>
                 <?= date('d/m/Y H:i', strtotime($exam['created_time'])) ?></p>
              <p class="mb-3">שאלות: <?= (int)$exam['nb_questions'] ?></p>
              <a class="btn btn-primary mt-auto w-100"
                 href="examQuestionForm.php?exam_questions_id=<?= $exam['id'] ?>">
                 להתחיל / לצפות
              </a>
            </div>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</div>

<!-- Modal création examen -->
<div class="modal fade" id="generateExamModal" tabindex="-1">
  <div class="modal-dialog">
    <form id="examForm" class="modal-content" method="POST" action="generateExamApi.php">
      <div class="modal-header">
        <h5 class="modal-title">יצירת מבחן ישראלי חדש</h5>
        <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="form-floating">
          <select id="exam_type" name="exam_type" class="form-select" required>
            <option value="">-- בחר סוג מבחן --</option>
            <option value="psychometric">פסיכומטרי</option>
            <option value="amir">אמיר״ם</option>
            <option value="yael">יע״ל</option>
            <option value="mirkam_medicine">מרק״ם לרפואה</option>
            <option value="mor">מו״ר</option>
            <option value="dapar">דפ״ר</option>
            <option value="mot">מו״ת</option>
            <option value="mirkam_army">מרק״ם צבאי</option>
            <option value="gifted">מחוננים</option>
            <option value="mimad">מימ״ד</option>
            <option value="mitzav">מיצ״ב</option>
            <option value="boarding_school">קבלה לפנימיות</option>
            <option value="ulpanot">קבלה לאולפנות</option>
            <option value="bar_exam">לשכת עורכי הדין</option>
            <option value="cpa">רואי חשבון</option>
            <option value="teaching_license">הסמכה בהוראה</option>
            <option value="psychology_stage_ab">פסיכולוגיה שלב א׳/ב׳</option>
          </select>
          <label for="exam_type">סוג מבחן</label>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button>
        <button type="submit" class="btn btn-primary">צור</button>
      </div>
    </form>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const spinner = document.getElementById('spinner');
  const form    = document.getElementById('examForm');
  if (form) {
    form.addEventListener('submit', () => {
      spinner.style.display = 'flex';
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
    });
  }
});
</script>

<?php include 'includes/footer.php'; ?>
</body>
</html>
