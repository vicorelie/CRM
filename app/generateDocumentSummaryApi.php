<?php
// generateDocumentSummaryApi.php

set_time_limit(300);
ini_set('memory_limit', '1024M');

require 'config.php';             // Doit définir $pdo, OPENAI_API_KEY, OPENAI_MODEL_SUMMARY,...
csrf_protect_post();

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
$userUuid = $_SESSION['user_uuid'];
$subjectDocumentId = (int)($_POST['subject_document_id'] ?? 0);
if ($subjectDocumentId <= 0) {
    header('Location: viewSummary.php?generateSummaryError=ID_document_manquant');
    exit;
}

$summaryLanguage = trim($_POST['summary_language'] ?? 'he');
$summaryLength   = max(300, (int)($_POST['summary_length'] ?? 1000));

$pdo = ensurePdo($pdo);

// 1-A) subjectDocuments
$docRow = fetchOne($pdo, "
    SELECT study_subjects_id, topic, sub_topic, documents_id
    FROM subjectDocuments
    WHERE id = :id AND uuid = :u
    LIMIT 1
", [':id'=>$subjectDocumentId,':u'=>$userUuid]);
if (!$docRow) {
    header("Location: viewSummary.php?generateSummaryError=Document_non_trouvé");
    exit;
}

// 1-B) studySubjects
$subjRow = fetchOne($pdo, "
    SELECT subject_name, subject_unit, course_name
    FROM studySubjects
    WHERE id = :sid AND uuid = :u
    LIMIT 1
", [':sid'=>$docRow['study_subjects_id'],':u'=>$userUuid]);
if (!$subjRow) {
    header("Location: viewSummary.php?generateSummaryError=Matière_non_trouvée");
    exit;
}

// 1-C) curriculum
$curr = fetchOne($pdo, "
    SELECT * FROM studentCurriculum WHERE uuid = :u LIMIT 1
", [':u'=>$userUuid]);
if (!$curr) {
    header("Location: viewSummary.php?generateSummaryError=Curriculum_non_trouvé");
    exit;
}

/* ========== 2. Paramètres pour échantillonnage ========== */
const CHAR_PER_Q = 2500;
const HARD_TOP   = 12000;
const MIN_CHARS  = 1000;

// On n'a pas de questions ici, mais on fixe une limite proportionnelle
$nbQuestions = 1;

// 2-A) préparation variables
$documentsId   = (int)$docRow['documents_id'];
$docTopic      = trim($docRow['topic'] ?? '');
$docSubTopic   = trim($docRow['sub_topic'] ?? '');
$subjectName   = trim($subjRow['subject_name'] ?? '');
$subjectUnit   = trim($subjRow['subject_unit'] ?? '');
$docCourseName = trim($subjRow['course_name'] ?? '');
$plainText     = '';

if ($documentsId) {
    // Extraction & métriques
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
            $nbQuestions * CHAR_PER_Q,
            max(MIN_CHARS, $docChars)
        );
        $segments = json_decode($row['extract_content'] ?? '', true);

        if (!is_array($segments)) {
            $plainText = mb_substr($row['extract_content'], 0, $CHAR_LIMIT, 'UTF-8');
        } else {
            $totalSeg = count($segments);
            if ($totalSeg) {
                $avgLen  = array_sum(
                    array_map(fn($s)=>mb_strlen($s['content'] ?? '','UTF-8'), $segments)
                )/max(1,$totalSeg);
                $hardCap = max(1,(int)floor($CHAR_LIMIT/max(1,$avgLen)));
                // échantillonnage régulier
                $step   = max(1,(int)floor($totalSeg/$hardCap));
                $picked = [];
                for($i=0;$i<$totalSeg&&count($picked)<$hardCap;$i+=$step){
                    $picked[]=$i;
                }
                // aléatoire 30%
                $extraNeed = (int)floor(count($picked)*0.3);
                if($extraNeed){
                    $rest = array_values(array_diff(range(0,$totalSeg-1),$picked));
                    $rnd  = (array)array_rand($rest,min($extraNeed,count($rest)));
                    foreach($rnd as $rk) $picked[] = $rest[$rk];
                }
                sort($picked);
                foreach($picked as $idx){
                    if(mb_strlen($plainText,'UTF-8')>=$CHAR_LIMIT) break;
                    $chunk = trim($segments[$idx]['content']??'');
                    if(mb_strlen($chunk,'UTF-8')<30) continue;
                    $plainText .= $chunk."\n";
                }
                $plainText = mb_substr($plainText,0,$CHAR_LIMIT,'UTF-8');
            }
        }
    }
}

// 2-B) découpage en deux parties pour varier
$totalLen = mb_strlen($plainText,'UTF-8');
$half     = (int)ceil($totalLen/2);
$partA    = trim(mb_substr($plainText,0,$half,'UTF-8'));
$partB    = trim(mb_substr($plainText,$half,null,'UTF-8'));
$safeA    = addslashes($partA);
$safeB    = addslashes($partB);

/* ========== 3. Construction du prompt ========== */
if ($curr['student_type']==='school') {
    $student_country      = trim($curr['student_country'] ?? '');
    $student_school_class = trim($curr['student_school_class'] ?? '');

    $systemMessage = <<<SYS
You are an expert learning‐content generator for school learners in {$student_country}, grade {$student_school_class}, studying {$subjectName} (unit {$subjectUnit}).

Produce a clear, well‐structured summary in {$summaryLanguage}, exactly {$summaryLength} words long. 
Do not invent facts. Use only the content provided below, divided into two parts; merge them coherently:

PART 1:
{$safeA}

PART 2:
{$safeB}

Requirements:
- Tailor language to a grade‐level {$student_school_class} student.
- Include headings for logical flow.
- Avoid redundancy.
SYS;

} else {  // academic
    $student_country        = trim($curr['student_country'] ?? '');
    $student_academic_course  = '';
    $student_academic_diploma = '';
    $student_academic_year    = '';

    // trouver parcours adapté
    for($i=1;$i<=3;$i++){
        if($docCourseName===trim($curr["student_academic_course_$i"]??'')){
            $student_academic_course  = $curr["student_academic_course_$i"];
            $student_academic_diploma = $curr["student_academic_diploma_$i"];
            $student_academic_year    = $curr["student_academic_year_$i"];
            break;
        }
    }
    if(!$student_academic_course){
        $student_academic_course = $docCourseName;
    }

    $systemMessage = <<<SYS
You are an expert learning‐content generator for university students in {$student_country}, year {$student_academic_year} of {$student_academic_diploma}, course {$student_academic_course}.

Produce a clear, comprehensive summary in {$summaryLanguage}, exactly {$summaryLength} words long.
Do not invent facts. Use only the content provided below, divided into two parts; integrate them into a coherent narrative:

PART 1:
{$safeA}

PART 2:
{$safeB}

Requirements:
- Tailor depth and terminology for university level.
- Use headings and logical structure.
- Avoid redundancy.
SYS;
}

/* ========== 4. Appel OpenAI ========== */
$request = [
    'model'       => OPENAI_MODEL_SUMMARY,
    'messages'    => [['role'=>'system','content'=>$systemMessage]],
    'temperature' => 0.5,
    'max_tokens'  => 1200,
    'top_p'       => 0.8,
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
$err = curl_error($ch);
curl_close($ch);
if ($err) {
    header("Location: viewSummary.php?generateSummaryError=".urlencode($err));
    exit;
}
$data = json_decode($response,true);
$summaryText = trim($data['choices'][0]['message']['content'] ?? '');
if (!$summaryText) {
    header("Location: viewSummary.php?generateSummaryError=resume_vide");
    exit;
}

/* ========== 5. Sauvegarde en base ========== */
try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("
        INSERT INTO documentResumes
            (uuid, subject_document_id, resume_content, openaiCost, created_time)
        VALUES (:u,:doc,:content,0.02,NOW())
        ON DUPLICATE KEY UPDATE
            resume_content=VALUES(resume_content),
            openaiCost=VALUES(openaiCost),
            created_time=VALUES(created_time)
    ");
    $stmt->execute([
        ':u'       => $userUuid,
        ':doc'     => $subjectDocumentId,
        ':content' => $summaryText
    ]);
    $pdo->commit();
} catch (PDOException $e) {
    $pdo->rollBack();
    header("Location: viewSummary.php?generateSummaryError=".urlencode($e->getMessage()));
    exit;
}

/* ========== 6. Redirection ========== */
header("Location: viewSummary.php?generateSummarySuccess=1&subject_document_id={$subjectDocumentId}");
exit;
