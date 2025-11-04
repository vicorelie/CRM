<?php
// includes/langDetect.php

/**
 * Exporte la transcription dans un fichier temporaire,
 * appelle detectLang.py avec python3, puis lit le résultat.
 *
 * @param string $text Le texte à détecter.
 * @return string Le code langue détecté (fr, en, etc.) ou "inconnue".
 */
function detectTranscriptLanguage(string $text): string
{
    // 1) Crée un fichier temporaire
    $tmp = tempnam(sys_get_temp_dir(), 'trans_');
    if ($tmp === false) {
        return 'inconnue';
    }
    file_put_contents($tmp, $text);

    // 2) Chemin vers le script Python
    $script = __DIR__ . '/detectLang.py';

    // 3) Prépare la commande : forcer python3 + site.USER_SITE si besoin
    $cmd = escapeshellcmd("python3 {$script}") . ' ' . escapeshellarg($tmp);

    // 4) Exécution
    $output = null;
    $return = null;
    exec($cmd, $output, $return);

    // 5) Supprime le temporaire
    @unlink($tmp);

    // 6) Si erreur, renvoie "inconnue"
    if ($return !== 0 || !isset($output[0])) {
        return 'inconnue';
    }

    // 7) Sinon, c’est la première ligne de la sortie
    return trim($output[0]);
}
