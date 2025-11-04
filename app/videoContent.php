<?php
// videoContent.php
// Upload vidéo → remux → extraction audio → transcription → détection langue → insertion en BDD

session_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);

require __DIR__ . '/config.php';
requireSubscription($pdo);

// 1) Authentification
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit;
}
$userUuid = $_SESSION['user_uuid'];

// 2) Récupération des champs
$sid      = intval($_POST['study_subjects_id'] ?? 0);
$topic    = trim($_POST['topic']          ?? '');
$subTopic = trim($_POST['sub_topic']      ?? '');

// Sujet obligatoire
if ($topic === '') {
    die('Le champ "Sujet" est obligatoire.');
}

// 3) Upload de la vidéo
if (!isset($_FILES['video_file']) || $_FILES['video_file']['error'] !== UPLOAD_ERR_OK) {
    die('Erreur lors de l’upload de la vidéo.');
}

$origName     = basename($_FILES['video_file']['name']);
$uploadDirVid = __DIR__ . '/uploads/video';
$tmpDir       = __DIR__ . '/tmp';
foreach ([$uploadDirVid, $tmpDir] as $d) {
    if (!is_dir($d) && !mkdir($d, 0755, true)) {
        die("Impossible de créer le dossier $d");
    }
}
$videoSysPath = "$uploadDirVid/$origName";
$videoRelPath = "uploads/video/$origName";
if (!move_uploaded_file($_FILES['video_file']['tmp_name'], $videoSysPath)) {
    die('Impossible de déplacer la vidéo.');
}

// 4) Remux pour corriger le moov atom
$fixedPath = "$tmpDir/fixed_" . uniqid() . ".mp4";
$remuxCmd  = escapeshellcmd(__DIR__ . '/bin/ffmpeg')
           . ' -y -i ' . escapeshellarg($videoSysPath)
           . ' -c copy -movflags +faststart ' . escapeshellarg($fixedPath)
           . ' 2>&1';
exec($remuxCmd, $remuxOut, $remuxCode);
$videoForAudio = ($remuxCode === 0 && file_exists($fixedPath))
               ? $fixedPath
               : $videoSysPath;

// 5) Extraction audio
$uploadDirAud = __DIR__ . '/uploads/audio';
if (!is_dir($uploadDirAud) && !mkdir($uploadDirAud, 0755, true)) {
    die("Impossible de créer le dossier $uploadDirAud");
}
$audioName    = pathinfo($origName, PATHINFO_FILENAME) . '.mp3';
$audioSysPath = "$uploadDirAud/$audioName";

$extractCmd = escapeshellcmd(__DIR__ . '/bin/ffmpeg')
            . ' -y -i ' . escapeshellarg($videoForAudio)
            . ' -ac 1 -ar 16000 -b:a 32k ' . escapeshellarg($audioSysPath)
            . ' 2>&1';
exec($extractCmd, $extractOut, $extractCode);
if ($extractCode !== 0) {
    die('Erreur extraction audio : ' . implode("\n", $extractOut));
}

// 6) Transcription Whisper
$ch = curl_init('https://api.openai.com/v1/audio/transcriptions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . OPENAI_API_KEY],
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => [
        'file'  => new CURLFile($audioSysPath, 'audio/mpeg', $audioName),
        'model' => 'whisper-1'
    ],
]);
$response   = curl_exec($ch);
$status     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$data       = json_decode($response, true);
if (empty($data['text'])) {
    die("Erreur transcription (HTTP $status) : $response");
}
$transcript = $data['text'];

// ────────────────────────────────────────────────────────────
// 7) Détection automatique de la langue avec votre helper
// ────────────────────────────────────────────────────────────
require_once __DIR__ . '/includes/langDetect.php';
$detectedLang = detectTranscriptLanguage($transcript);

// 8) Insertion dans Documents (avec la langue détectée)
$docStmt = $pdo->prepare("
    INSERT INTO Documents
      (uuid, filename, path, language, type, extract_content, created_time)
    VALUES
      (:uuid, :fn, :pth, :lang, 'video', :txt, NOW())
");
$docStmt->execute([
    ':uuid' => $userUuid,
    ':fn'   => $origName,
    ':pth'  => $videoRelPath,
    ':lang' => $detectedLang,
    ':txt'  => $transcript,
]);
$docId = $pdo->lastInsertId();

// 9) Liaison dans subjectDocuments (avec la langue)
$sdStmt = $pdo->prepare("
    INSERT INTO subjectDocuments
      (uuid, study_subjects_id, topic, sub_topic, documents_id, language, created_time)
    VALUES
      (:uuid, :sid, :topic, :sub, :docId, :lang, NOW())
");
$sdStmt->execute([
    ':uuid' => $userUuid,
    ':sid'  => $sid,
    ':topic'=> $topic,
    ':sub'  => $subTopic,
    ':docId'=> $docId,
    ':lang' => $detectedLang,
]);

// 10) Redirection
header('Location: studyList.php?docAddSuccess=1');
exit;
