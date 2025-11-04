<?php
/*****************************************************************
 *  SSE : 1) télécharge l’audio (yt-dlp + ffmpeg)
 *        2) envoie le contenu à l’API Whisper d’OpenAI en streaming
 *        3) renvoie la transcription en temps réel
 *****************************************************************/
require_once __DIR__ . '/config.php';

ini_set('display_errors', 0);
set_time_limit(0);
ignore_user_abort(true);

date_default_timezone_set('Asia/Jerusalem');

/*────────── en-têtes SSE ──────────*/
header('Content-Type: text/event-stream; charset=utf-8');
header('Cache-Control: no-cache');
header('X-Accel-Buffering: no');
echo "retry:3000\n\n";

function sse(string $msg)       { echo 'data: '.$msg."\n\n"; @ob_flush(); flush(); }
function sse_event($e,$d='')    { echo "event:$e\ndata:$d\n\n"; @ob_flush(); flush(); }
function fatal(string $m)       { sse("⚠️ $m"); sse_event('done'); exit; }

/*────────── job_id ───────────────*/
$job = preg_replace('/[^A-Za-z0-9_]/', '', $_GET['job_id'] ?? '');
if (!$job) fatal('job_id manquant');

$TEMP     = __DIR__ . '/temp';
$urlFile  = "$TEMP/$job.url";
$audioMP3 = "$TEMP/$job.mp3";
$audioWAV = "$TEMP/$job.wav";

if (!is_file($urlFile)) fatal('Job introuvable');
$url = trim(file_get_contents($urlFile));
if (!filter_var($url, FILTER_VALIDATE_URL)) fatal('URL invalide dans le job');

/*────────── binaires (chemins ABSOLUS) ──*/
$yt = '/home/vicorelie/bin/yt-dlp';
$ff = '/home/vicorelie/bin/ffmpeg';

if (!is_executable($yt)) fatal('yt-dlp manquant : '.$yt);
if (!is_executable($ff)) fatal('ffmpeg manquant : '.$ff);

/*────────── 1) Téléchargement MP3 ───────*/
sse('['.date('H:i:s')."] 🌀 Téléchargement audio…");
$dlCmd = escapeshellarg($yt).' -f 251 -o '.escapeshellarg("$TEMP/$job.%(ext)s").
         ' '.escapeshellarg($url).' 2>&1';

$p = popen($dlCmd, 'r') ?: fatal('Impossible de lancer yt-dlp');
while (!feof($p)) { if (($l = fgets($p)) !== false) sse(trim($l)); }
$rc = pclose($p);
if ($rc !== 0) fatal("yt-dlp a retourné le code $rc");
if (!is_file($audioMP3) || filesize($audioMP3) < 20_000) fatal('Téléchargement audio KO');

/*────────── 2) Conversion WAV 16 kHz mono ─*/
sse('['.date('H:i:s')."] 🎙️ Conversion 16 kHz mono…");
$conv = escapeshellarg($ff).' -y -i '.escapeshellarg($audioMP3).
        ' -ac 1 -ar 16000 -c:a pcm_s16le '.escapeshellarg($audioWAV).' 2>&1';
exec($conv, $outConv, $stConv);
if ($stConv !== 0) { sse(join("\n", $outConv)); fatal('ffmpeg a échoué'); }

/*────────── 3) Appel API Whisper (OpenAI) ─*/
sse('['.date('H:i:s')."] ▶️ Transcription…");

/* ► envoi en streaming multipart/form-data */
$ch = curl_init('https://api.openai.com/v1/audio/transcriptions');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer '.OPENAI_API_KEY
    ],
    CURLOPT_POSTFIELDS     => [
        'model' => 'whisper-1',
        'file'  => new CURLFile($audioWAV, 'audio/wav', basename($audioWAV)),
        // facultatif : 'response_format' => 'srt'
    ],
    CURLOPT_WRITEFUNCTION  => function($ch,$data){
        /* l’API renvoie des lignes JSON → on les retransmet */
        sse(trim($data));
        return strlen($data);
    },
    CURLOPT_HEADERFUNCTION => function(){ return 0; },
]);
curl_exec($ch);
if (($e = curl_error($ch))) fatal('cURL : '.$e);
curl_close($ch);

/*────────── FIN ─────────────────────────*/
sse('✅ Transcription terminée');
sse_event('done');
