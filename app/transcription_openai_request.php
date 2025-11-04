<?php
/**********************************************************
 * POST JSON {"url":"https://youtu.be/…"}
 *     ↳ crée un job_XYZ + job_XYZ.url dans /app/temp
 * GET
 *     ↳ renvoie une page HTML de démonstration
 **********************************************************/
require_once __DIR__ . '/config.php';   // charge OPENAI_API_KEY

/*────────── Dossier de travail ──────────*/
$TEMP = __DIR__ . '/temp';
if (!is_dir($TEMP) && !mkdir($TEMP, 0775, true)) {
    http_response_code(500);
    exit('Impossible de créer le dossier temp/');
}

/*────────── POST = création d’un job ────*/
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true) ?: $_POST;       // JSON ou form-urlencoded
    $url  = trim($data['url'] ?? '');

    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        return_json(['error' => 'URL invalide !'], 400);
    }

    $job = 'job_' . uniqid();
    if (@file_put_contents("$TEMP/$job.url", $url) === false) {
        return_json(['error' => 'Écriture impossible dans temp/'], 500);
    }

    return_json(['job_id' => $job]);
}

/*────────── GET = petite page test ──────*/
?>
<!doctype html>
<html lang="fr"><meta charset="utf-8">
<title>Transcription YouTube → OpenAI Whisper</title>
<style>
 body{font-family:system-ui,Arial,sans-serif;margin:2rem}
 input[type=url]{width:70%;padding:.4rem}
 pre{white-space:pre-wrap;background:#f7f7f7;border:1px solid #ddd;
     padding:1rem;height:360px;overflow:auto}
 button{padding:.6rem 1rem}
</style>

<h1>Transcription YouTube (Whisper API stream)</h1>

<form id="form">
  <input type="url" id="yt" placeholder="https://www.youtube.com/watch?v=…" required>
  <button>Transcrire</button>
</form>

<pre id="log">(vide)</pre>

<script>
document.getElementById('form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const log = document.getElementById('log');
  log.textContent = '';

  /* 1) création de job */
  const r = await fetch('transcription_openai_request.php', {
    method : 'POST',
    headers: {'Content-Type':'application/json'},
    body   : JSON.stringify({url: document.getElementById('yt').value})
  });
  const j = await r.json();
  if (!r.ok) { log.textContent = 'Erreur : ' + (j.error || 'inconnue'); return; }

  /* 2) ouverture du flux SSE */
  const es = new EventSource('transcription_openai_stream.php?job_id=' + encodeURIComponent(j.job_id));
  es.onmessage = ev => { log.textContent += ev.data + "\n"; log.scrollTop = log.scrollHeight; };
  es.addEventListener('done', () => es.close());
  es.onerror = () => { log.textContent += "\n[Flux interrompu]"; es.close(); };
});
</script>
<?php
/*────────── helpers JSON ───────────────*/
function return_json(array $arr, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($arr, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
?>
