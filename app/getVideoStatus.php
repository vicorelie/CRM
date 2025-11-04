// 4) getVideoStatus.php
<?php
session_start();
header('Content-Type: application/json; charset=UTF-8');
require __DIR__ . '/config.php';
if (!isset($_SESSION['user_uuid'])) {
    http_response_code(403);
    echo json_encode(['success'=>false,'error'=>'Non autorisé']);
    exit;
}
$jobId = $_GET['job_id'] ?? null;
$stmt = $pdo->prepare("SELECT id,mode,video_filename,audio_filename,status,error_message FROM video_jobs WHERE id=:id AND user_uuid=:u");
$stmt->execute([':id'=>$jobId,':u'=>$_SESSION['user_uuid']]);
$job = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$job) {
    http_response_code(404);
    echo json_encode(['success'=>false,'error'=>'Job introuvable']);
    exit;
}
echo json_encode(['success'=>true]+ $job);
exit;