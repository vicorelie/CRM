<?php
// generateDocumentPairApi.php

session_start();
set_time_limit(300);
ini_set('memory_limit', '1024M');

require 'config.php';             // Définit $pdo, OPENAI_API_KEY, OPENAI_MODEL, etc.
require_once 'vendor/autoload.php';

use Ramsey\Uuid\Uuid;

/* ---------- utilitaires ---------- */
function ensurePdo(PDO $pdo): PDO {
    try { $pdo->query('SELECT 1'); return $pdo; }
    catch (PDOException) {
        global $dsn;
        return new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
}
function fetchOne(PDO $pdo, string $sql, array $params): ?array {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetch() ?: null;
}

/* ---------- 1. Contrôles & infos ---------- */
if (!isset($_SESSION['user_uuid'])) {
    die("Erreur : accès non autorisé.");
}
$userUuid           = $_SESSION['user_uuid'];
$subjectDocumentId  = (int)($_POST['subject_document_id'] ?? 0);
$language           = trim($_POST['pair_language'] ?? 'he');

if ($subjectDocumentId <= 0) {
    header('Location: viewPair.php?generatePairError=ID_document_manquant');
    exit;
}

$pdo = ensurePdo($pdo);

// 1-A) subjectDocuments + documents_id
$doc = fetchOne($pdo, "
    SELECT study_subjects_id, topic, sub_topic, documents_id
    FROM subjectDocuments
    WHERE id = :id AND uuid = :u
    LIMIT 1
", [':id'=>$subjectDocumentId,':u'=>$userUuid]);
if (!$doc) {
    die("Erreur : Document introuvable.");
}

// 1-B) studySubjects
$subj = fetchOne($pdo, "
    SELECT subject_name, subject_unit, course_name
    FROM studySubjects
    WHERE id = :sid AND uuid = :u
    LIMIT 1
", [':sid'=>$doc['study_subjects_id'],':u'=>$userUuid]);
if (!$subj) {
    die("Erreur : Matière introuvable.");
}

// 1-C) curriculum
$curr = fetchOne($pdo, "
    SELECT * FROM studentCurriculum WHERE uuid = :u LIMIT 1
", [':u'=>$userUuid]);
if (!$curr) {
    die("Erreur : Curriculum introuvable.");
}

$docTopic      = trim($doc['topic']     ?? '');
$docSubTopic   = trim($doc['sub_topic'] ?? '');
$documentsId   = (int)$doc['documents_id'];
$subjectName   = trim($subj['subject_name'] ?? '');
$subjectUnit   = trim($subj['subject_unit'] ?? '');
$docCourseName = trim($subj['course_name']  ?? '');

/* ---------- 2. Extraction & échantillonnage du contenu ---------- */
const CHAR_PER_PAIR = 800;
const HARD_TOP      = 10000;
const MIN_CHARS     = 1000;

$plainText = '';
if ($documentsId) {
    $row = fetchOne($pdo, "
        SELECT extract_content, char_number
        FROM Documents
        WHERE id = :d AND uuid = :u
        LIMIT 1
    ", [':d'=>$documentsId,':u'=>$userUuid]);
    if ($row) {
        $docChars   = (int)($row['char_number'] ?? 0);
        $CHAR_LIMIT = min(
            HARD_TOP,
            6 * CHAR_PER_PAIR,
            max(MIN_CHARS, $docChars)
        );
        $segments = json_decode($row['extract_content'] ?? '', true);
        if (!is_array($segments)) {
            $plainText = mb_substr($row['extract_content'], 0, $CHAR_LIMIT, 'UTF-8');
        } else {
            $totalSeg = count($segments);
            if ($totalSeg) {
                $avgLen  = array_sum(
                    array_map(fn($s) => mb_strlen($s['content'] ?? '','UTF-8'), $segments)
                ) / max(1,$totalSeg);
                $hardCap = max(1, (int)floor($CHAR_LIMIT / max(1,$avgLen)));
                $step    = max(1, (int)floor($totalSeg / $hardCap));
                $picked  = [];
                for ($i = 0; $i < $totalSeg && count($picked) < $hardCap; $i += $step) {
                    $picked[] = $i;
                }
                $extra = (int)floor(count($picked)*0.3);
                if ($extra) {
                    $rest = array_values(array_diff(range(0,$totalSeg-1), $picked));
                    $rnd  = (array)array_rand($rest, min($extra, count($rest)));
                    foreach ($rnd as $rk) $picked[] = $rest[$rk];
                }
                sort($picked);
                foreach ($picked as $idx) {
                    if (mb_strlen($plainText,'UTF-8') >= $CHAR_LIMIT) break;
                    $chunk = trim($segments[$idx]['content'] ?? '');
                    if (mb_strlen($chunk,'UTF-8') < 30) continue;
                    $plainText .= $chunk."\n";
                }
                $plainText = mb_substr($plainText, 0, $CHAR_LIMIT, 'UTF-8');
            }
        }
    }
}
// Diviser en deux pour enrichir le prompt
$totalLen = mb_strlen($plainText,'UTF-8');
$half     = (int)ceil($totalLen/2);
$part1    = trim(mb_substr($plainText,0,$half,'UTF-8'));
$part2    = trim(mb_substr($plainText,$half,null,'UTF-8'));
$s1       = addslashes($part1);
$s2       = addslashes($part2);

/* ---------- 3. Construction du prompt ---------- */
if ($curr['student_type'] === 'school') {
    $country = trim($curr['student_country'] ?? '');
    $grade   = trim($curr['student_school_class'] ?? '');
    $prompt  = <<<P
Langue: {$language}

Contexte scolaire: pays {$country}, classe {$grade}, matière {$subjectName} (coef. {$subjectUnit}).

Contenu (2 parties) à utiliser:
--- PARTIE 1 ---
{$s1}

--- PARTIE 2 ---
{$s2}

Générez **6 paires** JSON:
- "texte1": un terme (1 à 2 mots)
- "texte2": explication (~20 mots) sans utiliser la racine du terme
Ajoutez un indice sémantique pour les apparier.
Mélangez les 12 items (pas de "texte2" imm. après son "texte1").
Répondez **uniquement** par un tableau JSON, objets avec clés "texte1" et "texte2".
P;
} else {
    $country = trim($curr['student_country'] ?? '');
    $course  = $curr['student_academic_course_1'];
    $dip     = $curr['student_academic_diploma_1'];
    $year    = $curr['student_academic_year_1'];
    for ($i=1;$i<=3;$i++){
        if ($docCourseName===trim($curr["student_academic_course_$i"]??'')){
            $course=$curr["student_academic_course_$i"];
            $dip   =$curr["student_academic_diploma_$i"];
            $year  =$curr["student_academic_year_$i"];
            break;
        }
    }
    $prompt = <<<P
Langue: {$language}

Contexte universitaire: pays {$country}, année {$year} du {$dip}, cours {$course}.

Contenu (2 parties) à utiliser:
--- PARTIE 1 ---
{$s1}

--- PARTIE 2 ---
{$s2}

Générez **6 paires** JSON:
- "texte1": un terme (1 à 2 mots)
- "texte2": explication (~20 mots) sans utiliser la racine du terme
Ajoutez un indice sémantique pour les apparier.
Mélangez les 12 items (pas de "texte2" imm. après son "texte1").
Répondez **uniquement** par un tableau JSON, objets avec clés "texte1" et "texte2".
P;
}

/* ---------- 4. Appel OpenAI ---------- */
$request = [
    'model'       => OPENAI_MODEL,
    'messages'    => [
        ['role'=>'system','content'=>'Vous êtes un assistant générant des paires pédagogiques.'],
        ['role'=>'user',  'content'=>$prompt]
    ],
    'temperature' => 0.7,
    'max_tokens'  => 1500,
];

$ch = curl_init("https://api.openai.com/v1/chat/completions");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        "Content-Type: application/json",
        "Authorization: Bearer ".OPENAI_API_KEY
    ],
    CURLOPT_POSTFIELDS     => json_encode($request),
]);
$response = curl_exec($ch);
$err      = curl_error($ch);
curl_close($ch);

if ($err) {
    die("Erreur API OpenAI: $err");
}
$raw = json_decode($response, true);
$content = $raw['choices'][0]['message']['content'] ?? '';
$content = preg_replace('/^```json\s*|```$/i','',$content);
$pairs   = json_decode($content, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($pairs)) {
    die("Format JSON invalide: ".json_last_error_msg());
}

/* ---------- 5. Sauvegarde en base ---------- */
$openaiCost  = 0.02;
$text_content = json_encode($pairs, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);

$stmt = $pdo->prepare("
    INSERT INTO documentPairs
        (uuid, created_time, subject_document_id, text_content, openaiCost)
    VALUES
        (:u, NOW(), :doc, :txt, :cost)
");
$stmt->execute([
    ':u'    => $userUuid,
    ':doc'  => $subjectDocumentId,
    ':txt'  => $text_content,
    ':cost' => $openaiCost
]);

header("Location: viewPair.php?subject_document_id={$subjectDocumentId}");
exit;
