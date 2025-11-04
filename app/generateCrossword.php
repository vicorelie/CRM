<?php
// generateCrossword.php
require_once __DIR__.'/config.php'; // $pdo, ...
csrf_protect_post(); 

// 1) Sécurité & params
if (!isset($_SESSION['user_uuid'])) exit('login');
$uuid = $_SESSION['user_uuid'];
$sd   = (int)($_POST['subject_document_id'] ?? 0);
$lang = trim($_POST['crossword_language'] ?? 'fr');
if (!$sd) exit('param');

// 2) Récupérer topic/sub
$stmt = $pdo->prepare("
  SELECT topic, sub_topic
  FROM subjectDocuments
  WHERE id=:id AND uuid=:u
  LIMIT 1
");
$stmt->execute(['id'=>$sd,'u'=>$uuid]);
$doc = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$doc) exit('doc');

// 3) Récupérer les pairs via fetch_pairs.php
$url = "https://wanatest.com/app/fetch_pairs.php"
     . "?topic="     . urlencode($doc['topic'])
     . "&sub_topic=" . urlencode($doc['sub_topic'])
     . "&lang="      . urlencode($lang);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
]);
$response = curl_exec($ch);
$code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if ($response === false || $code < 200 || $code >= 300) {
    $err = curl_error($ch) ?: "HTTP $code";
    curl_close($ch);
    exit("fetch error: $err");
}
curl_close($ch);

$pairs = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE || empty($pairs)) {
    exit('OpenAI vide');
}

// 4) Lancement du Python via proc_open en mode stdin/stdout/stderr
$descriptors = [
    0 => ['pipe', 'r'], // stdin
    1 => ['pipe', 'w'], // stdout
    2 => ['pipe', 'w'], // stderr
];
$cmd = '/usr/bin/env python3 ' . escapeshellarg(__DIR__.'/generate_crossword.py');
$proc = proc_open($cmd, $descriptors, $pipes);

if (!is_resource($proc)) {
    exit('Erreur Python : impossible de lancer le processus');
}

// écrire les pairs en stdin
fwrite($pipes[0], json_encode($pairs, JSON_UNESCAPED_UNICODE));
fclose($pipes[0]);

// lire stdout / stderr
$stdout = stream_get_contents($pipes[1]); fclose($pipes[1]);
$stderr = stream_get_contents($pipes[2]); fclose($pipes[2]);

$return = proc_close($proc);

if ($return !== 0) {
    // afficher directement l’erreur Python
    exit("Erreur Python : " . trim($stderr));
}

// 5) Décoder la sortie Python
$data = json_decode($stdout, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    exit('Erreur Python : JSON invalide (' . json_last_error_msg() . ')');
}

// 6) Stockage en base (même SQL que précédemment)
$sql = "INSERT INTO documentCrossword
  (uuid, created_time, subject_document_id, subject, language,
   grid_json, across_json, down_json, openaiCost)
  VALUES
  (:u, NOW(), :sd, :s, :l, :g, :a, :d, 0.02)";
$params = [
  ':u'  => $uuid,
  ':sd' => $sd,
  ':s'  => $doc['topic'],
  ':l'  => $lang,
  ':g'  => json_encode($data['cells'],  JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
  ':a'  => json_encode($data['across'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
  ':d'  => json_encode($data['down'],   JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
];
$pdo->prepare($sql)->execute($params);

// 7) Redirection
header("Location: viewCrossword.php?subject_document_id=".$sd);
exit;
