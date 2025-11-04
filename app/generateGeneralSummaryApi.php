<?php
// generateGeneralSummaryApi.php

session_start();
set_time_limit(300);
ini_set('memory_limit', '1024M');

require 'config.php'; // Doit définir $pdo, OPENAI_API_KEY, OPENAI_MODEL_SUMMARY, etc.
require_once 'vendor/autoload.php';

// Vérifier que l'utilisateur est authentifié
if (!isset($_SESSION['user_uuid'])) {
    die("Erreur : Accès non autorisé. Veuillez vous connecter.");
}

$userUuid = $_SESSION['user_uuid'];

// Vérifier que l'ID du document est transmis via POST
$subjectDocumentId = isset($_POST['subject_document_id']) ? (int)$_POST['subject_document_id'] : 0;
if ($subjectDocumentId <= 0) {
    header('Location: viewSummary.php?generateSummaryError=ID_document_manquant');
    exit();
}

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
    header('Location: viewSummary.php?generateSummaryError=Document_non_trouvé&subject_document_id=' . $subjectDocumentId);
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
    header('Location: viewSummary.php?generateSummaryError=Matière_non_trouvée&subject_document_id=' . $subjectDocumentId);
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
    header('Location: viewSummary.php?generateSummaryError=Curriculum_non_trouvé');
    exit();
}

// -- 4) Récupérer les paramètres du formulaire (langue, longueur du résumé, etc.)
$summaryLanguage = trim($_POST['summary_language'] ?? 'he');
// Vous pouvez ajouter un champ "summary_length" pour définir un nombre exact de mots
$summaryLength = isset($_POST['summary_length']) ? (int)$_POST['summary_length'] : 1000;
if ($summaryLength < 300) {
    // On fixe un minimum arbitraire
    $summaryLength = 300;
}

// -- 5) Construire le prompt OpenAI selon le type d'étudiant
if ($curriculumData['student_type'] === 'school') {
    $student_country      = trim($curriculumData['student_country'] ?? '');
    $student_school_class = trim($curriculumData['student_school_class'] ?? '');

    $systemMessage = <<<SYS
You are an expert learning-content generator specializing in concise, high-quality study guides and summaries for school students.  
The learner is located in {$student_country}, in grade {$student_school_class},  
studying the subject {$subjectName} (weight: {$subjectUnit}).

Your task: produce a clear, comprehensive, and precise summary in {$summaryLanguage},  
focused solely on the topic "{$docTopic}" (subtopic: "{$docSubTopic}").  
Requirements:
- The summary must be exactly {$summaryLength} words long.
- Do not invent any information; rely strictly on the given topic and subtopic.
- Tailor the language and depth to a {$student_school_class} grade student.
- Avoid redundancy and repetition of ideas.
- Structure the text with clear headings and logical order for optimal understanding.
SYS;
} elseif ($curriculumData['student_type'] === 'academic') {
    $student_country        = trim($curriculumData['student_country'] ?? '');
    $student_academic_course  = '';
    $student_academic_diploma = '';
    $student_academic_year    = '';

    // Déterminer lequel des 3 cours correspond
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

    $systemMessage = <<<SYS
You are an expert learning-content generator specializing in concise, high-quality study guides and summaries for university students.  
The student is in year {$student_academic_year} of the {$student_academic_diploma} program,  
located in {$student_country}, enrolled in the course {$student_academic_course}.

Your task: produce a clear, comprehensive, and precise summary in {$summaryLanguage},  
focused solely on the topic "{$docTopic}" (subtopic: "{$docSubTopic}").  
Requirements:
- The summary must be exactly {$summaryLength} words long.
- Do not invent any information; rely strictly on the provided topic details.
- Adapt the depth and terminology for a university-level audience (in-depth analysis, precise jargon).
- Avoid redundancy and repetition of ideas.
- Structure the text with clear headings and logical order to facilitate learning.
SYS;
} else {
    // Type inconnu
    $systemMessage = "Erreur : Type d'étudiant non reconnu. Impossible de générer le résumé.";
}

// -- 6) Appel à l'API OpenAI pour générer le résumé
$requestData = [
    "model"       => OPENAI_MODEL_SUMMARY, 
    "messages"    => [
        ["role" => "system", "content" => $systemMessage]
    ],
    "temperature" => 0.5,
    "max_tokens"  => 1200,
    "top_p"       => 0.8
];

// Log du prompt envoyé (attention en prod à limiter l'exposition de données sensibles)
error_log("Prompt envoyé pour résumé : " . $systemMessage);

$ch = curl_init("https://api.openai.com/v1/chat/completions");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer " . OPENAI_API_KEY,
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestData));

$response = curl_exec($ch);
if (curl_errno($ch)) {
    $error_msg = curl_error($ch);
}
curl_close($ch);

if (isset($error_msg) && $error_msg) {
    header('Location: viewSummary.php?generateSummaryError=' . urlencode($error_msg) . '&subject_document_id=' . $subjectDocumentId);
    exit();
}

$data = json_decode($response, true);
if (!isset($data['choices'][0]['message']['content'])) {
    header('Location: viewSummary.php?generateSummaryError=invalid_openai_response&subject_document_id=' . $subjectDocumentId);
    exit();
}

$summaryText = trim($data['choices'][0]['message']['content']);
if (empty($summaryText)) {
    header('Location: viewSummary.php?generateSummaryError=resume_vide&subject_document_id=' . $subjectDocumentId);
    exit();
}

// -- 7) Stocker le résumé en base (table "documentResumes", par exemple)
try {
    // Coût fictif (à ajuster selon votre suivi des coûts)
    $aiCost = 0.02;

    $pdo->beginTransaction();
    $stmtInsert = $pdo->prepare("
        INSERT INTO documentResumes
            (uuid, subject_document_id, resume_content, openaiCost, created_time)
        VALUES
            (:uuid, :doc_id, :content, :cost, NOW())
        ON DUPLICATE KEY UPDATE
            resume_content = VALUES(resume_content),
            openaiCost     = VALUES(openaiCost),
            created_time   = VALUES(created_time)
    ");

    $stmtInsert->execute([
        ':uuid'    => $userUuid,
        ':doc_id'  => $subjectDocumentId,
        ':content' => $summaryText,
        ':cost'    => $aiCost
    ]);

    $pdo->commit();
} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Erreur d'insertion du résumé : " . $e->getMessage());
    header('Location: viewSummary.php?generateSummaryError=' . urlencode($e->getMessage()) . '&subject_document_id=' . $subjectDocumentId);
    exit();
}

// Redirection sur la page de visualisation du résumé
header('Location: viewSummary.php?generateSummarySuccess=1&subject_document_id=' . $subjectDocumentId);
exit();
