<?php
// submitQCM.php
session_start();
require 'config.php';

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die('Requête invalide');
}

/* ---------------------------------------------------------------------------
   1) Récupération des champs POST
--------------------------------------------------------------------------- */
$document_id         = isset($_POST['document_id'])         ? (int)$_POST['document_id']         : null;
$subject_document_id = isset($_POST['subject_document_id']) ? (int)$_POST['subject_document_id'] : null;
$submit_answers      = $_POST['answers']        ?? [];     // radios QCM
$openSubmit          = $_POST['openAnswers']    ?? [];     // textarea questions ouvertes
$randomOrderJson     = $_POST['randomOrderAll'] ?? '';

$errors = [];
if (!$document_id && !$subject_document_id) {
    $errors[] = 'ID du document manquant.';
}

/* ---------------------------------------------------------------------------
   2) Lecture des données officielles (bonnes réponses QCM + modèles ouverts)
--------------------------------------------------------------------------- */
$correctAnswers = [];
$openAnswers    = [];

if (!$errors) {
    try {
        $sql = "
            SELECT answers, open_answers
            FROM documentQuestions
            WHERE " . ($document_id ? 'document_id = :id' : 'subject_document_id = :id') . "
              AND uuid = :uuid
            LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id'   => $document_id ?: $subject_document_id,
            ':uuid' => $_SESSION['user_uuid']
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            $errors[] = 'Questions introuvables dans la base.';
        } else {
            $correctAnswers = json_decode($row['answers'] ?? '[]', true)        ?: [];
            $openAnswers    = json_decode($row['open_answers'] ?? '[]', true)   ?: [];
        }
    } catch (PDOException $e) {
        $errors[] = 'Erreur SQL : ' . $e->getMessage();
    }
}

/* ---------------------------------------------------------------------------
   3) Validation dynamique de randomOrderAll selon le nombre de QCM
--------------------------------------------------------------------------- */
$totalQuestions = is_array($correctAnswers) ? count($correctAnswers) : 0;
if (!$errors && $totalQuestions > 0 && !$randomOrderJson) {
    // randomOrderAll est requis uniquement si on a des QCM
    $errors[] = 'Ordre aléatoire absent.';
}

if ($errors) {
    include 'includes/header.php';
    echo '<div class="alert alert-danger"><ul><li>' .
         implode('</li><li>', array_map('htmlspecialchars', $errors)) .
         '</li></ul></div>';
    echo '<a class="btn btn-primary" href="questionForm.php?' .
         ($subject_document_id ? 'subject_document_id=' . urlencode($subject_document_id)
                               : 'document_id=' . urlencode($document_id)) .
         '">Retour</a>';
    include 'includes/footer.php';
    exit();
}

/* ---------------------------------------------------------------------------
   4) Note QCM (si présent)
--------------------------------------------------------------------------- */
$correctCount    = 0;
$userLetters     = []; // ex : A,B,NA,C
$submitAnswersStr = '';

if ($totalQuestions > 0) {
    $randomOrders = json_decode($randomOrderJson, true);
    if (!is_array($randomOrders)) {
        // Sécurité: si malformé, considérer comme erreur "douce" (notes = 0)
        $randomOrders = [];
    }

    for ($i = 0; $i < $totalQuestions; $i++) {
        // Mapping affiché à l'étudiant pour cette question
        $lettersArr   = $randomOrders[$i]['order']   ?? []; // ex ['C','A','D','B']
        $correctIndex = isset($randomOrders[$i]['correct']) ? (int)$randomOrders[$i]['correct'] : null;

        // Lettre correcte affichée à l'étudiant
        $correctLet = ($correctIndex !== null && isset($lettersArr[$correctIndex])) ? $lettersArr[$correctIndex] : '';

        if (isset($submit_answers[$i])) {
            $userIndex = (int)$submit_answers[$i];               // 0..3
            $userLet   = $lettersArr[$userIndex] ?? 'NA';        // Lettre choisie par l'étudiant
            if ($correctLet && strtoupper($userLet) === strtoupper($correctLet)) {
                $correctCount++;
            }
        } else {
            $userLet = 'NA';
        }
        $userLetters[] = $userLet;
    }

    $submitAnswersStr = implode(',', $userLetters);
}

/* ---------------------------------------------------------------------------
   5) Évaluation des questions ouvertes (stricte + réaliste)
   - Si pas de modèles open_answers, on stocke juste la saisie et laisse score/feedback vides
--------------------------------------------------------------------------- */
$openScoreCsv = '';   // CSV final "p1,p2,..."
$openFeedback = [];   // tableau de feedback

