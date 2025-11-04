<?php
// downloadUploads.php
session_start();
require 'config.php';

// Vérifier que l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('HTTP/1.0 403 Forbidden');
    exit('Accès interdit');
}

// Vérifier que le paramètre "file" est fourni
if (!isset($_GET['file'])) {
    header('HTTP/1.0 400 Bad Request');
    exit('Fichier non spécifié');
}

$file = basename($_GET['file']); // Nettoyer pour éviter path traversal
$filePath = __DIR__ . '/uploads/' . $file;

if (!file_exists($filePath)) {
    header('HTTP/1.0 404 Not Found');
    exit('Fichier introuvable');
}

// (Optionnel) vérifier si l'utilisateur a le droit d'accéder à ce fichier
// ...

// Déterminer le type MIME
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $filePath);
finfo_close($finfo);

// Envoyer les en-têtes et servir le fichier
header('Content-Description: File Transfer');
header('Content-Type: ' . $mimeType);
header('Content-Disposition: inline; filename="' . $file . '"');
header('Content-Length: ' . filesize($filePath));
readfile($filePath);
exit();
?>
