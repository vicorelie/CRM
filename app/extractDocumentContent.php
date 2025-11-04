<?php
// extractDocumentContent.php (version mise à jour)

ini_set('memory_limit', '512M');
set_time_limit(300);

session_start();
require 'config.php';
require_once 'vendor/autoload.php';

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// --- Config chemins absolus ---
const APP_DIR    = '/var/www/app';
const PYTHON_BIN = APP_DIR . '/.venv/bin/python';
const SCRIPT_PY  = APP_DIR . '/extractContent.py';
const UPLOAD_DIR = '/var/www/uploads';
const LOG_DIR    = '/var/www/logs';

// 1) Fonction d'extraction Python (avec venv + cwd correct + logs)
function callPythonExtractor(string $filePath): array {
    $absolutePath = realpath($filePath);
    if (!$absolutePath) {
        throw new Exception("Chemin absolu introuvable : " . $filePath);
    }
    if (!is_file(PYTHON_BIN)) throw new Exception("Python du venv introuvable : " . PYTHON_BIN);
    if (!is_file(SCRIPT_PY))  throw new Exception("Script Python introuvable : " . SCRIPT_PY);

    $cmd = 'cd ' . escapeshellarg(APP_DIR) . ' && '
         . escapeshellarg(PYTHON_BIN) . ' ' . escapeshellarg(SCRIPT_PY) . ' '
         . escapeshellarg($absolutePath) . ' 2>&1';

    $output = [];
    $returnCode = 0;
    exec($cmd, $output, $returnCode);

    @mkdir(LOG_DIR, 0770, true);
    file_put_contents(LOG_DIR . '/python.log',
        "[" . date('c') . "] $cmd\n" . implode("\n", $output) . "\n\n", FILE_APPEND
    );

    $jsonResponse = implode("\n", $output);
    $data = json_decode($jsonResponse, true, 512, JSON_INVALID_UTF8_SUBSTITUTE);

    if ($returnCode !== 0) {
        throw new Exception("Erreur Python: " . $jsonResponse);
    }
    if (!is_array($data)) {
        throw new Exception("JSON invalide renvoyé par le script Python.");
    }
    if (isset($data['error'])) {
        throw new Exception("Erreur Python: " . $data['error']);
    }
    return $data;
}

// 2) Vérifier la méthode
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: studyList.php");
    exit();
}

// 3) Champs du formulaire
$userUuid        = $_SESSION['user_uuid'];
$studySubjectsId = $_POST['study_subjects_id'] ?? '';
$topic           = trim($_POST['topic'] ?? '');
$subTopic        = trim($_POST['sub_topic'] ?? '');
$language        = trim($_POST['language'] ?? 'he');

// 4) Upload
$uploadedFileName = $_FILES['document']['name'] ?? '';
$tmpPath          = $_FILES['document']['tmp_name'] ?? '';
$fileExt          = '';
$fileId           = null;

try {
    if (!empty($uploadedFileName) && !empty($tmpPath) && is_uploaded_file($tmpPath)) {
        $fileExt = strtolower(pathinfo($uploadedFileName, PATHINFO_EXTENSION));
        $allowedExt = ['doc','docx','pdf','jpeg','jpg','png','xls','xlsx','ppt','pptx'];
        if (!in_array($fileExt, $allowedExt, true)) {
            header("Location: studyList.php?docAddError=" . urlencode("Format '$fileExt' non autorisé."));
            exit();
        }

        @mkdir(UPLOAD_DIR, 0770, true);
        $safeBase = preg_replace('/[^A-Za-z0-9._-]/', '_', basename($uploadedFileName));
        $uniqueFilename = bin2hex(random_bytes(8)) . '_' . $safeBase;
        $filePath = UPLOAD_DIR . '/' . $uniqueFilename;

        if (!move_uploaded_file($tmpPath, $filePath)) {
            header("Location: studyList.php?docAddError=" . urlencode("Impossible de déplacer le fichier uploadé."));
            exit();
        }

        // Extraction Python
        $extractionData = callPythonExtractor($filePath);
        $extractedLang  = $extractionData["language"] ?? 'inconnue';
        $segments       = $extractionData["segments"] ?? [];
        $jsonSegments   = json_encode($segments, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

        // métriques
        $wordNumber = 0; $charNumber = 0;
        foreach ($segments as $seg) {
            $content = (string)($seg['content'] ?? '');
            $wordNumber += preg_match_all('/\p{L}+/u', $content);
            $charNumber += mb_strlen($content, 'UTF-8');
        }

        // Enregistrement Documents
        $stmtDoc = $pdo->prepare("
            INSERT INTO Documents (
              uuid, filename, path, language, type,
              extract_content, word_number, char_number, created_time
            ) VALUES (
              :uuid, :filename, :path, :language, :type,
              :extract_content, :word_number, :char_number, NOW()
            )
        ");
        $stmtDoc->execute([
            ':uuid'            => $userUuid,
            ':filename'        => $uploadedFileName,
            ':path'            => $filePath,
            ':language'        => $extractedLang,
            ':type'            => $fileExt,
            ':extract_content' => $jsonSegments,
            ':word_number'     => $wordNumber,
            ':char_number'     => $charNumber
        ]);
        $fileId = $pdo->lastInsertId();
    }

    // Liaison subjectDocuments
    $stmtSubDoc = $pdo->prepare("
        INSERT INTO subjectDocuments (
          uuid, study_subjects_id, documents_id, topic, sub_topic, language, created_time
        ) VALUES (
          :uuid, :study_subjects_id, :documents_id, :topic, :sub_topic, :language, NOW()
        )
    ");
    $stmtSubDoc->execute([
        ':uuid'              => $userUuid,
        ':study_subjects_id' => $studySubjectsId,
        ':documents_id'      => $fileId,
        ':topic'             => $topic,
        ':sub_topic'         => $subTopic,
        ':language'          => $language
    ]);

    header("Location: studyList.php?docAddSuccess=1");
    exit();

} catch (Exception $e) {
    header("Location: studyList.php?docAddError=" . urlencode($e->getMessage()));
    exit();
}
