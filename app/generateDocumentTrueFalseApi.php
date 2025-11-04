<?php
/****************************************************************************
 *  generateDocumentTrueFalseApi.php
 *  ------------------------------------------------------------------------
 *  • POST : subject_document_id, tf_language (fr|en|he|ar|ru…)
 *  • Génère 10 énoncés “Vrai/Faux” (≈ 50 mots) : 5 corrects, 5 erronés.
 *    – JSON attendu : [{ statement, is_true, explanation }]
 *  • Insère dans documentTrueFalse.text_content puis redirige vers viewTrueFalse.php
 ***************************************************************************/

session_start();
set_time_limit(300);
ini_set('memory_limit', '1024M');

require 'config.php';                 // définit $pdo, OPENAI_API_KEY, OPENAI_MODEL
require_once 'vendor/autoload.php';

// 1. Vérification d'authentification et paramètres
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_SESSION['user_uuid'], $_POST['subject_document_id'])) {
    die("Erreur : requête invalide ou accès non autorisé.");
}
$userUuid           = $_SESSION['user_uuid'];
$subjectDocumentId  = (int)$_POST['subject_document_id'];
$language           = trim($_POST['tf_language'] ?? 'he');
$numberOfStmts      = 10;   // 5 vrais + 5 faux

// 2. Récupérer les infos du document et de la matière
$stmt = $pdo->prepare("
    SELECT D.topic,
           D.sub_topic,
           SS.subject_name,
           SS.subject_unit,
           SS.course_name
    FROM subjectDocuments D
    LEFT JOIN studySubjects SS ON D.study_subjects_id = SS.id
    WHERE D.id = :id AND D.uuid = :uuid
    LIMIT 1
");
$stmt->execute([
    ':id'   => $subjectDocumentId,
    ':uuid' => $userUuid
]);
$doc = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$doc) {
    die("Erreur : document introuvable ou accès refusé.");
}
$topic     = trim($doc['topic']      ?? '');
$subTopic  = trim($doc['sub_topic']  ?? '');
$subjName  = trim($doc['subject_name'] ?? '');
$subjUnit  = trim($doc['subject_unit'] ?? '');
$course    = trim($doc['course_name']  ?? '');

// 3. Récupérer le curriculum utilisateur
$stmt = $pdo->prepare("
    SELECT student_type, student_country, student_school_class,
           student_academic_course_1, student_academic_diploma_1, student_academic_year_1,
           student_academic_course_2, student_academic_diploma_2, student_academic_year_2,
           student_academic_course_3, student_academic_diploma_3, student_academic_year_3
    FROM studentCurriculum
    WHERE uuid = :uuid
    LIMIT 1
");
$stmt->execute([':uuid' => $userUuid]);
$cur = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$cur) {
    die("Erreur : curriculum manquant.");
}

// 4. Construire le prompt
$content = "Sujet : {$topic}";
if ($subTopic) {
    $content .= "\nSous-sujet : {$subTopic}";
}

