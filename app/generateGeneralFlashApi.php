<?php
// generateGeneralFlashApi.php

set_time_limit(300);
ini_set('memory_limit', '1024M');

require 'config.php'; // Doit définir $pdo, OPENAI_API_KEY, OPENAI_MODEL_FLASH, OPENAI_MODEL, etc.
csrf_protect_post();

use Ramsey\Uuid\Uuid;

// Vérifier que l'utilisateur est authentifié
if (!isset($_SESSION['user_uuid'])) {
    die("Erreur : Accès non autorisé. Veuillez vous connecter.");
}

$userUuid = $_SESSION['user_uuid'];

// Vérifier que l'ID du document est transmis via POST (on se base ici sur subject_document_id)
$subjectDocumentId = isset($_POST['subject_document_id']) ? (int)$_POST['subject_document_id'] : 0;
if ($subjectDocumentId <= 0) {
    header('Location: viewFlash.php?generateFlashError=ID_document_manquant');
    exit();
}

// Pour insertion, on définit $documentId comme étant le subject_document_id
$documentId = $subjectDocumentId;

// -- 1) Récupérer les infos du document (topic, sub_topic) dans subjectDocuments
$stmtDoc = $pdo->prepare("
    SELECT study_subjects_id, topic, sub_topic
    FROM subjectDocuments
    WHERE id = :doc_id
      AND uuid = :uuid
    LIMIT 1
");
$stmtDoc->execute([
    ':doc_id' => $subjectDocumentId,
    ':uuid'   => $userUuid
]);
$docData = $stmtDoc->fetch(PDO::FETCH_ASSOC);
if (!$docData) {
    header('Location: viewFlash.php?generateFlashError=Document_non_trouvé&subject_document_id=' . $subjectDocumentId);
    exit();
}
$studySubjectsId = $docData['study_subjects_id'];
$docTopic        = trim($docData['topic'] ?? '');
$docSubTopic     = trim($docData['sub_topic'] ?? '');

// -- 2) Récupérer les infos de la matière depuis studySubjects
$stmtSubject = $pdo->prepare("
    SELECT subject_name, subject_unit, course_name
    FROM studySubjects
    WHERE id = :ss_id
      AND uuid = :uuid
    LIMIT 1
");
$stmtSubject->execute([
    ':ss_id' => $studySubjectsId,
    ':uuid'  => $userUuid
]);
$subjectData = $stmtSubject->fetch(PDO::FETCH_ASSOC);
if (!$subjectData) {
    header('Location: viewFlash.php?generateFlashError=Matière_non_trouvée&subject_document_id=' . $subjectDocumentId);
    exit();
}
$subjectName   = trim($subjectData['subject_name'] ?? '');
$subjectUnit   = trim($subjectData['subject_unit'] ?? '');
$docCourseName = trim($subjectData['course_name'] ?? '');

// -- 3) Récupérer le curriculum de l'utilisateur
$stmtCurr = $pdo->prepare("
    SELECT 
        student_type,
        student_country,
        student_school_class,
        student_academic_course_1,
        student_academic_diploma_1,
        student_academic_year_1,
        student_academic_course_2,
        student_academic_diploma_2,
        student_academic_year_2,
        student_academic_course_3,
        student_academic_diploma_3,
        student_academic_year_3
    FROM studentCurriculum
    WHERE uuid = :uuid
    LIMIT 1
");
$stmtCurr->execute([':uuid' => $userUuid]);
$curriculumData = $stmtCurr->fetch(PDO::FETCH_ASSOC);
if (!$curriculumData) {
    header('Location: viewFlash.php?generateFlashError=Curriculum_non_trouvé');
    exit();
}

// -- 4) Récupérer les paramètres du formulaire
$flashLanguage = trim($_POST['flash_language'] ?? 'he');

// -- 5) Générer le prompt pour les flash cards selon le type d'étudiant
if ($curriculumData['student_type'] === 'school') {
    $student_country      = trim($curriculumData['student_country'] ?? '');
    $student_school_class = trim($curriculumData['student_school_class'] ?? '');
    
    $promptFlash = <<<FLASH
Vous êtes un expert en création de supports pédagogiques pour l'enseignement scolaire. 
L'élève étudie dans le pays {$student_country}, en classe {$student_school_class}, 
la matière {$subjectName} (coefficient: {$subjectUnit}).
Votre tâche : générez un ensemble de 9 flash cards, dans la langue exclusive {$flashLanguage}, 
portant uniquement sur "{$docTopic}" (sous-sujet: "{$docSubTopic}").
Chaque flash card doit comporter deux parties : 
- le recto (une notion ou un titre)
- le verso (l'explication détaillée correspondante). 
La réponse doit être exclusivement au format JSON sous la forme d'un tableau d'objets avec les clés "recto" et "verso". 
Ne fournissez aucun texte supplémentaire.
FLASH;
} elseif ($curriculumData['student_type'] === 'academic') {
    $student_country = trim($curriculumData['student_country'] ?? '');
    $student_academic_course = '';
    $student_academic_diploma = '';
    $student_academic_year = '';
    
    if ($docCourseName === trim($curriculumData['student_academic_course_1'] ?? '')) {
        $student_academic_course  = $curriculumData['student_academic_course_1'];
        $student_academic_diploma = $curriculumData['student_academic_diploma_1'];
        $student_academic_year    = $curriculumData['student_academic_year_1'];
    } elseif ($docCourseName === trim($curriculumData['student_academic_course_2'] ?? '')) {
        $student_academic_course  = $curriculumData['student_academic_course_2'];
        $student_academic_diploma = $curriculumData['student_academic_diploma_2'];
        $student_academic_year    = $curriculumData['student_academic_year_2'];
    } elseif ($docCourseName === trim($curriculumData['student_academic_course_3'] ?? '')) {
        $student_academic_course  = $curriculumData['student_academic_course_3'];
        $student_academic_diploma = $curriculumData['student_academic_diploma_3'];
        $student_academic_year    = $curriculumData['student_academic_year_3'];
    }
    
    $promptFlash = <<<FLASH
Vous êtes un expert en création de supports pédagogiques pour l'enseignement universitaire. 
L'étudiant est en {$student_academic_year} du diplôme {$student_academic_diploma}, 
dans le pays {$student_country}, et suit le cours {$student_academic_course}.
Votre tâche : générez un ensemble de 9 flash cards, dans la langue exclusive {$flashLanguage}, 
portant uniquement sur "{$docTopic}" (sous-sujet: "{$docSubTopic}").
Chaque flash card doit comporter deux parties : 
- le recto (une notion ou un titre)
- le verso (l'explication détaillée correspondante). 
La réponse doit être exclusivement au format JSON sous la forme d'un tableau d'objets avec les clés "recto" et "verso". 
Ne fournissez aucun texte supplémentaire.
FLASH;
} else {
    $promptFlash = "Erreur : Type d'étudiant non reconnu. Impossible de générer les flash cards.";
}

// Log pour débogage
error_log("Prompt flash : " . $promptFlash);

/**
 * Fonction pour appeler l'API OpenAI et générer les flash cards.
 * Chaque flash card doit comporter un "recto" et un "verso".
 *
 * @param string $prompt Le prompt à envoyer à OpenAI.
 * @param string $language La langue ciblée.
 * @param int $numberOfCards Le nombre de flash cards à générer.
 * @return array Tableau des flash cards.
 */
function callOpenAIFlashCards($prompt, $language, $numberOfCards = 9) {
    $apiKey   = OPENAI_API_KEY;
    $endpoint = "https://api.openai.com/v1/chat/completions";
    
    $data = [
        "model"       => OPENAI_MODEL,
        "messages"    => [
            [
                "role"    => "system",
                "content" => "Vous êtes un assistant qui génère des flash cards à partir d'un prompt pédagogique."
            ],
            [
                "role"    => "user",
                "content" => $prompt
            ]
        ],
        "max_tokens"  => 1500,
        "temperature" => 0.7,
    ];
    
    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "Authorization: Bearer $apiKey"
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_TIMEOUT, 120);
    
    $response = curl_exec($ch);
    $error    = curl_error($ch);
    $httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    file_put_contents('openai_flashcard_log.json', json_encode([
        'status'   => $httpStatus,
        'response' => $response,
    ], JSON_PRETTY_PRINT) . PHP_EOL, FILE_APPEND);
    
    if ($error || $httpStatus !== 200) {
        die("Erreur : Impossible de générer les flash cards. Vérifiez openai_flashcard_log.json.");
    }
    
    $result = json_decode($response, true);
    if (!isset($result['choices'][0]['message']['content'])) {
        die("Erreur : Réponse OpenAI invalide.");
    }
    
    $flashContent = $result['choices'][0]['message']['content'];
    $flashContent = preg_replace('/^```json\s*/', '', $flashContent);
    $flashContent = preg_replace('/\s*```$/', '', $flashContent);
    
    $cards = json_decode($flashContent, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($cards)) {
        die("Erreur : Le format JSON des flash cards est invalide. " . json_last_error_msg());
    }
    return $cards;
}

// Appel de la fonction pour générer les flash cards
$flashCards = callOpenAIFlashCards($promptFlash, $flashLanguage, 30);
$openaiCost = 0.02;

// Insertion en une seule ligne dans documentFlash
$text_content = json_encode($flashCards, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

try {
    $insertStmt = $pdo->prepare("
        INSERT INTO documentFlash (uuid, created_time, subject_document_id, text_content, openaiCost)
        VALUES (:uuid, NOW(), :subject_document_id, :text_content, :openaiCost)
    ");
    $insertStmt->execute([
        'uuid'         => $_SESSION['user_uuid'],
        'subject_document_id'  => $documentId,
        'text_content' => $text_content,
        'openaiCost'   => $openaiCost
    ]);
} catch (PDOException $e) {
    die("Erreur lors de l'insertion des flash cards dans la DB : " . $e->getMessage());
}

header("Location: viewFlash.php?subject_document_id=" . $documentId);
exit();

die("Erreur : Requête invalide.");
?>
