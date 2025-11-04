<?php
// generateDocumentFlashApi.php

set_time_limit(300);
ini_set('memory_limit', '1024M');

require 'config.php';             // Définit $pdo, OPENAI_API_KEY, OPENAI_MODEL_FLASH, etc.
csrf_protect_post();

use Ramsey\Uuid\Uuid;

/* ---------- 1. Contrôles & infos ---------- */
if (!isset($_SESSION['user_uuid'])) {
    die("Erreur : accès non autorisé. Veuillez vous connecter.");
}
$userUuid            = $_SESSION['user_uuid'];
$subjectDocumentId   = (int)($_POST['subject_document_id'] ?? 0);
$flashLanguage       = trim($_POST['flash_language'] ?? 'he');
$numberOfFlashCards  = max(1, (int)($_POST['flash_number'] ?? 15)); 

if ($subjectDocumentId <= 0) {
    header('Location: viewFlash.php?generateFlashError=ID_document_manquant');
    exit;
}

$pdo = ensurePdo($pdo);

// 1-A) Charger subjectDocuments
$docRow = fetchOne($pdo, "
    SELECT study_subjects_id, topic, sub_topic, documents_id
    FROM subjectDocuments
    WHERE id = :id AND uuid = :u
    LIMIT 1
", [':id'=>$subjectDocumentId,':u'=>$userUuid]);
if (!$docRow) {
    header("Location: viewFlash.php?generateFlashError=Document_non_trouvé");
    exit;
}

// 1-B) Charger studySubjects
$subjRow = fetchOne($pdo, "
    SELECT subject_name, subject_unit, course_name
    FROM studySubjects
    WHERE id = :sid AND uuid = :u
    LIMIT 1
", [':sid'=>$docRow['study_subjects_id'],':u'=>$userUuid]);
if (!$subjRow) {
    header("Location: viewFlash.php?generateFlashError=Matière_non_trouvée");
    exit;
}

// 1-C) Charger curriculum
$curr = fetchOne($pdo, "
    SELECT * FROM studentCurriculum WHERE uuid = :u LIMIT 1
", [':u'=>$userUuid]);
if (!$curr) {
    header("Location: viewFlash.php?generateFlashError=Curriculum_non_trouvé");
    exit;
}

/* ---------- 2. Paramètres d’échantillonnage ---------- */
const CHAR_PER_CARD = 800;   // ≃ 200 tokens GPT‐4o / carte
const HARD_TOP      = 10000; // plafond
const MIN_CHARS     = 1000;  // plancher

$documentsId   = (int)$docRow['documents_id'];
$docTopic      = trim($docRow['topic'] ?? '');
$docSubTopic   = trim($docRow['sub_topic'] ?? '');
$subjectName   = trim($subjRow['subject_name'] ?? '');
$subjectUnit   = trim($subjRow['subject_unit'] ?? '');
$docCourseName = trim($subjRow['course_name'] ?? '');

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
            $numberOfFlashCards * CHAR_PER_CARD,
            max(MIN_CHARS, $docChars)
        );
        $segments = json_decode($row['extract_content'] ?? '', true);

        if (!is_array($segments)) {
            $plainText = mb_substr($row['extract_content'], 0, $CHAR_LIMIT, 'UTF-8');
        } else {
            $totalSeg = count($segments);
            if ($totalSeg) {
                $avgLen  = array_sum(
                    array_map(fn($s)=>mb_strlen($s['content']??'','UTF-8'), $segments)
                )/max(1,$totalSeg);
                $hardCap = max(1,(int)floor($CHAR_LIMIT/max(1,$avgLen)));
                $step    = max(1,(int)floor($totalSeg/$hardCap));
                $picked  = [];
                for($i=0;$i<$totalSeg&&count($picked)<$hardCap;$i+=$step){
                    $picked[]=$i;
                }
                $extra   = (int)floor(count($picked)*0.3);
                if($extra){
                    $rest = array_values(array_diff(range(0,$totalSeg-1),$picked));
                    $rnd  = (array)array_rand($rest,min($extra,count($rest)));
                    foreach($rnd as $rk) $picked[]=$rest[$rk];
                }
                sort($picked);
                foreach($picked as $idx){
                    if(mb_strlen($plainText,'UTF-8')>=$CHAR_LIMIT) break;
                    $chunk=trim($segments[$idx]['content']??'');
                    if(mb_strlen($chunk,'UTF-8')<30) continue;
                    $plainText.=$chunk."\n";
                }
                $plainText = mb_substr($plainText,0,$CHAR_LIMIT,'UTF-8');
            }
        }
    }
}

