<?php
// youtubeContent.php
session_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';             // $pdo + OPENAI_API_KEY
requireSubscription($pdo);                        // Vérifie l’abonnement
require_once __DIR__ . '/includes/langDetect.php';// Helper detectTranscriptLanguage()

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit;
}
$userUuid = $_SESSION['user_uuid'];

// 1) Récupérer les champs du formulaire
$url      = trim($_POST['youtube_url']       ?? '');
$sid      = intval($_POST['study_subjects_id'] ?? 0);
$topic    = trim($_POST['topic']             ?? '');
$subTopic = trim($_POST['sub_topic']         ?? '');
if ($topic === '') {
    die('Le champ "Sujet" est obligatoire.');
}

// 2) Préparer les dossiers
define('BIN_DIR',    __DIR__ . '/bin');
define('TMP_DIR',    __DIR__ . '/tmp');
define('UPLOAD_DIR', __DIR__ . '/uploads/audio');
foreach ([TMP_DIR, UPLOAD_DIR] as $dir) {
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        die("Impossible de créer le dossier $dir");
    }
}
putenv('TMPDIR=' . TMP_DIR);

// 3) Valider l’URL YouTube
if (!filter_var($url, FILTER_VALIDATE_URL)
    || !preg_match('#^(https?://)?(www\.)?(youtube\.com|youtu\.be)/#', $url)
) {
    die('URL YouTube invalide.');
}

// 4) Télécharger l’audio au format MP3
$cmd = escapeshellcmd(BIN_DIR . '/yt-dlp')
     . ' --ffmpeg-location ' . escapeshellarg(BIN_DIR)
     . ' --quiet --no-playlist --extract-audio --audio-format mp3'
     . ' -o ' . escapeshellarg(UPLOAD_DIR . '/%(id)s.%(ext)s')
     . ' ' . escapeshellarg($url) . ' 2>&1';
exec($cmd, $out, $code);
if ($code !== 0) {
    die('Erreur téléchargement audio : ' . implode("\n", $out));
}

// 5) Récupérer le fichier MP3 le plus récent
$files = glob(UPLOAD_DIR . '/*.mp3');
usort($files, fn($a, $b) => filemtime($b) - filemtime($a));
$audioPath = $files[0] ?? '';
if (!$audioPath || !file_exists($audioPath)) {
    die('Fichier audio introuvable.');
}
$audioFile = basename($audioPath);

// 6) Compression si > 25 Mo
$src = $audioPath;
if (filesize($audioPath) > 25 * 1024 * 1024) {
    $cmp = TMP_DIR . '/cmp_' . $audioFile;
    exec(
        escapeshellcmd(BIN_DIR . '/ffmpeg')
      . ' -y -i ' . escapeshellarg($audioPath)
      . ' -ac 1 -ar 16000 -b:a 32k ' . escapeshellarg($cmp)
      . ' 2>&1',
        $fout,
        $fc
    );
    if ($fc !== 0) {
        die('Erreur compression : ' . implode("\n", $fout));
    }
    $src = $cmp;
}

// 7) Transcription via Whisper
$ch = curl_init('https://api.openai.com/v1/audio/transcriptions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . OPENAI_API_KEY],
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => [
        'file'  => new CURLFile($src, 'audio/mpeg', $audioFile),
        'model' => 'whisper-1'
    ]
]);
$response = curl_exec($ch);
$status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$data = json_decode($response, true);
if (empty($data['text'])) {
    die("Erreur transcription (HTTP $status) : $response");
}
$transcript = $data['text'];

// 🔍 8) Détection automatique de la langue
$detectedLang = detectTranscriptLanguage($transcript);

// 9) Insertion dans Documents
$docStmt = $pdo->prepare(
    'INSERT INTO Documents
       (uuid, filename, path, language, type, extract_content, created_time)
     VALUES
       (:uuid, :filename, :path, :language, :type, :extract_content, NOW())'
);
$docStmt->execute([
    ':uuid'            => $userUuid,
    ':filename'        => $audioFile,
    ':path'            => "uploads/audio/$audioFile",
    ':language'        => $detectedLang,
    ':type'            => 'youtube',
    ':extract_content' => $transcript
]);
$documentId = $pdo->lastInsertId();

// 10) Liaison dans subjectDocuments (avec langue)
$sdStmt = $pdo->prepare(
    'INSERT INTO subjectDocuments
       (uuid, study_subjects_id, documents_id, topic, sub_topic, language, created_time)
     VALUES
       (:uuid, :sid, :did, :topic, :sub, :language, NOW())'
);
$sdStmt->execute([
    ':uuid'     => $userUuid,
    ':sid'      => $sid,
    ':did'      => $documentId,
    ':topic'    => $topic,
    ':sub'      => $subTopic,
    ':language' => $detectedLang
]);

// 11) Redirection
header('Location: studyList.php?docAddSuccess=1');
exit;