if (!empty($openSubmit)) {
    // S'il y a des modèles, on corrige ; sinon, on enregistre tel quel
    if (!empty($openAnswers) && is_array($openAnswers)) {
        $countOpen = count($openAnswers);
        $perQMax   = $countOpen > 0 ? (25 / $countOpen) : 0; // points MAX par question

        $pointsArr = []; // points attribués par question (0..perQMax)

        foreach ($openAnswers as $idx => $model) {
            $student = trim($openSubmit[$idx] ?? '');

            // Détection langue pour feedback
            $isHeb  = (bool)(preg_match('/\p{Hebrew}/u', $model) || preg_match('/\p{Hebrew}/u', $student));
            $fbLang = $isHeb ? 'Hebrew' : 'French';

            // Réponse vide ou quasi vide => 0
            $studentNoSpace = preg_replace('/\s+/u', '', $student);
            if (!$studentNoSpace || mb_strlen($studentNoSpace, 'UTF-8') < 8) {
                $openFeedback[$idx] = $isHeb
                    ? 'תשובה קצרה מדי או ריקה — נא להרחיב ולהתייחס לרעיונות המרכזיים.'
                    : 'Réponse trop courte ou vide — merci de développer et de couvrir les idées clés.';
                $pointsArr[$idx] = 0.0;
                continue;
            }

            // Prompt d'évaluation stricte
            $sysPrompt = "You are a strict academic grader. Return ONLY valid JSON {\"score\":X,\"feedback\":\"...\"}. "
                       . "Scoring must follow this rubric: Key-idea coverage (70%), factual accuracy & non-contradiction (20%), clarity & structure (10%). "
                       . "Use integers 0..10 (no decimals). Feedback must be concise, constructive, and in {$fbLang}.";

            $usrPrompt = "Model answer:\n{$model}\n\n"
                       . "Student answer:\n{$student}\n\n"
                       . "Steps you MUST follow (do not output these steps):\n"
                       . "1) Extract 5-8 key ideas from the model answer.\n"
                       . "2) For each key idea, judge student coverage as present / partial / missing.\n"
                       . "3) Compute coverage_score = ((present*1 + partial*0.5)/ideas_count)*7.\n"
                       . "4) Add accuracy_score 0..2 (penalize contradictions/inaccuracies), and clarity_score 0..1.\n"
                       . "5) Sum, round to nearest INTEGER, clamp to 0..10. Be strict: off-topic => <=2.\n"
                       . "Return ONLY JSON: {\"score\":X,\"feedback\":\"...\"} in {$fbLang}.";

            $payload = [
                'model'           => OPENAI_MODEL_QCM,
                'messages'        => [
                    ['role' => 'system', 'content' => $sysPrompt],
                    ['role' => 'user',   'content' => $usrPrompt],
                ],
                'response_format' => ['type' => 'json_object'],
                'max_tokens'      => 220,
                'temperature'     => 0.0,
                'top_p'           => 0.1,
            ];

            $ch = curl_init('https://api.openai.com/v1/chat/completions');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_HTTPHEADER     => [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . OPENAI_API_KEY
                ],
                CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE)
            ]);
            $raw = curl_exec($ch);
            $err = curl_error($ch);
            curl_close($ch);

            $score10 = 0;
            $fbText  = $isHeb
                ? 'הערכת ציון אוטומטית נכשלה — נסה שוב מאוחר יותר.'
                : 'Évaluation automatique indisponible — réessaie plus tard.';

            if ($raw !== false && !$err) {
                $data    = json_decode($raw, true);
                $content = $data['choices'][0]['message']['content'] ?? '{}';
                $res     = json_decode($content, true) ?: [];
                if (isset($res['score']))    $score10 = (int)$res['score'];
                if (isset($res['feedback'])) $fbText  = (string)$res['feedback'];
            }

            // 0..10 puis conversion vers points
            if ($score10 < 0)  $score10 = 0;
            if ($score10 > 10) $score10 = 10;
            $points = $perQMax > 0 ? round(($score10 / 10) * $perQMax, 1) : 0.0;

            $openFeedback[$idx] = $fbText;
            $pointsArr[$idx]    = $points;
        }

        // CSV propre: "5,15"
        $openScoreCsv = implode(',', array_map(function($v){
            return rtrim(rtrim(number_format((float)$v, 1, '.', ''), '0'), '.');
        }, $pointsArr));
    } else {
        // Pas de modèles => pas de scoring automatique
        $openScoreCsv = '';
        $openFeedback = [];
    }
}

/* ---------------------------------------------------------------------------
   6) Insertion dans qcmSubmit
--------------------------------------------------------------------------- */
$stmtIns = $pdo->prepare("
   INSERT INTO qcmSubmit (
       uuid, document_id, subject_document_id,
       submitAnswer, submitNote,
       openSubmitAnswer, openScore, openFeedback,
       randomOrder, created_time
   )
   VALUES (
       :uuid, :doc, :subdoc,
       :submitAnswer, :submitNote,
       :openSubmit, :openScore, :openFeedback,
       :randomOrder, NOW()
   )
");

$stmtIns->execute([
    ':uuid'         => $_SESSION['user_uuid'],
    ':doc'          => $document_id,
    ':subdoc'       => $subject_document_id,
    ':submitAnswer' => $submitAnswersStr,                             // "" si pas de QCM
    ':submitNote'   => $correctCount,                                 //  0 si pas de QCM
    ':openSubmit'   => json_encode($openSubmit,   JSON_UNESCAPED_UNICODE),
    ':openScore'    => $openScoreCsv,                                 // "" si pas de modèles
    ':openFeedback' => json_encode($openFeedback, JSON_UNESCAPED_UNICODE),
    ':randomOrder'  => $totalQuestions > 0 ? $randomOrderJson : ''    // "" si pas de QCM
]);

/* ---------------------------------------------------------------------------
   7) Redirection vers la page de résultat
--------------------------------------------------------------------------- */
$dest = $document_id
      ? 'qcmResult.php?document_id=' . urlencode($document_id)
      : 'qcmResult.php?subject_document_id=' . urlencode($subject_document_id);

header("Location: $dest");
exit();
