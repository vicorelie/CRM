<?php
// audioContent.php
// Upload audio → compression éventuelle → transcription Whisper → détection langue → insertion en BDD

session_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);

require __DIR__ . '/config.php';                     // $pdo + OPENAI_API_KEY
requireSubscription($pdo);                           // Vérifie l’abonnement
require_once __DIR__ . '/includes/langDetect.php';   // Helper detectTranscriptLanguage()

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit;
}
$userUuid = $_SESSION['user_uuid'];

// 1) Récupérer topic, sub_topic et study_subjects_id
$topic    = trim($_POST['topic']         ?? '');
$subTopic = trim($_POST['sub_topic']     ?? '');
$sid      = intval($_POST['study_subjects_id'] ?? 0);
if ($topic === '') {
    die('Le champ "Sujet" est obligatoire.');
}

// 2) Vérifier l’upload audio
if (!isset($_FILES['audio_file']) || $_FILES['audio_file']['error'] !== UPLOAD_ERR_OK) {
    die('Erreur lors de l’upload audio : ' . ($_FILES['audio_file']['error'] ?? 'N/A'));
}

// 3) Préparer les dossiers
$binDir    = __DIR__ . '/bin';
$tmpDir    = __DIR__ . '/tmp';
$uploadDir = __DIR__ . '/uploads/audio';
foreach ([$tmpDir, $uploadDir] as $d) {
    if (!is_dir($d) && !mkdir($d, 0755, true)) {
        die("Impossible de créer le dossier $d");
    }
}
putenv('TMPDIR=' . $tmpDir);

// 4) Déplacer le fichier uploadé
$origName = basename($_FILES['audio_file']['name']);
$target   = "$uploadDir/$origName";
if (!move_uploaded_file($_FILES['audio_file']['tmp_name'], $target)) {
    die('Impossible de déplacer le fichier uploadé.');
}

// 5) (Optionnel) Compresser si > 25 Mo
$src = $target;
if (filesize($target) > 25 * 1024 * 1024) {
    $cmp = "$tmpDir/cmp_" . $origName;
    exec(
        escapeshellcmd("$binDir/ffmpeg")
      . " -y -i " . escapeshellarg($target)
      . " -ac 1 -ar 16000 -b:a 32k " . escapeshellarg($cmp)
      . " 2>&1",
        $ffOut,
        $ffCode
    );
    if ($ffCode !== 0) {
        die('Erreur compression audio : ' . implode("\n", $ffOut));
    }
    $src = $cmp;
}

// 6) Transcription Whisper
$ch = curl_init('https://api.openai.com/v1/audio/transcriptions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . OPENAI_API_KEY],
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => [
        'file'  => new CURLFile($src, 'audio/mpeg', $origName),
        'model' => 'whisper-1'
    ]
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$data = json_decode($response, true);
if (empty($data['text'])) {
    die("Erreur transcription (HTTP $httpCode): $response");
}
$transcript = $data['text'];

// 🔍 7) Détection automatique de la langue
$detectedLang = detectTranscriptLanguage($transcript);

// 8) Insertion dans Documents (avec la langue détectée)
$docStmt = $pdo->prepare("
    INSERT INTO Documents
      (uuid, filename, path, language, type, extract_content, created_time)
    VALUES
      (:uuid, :fn, :pth, :lang, 'audio', :txt, NOW())
");
$docStmt->execute([
    ':uuid' => $userUuid,
    ':fn'   => $origName,
    ':pth'  => "uploads/audio/$origName",
    ':lang' => $detectedLang,
    ':txt'  => $transcript
]);
$docId = $pdo->lastInsertId();

// 9) Liaison dans subjectDocuments (en passant la langue)
$sdStmt = $pdo->prepare("
    INSERT INTO subjectDocuments
      (uuid, study_subjects_id, documents_id, topic, sub_topic, language, created_time)
    VALUES
      (:uuid, :sid, :did, :topic, :sub, :lang, NOW())
");
$sdStmt->execute([
    ':uuid' => $userUuid,
    ':sid'  => $sid,
    ':did'  => $docId,
    ':topic'=> $topic,
    ':sub'  => $subTopic,
    ':lang' => $detectedLang
]);

// 10) Redirection
header('Location: studyList.php?docAddSuccess=1');
exit;
