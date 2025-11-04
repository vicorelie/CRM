<?php
// generateDocumentMissApi.php

set_time_limit(300);
ini_set('memory_limit', '1024M');

require 'config.php';             // Définit $pdo, OPENAI_API_KEY, OPENAI_MODEL, etc.
csrf_protect_post();

/* ---------- 1. Contrôles & récupération des infos ---------- */
if (!isset($_SESSION['user_uuid'])) {
    die("Erreur : accès non autorisé.");
}
$userUuid          = $_SESSION['user_uuid'];
$subjectDocumentId = (int)($_POST['subject_document_id'] ?? 0);
$language          = trim($_POST['miss_language'] ?? 'he');
$nbMiss            = 6;  // nombre d’exercices à trous

if ($subjectDocumentId <= 0) {
    header('Location: viewMiss.php?generateMissError=ID_document_manquant');
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
const CHAR_PER_MISS = 1000;
const HARD_TOP      = 8000;
const MIN_CHARS     = 500;

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
            $nbMiss * CHAR_PER_MISS,
            max(MIN_CHARS, $docChars)
        );
        $segments = json_decode($row['extract_content'] ?? '', true);
        if (!is_array($segments)) {
            $plainText = mb_substr($row['extract_content'], 0, $CHAR_LIMIT, 'UTF-8');
        } else {
            $totalSeg = count($segments);
            if ($totalSeg) {
                $avgLen  = array_sum(
                    array_map(fn($s)=>mb_strlen($s['content']??'','UTF-8'),$segments)
                )/max(1,$totalSeg);
                $hardCap = max(1,(int)floor($CHAR_LIMIT/max(1,$avgLen)));
                $step    = max(1,(int)floor($totalSeg/$hardCap));
                $picked  = [];
                for($i=0;$i<$totalSeg&&count($picked)<$hardCap;$i+=$step){
                    $picked[]=$i;
                }
                $extra=floor(count($picked)*0.3);
                if($extra){
                    $rest=array_values(array_diff(range(0,$totalSeg-1),$picked));
                    $rnd=(array)array_rand($rest,min($extra,count($rest)));
                    foreach($rnd as $rk) $picked[]=$rest[$rk];
                }
                sort($picked);
                foreach($picked as $idx){
                    if(mb_strlen($plainText,'UTF-8')>=$CHAR_LIMIT) break;
                    $chunk=trim($segments[$idx]['content']??'');
                    if(mb_strlen($chunk,'UTF-8')<30) continue;
                    $plainText.=$chunk."\n";
                }
                $plainText=mb_substr($plainText,0,$CHAR_LIMIT,'UTF-8');
            }
        }
    }
}
// --- découpage en 2 pour varier ---
$totalLen = mb_strlen($plainText,'UTF-8');
$half     = ceil($totalLen/2);
$p1       = trim(mb_substr($plainText,0,$half,'UTF-8'));
$p2       = trim(mb_substr($plainText,$half,null,'UTF-8'));
$s1       = addslashes($p1);
$s2       = addslashes($p2);

/* ---------- 3. Construction du prompt ---------- */
if ($curr['student_type']==='school') {
    $country = trim($curr['student_country'] ?? '');
    $grade   = trim($curr['student_school_class'] ?? '');
    $prompt  = <<<P
Langue: {$language}

Contexte scolaire: pays {$country}, classe {$grade}, matière {$subjectName} (coef. {$subjectUnit}).

Contenu (2 blocs) :
--- PARTIE 1 ---
{$s1}

--- PARTIE 2 ---
{$s2}

Générez **{$nbMiss} exercices à trous** JSON :
- Texte complet (~50 mots) avec un blanc marqué "___"
- "propositions": tableau de 4 choix (1 correct, 3 proches)
- "correct_index": indice (0–3)
Répondez **uniquement** par un tableau JSON d’objets {texte_complet, propositions, correct_index}.
P;
} else {
    $country = trim($curr['student_country'] ?? '');
    // trouver cursus académique lié…
    $course=''; $dip=''; $year='';
    for($i=1;$i<=3;$i++){
        if($docCourseName===trim($curr["student_academic_course_{$i}"]??'')){
            $course=$curr["student_academic_course_{$i}"];
            $dip   =$curr["student_academic_diploma_{$i}"];
            $year  =$curr["student_academic_year_{$i}"];
            break;
        }
    }
    $prompt = <<<P
Langue: {$language}

Contexte universitaire: pays {$country}, année {$year} du {$dip}, cours {$course}.

Contenu (2 blocs) :
--- PARTIE 1 ---
{$s1}

--- PARTIE 2 ---
{$s2}

Générez **{$nbMiss} exercices à trous** JSON :
- Texte complet (~50 mots) avec un blanc marqué "___"
- "propositions": tableau de 4 choix (1 correct, 3 proches)
- "correct_index": indice (0–3)
Répondez **uniquement** par un tableau JSON d’objets {texte_complet, propositions, correct_index}.
P;
}

/* ---------- 4. Appel OpenAI ---------- */
$request = [
    'model'    => OPENAI_MODEL,
    'messages' => [
        ['role'=>'system','content'=>'Vous êtes un assistant générant des exercices à trous.'],
        ['role'=>'user',  'content'=>$prompt]
    ],
    'temperature'=>0.7,
    'max_tokens' =>1500,
];

$ch = curl_init("https://api.openai.com/v1/chat/completions");
curl_setopt_array($ch,[
    CURLOPT_RETURNTRANSFER=>true,
    CURLOPT_POST=>true,
    CURLOPT_HTTPHEADER=>[
        "Content-Type: application/json",
        "Authorization: Bearer ".OPENAI_API_KEY
    ],
    CURLOPT_POSTFIELDS=>json_encode($request),
]);
$response = curl_exec($ch);
$err      = curl_error($ch);
curl_close($ch);
if($err) die("Erreur OpenAI: $err");

$raw     = json_decode($response,true);
$content = $raw['choices'][0]['message']['content'] ?? '';
$content = preg_replace('/^```json\s*|```$/i','',$content);
$miss    = json_decode($content,true);
if(json_last_error()!==JSON_ERROR_NONE||!is_array($miss)){
    die("JSON invalide : ".json_last_error_msg());
}

/* ---------- 5. Sauvegarde en base ---------- */
$cost = 0.02;
$json  = json_encode($miss,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);

$stmt = $pdo->prepare("
    INSERT INTO documentMiss
       (uuid, created_time, subject_document_id, text_content, openaiCost)
    VALUES
       (:u,NOW(),:doc,:txt,:cost)
");
$stmt->execute([
    ':u'=>$userUuid,
    ':doc'=>$subjectDocumentId,
    ':txt'=>$json,
    ':cost'=>$cost
]);

header("Location: viewMiss.php?subject_document_id={$subjectDocumentId}");
exit;
