<?php
// generateGeneralMissApi.php

session_start();
set_time_limit(300);
ini_set('memory_limit', '1024M');

require 'config.php'; // Doit définir $pdo, OPENAI_API_KEY, OPENAI_MODEL (par ex. "gpt-3.5-turbo")
require_once 'vendor/autoload.php';

use Ramsey\Uuid\Uuid;

if (!isset($_SESSION['user_uuid'])) {
    die("Erreur : Accès non autorisé. Veuillez vous connecter.");
}

$userUuid = $_SESSION['user_uuid'];

// On attend le paramètre subject_document_id dans la requête POST
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['subject_document_id'])) {
    $subjectDocumentId = (int) $_POST['subject_document_id'];
    $language = $_POST['miss_language'] ?? 'he';  // Langue pour l'exercice
    $numberOfTexts = 6; // Nombre d'exercices Miss à générer

    // 1. Récupérer les informations de la matière depuis subjectDocuments
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
    
    $topic           = trim($subjectData['topic'] ?? '');
    $sub_topic       = trim($subjectData['sub_topic'] ?? '');
    $additional_info = trim($subjectData['additional_info'] ?? '');
    $subjectName     = trim($subjectData['subject_name'] ?? '');
    $subjectUnit     = trim($subjectData['subject_unit'] ?? '');
    $courseName      = trim($subjectData['course_name'] ?? '');
    
    // Construire un contenu de base qui servira de contexte dans le prompt
    $content = "Sujet: $topic\nSous-sujet: $sub_topic";
    if (!empty($additional_info)) {
        $content .= "\nInformations complémentaires: $additional_info";
    }
    
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
    
    // 3. Construire le prompt en fonction du type d'étudiant
    if ($curriculumData['student_type'] === 'school') {
        $student_country = trim($curriculumData['student_country'] ?? '');
        $student_school_class = trim($curriculumData['student_school_class'] ?? '');
        

        
        // Prompt pour un élève du secondaire
        $prompt = "Langue cible exclusive: $language.\n\n"
                . "Vous êtes un assistant expert chargé de générer des exercices à trous adaptés à l'enseignement scolaire. "
                . "L'élève étudie dans le pays $student_country en classe $student_school_class, la matière $subjectName (coefficient: $subjectUnit). "
                . "À partir des informations suivantes concernant le sujet, générez un ensemble de $numberOfTexts textes à trous. d'environ 50 mots. "
                . "Pour chacun, laisse une partie manquante (représentée par '___') et propose 4 options (3 ou 4 mots) pour compléter le blanc. " .
                "Parmi ces 4 propositions, une seule est correcte et les trois autres sont proches mais légèrement erronées. " .
                "Réponds uniquement et exclusivement avec du JSON sous la forme d'un tableau d'objets, où chaque objet possède les propriétés suivantes :\n" .
                "  - \"texte_complet\" : le texte avec le blanc marqué par \"___\"\n" .
                "  - \"propositions\" : un tableau de 4 propositions pour compléter le blanc\n" .
                "  - \"correct_index\" : l'indice (de 0 à 3) de la proposition correcte\n\n" .
                "Ne fournis aucune explication supplémentaire.\n\n" .
                
                $content;


    } elseif ($curriculumData['student_type'] === 'academic') {
        $student_country = trim($curriculumData['student_country'] ?? '');
        $student_academic_course = '';
        $student_academic_diploma = '';
        $student_academic_year = '';
        
        if ($courseName === trim($curriculumData['student_academic_course_1'] ?? '')) {
            $student_academic_course = $curriculumData['student_academic_course_1'];
            $student_academic_diploma = $curriculumData['student_academic_diploma_1'];
            $student_academic_year = $curriculumData['student_academic_year_1'];
        } elseif ($courseName === trim($curriculumData['student_academic_course_2'] ?? '')) {
            $student_academic_course = $curriculumData['student_academic_course_2'];
            $student_academic_diploma = $curriculumData['student_academic_diploma_2'];
            $student_academic_year = $curriculumData['student_academic_year_2'];
        } elseif ($courseName === trim($curriculumData['student_academic_course_3'] ?? '')) {
            $student_academic_course = $curriculumData['student_academic_course_3'];
            $student_academic_diploma = $curriculumData['student_academic_diploma_3'];
            $student_academic_year = $curriculumData['student_academic_year_3'];
        }
        
        // Prompt pour un étudiant universitaire
        $prompt = "Langue cible exclusive: $language.\n\n"
                . "Vous êtes un assistant expert chargé de générer des exercices à trous adaptés à l'enseignement universitaire. "
                . "L'étudiant est en $student_academic_year du diplôme $student_academic_diploma dans le pays $student_country et suit le cours $student_academic_course. "
                . "À partir des informations suivantes concernant le sujet, générez un ensemble de $numberOfTexts textes à trous. d'environ 50 mots. "
                . "Pour chacun, laisse une partie manquante (représentée par '___') et propose 4 options (3 ou 4 mots) pour compléter le blanc. " .
                "Parmi ces 4 propositions, une seule est correcte et les trois autres sont proches mais légèrement erronées. " .
                "Réponds uniquement et exclusivement avec du JSON sous la forme d'un tableau d'objets, où chaque objet possède les propriétés suivantes :\n" .
                "  - \"texte_complet\" : le texte avec le blanc marqué par \"___\"\n" .
                "  - \"propositions\" : un tableau de 4 propositions pour compléter le blanc\n" .
                "  - \"correct_index\" : l'indice (de 0 à 3) de la proposition correcte\n\n" .
                "Ne fournis aucune explication supplémentaire.\n\n" .
                $content;
    } else {
        die("Erreur : Type d'étudiant non reconnu.");
    }
    
    // 4. Fonction pour appeler l'API OpenAI et générer les exercices Miss
    function callOpenAIMissCustom($prompt) {
        $apiKey   = OPENAI_API_KEY;
        $endpoint = "https://api.openai.com/v1/chat/completions";
        
        $data = [
            "model"       => OPENAI_MODEL, // par exemple "gpt-3.5-turbo"
            "messages"    => [
                [
                    "role"    => "system",
                    "content" => "Tu es un assistant qui génère des exercices à trous pour des exercices interactifs."
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
        
        file_put_contents('openai_miss_log.json', json_encode([
            'status'   => $httpStatus,
            'response' => $response,
        ], JSON_PRETTY_PRINT) . PHP_EOL, FILE_APPEND);
        
        if ($error || $httpStatus !== 200) {
            die("Erreur : Impossible de générer les textes à trous. Vérifiez openai_miss_log.json.");
        }
        
        $result = json_decode($response, true);
        if (!isset($result['choices'][0]['message']['content'])) {
            die("Erreur : Réponse de l'API OpenAI invalide.");
        }
        
        $missContent = $result['choices'][0]['message']['content'];
        // Retirer d'éventuelles balises Markdown
        if (preg_match('/```json(.*?)```/s', $missContent, $matches)) {
            $jsonPart = trim($matches[1]);
        } else {
            $jsonPart = preg_replace('/^```json\s*/', '', $missContent);
            $jsonPart = preg_replace('/\s*```$/', '', $jsonPart);
            $jsonPart = trim($jsonPart);
        }
        
        $texts = json_decode($jsonPart, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($texts)) {
            die("Erreur : Le format JSON des textes à trous est invalide. " . json_last_error_msg());
        }
        return $texts;
    }
    
    $missTexts = callOpenAIMissCustom($prompt);
    $openaiCost = 0.02;
    
    $text_content = json_encode($missTexts, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
    try {
        $insertStmt = $pdo->prepare("
            INSERT INTO documentMiss (uuid, created_time, subject_document_id, text_content, openaiCost)
            VALUES (:uuid, NOW(), :subject_document_id, :text_content, :openaiCost)
        ");
        $insertStmt->execute([
            'uuid' => $userUuid,
            'subject_document_id' => $subjectDocumentId,
            'text_content' => $text_content,
            'openaiCost' => $openaiCost
        ]);
    } catch (PDOException $e) {
        die("Erreur lors de l'insertion des textes à trous dans la DB : " . $e->getMessage());
    }
    
    // Redirection vers la page de visualisation des exercices à trous en passant subject_document_id
    header("Location: viewMiss.php?subject_document_id=" . $subjectDocumentId);
    exit();
}

die("Erreur : Requête invalide.");
?>
