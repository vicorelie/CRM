<?php
// transcription_request.php
ini_set('display_errors', 0);
error_reporting(E_ALL);
date_default_timezone_set('Asia/Jerusalem');

/*──────────────────────
 *  Dossier temporaire
 *─────────────────────*/
$temp = __DIR__ . '/temp';
if (!is_dir($temp)) mkdir($temp, 0755, true);

/*──────── POST = création de job ────────*/
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    /* 1) récupère l’URL (JSON ou form-urlencoded) */
    $ctype = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($ctype, 'application/json') !== false) {
        $raw  = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: [];
        $url  = trim($data['url'] ?? '');
    } else {
        $url = trim($_POST['youtube_url'] ?? '');
    }

    /* 2) validation */
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'URL invalide']);
        exit;
    }

    /* 3) enregistre le job */
    $job = 'job_' . uniqid();
    file_put_contents("{$temp}/{$job}.url", $url);

    header('Content-Type: application/json');
    echo json_encode(['job_id' => $job]);
    exit;
}

/*──────── Sinon : page HTML ────────*/
?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Transcription YouTube en direct</title>
<style>
body{font-family:sans-serif;margin:2rem;}
pre{height:50vh;overflow:auto;background:#f7f7f7;padding:1rem;border:1px solid #ccc;}
input[type=url]{width:70%;padding:.4rem;}
button{padding:.45rem 1.1rem;}
</style>
</head>
<body>

<h1>Transcription YouTube (SSE)</h1>

<form id="form">
  <input type="url" id="url" placeholder="https://youtube.com/…" required>
  <button type="submit">Transcrire</button>
</form>

<pre id="log"></pre>

<script>
document.getElementById('form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const url = document.getElementById('url').value.trim();
  if (!url) return;

  /* ► création du job */
  const res = await fetch('transcription_request.php', {
      method : 'POST',
      headers: {'Content-Type':'application/json'},
      body   : JSON.stringify({url})
  });

  const out = await res.json();
  if (!res.ok) {
      alert(out.error || 'Erreur serveur');
      return;
  }

  /* ► écoute SSE */
  const log  = document.getElementById('log');
  log.textContent = '';
  const es   = new EventSource(`transcription_stream.php?job_id=${out.job_id}`);

  let completed = false;

  es.onmessage = e => {
      log.textContent += e.data + '\n';
      log.scrollTop    = log.scrollHeight;
  };

  /* ★ événement custom « done » */
  es.addEventListener('done', () => {
      completed = true;
      es.close();
      log.textContent += '\n— fin normale —\n';
      log.scrollTop    = log.scrollHeight;
  });

  es.onerror = () => {
      if (!completed){
          log.textContent += '\n🛑 Flux interrompu (erreur réseau ou serveur)…\n';
          log.scrollTop    = log.scrollHeight;
      }
      es.close();
  };
});
</script>

</body>
</html>
