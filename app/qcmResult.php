<?php
// qcmResult.php

session_start();
require 'config.php';
requireSubscription($pdo);
include 'includes/header.php';

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// Récupérer soit document_id, soit subject_document_id depuis GET
$document_id = $_GET['document_id'] ?? '';
$subject_document_id = $_GET['subject_document_id'] ?? '';
$submit_id = $_GET['submit_id'] ?? '';

// Vérifier qu'au moins l'un des deux paramètres est présent
if (empty($document_id) && empty($subject_document_id)) {
    die("Erreur : Aucun ID de document fourni.");
}

try {
    // 1) Récupérer toutes les soumissions (COMME AVANT) + open* pour l'affichage des ouvertes
    if (!empty($document_id)) {
        $stmtAll = $pdo->prepare("
            SELECT id, submitAnswer, submitNote, randomOrder,
                   openSubmitAnswer, openScore, openFeedback,
                   created_time
            FROM qcmSubmit
            WHERE document_id = :document_id
              AND uuid = :uuid
            ORDER BY created_time DESC
        ");
        $stmtAll->execute([
            'document_id' => $document_id,
            'uuid'        => $_SESSION['user_uuid']
        ]);
    } else {
        $stmtAll = $pdo->prepare("
            SELECT id, submitAnswer, submitNote, randomOrder,
                   openSubmitAnswer, openScore, openFeedback,
                   created_time
            FROM qcmSubmit
            WHERE subject_document_id = :subject_document_id
              AND uuid = :uuid
            ORDER BY created_time DESC
        ");
        $stmtAll->execute([
            'subject_document_id' => $subject_document_id,
            'uuid'                => $_SESSION['user_uuid']
        ]);
    }
    $allSubmissions = $stmtAll->fetchAll(PDO::FETCH_ASSOC);

    if (count($allSubmissions) === 0) {
        die("Aucune soumission trouvée pour ce QCM.");
    }

    /* ---------- Historique graphique (COMME AVANT) ---------- */
    $submissionDates  = [];
    $submissionScores = [];
    foreach ($allSubmissions as $submission) {
        $submissionDates[]  = date('d/m/Y H:i', strtotime($submission['created_time']));
        $submissionScores[] = (int)$submission['submitNote']; // nb de bonnes réponses QCM (brut)
    }
    // Inverser pour affichage chronologique
    $submissionDates  = array_reverse($submissionDates);
    $submissionScores = array_reverse($submissionScores);

    $submissionDatesJson  = json_encode($submissionDates);
    $submissionScoresJson = json_encode($submissionScores);

    // 2) Déterminer la soumission à afficher (COMME AVANT)
    $selectedSubmission = null;
    if (!empty($submit_id)) {
        foreach ($allSubmissions as $sub) {
            if ($sub['id'] == $submit_id) {
                $selectedSubmission = $sub;
                break;
            }
        }
        if (!$selectedSubmission) {
            $selectedSubmission = $allSubmissions[0]; // fallback: la plus récente
        }
    } else {
        $selectedSubmission = $allSubmissions[0]; // par défaut: la plus récente
    }

    // 3) Récupérer questions/ réponses/ explications + OUVERTES + ai_id
    if ($document_id) {
        $stmtQ = $pdo->prepare("
            SELECT questions, answers, explanation,
                   open_questions, open_answers, ai_id
            FROM documentQuestions
            WHERE document_id = :doc
            LIMIT 1
        ");
        $stmtQ->execute([':doc' => $document_id]);
    } else {
        $stmtQ = $pdo->prepare("
            SELECT questions, answers, explanation,
                   open_questions, open_answers, ai_id
            FROM documentQuestions
            WHERE subject_document_id = :subdoc
            LIMIT 1
        ");
        $stmtQ->execute([':subdoc' => $subject_document_id]);
    }
    $qd = $stmtQ->fetch(PDO::FETCH_ASSOC);
    if (!$qd) {
        die("Erreur : Aucune question trouvée pour ce document.");
    }

    $questions     = json_decode($qd['questions'], true);
    $answers       = json_decode($qd['answers'], true);
    $explanations  = json_decode($qd['explanation'] ?? '[]', true) ?: [];
    $openQuestions = json_decode($qd['open_questions'] ?? '[]', true);
    $openAnswers   = json_decode($qd['open_answers']   ?? '[]', true);
    $aiId          = $qd['ai_id'] ?? null;

    if (!is_array($questions) || !is_array($answers)) {
        die("Erreur : Format JSON invalide (questions/answers).");
    }

    // 4) Données de la soumission sélectionnée
    $randomOrder      = json_decode($selectedSubmission['randomOrder'] ?? '', true); // array
    $submittedAnswers = explode(',', strtoupper($selectedSubmission['submitAnswer'] ?? ''));
    $correctCount     = (int)$selectedSubmission['submitNote'];
    $totalQuestions   = count($questions);

    // Ouvertes: lecture (openSubmit, openFeedback, openScore CSV ou ancien /10)
    $openSubmit   = json_decode($selectedSubmission['openSubmitAnswer'] ?? '[]', true);
    $openFeedback = json_decode($selectedSubmission['openFeedback']    ?? '[]', true);

    $openScoreRaw  = (string)($selectedSubmission['openScore'] ?? '');
    $openScoreList = [];
    $score25       = 0.0;

    if (!empty($openQuestions) && $openScoreRaw !== '') {
        if (strpos($openScoreRaw, ',') !== false) {
            $openScoreList = array_map('floatval', array_filter(array_map('trim', explode(',', $openScoreRaw)), 'strlen'));
            $score25 = round(array_sum($openScoreList), 1);
        } else {
            // compat ancien: moyenne /10 => convertir sur 25
            $avg10   = (float)$openScoreRaw;
            $score25 = round(($avg10 / 10) * 25, 1);
        }
    }

    // >>> AJOUT pour rétablir le ציון סופי (/100)
    $score75  = $totalQuestions ? round($correctCount / $totalQuestions * 75, 1) : 0;
    $score100 = round($score75 + $score25, 1);

} catch (PDOException $e) {
    die("Erreur : " . $e->getMessage());
}

// Déterminer l'URL de retour selon la provenance
if (isset($_SERVER['HTTP_REFERER']) && strpos($_SERVER['HTTP_REFERER'], 'quizList.php') !== false) {
    $backUrl = 'quizList.php';
} else {
    $backUrl = 'studyList.php';
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'he') ?>">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($lang_data['qcm_results_page_title'] ?? 'QCM Results') ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
/* --- Chat look & feel --- */
#chatHistory {
    max-height: 350px;
    overflow-y: auto;
    background: #f8f9fa;
    border: 1px solid #e3e6ea;
    border-radius: .5rem;
    padding: 1rem;
}
.msg-user,
.msg-ai {
    display: inline-block;
    padding: .6rem 1rem;
    margin-bottom: .5rem;
    border-radius: 18px;
    max-width: 80%;
    word-wrap: break-word;
    font-size: .9rem;
    line-height: 1.3;
}
.msg-user { background:#0d6efd;  color:#fff; align-self:flex-end;}
.msg-ai   { background:#e9ecef;  color:#000; align-self:flex-start;}
</style>

</head>
<body>
<div class="container mt-5 mb-5">
    <div class="text-center mb-4">
        <h1 class="display-4"><?= htmlspecialchars($lang_data['qcm_results_heading'] ?? 'QCM Results') ?></h1>
    </div>

    <!-- Résultat global : on garde %d/%d ET on affiche le ציון סופי /100 -->
    <div class="card mb-4 shadow-sm">
        <div class="card-body text-center">
            <h5 class="mb-0">
                <?= sprintf($lang_data['submission_result_message'] ?? 'Vous avez obtenu %d / %d', $correctCount, $totalQuestions) ?>
                &nbsp;•&nbsp; <strong><?= $lang_data['final_score_label'] ?? 'ציון סופי' ?>: <?= $score100 ?>/100</strong>
            </h5>
            <small>(
                <?= $lang_data['score_qcm'] ?? 'QCM' ?>&nbsp;<?= $score75 ?>/75
                &nbsp;|&nbsp;
                <?= $lang_data['score_open'] ?? 'Ouvertes' ?>&nbsp;<?= $score25 ?>/25
            )</small>
        </div>
    </div>

    <?php if (count($allSubmissions) > 1): ?>
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-center mb-3 gap-3">
            <!-- Sélecteur de soumission (COMME AVANT) -->
            <form method="GET" action="qcmResult.php" class="d-flex align-items-center w-100 w-md-auto gap-2">
                <?php if (!empty($document_id)): ?>
                    <input type="hidden" name="document_id" value="<?= htmlspecialchars($document_id) ?>">
                <?php else: ?>
                    <input type="hidden" name="subject_document_id" value="<?= htmlspecialchars($subject_document_id) ?>">
                <?php endif; ?>
                <label for="submit_id" class="form-label mb-0 fw-bold d-none d-md-inline">
                    <?= $lang_data['select_submission_label'] ?? 'Soumission :' ?>
                </label>
                <select name="submit_id" id="submit_id" class="form-select" onchange="this.form.submit()">
                    <?php foreach ($allSubmissions as $sub): ?>
                        <option value="<?= htmlspecialchars($sub['id']) ?>"
                            <?= ($sub['id'] == $selectedSubmission['id']) ? 'selected' : '' ?>>
                            <?= htmlspecialchars(date('d/m/Y H:i', strtotime($sub['created_time']))) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </form>

            <!-- Bouton statistiques (COMME AVANT) -->
            <button class="btn btn-primary d-flex align-items-center gap-2" type="button"
                    data-bs-toggle="collapse" data-bs-target="#statisticsCollapse"
                    aria-expanded="false" aria-controls="statisticsCollapse">
                <i class="bi bi-graph-up"></i>
                <?= $lang_data['toggle_statistics_button'] ?? 'Statistiques' ?>
            </button>
        </div>
    <?php endif; ?>

    <!-- Bloc statistiques (COMME AVANT) -->
    <div class="collapse" id="statisticsCollapse">
        <div class="row">
            <div class="col-12 mb-4">
                <div class="card flex-fill w-100 draggable">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <?= htmlspecialchars($lang_data['score_chart_title'] ?? 'Your Score Over Time:') ?>
                        </h5>
                    </div>
                    <div class="card-body py-3">
                        <div class="chart chart-sm">
                            <canvas id="chartjs-dashboard-line" style="max-height: 300px;"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <h4 class="card-title"><?= $lang_data['your_answers_heading'] ?? 'Your Answers:' ?></h4>

    <?php
    // Affichage de chaque question fermée en respectant l’ordre aléatoire
    for ($i = 0; $i < $totalQuestions; $i++) {
        $questionText = $questions[$i] ?? '';
        $answerData   = $answers[$i] ?? [];
        $allOptions   = $answerData['options'] ?? [];  // ex: ['A'=>'...','B'=>'...','C'=>'...','D'=>'...']
        $explanation  = $explanations[$i] ?? '';

        // randomOrder pour cette question
        $orderInfo    = $randomOrder[$i] ?? [];
        $lettersOrder = $orderInfo['order'] ?? []; // Exemple : ['C','A','D','B']
        $correctIndex = isset($orderInfo['correct']) ? (int)$orderInfo['correct'] : null;

        // Construction de l'affichage des options (A,B,C,D)
        $displayAnswers = [];
        foreach ($lettersOrder as $k => $originalKey) {
            $displayAnswers[$k] = [
                'letter' => chr(65 + $k),
                'text'   => $allOptions[$originalKey] ?? ''
            ];
        }

        // Réponse soumise (lettre "originale" stockée)
        $originalUserLetter  = $submittedAnswers[$i] ?? 'NA';
        // Trouver l'index affiché
        $userDisplayedIndex  = array_search($originalUserLetter, $lettersOrder);
        $userDisplayedLetter = ($userDisplayedIndex === false) ? 'NA' : chr(65 + $userDisplayedIndex);

        // Lettre correcte affichée
        $correctDisplayedLetter = ($correctIndex !== null && isset($displayAnswers[$correctIndex]))
            ? chr(65 + $correctIndex) : '';

        // Nettoyage & placeholder {correct}
        if (strpos($explanation, 'Réponse correcte') !== false) {
            $explanation = preg_replace('/<br\s*\/?>\s*<strong>Réponse correcte\s*:\s*.*<\/strong>/i', '', $explanation);
        }
        $updatedExplanation = (strpos($explanation, '{correct}') !== false)
            ? str_replace('{correct}', $correctDisplayedLetter, $explanation)
            : $explanation;
        ?>

        <div class="result-block mb-4 p-3 border rounded shadow-sm">
            <p class="fw-bold">
                <?= $lang_data['question_form_question_prefix'] ?? 'Question' ?> <?= $i + 1 ?> :
                <?= htmlspecialchars($questionText) ?>
            </p>

            <?php 
            foreach ($displayAnswers as $k => $opt) {
                $optLetter = $opt['letter'];
                $optText   = $opt['text'];

                $isChoiceCorrect = ($k === $correctIndex);
                $isChoiceUser    = (strtoupper($optLetter) === strtoupper($userDisplayedLetter));

                $choiceClass = '';
                $choiceIcon  = '';
                if ($isChoiceCorrect && $isChoiceUser) {
                    $choiceClass = 'alert alert-success';
                    $choiceIcon  = '<i class="bi bi-check-circle-fill text-success ms-2"></i>';
                } elseif ($isChoiceCorrect) {
                    $choiceClass = 'alert alert-success';
                } elseif ($isChoiceUser) {
                    $choiceClass = 'alert alert-danger';
                    $choiceIcon  = '<i class="bi bi-x-circle-fill text-danger ms-2"></i>';
                }
                ?>
                <div class="answer d-flex align-items-center mb-2 <?= $choiceClass ?>" style="padding:8px;">
                    <span class="fw-bold me-2"><?= $optLetter ?>)</span>
                    <span class="flex-grow-1"><?= htmlspecialchars(html_entity_decode($optText)) ?></span>
                    <?= $choiceIcon ?>
                </div>
            <?php } ?>

            <!-- Badge état de réponse (COMME AVANT) -->
            <div class="mt-2">
                <?php
                if ($userDisplayedLetter === 'NA') {
                    echo '<span class="badge bg-warning text-dark"><i class="bi bi-question-circle-fill me-1"></i>'
                         . ($lang_data['not_answered'] ?? 'Not answered')
                         . '</span>';
                } elseif (strtoupper($userDisplayedLetter) === strtoupper($correctDisplayedLetter)) {
                    echo '<span class="badge bg-success"><i class="bi bi-check-circle-fill me-1"></i>'
                         . ($lang_data['correct_label'] ?? 'Correct')
                         . '</span>';
                } else {
                    echo '<span class="badge bg-danger"><i class="bi bi-x-circle-fill me-1"></i>'
                         . ($lang_data['incorrect_label'] ?? 'Incorrect')
                         . '</span>';
                }
                ?>
            </div>

            <div class="mt-2">
                <strong><?= $lang_data['explanation_label'] ?? 'Explanation:' ?></strong>
                <p><em><?= nl2br(htmlspecialchars($updatedExplanation)) ?></em></p>
            </div>
        </div>
        <?php
    } // Fin du for des fermées
    ?>

    <!-- ========= Questions ouvertes ========= -->
    <?php if (!empty($openQuestions)): ?>
    <?php
      // Somme /25 déjà calculée dans $score25 ; badge récap
      $badge25 = rtrim(rtrim(number_format($score25, 1, '.', ''), '0'), '.');
    ?>
    <h3 class="mt-5">
        <?= $lang_data['open_questions_section'] ?? 'Questions ouvertes' ?>
        <span class="badge bg-info"><?= $badge25 ?>/25</span>
    </h3>

    <?php foreach ($openQuestions as $i=>$q): ?>
    <div class="border rounded p-3 mb-4 shadow-sm">
        <p class="fw-bold"><?= htmlspecialchars($q) ?></p>

        <p><strong><?= $lang_data['your_answer'] ?? 'Votre réponse' ?> :</strong><br>
           <?= nl2br(htmlspecialchars($openSubmit[$i] ?? '')) ?></p>

        <p><strong><?= $lang_data['model_answer'] ?? 'Réponse modèle' ?> :</strong><br>
           <?= nl2br(htmlspecialchars($openAnswers[$i] ?? '')) ?></p>

        <?php
          // Points pour CETTE question (issus du CSV)
          $perQ = isset($openScoreList[$i]) ? (float)$openScoreList[$i] : 0.0;
          $perQStr = rtrim(rtrim(number_format($perQ, 1, '.', ''), '0'), '.');
        ?>
        <p class="alert alert-info mb-0">
            <strong><?= $lang_data['feedback_label'] ?? 'Feedback' ?> (<?= $perQStr ?>) :</strong><br>
            <?= nl2br(htmlspecialchars($openFeedback[$i] ?? '')) ?>
        </p>
    </div>
    <?php endforeach; endif; ?>

    <div class="text-center mt-4">
        <a href="<?= htmlspecialchars($backUrl) ?>" class="btn btn-primary">
            <i class="bi bi-arrow-left-circle me-2"></i>
            <?= $lang_data['back_to_quizList'] ?? 'Retour à la liste des QCM' ?>
        </a>
    </div>
</div>
<!-- Bouton flottant -->
<button type="button" class="btn btn-primary rounded-circle shadow-lg"
        style="position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; z-index: 9999;"
        data-bs-toggle="modal" data-bs-target="#openaiChatModal" title="Poser une question">
    <i class="bi bi-chat-dots fs-4"></i>
</button>

<!-- Modal de Chat -->
<div class="modal fade" id="openaiChatModal" tabindex="-1" aria-labelledby="openaiChatModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-lg">
    <div class="modal-content shadow">
      <div class="modal-header">
        <h5 class="modal-title">
            <?= htmlspecialchars($lang_data['chat_modal_title'] ?? 'Assistant IA') ?>
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
      </div>

      <div class="modal-body d-flex flex-column" style="gap:1rem;">
        <!-- Fil de discussion -->
        <div id="chatHistory" class="d-flex flex-column"></div>

        <!-- Zone de saisie -->
        <div class="input-group">
          <textarea id="chatInput" class="form-control mb-3" rows="2"
                placeholder="<?= htmlspecialchars($lang_data['chat_placeholder'] ?? 'Écrivez votre question…') ?>">
          </textarea>
          <button id="sendChatBtn" class="btn btn-primary">
                <i class="bi bi-send-fill me-1"></i>
                <?= htmlspecialchars($lang_data['chat_send_button'] ?? 'Envoyer') ?>
           </button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ========== JS Charts (COMME AVANT) ========== -->
<script>
document.addEventListener('DOMContentLoaded', () => {
    const submissionDates  = <?= $submissionDatesJson ?>;
    const submissionScores = <?= $submissionScoresJson ?>;

    const chartTranslations = {
        scoreChartTitle: '<?= addslashes($lang_data['score_chart_title'] ?? 'Your Score Over Time:') ?>',
        scoreChartXAxis: '<?= addslashes($lang_data['score_chart_x_axis'] ?? 'Submission Date') ?>',
        scoreChartYAxis: '<?= addslashes($lang_data['score_chart_y_axis'] ?? 'Score') ?>',
        tooltipLabel:   '<?= addslashes($lang_data['tooltip_correct_label'] ?? 'Score') ?>',
    };

    const ctxLine = document.getElementById('chartjs-dashboard-line')?.getContext('2d');
    if (ctxLine) {
        const gradient = ctxLine.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, "rgba(215, 227, 244, 1)");
        gradient.addColorStop(1, "rgba(215, 227, 244, 0)");

        new Chart(ctxLine, {
            type: "line",
            data: {
                labels: submissionDates,
                datasets: [{
                    label: chartTranslations.scoreChartTitle,
                    fill: true,
                    backgroundColor: gradient,
                    borderColor: 'rgba(33, 150, 243, 1)',
                    data: submissionScores
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = chartTranslations.tooltipLabel || '';
                                if (label) { label += ': '; }
                                label += context.parsed.y;
                                return label;
                            }
                        }
                    }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false },
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: chartTranslations.scoreChartXAxis, font: { size: 14, weight: 'bold' } },
                        grid: { display: false },
                        ticks: { autoSkip: true, maxTicksLimit: 10 }
                    },
                    y: {
                        display: true,
                        title: { display: true, text: chartTranslations.scoreChartYAxis, font: { size: 14, weight: 'bold' } },
                        suggestedMin: 0,
                        suggestedMax: Math.max(...submissionScores, 1) + 1,
                        grid: { borderDash: [3, 3], color: "rgba(0,0,0,0.1)" },
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }
});
</script>

<?php include 'includes/footer.php'; ?>
</body>
</html>
