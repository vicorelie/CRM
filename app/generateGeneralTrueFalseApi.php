<?php
/****************************************************************************
 *  generateGeneralTrueFalseApi.php
 *  ------------------------------------------------------------------------
 *  • POST : subject_document_id, tf_language (fr|en|he|ar|ru…)
 *  • Génère 10 énoncés “Vrai/Faux” (≈ 50 mots) : 5 corrects, 5 erronés.
 *    – JSON attendu : [{ statement, is_true, explanation }]
 *  • Insère dans documentTrueFalse.text_content puis redirige vers viewTrueFalse.php
 ***************************************************************************/

set_time_limit(300);
ini_set('memory_limit', '1024M');

require 'config.php';                 // définit $pdo, OPENAI_API_KEY, OPENAI_MODEL
csrf_protect_post();

if (!isset($_SESSION['user_uuid'])) {
    die("Erreur : accès non autorisé. Veuillez vous connecter.");
}
$userUuid = $_SESSION['user_uuid'];

/* ---------- paramètres ---------- */
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['subject_document_id'])) {
    die("Erreur : requête invalide.");
}
$subjectDocumentId = (int)$_POST['subject_document_id'];
$language          = $_POST['tf_language'] ?? 'he';
$numberOfStmts     = 10;   // total (5 vrais, 5 faux)

/* ---------- 1. infos document ---------- */
$stmtDoc = $pdo->prepare("
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
$stmtDoc->execute(['id'=>$subjectDocumentId,'uuid'=>$userUuid]);
$doc = $stmtDoc->fetch(PDO::FETCH_ASSOC);
if (!$doc) die("Erreur : document introuvable ou accès refusé.");

$topic     = trim($doc['topic']      ?? '');
$subTopic  = trim($doc['sub_topic']  ?? '');
$subjName  = trim($doc['subject_name'] ?? '');
$subjUnit  = trim($doc['subject_unit'] ?? '');
$course    = trim($doc['course_name']  ?? '');

/* ---------- 2. curriculum ---------- */
$stmtCur = $pdo->prepare("
    SELECT student_type, student_country, student_school_class,
           student_academic_course_1, student_academic_diploma_1, student_academic_year_1,
           student_academic_course_2, student_academic_diploma_2, student_academic_year_2,
           student_academic_course_3, student_academic_diploma_3, student_academic_year_3
    FROM studentCurriculum
    WHERE uuid = :uuid
    LIMIT 1
");
$stmtCur->execute(['uuid'=>$userUuid]);
$cur = $stmtCur->fetch(PDO::FETCH_ASSOC) ?: die("Erreur : curriculum manquant.");

/* ---------- 3. prompt ---------- */
$content  = "Sujet : $topic";
if ($subTopic) $content .= "\nSous-sujet : $subTopic";

if ($cur['student_type'] === 'school') {
    $student_country = $cur['student_country']     ?? '';
    $student_class   = $cur['student_school_class']?? '';

    $prompt = "Langue exclusive : $language.\n\n"
            . "Vous êtes un assistant expert qui crée des QCM Vrai/Faux pour le secondaire. "
            . "Élève : pays $student_country, classe $student_class. Matière : $subjName (coef. $subjUnit).\n"
            . "$content\n\n"
            . "Générez exactement $numberOfStmts énoncés d’environ 50 mots : **5 vrais, 5 faux**. "
            . "Pour chaque énoncé :\n"
            . "• `statement`   : le texte complet\n"
            . "• `is_true`     : true ou false\n"
            . "• `explanation` : courte explication uniquement si `is_true` == false, sinon chaîne vide.\n\n"
            . "Répondez UNIQUEMENT avec le JSON (tableau). Aucune autre sortie.";
} elseif ($cur['student_type'] === 'academic') {
    $student_country = $cur['student_country'] ?? '';

    // déterminer le bon triplet course/diploma/year
    $triplets = [
        ['course'=>$cur['student_academic_course_1'],'diploma'=>$cur['student_academic_diploma_1'],'year'=>$cur['student_academic_year_1']],
        ['course'=>$cur['student_academic_course_2'],'diploma'=>$cur['student_academic_diploma_2'],'year'=>$cur['student_academic_year_2']],
        ['course'=>$cur['student_academic_course_3'],'diploma'=>$cur['student_academic_diploma_3'],'year'=>$cur['student_academic_year_3']],
    ];
    $chosen = ['course'=>'','diploma'=>'','year'=>''];
    foreach ($triplets as $t) if ($course && $course === trim($t['course']??'')) $chosen = $t;

    $prompt = "Langue exclusive : $language.\n\n"
            . "Vous êtes un assistant expert qui crée des Vrai/Faux universitaires. "
            . "Étudiant : $chosen[year]ᵉ année du diplôme $chosen[diploma], pays $student_country, cours $chosen[course].\n"
            . "$content\n\n"
            . "Générez exactement $numberOfStmts énoncés d’environ 50 mots : **5 vrais, 5 faux**. "
            . "Pour chaque énoncé :\n"
            . "• `statement`   : le texte complet\n"
            . "• `is_true`     : true ou false\n"
            . "• `explanation` : courte explication uniquement si `is_true` == false, sinon chaîne vide.\n\n"
            . "Répondez UNIQUEMENT avec le JSON (tableau). Aucune autre sortie.";
} else {
    die("Erreur : type d’étudiant inconnu.");
}

/* ---------- 4. appel OpenAI ---------- */
function callOpenAI_TF(string $prompt) : array
{
    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_HTTPHEADER=>[
            'Content-Type: application/json',
            'Authorization: Bearer '.OPENAI_API_KEY
        ],
        CURLOPT_POST=>true,
        CURLOPT_POSTFIELDS=>json_encode([
            'model'    => OPENAI_MODEL,
            'messages' => [
                ['role'=>'system','content'=>'Tu génères des exercices Vrai/Faux en JSON strict.'],
                ['role'=>'user'  ,'content'=>$prompt]
            ],
            'temperature'=>0.7,
            'max_tokens' =>2000
        ]),
        CURLOPT_TIMEOUT=>120
    ]);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if (!$raw || $status!==200) die("Erreur OpenAI ($status)");
    $content = json_decode($raw,true)['choices'][0]['message']['content'] ?? '';
    if (preg_match('/```json(.*?)```/s',$content,$m)) $content = trim($m[1]);
    $arr = json_decode($content,true);
    if (json_last_error()!==JSON_ERROR_NONE || !is_array($arr))
        die("JSON OpenAI illisible : ".json_last_error_msg());
    return $arr;
}

$statements  = callOpenAI_TF($prompt);
$openaiCost  = 0.02;
$textContent = json_encode($statements, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);

/* ---------- 5. sauvegarde ---------- */
$pdo->prepare("
    INSERT INTO documentTrueFalse
           (uuid, created_time, subject_document_id, text_content, openaiCost)
    VALUES (:uuid, NOW(), :sid, :txt, :cost)
")->execute([
    'uuid'=>$userUuid,
    'sid' =>$subjectDocumentId,
    'txt' =>$textContent,
    'cost'=>$openaiCost
]);

header("Location: viewTrueFalse.php?subject_document_id=$subjectDocumentId");
exit;
?>
