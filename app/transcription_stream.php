<?php
/*****************************************************************
 *  transcription_stream.php?job_id=xxx[&lang=xx][&translate=yy]
 *  1) télécharge l’audio YouTube
 *  2) convertit en WAV 16 kHz mono
 *  3) transcrit avec whisper.cpp
 *  4) (option) traduit la transcription
 *****************************************************************/

/*══════════ 0) INIT ══════════*/
ini_set('display_errors', 0);
set_time_limit(0);
ignore_user_abort(true);
date_default_timezone_set('Asia/Jerusalem');

/*══════════ 1) SSE HEADERS ═══*/
header('Content-Type: text/event-stream; charset=utf-8');
header('Cache-Control: no-cache');
header('X-Accel-Buffering: no');
echo "retry: 3000\n\n";

function sse(string $m){ echo "data: $m\n\n"; @ob_flush(); flush(); }
function evt(string $e,string $d=''){ echo "event: $e\ndata: $d\n\n"; @ob_flush(); flush(); }
function fatal(string $m){ sse("⚠️ $m"); evt('done'); exit; }

/*══════════ 2) ENV / PATHS ══*/
$HOME = $_SERVER['HOME'] ?? '/home/'.get_current_user();
putenv("PATH=$HOME/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin");
$CACHE = "$HOME/tmpstaticx"; @mkdir($CACHE, 0700, true);
putenv("TMPDIR=$CACHE"); putenv("STATICX_CACHE_DIR=$CACHE");

/*══════════ 3) PARAMS ═══════*/
$job   = preg_replace('/\W/','', $_GET['job_id'] ?? '');
$lang  = preg_replace('/[^a-z]/','', $_GET['lang']      ?? '');   // ''=auto
$tran  = preg_replace('/[^a-z]/','', $_GET['translate'] ?? '');   // ''=none
if(!$job) fatal('job_id manquant');

$TEMP = __DIR__.'/temp';
$URLf = "$TEMP/$job.url";
$MP3  = "$TEMP/$job.mp3";
$WAV  = "$TEMP/$job.wav";
if(!is_file($URLf)) fatal('Job introuvable');
$url = trim(file_get_contents($URLf));
if(!filter_var($url, FILTER_VALIDATE_URL)) fatal('URL invalide');

/*══════════ 4) BINARIES ═════*/
$yt   = trim(shell_exec('command -v yt-dlp')) ?: trim(shell_exec('command -v youtube-dl'));
$ff   = trim(shell_exec('command -v ffmpeg'));
if(!$yt) fatal('yt-dlp/youtube-dl manquant');
if(!$ff) fatal('ffmpeg manquant');

/*══════════ 5) DL + CONVERT ==*/
sse('['.date('H:i:s')."] 🌀 Téléchargement audio…");
$cmd = "$yt --no-playlist -x --audio-format mp3 ".
       "-o ".escapeshellarg("$TEMP/{$job}.%(ext)s")." ".
       escapeshellarg($url)." 2>&1";
$dl = popen($cmd,'r') ?: fatal('yt-dlp impossible à lancer');
while(!feof($dl)){ if(($l=fgets($dl))!==false) sse(rtrim($l,"\r\n")); }
pclose($dl);
if(!is_file($MP3) || filesize($MP3)<20_000) fatal('Téléchargement audio KO');

sse('['.date('H:i:s')."] 🎙️ Conversion 16 kHz mono…");
exec("$ff -y -i ".escapeshellarg($MP3)." -ac 1 -ar 16000 -c:a pcm_s16le ".
     escapeshellarg($WAV)." 2>&1", $o, $st);
if($st) fatal('ffmpeg conversion KO');

/*══════════ 6) WHISPER SETUP ═*/
$WDIR = realpath(__DIR__.'/../models/whisper.cpp') ?: fatal('Dossier modèles manquant');
$CLI  = "$WDIR/build/bin/whisper-cli";
if(!is_executable($CLI)) fatal('whisper-cli absent');

$pref = ['ggml-medium-q5_0.bin','ggml-medium-q5_0.gguf','ggml-small-q5_0.gguf','ggml-small.bin','ggml-tiny.bin'];
$models = [];
foreach($pref as $f){ $p="$WDIR/$f"; if(is_file($p) && filesize($p)>10_000_000) $models[]=$p; }
if(!$models) fatal('Aucun modèle trouvé – téléchargez-en un');

/*══════════ 7) TRANSCRIPTION ═*/
$threads = max(1, min(8, (int)shell_exec('nproc 2>/dev/null') ?: 2));
$ok      = false;
foreach($models as $model){
    $beam = 5;
    for($pass=0; $pass<3; $pass++){          // 0: full, 1: beam=1, 2: threads=1
        $beam_now = $beam>1 && $pass>0 ? 1       : $beam;
        $thr_now  = $threads>1 && $pass==2 ? 1   : $threads;
        $opts = "--threads $thr_now --no-gpu --beam-size $beam_now ".
                "--best-of $beam_now --temperature 0";
        $langOpt = $lang ? "--language $lang" : "--language auto";

        sse("—— Modèle ".basename($model)."  (threads=$thr_now, beam=$beam_now)");
        $cmd = escapeshellarg($CLI)." -m ".escapeshellarg($model)." $langOpt $opts ".
               "-f ".escapeshellarg($WAV)." 2>&1";
        $p = popen($cmd,'r') ?: fatal('whisper-cli KO');
        while(!feof($p)){
            if(($l=fgets($p))!==false){
                if(preg_match('/\b(\d{1,3})%/',$l,$m)) evt('progress',$m[1]);
                sse(rtrim($l,"\r\n"));
            }
        }
        $rc = pclose($p);
        if($rc==0){ $ok=true; break 2; }      // succès
        if($rc!=137){ fatal("whisper-cli rc=$rc"); } // autre erreur → stop
        sse('⚠️ OOM → on allège…');
    }
}
if(!$ok) fatal('Tous les modèles ont échoué (OOM)');

sse('✅ Transcription terminée');

/*══════════ 8) TRADUCTION ? ═*/
// if($tran){
//     sse('['.date('H:i:s')."] 🌍 Traduction vers $tran…");
//     $json = "$TEMP/$job.json";
//     exec(escapeshellarg($CLI)." -m ".escapeshellarg($model)." $langOpt ".
//          "--output-json-full -f ".escapeshellarg($WAV)." -ojf -of ".
//          escapeshellarg($TEMP.'/'.$job)." 2>/dev/null");

//     $tcmd = escapeshellarg($CLI)." -m ".escapeshellarg($model).
//             " --translate --language $tran --input-json ".
//             escapeshellarg($json)." 2>&1";
//     passthru($tcmd);
//     sse('🎉 Traduction terminée');
// }

evt('done');
?>