// Diviser le texte en deux moitiés pour varier
$totalLen = mb_strlen($plainText,'UTF-8');
$half     = (int)ceil($totalLen/2);
$partA    = trim(mb_substr($plainText,0,$half,'UTF-8'));
$partB    = trim(mb_substr($plainText,$half,null,'UTF-8'));
$safeA    = addslashes($partA);
$safeB    = addslashes($partB);

/* ---------- 3. Construction du prompt ---------- */
if ($curr['student_type']==='school') {
    $student_country      = trim($curr['student_country'] ?? '');
    $student_school_class = trim($curr['student_school_class'] ?? '');
    $promptFlash = <<<FLASH
Vous êtes un expert en supports pédagogiques pour élèves scolaires en {$student_country}, classe {$student_school_class}, matière {$subjectName} (coefficient {$subjectUnit}).

Générez {$numberOfFlashCards} flash cards en {$flashLanguage}, uniquement sur "{$docTopic}" (sous-sujet: "{$docSubTopic}").  
Le contenu est fourni en deux parties ci-dessous, à intégrer de façon cohérente :

PARTIE 1 :
{$safeA}

PARTIE 2 :
{$safeB}

Chaque flash card doit être un objet JSON avec les clés :
- "recto"  : titre ou notion
- "verso"  : explication détaillée

Ne fournissez **aucun** texte supplémentaire hors du JSON.
FLASH;

} else {
    $student_country        = trim($curr['student_country'] ?? '');
    // déterminer cursus universitaire
    $studCourse = $curr['student_academic_course_1'];
    $studDip    = $curr['student_academic_diploma_1'];
    $studYear   = $curr['student_academic_year_1'];
    for($i=1;$i<=3;$i++){
        if($docCourseName===trim($curr["student_academic_course_$i"]??'')){
            $studCourse=$curr["student_academic_course_$i"];
            $studDip   =$curr["student_academic_diploma_$i"];
            $studYear  =$curr["student_academic_year_$i"];
            break;
        }
    }
    $promptFlash = <<<FLASH
Vous êtes un expert en supports pédagogiques pour étudiants universitaires en {$student_country}, année {$studYear} du diplôme {$studDip}, cours {$studCourse}.

Générez {$numberOfFlashCards} flash cards en {$flashLanguage}, uniquement sur "{$docTopic}" (sous-sujet: "{$docSubTopic}").  
Le contenu est fourni en deux parties ci-dessous, à intégrer de façon cohérente :

PARTIE 1 :
{$safeA}

PARTIE 2 :
{$safeB}

Chaque flash card doit être un objet JSON avec les clés :
- "recto"  : titre ou notion
- "verso"  : explication détaillée

Ne fournissez **aucun** texte supplémentaire hors du JSON.
FLASH;
}

// Appel à OpenAI
$request = [
    'model'       => OPENAI_MODEL_FLASH,
    'messages'    => [
        ['role'=>'system','content'=>'Vous êtes un assistant qui génère des flash cards.'],
        ['role'=>'user',  'content'=>$promptFlash]
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
    header("Location: viewFlash.php?generateFlashError=".urlencode($err));
    exit;
}
$data = json_decode($response,true);
$content = $data['choices'][0]['message']['content'] ?? '';
$content = preg_replace('/^```json\s*|```$/i','',$content);
$flashCards = json_decode($content,true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($flashCards)) {
    header("Location: viewFlash.php?generateFlashError=Format_JSON_invalide");
    exit;
}

// Sauvegarde
$openaiCost = 0.02;
$text_content = json_encode($flashCards, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);

try {
    $stmt = $pdo->prepare("
        INSERT INTO documentFlash
            (uuid, created_time, subject_document_id, text_content, openaiCost)
        VALUES (:u, NOW(), :doc, :txt, :cost)
    ");
    $stmt->execute([
        ':u'    => $userUuid,
        ':doc'  => $subjectDocumentId,
        ':txt'  => $text_content,
        ':cost' => $openaiCost
    ]);
} catch (PDOException $e) {
    die("Erreur insertion Flash: ".$e->getMessage());
}

header("Location: viewFlash.php?subject_document_id={$subjectDocumentId}");
exit;
