<?php
// questionForm.php

session_start();

require 'config.php'; 
requireSubscription($pdo); // Vérifier l'abonnement de l'utilisateur

include 'includes/header.php';

// Vérifier login
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// Récupérer paramètre
$subject_document_id = $_GET['subject_document_id'] ?? '';
$document_id         = $_GET['document_id']         ?? '';

if (empty($subject_document_id) && empty($document_id)) {
    die($lang_data['question_form_error_missing_document_id'] ?? 'Erreur : ID du document manquant.');
}

// Charger les questions/answers (+ open_answers)
try {
    if (!empty($subject_document_id)) {
        $stmt = $pdo->prepare("
            SELECT questions, answers, open_questions, open_answers
            FROM documentQuestions 
            WHERE subject_document_id = :subject_document_id 
              AND uuid = :uuid 
            LIMIT 1
        ");
        $stmt->execute([
            ':subject_document_id' => (int)$subject_document_id,
            ':uuid'                => $_SESSION['user_uuid']
        ]);
    } else {
        $stmt = $pdo->prepare("
            SELECT questions, answers, open_questions, open_answers
            FROM documentQuestions 
            WHERE document_id = :document_id 
              AND uuid = :uuid 
            LIMIT 1
        ");
        $stmt->execute([
            ':document_id' => (int)$document_id,
            ':uuid'        => $_SESSION['user_uuid']
        ]);
    }

    $questionData = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$questionData) {
        die($lang_data['question_form_error_questions_not_found'] ?? 'Erreur : Questions du QCM non trouvées.');
    }

    $questions      = json_decode($questionData['questions'], true) ?: [];
    $answers        = json_decode($questionData['answers'],   true) ?: [];
    $open_questions = json_decode($questionData['open_questions'] ?? '[]', true) ?: [];
    $open_models    = json_decode($questionData['open_answers']   ?? '[]', true) ?: [];

} catch (PDOException $e) {
    die(($lang_data['question_form_error_fetching_questions'] ?? 'Erreur lors de la récupération des questions : ') . htmlspecialchars($e->getMessage()));
}

// Déterminer l'URL de retour selon la provenance
if (isset($_SERVER['HTTP_REFERER']) && strpos($_SERVER['HTTP_REFERER'], 'studyList.php') !== false) {
    $backUrl = 'studyList.php';
} else {
    $backUrl = 'quizList.php';
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($lang_data['question_form_title'] ?? 'Soumettre le QCM') ?></title>
    <!-- Icônes Bootstrap si nécessaires pour le timer -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
</head>
<body class="list-container">

    <!-- Barre de progression -->
    <div class="progress-container">
        <div class="progress">
            <div id="progressBar" class="progress-bar bg-success" style="width: 100%;"></div>
        </div>
    </div>

    <div class="main-content container">
        <h1 class="mb-4 text-center">
            <?= htmlspecialchars($lang_data['question_form_title'] ?? 'Soumettre le QCM') ?>
        </h1>

        <!-- Timer -->
        <div class="timer-container mb-4 container">
            <div class="card-body shadow-lg p-3 border-0" style="background: linear-gradient(135deg, var(--primary-color), var(--primary-hover)); color: white;">
                <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <!-- Icône et titre -->
                    <div class="d-flex align-items-center gap-2 flex-shrink-1">
                        <i class="bi bi-clock-history fs-4"></i>
                        <h5 class="fw-bold mb-0 text-nowrap text-white">
                            <?= $lang_data['question_form_timer_label'] ?? 'Durée du quiz :' ?>
                        </h5>
                    </div>
                    <!-- Champ de durée et bouton -->
                    <div class="d-flex align-items-center gap-2 flex-grow-1 justify-content-end">
                        <input type="number" id="timerDuration" class="btn btn-light d-flex align-items-center gap-2 fw-bold shadow-sm" value="1" min="1" max="120" style="max-width: 80px; background-color: white; color: var(--primary-color); font-weight: bold; text-align: center;">
                        <button id="startTimer" class="btn btn-light d-flex align-items-center gap-2 fw-bold shadow-sm" style="color: var(--primary-color); white-space: nowrap;">
                            <i class="bi bi-play-fill"></i>
                            <?= $lang_data['question_form_timer_start'] ?? 'Démarrer' ?>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <form id="questionForm" method="POST" action="submitQCM.php" novalidate>
            <!-- On envoie l'ID selon le cas -->
            <?php if (!empty($subject_document_id)) : ?>
                <input type="hidden" name="subject_document_id" value="<?= (int)$subject_document_id ?>">
            <?php else: ?>
                <input type="hidden" name="document_id" value="<?= (int)$document_id ?>">
            <?php endif; ?>

            <?php 
            // On va stocker le mapping de chaque question pour le shuffle
            $allRandomOrders = [];

            foreach ($questions as $i => $questionText) :
                $answerObj       = $answers[$i] ?? [];
                $originalOptions = $answerObj['options'] ?? [];
                $originalCorrect = strtoupper($answerObj['correct'] ?? '');

                // Construire un tableau pour shuffle
                $tempArray = [];
                foreach ($originalOptions as $letter => $text) {
                    $tempArray[] = [
                        'letter' => $letter,
                        'text'   => $text
                    ];
                }

                // Shuffle
                shuffle($tempArray);

                // Trouver la position de la bonne réponse
                $newCorrectIndex = null;
                foreach ($tempArray as $indexOpt => $opt) {
                    if (strtoupper($opt['letter']) === $originalCorrect) {
                        $newCorrectIndex = $indexOpt;
                        break;
                    }
                }

                // On enregistre le mapping
                $allRandomOrders[$i] = [
                    'order'   => array_column($tempArray, 'letter'), // ex: ['C','A','D','B']
                    'correct' => $newCorrectIndex
                ];
            ?>
                <div class="question-block">
                    <p>
                        <strong><?= $lang_data['question_form_question_prefix'] ?? 'Question' ?> <?= $i + 1 ?> :</strong>
                        <?= htmlspecialchars($questionText) ?>
                    </p>

                    <?php 
                    // Affichage des options dans le nouvel ordre
                    // On associe l’index 0..3 à la value du radio
                    $lettersForDisplay = ['A','B','C','D'];
                    foreach ($tempArray as $idx => $item) : 
                        $displayLetter = $lettersForDisplay[$idx] ?? chr(65+$idx);
                        $displayText   = $item['text'];
                    ?>
                        <div class="answer d-flex align-items-center mb-2" data-answer-group="<?= $i ?>" style="padding:8px;">
                            <input type="radio"
                                name="answers[<?= $i ?>]"
                                id="q<?= $i ?>_<?= $idx ?>"
                                value="<?= $idx ?>"
                                style="display: none;">
                            <span class="fw-bold me-2"><?= $displayLetter ?>)</span>
                            <span class="flex-grow-1"><?= htmlspecialchars(html_entity_decode($displayText)) ?></span>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endforeach; ?>

            <?php if (!empty($open_questions)): ?>
                <h4 class="mt-4">
                    <?= htmlspecialchars($lang_data['open_questions_section'] ?? 'Questions ouvertes') ?>
                </h4>

                <?php foreach ($open_questions as $k => $q): ?>
                    <div class="open-question-block mb-4">
                        <p class="fw-bold">
                            <?= htmlspecialchars($lang_data['open_question_prefix'] ?? 'Question ouverte') ?>
                            <?= $k + 1 ?> :
                            <?= htmlspecialchars($q) ?>
                        </p>

                        <div class="mb-3">
                            <textarea name="openAnswers[<?= $k ?>]"
                                      class="form-control"
                                      rows="4"
                                      required></textarea>
                        </div>

                        <?php if (!empty($open_models[$k])): ?>
                            <details class="mt-2">
                                <summary><?= htmlspecialchars($lang_data['model_answer'] ?? 'Réponse modèle') ?></summary>
                                <div class="p-2 border rounded bg-light"><?= nl2br(htmlspecialchars($open_models[$k])) ?></div>
                            </details>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>

            <!-- On place l'info randomOrderAll dans un input caché -->
            <input type="hidden" 
                   name="randomOrderAll" 
                   value="<?= htmlspecialchars(json_encode($allRandomOrders), ENT_QUOTES) ?>">

            <div class="text-center">
                <button type="submit" class="btn btn-primary">
                    <?= $lang_data['question_form_submit'] ?? 'Soumettre' ?>
                </button>
            </div>
        </form>

        <div class="text-center mt-4">
            <a href="<?= $backUrl ?>" class="btn btn-primary">
                <i class="bi bi-arrow-left-circle me-2"></i>
                <?= $lang_data['back_to_quizList'] ?? 'Back to quiz list' ?>
            </a>
        </div>
    </div>

    <script>
    document.addEventListener("DOMContentLoaded", function () {
        const progressBar = document.getElementById("progressBar");
        const timerDurationInput = document.getElementById("timerDuration");
        const startTimerButton = document.getElementById("startTimer");
        const questionForm = document.getElementById("questionForm");
        const progressContainer = document.querySelector(".progress-container");

        let timerInterval;
        let timerState = "initial";
        let timeRemaining = 0;
        let totalTime = 0;

        startTimerButton.addEventListener("click", function () {
            if (timerState === "initial") {
                startTimer();
            } else if (timerState === "running") {
                pauseTimer();
            } else if (timerState === "paused") {
                resumeTimer();
            }
        });

        function startTimer() {
            const duration = parseInt(timerDurationInput.value, 10) * 60;
            if (isNaN(duration) || duration <= 0) {
                alert("Veuillez entrer une durée valide.");
                return;
            }
            timeRemaining = duration;
            totalTime = duration;
            progressContainer.classList.add("visible");
            progressBar.style.width = "100%";
            progressBar.style.backgroundColor = "#28a745";

            clearInterval(timerInterval);
            timerState = "running";
            toggleButtonIcon();
            timerInterval = setInterval(updateTimer, 1000);
        }

        function updateTimer() {
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                progressBar.style.width = "0%";
                progressBar.style.backgroundColor = "#dc3545";
                alert("Temps écoulé !");
                questionForm.submit();
                timerState = "initial";
                toggleButtonIcon();
            } else {
                timeRemaining--;
                const progress = (timeRemaining / totalTime) * 100;
                progressBar.style.width = progress + "%";
            }
        }

        function pauseTimer() {
            clearInterval(timerInterval);
            timerState = "paused";
            toggleButtonIcon();
        }

        function resumeTimer() {
            timerState = "running";
            toggleButtonIcon();
            timerInterval = setInterval(updateTimer, 1000);
        }

        function toggleButtonIcon() {
            const icon = startTimerButton.querySelector("i");
            const translations = {
                pause: "<?= $lang_data['question_form_timer_pause'] ?? 'Pause' ?>",
                resume: "<?= $lang_data['question_form_timer_resume'] ?? 'Resume' ?>",
                start: "<?= $lang_data['question_form_timer_start'] ?? 'Start Timer' ?>"
            };

            if (timerState === "running") {
                icon.className = "bi bi-pause-fill";
                startTimerButton.innerHTML = `<i class="bi bi-pause-fill"></i> ${translations.pause}`;
                startTimerButton.classList.remove("btn-primary");
                startTimerButton.classList.add("btn-secondary");
            } else if (timerState === "paused") {
                icon.className = "bi bi-play-fill";
                startTimerButton.innerHTML = `<i class="bi bi-play-fill"></i> ${translations.resume}`;
                startTimerButton.classList.remove("btn-secondary");
                startTimerButton.classList.add("btn-secondary");
            } else if (timerState === "initial") {
                icon.className = "bi bi-play-fill";
                startTimerButton.innerHTML = `<i class="bi bi-play-fill"></i> ${translations.start}`;
                startTimerButton.classList.remove("btn-secondary");
                startTimerButton.classList.add("btn-secondary");
            }
        }

        // Gestion du style pour la sélection d'option
        const answers = document.querySelectorAll(".answer");
        answers.forEach(answer => {
            answer.addEventListener("click", function () {
                const group = this.getAttribute("data-answer-group");
                document.querySelectorAll(`.answer[data-answer-group='${group}']`).forEach(a => a.classList.remove("selected"));
                this.classList.add("selected");
                const radio = this.querySelector("input[type='radio']");
                if (radio) radio.checked = true;
            });
        });
    });
    </script>

<?php include 'includes/footer.php'; ?>
</body>
</html>
