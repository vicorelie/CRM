<?php
/****************  generateExamApi.php  *****************
 *  Génère un examen « Exam IL » complet
 *  (psychometric, amir, yael, …) et l’enregistre
 *  dans documentExamQuestions.
 *  Style & robustesse calqués sur generateGeneralQuizAPI.php
 *********************************************************/

ignore_user_abort(true);
set_time_limit(0);
ini_set('memory_limit', '1024M');

require_once __DIR__.'/config.php';   // DSN, DB_USER, DB_PASS, $pdo, constantes
session_start();
require_once 'vendor/autoload.php';

/* ---------- utilitaires ---------- */
function fixJsonQuotes(string $j): string
{
    return preg_replace_callback(
        '/"((?:\\\\.|[^"\\\\])*)"/u',
        fn($m) => '"'.str_replace('"','\"',$m[1]).'"',
        $j
    );
}
function ensurePdo(PDO $pdo): PDO
{
    try { $pdo->query('SELECT 1'); return $pdo; }
    catch (PDOException) {
        global $dsn;
        return new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
}

/* ---------- 1. contrôles ---------- */
if (!isset($_SESSION['user_uuid'])) die('Erreur : connexion requise.');
$userUuid  = $_SESSION['user_uuid'];

$examType  = trim($_POST['exam_type'] ?? '');
$prompts   = require __DIR__.'/examPrompts.php';
if (!isset($prompts[$examType])) die('Erreur : exam_type inconnu');

$numQuestions = 80;                    // fixe ; change si besoin

/* ---------- 2. prompt ---------- */
$systemTemplate = $prompts[$examType];

/* ---------- 3. appels OpenAI en lots (identique à ta logique) ---------- */
$batchSize = 8;
$allQcm    = [];
$openaiId  = 'exam';

for ($b = 1; $b <= ceil($numQuestions / $batchSize); $b++) {

    $need          = min($batchSize, $numQuestions - count($allQcm));
    $systemPrompt  = $systemTemplate;            // pas de variable à remplacer
    $userPrompt    = "ייצר בדיוק {$need} שאלות בפורמט JSON המבוקש בלבד.";   // court : taille max safe

    $ok = false;
    for ($t = 1; $t <= 3 && !$ok; $t++) {

        $payload = [
            'model'       => OPENAI_MODEL_QCM,
            'messages'    => [
                ['role'=>'system','content'=>$systemPrompt],
                ['role'=>'user',  'content'=>$userPrompt],
            ],
            'temperature' => 0.4,
            'max_tokens'  => 2000
        ];
        if ($t === 1) $payload['response_format'] = ['type'=>'json_object'];

        /* --- requête --- */
        $ch = curl_init('https://api.openai.com/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_POST           => 1,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer '.OPENAI_API_KEY
            ],
            CURLOPT_POSTFIELDS     => json_encode($payload)
        ]);
        $raw  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($err || $code !== 200) { usleep(200000); continue; }

        $data    = json_decode($raw, true);
        $openaiId = $data['id'] ?? $openaiId;

        $content = preg_replace(
            '/^```json\s*|```$/i',
            '',
            trim($data['choices'][0]['message']['content'] ?? '')
        );
        $json = json_decode($content, true)
            ?? json_decode(fixJsonQuotes($content), true);

        if (!$json) { usleep(150000); continue; }

        foreach (($json['questions'] ?? $json) as $q) {
            if (!isset($q['question'])) continue;

            $opt = $q['options'] ?? [];
            // si le modèle renvoie tableau numéroté → convertir en A,B,C,D
            if (array_keys($opt) === range(0, count($opt) - 1)) {
                $letters = ['A','B','C','D']; $tmp = [];
                foreach ($opt as $i => $v) $tmp[$letters[$i] ?? chr(65+$i)] = $v;
                $opt = $tmp;
            }
            $correct = $q['correct'] ?? $q['correct_answer'] ?? '';
            if (!$correct && isset($q['correct_answer'])) {
                foreach ($opt as $l => $v) if ($v === $q['correct_answer']) $correct = $l;
            }

            $allQcm[] = [
                'question'    => trim($q['question']),
                'options'     => $opt,
                'correct'     => $correct,
                'explanation' => $q['explanation'] ?? ''
            ];
        }
        $ok = true;
    } // fin for_try

    if (!$ok) error_log("Lot $b ignoré (échec JSON)");
    usleep(250000);
} // fin for_batch

/* ---------- 4. insertion DB ---------- */
if (!$allQcm) die('Erreur : aucune_question_générée');

$pdo = ensurePdo($pdo);

try {
    $pdo->beginTransaction();
    $pdo->prepare('INSERT INTO documentExamQuestions
        (uuid, created_time, exam_type,
         questions, answers, explanation,
         ai_id, aiCost)
        VALUES (:u, NOW(), :exam,
                :q, :a, :e,
                :ai, 0.02)')
        ->execute([
            ':u'    => $userUuid,
            ':exam' => $examType,
            ':q'    => json_encode(
                          array_column($allQcm, 'question'),
                          JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_HEX_AMP
                      ),
            ':a'    => json_encode(
                          $allQcm,
                          JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_HEX_AMP
                      ),
            ':e'    => json_encode(
                          array_column($allQcm, 'explanation'),
                          JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_HEX_AMP
                      ),
            ':ai'   => $openaiId
        ]);
    $examId = $pdo->lastInsertId();
    $pdo->commit();
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('DB insert: '.$e->getMessage());
    die('Erreur : insertion DB');
}

/* ---------- 5. succès ---------- */
header('Location: examQuestionForm.php?exam_questions_id='.$examId);
exit;
