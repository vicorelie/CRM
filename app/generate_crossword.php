<?php
// generate_crossword.php
require_once __DIR__.'/config.php';
requireSubscription($pdo);
csrf_protect_post();

// 1) Sécurité & params
$u    = $_SESSION['user_uuid'] ?? '';
$sd   = (int)($_POST['subject_document_id'] ?? 0);
$lang= trim($_POST['crossword_language'] ?? 'fr');
if (!$u || !$sd) exit('Paramètres manquants');

// 2) Sujet
$stmt = $pdo->prepare("
  SELECT topic, sub_topic
  FROM subjectDocuments
  WHERE id=:sd AND uuid=:u
  LIMIT 1
");
$stmt->execute([':sd'=>$sd,':u'=>$u]);
$doc = $stmt->fetch() ?: exit('Sujet introuvable');

// 3) fetch_pairs.php
$url = sprintf(
  'https://wanatest.com/app/fetch_pairs.php?topic=%s&sub_topic=%s&lang=%s',
  urlencode($doc['topic']), urlencode($doc['sub_topic']), urlencode($lang)
);
$resp = @file_get_contents($url);
if ($resp === false) exit('fetch error: network');
$pairs = json_decode($resp, true);
if (!is_array($pairs) || isset($pairs['error']) || count($pairs)<1) {
    exit('fetch error: '.($pairs['error'] ?? 'invalid data'));
}
$pairs = array_values($pairs);

// 4) Lancer Python
$descs = [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']];
$cmd   = 'python3 '.escapeshellarg(__DIR__.'/generate_crossword.py');
$proc  = proc_open($cmd, $descs, $pipes);
if (!is_resource($proc)) exit('Erreur Python');

// passer pairs en stdin
fwrite($pipes[0], json_encode($pairs, JSON_UNESCAPED_UNICODE));
fclose($pipes[0]);

$out = stream_get_contents($pipes[1]); fclose($pipes[1]);
$err = stream_get_contents($pipes[2]); fclose($pipes[2]);
$ret = proc_close($proc);
if ($ret!==0) exit('Erreur Python: '.$err);

$data = json_decode($out, true);
if (!isset($data['cells'],$data['across'],$data['down'])) {
    exit("Erreur Python: invalid output\n$out");
}

// 5) Stockage
$sql = "INSERT INTO documentCrossword
  (uuid,created_time,subject_document_id,subject,language,grid_json,across_json,down_json,openaiCost)
 VALUES (:u,NOW(),:sd,:s,:l,:g,:a,:d,0.02)";
$params = [
  ':u'=>$u,':sd'=>$sd,':s'=>$doc['topic'],':l'=>$lang,
  ':g'=>json_encode($data['cells'],  JSON_UNESCAPED_UNICODE),
  ':a'=>json_encode($data['across'], JSON_UNESCAPED_UNICODE),
  ':d'=>json_encode($data['down'],   JSON_UNESCAPED_UNICODE),
];
$pdo->prepare($sql)->execute($params);

// 6) Redirection
header('Location: viewCrossword.php?subject_document_id='.$sd);
exit;
