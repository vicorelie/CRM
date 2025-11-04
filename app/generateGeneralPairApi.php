<?php
// generateGeneralPairApi.php

set_time_limit(300);
ini_set('memory_limit', '1024M');

require 'config.php'; // Doit définir $pdo, OPENAI_API_KEY, OPENAI_MODEL (par ex. "gpt-3.5-turbo")
csrf_protect_post();

use Ramsey\Uuid\Uuid;

if (!isset($_SESSION['user_uuid'])) {
    die("Erreur : Accès non autorisé. Veuillez vous connecter.");
}

$userUuid = $_SESSION['user_uuid'];

// On attend le paramètre subject_document_id dans la requête POST
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['subject_document_id'])) {
    $subjectDocumentId = (int) $_POST['subject_document_id'];
    $language = $_POST['pair_language'] ?? 'he';  // Langue pour les paires

    $stmtDoc = $pdo->prepare("
    SELECT study_subjects_id, topic, sub_topic
    FROM subjectDocuments
    WHERE id = :doc_id
    AND uuid = :uuid
    LIMIT 1
    ");
    $stmtDoc->execute([
    'doc_id' => $subjectDocumentId,
    'uuid'   => $userUuid
    ]);
    $subjectData = $stmtDoc->fetch(PDO::FETCH_ASSOC);
    if (!$subjectData) {
        die("Erreur : Document introuvable ou accès non autorisé.");
    }
    
    $topic       = trim($subjectData['topic'] ?? '');
    $sub_topic   = trim($subjectData['sub_topic'] ?? '');
    $subjectName = trim($subjectData['subject_name'] ?? '');
    $subjectUnit = trim($subjectData['subject_unit'] ?? '');
    $courseName  = trim($subjectData['course_name'] ?? '');
    
    // Construire un contenu de base qui servira de contexte dans le prompt
    $content = "Sujet: $topic\nSous-sujet: $sub_topic";
    
    // 2. Récupérer le curriculum de l'utilisateur pour déterminer le type d'étudiant
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
    $stmtCurr->execute(['uuid' => $userUuid]);
    $curriculumData = $stmtCurr->fetch(PDO::FETCH_ASSOC);
    if (!$curriculumData) {
        die("Erreur : Curriculum non trouvé.");
    }
    
    // 3. Build the prompt based on student type
if ($curriculumData['student_type'] === 'school') {
    $student_country      = trim($curriculumData['student_country'] ?? '');
    $student_school_class = trim($curriculumData['student_school_class'] ?? '');

    // Prompt for a school student
    $prompt = <<<PROMPT
    Exclusive target language: {$language}

    Student context: country {$student_country}, grade {$student_school_class}, subject {$subjectName} (coef. {$subjectUnit}).

    You are an extremely precise system that specializes in creating a "pairs" game, in which there is a term (one or two words) on one card and a related explanation card. Under no circumstances should the explanation include the term itself as written on the term card. Select from the provided content the most accurate and educational terms. Your main goal is to teach: terms and explanations must be as accurate and educational as possible.

    Your mission: generate exactly six pairs of cards.

    Requirements for each pair:
    1. "texte1": a term of one or two words.
    2. "texte2": an explanation of approximately 20 words describing that term, without using any form or root of the term itself.
    3. Both texts must contain a subtle hint (semantic link, wordplay, etc.) allowing the learner to match them.

    General constraints:
    • If the topic lacks detail, supplement freely with relevant school-level facts.
    • Shuffle all twelve items so that no "texte2" immediately follows its "texte1".
    • Reply only with a JSON array; each entry must have exactly the keys "texte1" and "texte2".
    • Do not add any comments, tags, or text outside the JSON.

    Content to cover:
    {$content}
    PROMPT;
}
elseif ($curriculumData['student_type'] === 'academic') {
    $student_country        = trim($curriculumData['student_country'] ?? '');
    $student_academic_course  = '';
    $student_academic_diploma = '';
    $student_academic_year    = '';

    if ($courseName === trim($curriculumData['student_academic_course_1'] ?? '')) {
        $student_academic_course  = $curriculumData['student_academic_course_1'];
        $student_academic_diploma = $curriculumData['student_academic_diploma_1'];
        $student_academic_year    = $curriculumData['student_academic_year_1'];
    } elseif ($courseName === trim($curriculumData['student_academic_course_2'] ?? '')) {
        $student_academic_course  = $curriculumData['student_academic_course_2'];
        $student_academic_diploma = $curriculumData['student_academic_diploma_2'];
        $student_academic_year    = $curriculumData['student_academic_year_2'];
    } elseif ($courseName === trim($curriculumData['student_academic_course_3'] ?? '')) {
        $student_academic_course  = $curriculumData['student_academic_course_3'];
        $student_academic_diploma = $curriculumData['student_academic_diploma_3'];
        $student_academic_year    = $curriculumData['student_academic_year_3'];
    }

    // Prompt for a university student
    $prompt = <<<PROMPT
    Exclusive target language: {$language}

    Student context: year {$student_academic_year}, diploma {$student_academic_diploma}, country {$student_country}, course {$student_academic_course}.

    You are an extremely precise system that specializes in creating a "pairs" game, in which there is a term (one or two words) on one card and a related explanation card. Under no circumstances should the explanation include the term itself as written on the term card. Select from the provided content the most accurate and educational terms. Your main goal is to teach: terms and explanations must be as accurate and educational as possible.

    Your mission: generate exactly six pairs of cards.

    Requirements for each pair:
    1. "texte1": a term of one or two words.
    2. "texte2": an explanation of approximately 20 words detailing that term, without using any form or root of the term itself.
    3. Both texts must contain a subtle hint (semantic link, logical connection, etc.) allowing the student to match them.

    General constraints:
    • If the provided information is insufficient, supplement freely with relevant academic-level content.
    • Shuffle all twelve items so that no "texte2" immediately follows its "texte1".
    • Reply only with a JSON array; each object must have strictly the keys "texte1" and "texte2".
    • Do not add any comments, tags, or text outside the JSON.

    Reference content:
    {$content}
    PROMPT;
}
else {
    die("Error: unrecognized student type.");
}

    
    // 4. Fonction pour appeler l'API OpenAI et générer les paires
    function callOpenAIPairsCustom($prompt) {
        $apiKey   = OPENAI_API_KEY;
        $endpoint = "https://api.openai.com/v1/chat/completions";
        
        $data = [
            "model"       => OPENAI_MODEL, // par exemple "gpt-3.5-turbo"
            "messages"    => [
                [
                    "role"    => "system",
                    "content" => "Tu es un assistant qui génère des paires de textes pédagogiques."
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
        $error = curl_error($ch);
        $httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        file_put_contents('openai_pairs_log.json', json_encode([
            'status'   => $httpStatus,
            'response' => $response,
        ], JSON_PRETTY_PRINT) . PHP_EOL, FILE_APPEND);
        
        if ($error || $httpStatus !== 200) {
            die("Erreur : Impossible de générer les paires. Vérifiez openai_pairs_log.json.");
        }
        
        $result = json_decode($response, true);
        if (!isset($result['choices'][0]['message']['content'])) {
            die("Erreur : Réponse de l'API OpenAI invalide.");
        }
        
        $pairsContent = $result['choices'][0]['message']['content'];
        // Retirer d'éventuelles balises Markdown
        if (preg_match('/```json(.*?)```/s', $pairsContent, $matches)) {
            $jsonPart = trim($matches[1]);
        } else {
            $jsonPart = preg_replace('/^```json\s*/', '', $pairsContent);
            $jsonPart = preg_replace('/\s*```$/', '', $jsonPart);
            $jsonPart = trim($jsonPart);
        }
        
        $pairs = json_decode($jsonPart, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($pairs)) {
            die("Erreur : Le format JSON des paires est invalide. " . json_last_error_msg());
        }
        return $pairs;
    }
    
    $pairs = callOpenAIPairsCustom($prompt);
    $openaiCost = 0.02;
    
    $text_content = json_encode($pairs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
    try {
        $insertStmt = $pdo->prepare("
            INSERT INTO documentPairs (uuid, created_time, subject_document_id, text_content, openaiCost)
            VALUES (:uuid, NOW(), :subject_document_id, :text_content, :openaiCost)
        ");
        $insertStmt->execute([
            'uuid'                => $userUuid,
            'subject_document_id' => $subjectDocumentId,
            'text_content'        => $text_content,
            'openaiCost'          => $openaiCost
        ]);
    } catch (PDOException $e) {
        die("Erreur lors de l'insertion des paires dans la DB : " . $e->getMessage());
    }
    
    // Redirection vers la page de visualisation des paires en passant subject_document_id
    header("Location: viewPair.php?subject_document_id=" . $subjectDocumentId);
    exit();
}

die("Erreur : Requête invalide.");
?>
