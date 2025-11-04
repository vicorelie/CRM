<?php
/**
 * cleanLang2.php – version complète & sans doublons
 * 
 * Usage :
 *   php cleanLang2.php he.php            # crée he_clean.php à côté
 *   php cleanLang2.php he.php sortie.php # nom de sortie personnalisé
 */

if ($argc < 2) {
    fwrite(STDERR, "Usage: php cleanLang2.php <source> [cible]\n");
    exit(1);
}

$source = $argv[1];
$target = $argv[2] ?? dirname($source) . '/he_clean.php';

/* 1. on charge le fichier (il doit retourner $lang_data) */
$lang_data = [];
require $source;                  // remplit $lang_data depuis le fichier

if (!isset($lang_data) || !is_array($lang_data)) {
    fwrite(STDERR, "Erreur : « {$source} » ne définit pas \$lang_data.\n");
    exit(1);
}


/* 2. détection (facultative) des doublons pour information */
$raw   = file_get_contents($source);
$dupes = [];
if (preg_match_all("/'((?:\\\\'|[^'])*)'\\s*=>/u", $raw, $m)) {
    foreach ($m[1] as $k) {
        $dupes[$k] = ($dupes[$k] ?? 0) + 1;
    }
    $dupes = array_filter($dupes, fn($c) => $c > 1);
}

ksort($lang_data, SORT_STRING);               // tri alphabétique (optionnel)

/* 3. on exporte – ici en syntaxe courte [] pour plus de lisibilité */
function export_short($var, $indent = '') {
    switch (gettype($var)) {
        case 'array':
            $next = $indent . '    ';
            $out  = "[\n";
            foreach ($var as $k => $v) {
                $out .= $next . var_export($k, true) . ' => ' .
                        export_short($v, $next) . ",\n";
            }
            return $out . $indent . ']';
        default:
            return var_export($var, true);
    }
}

$export = "<?php\n// lang/he.php – VERSION NETTOYÉE ("
        . count($lang_data) . " clés)\n"
        . '$lang_data = ' . export_short($lang_data) . ";\n?>\n";

file_put_contents($target, $export);

echo "✅ Fichier nettoyé écrit dans « {$target} » (" .
     count($lang_data) . " clés uniques)\n";

if ($dupes) {
    echo "ℹ️  Clés dupliquées détectées :\n";
    foreach ($dupes as $k => $n) {
        echo "   - {$k} ({$n} occurrences)\n";
    }
}
?>