if ($cur['student_type'] === 'school') {
    $student_country = trim($cur['student_country']      ?? '');
    $student_class   = trim($cur['student_school_class'] ?? '');

    $prompt = <<<PROMPT
Langue exclusive : {$language}.

Vous êtes un assistant expert qui crée des exercices Vrai/Faux pour le secondaire.
Élève : pays {$student_country}, classe {$student_class}. Matière : {$subjName} (coef. {$subjUnit}).
{$content}

Générez exactement {$numberOfStmts} énoncés d’environ 50 mots : 5 vrais, 5 faux.
Pour chaque énoncé :
• "statement"   : le texte complet
• "is_true"     : true ou false
• "explanation" : courte explication uniquement si is_true == false, sinon chaîne vide.

Répondez UNIQUEMENT avec le JSON (tableau). Aucune autre sortie.
PROMPT;

} elseif ($cur['student_type'] === 'academic') {
    $student_country = trim($cur['student_country'] ?? '');

    // Trouver le triplet course/diploma/year correspondant
    for ($i = 1; $i <= 3; $i++) {
        if ($course === trim($cur["student_academic_course_{$i}"] ?? '')) {
            $chosen = [
                'course'  => $cur["student_academic_course_{$i}"],
                'diploma' => $cur["student_academic_diploma_{$i}"],
                'year'    => $cur["student_academic_year_{$i}"]
            ];
            break;
        }
    }
    $chosen = $chosen ?? ['course'=>'','diploma'=>'','year'=>''];

    $prompt = <<<PROMPT
Langue exclusive : {$language}.

Vous êtes un assistant expert qui crée des exercices Vrai/Faux universitaires.
Étudiant : {$chosen['year']}ᵉ année du diplôme {$chosen['diploma']}, pays {$student_country}, cours {$chosen['course']}.
{$content}

Générez exactement {$numberOfStmts} énoncés d’environ 50 mots : 5 vrais, 5 faux.
Pour chaque énoncé :
• "statement"   : le texte complet
• "is_true"     : true ou false
• "explanation" : courte explication uniquement si is_true == false, sinon chaîne vide.

Répondez UNIQUEMENT avec le JSON (tableau). Aucune autre sortie.
PROMPT;

} else {
    die("Erreur : type d’étudiant inconnu.");
}

/**
 * Appelle l'API OpenAI et retourne un array PHP de Vrai/Faux
 */
function callOpenAI_TF(string $prompt): array {
    $payload = [
        'model'       => OPENAI_MODEL,
        'messages'    => [
            ['role'=>'system','content'=>'Vous générez des exercices Vrai/Faux en JSON strict.'],
            ['role'=>'user',  'content'=>$prompt]
        ],
        'temperature' => 0.7,
        'max_tokens'  => 2000
    ];
    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer '.OPENAI_API_KEY
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 120
    ]);
    $raw    = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if (!$raw || $status !== 200) {
        throw new RuntimeException("Erreur OpenAI (HTTP $status)");
    }

    // Nettoyage Markdown
    $content = json_decode($raw, true)['choices'][0]['message']['content'] ?? '';
    $content = preg_replace('/^```json\s*/i', '', $content);
    $content = preg_replace('/\s*```$/i',    '', $content);

    // Essai 1 : json_decode direct
    $arr = json_decode($content, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($arr)) {
        return $arr;
    }

    // Essai 2 : extraire entre [ ... ]
    if (preg_match('/(\[.*\])/s', $content, $m)) {
        $cand = $m[1];
        $arr2 = json_decode($cand, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($arr2)) {
            return $arr2;
        }
    }

    // Essai 3 : échappement de guillemets
    $fixed = preg_replace_callback(
        '/"((?:\\\\.|[^"\\\\])*)"/u',
        fn($m)=>'"'.addcslashes($m[1], '"').'"',
        $content
    );
    $arr3 = json_decode($fixed, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($arr3)) {
        return $arr3;
    }

    throw new RuntimeException("JSON invalide : ".json_last_error_msg()."\nContenu :\n$content");
}

// 5. Exécution
try {
    $statements = callOpenAI_TF($prompt);
} catch (Exception $e) {
    die("Erreur lors de l’appel OpenAI : " . $e->getMessage());
}

// 6. Sauvegarde en base
$openaiCost  = 0.02;
$textContent = json_encode($statements, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);

$stmt = $pdo->prepare("
    INSERT INTO documentTrueFalse
       (uuid, created_time, subject_document_id, text_content, openaiCost)
    VALUES
       (:uuid, NOW(), :sid, :txt, :cost)
");
$stmt->execute([
    ':uuid'  => $userUuid,
    ':sid'   => $subjectDocumentId,
    ':txt'   => $textContent,
    ':cost'  => $openaiCost
]);

// 7. Redirection
header("Location: viewTrueFalse.php?subject_document_id={$subjectDocumentId}");
exit;
?>
