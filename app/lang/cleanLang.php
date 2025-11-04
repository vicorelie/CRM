<?php
/**
 * cleanLang.php – supprime les clés en double dans un tableau $lang_data
 * Usage : php cleanLang.php he.php > he_clean.php
 */
if ($argc < 2) {
    fwrite(STDERR, "Usage: php cleanLang.php <chemin/vers/he.php>\n");
    exit(1);
}
$src = file_get_contents($argv[1]);
if ($src === false) {
    fwrite(STDERR, "Impossible de lire le fichier : {$argv[1]}\n");
    exit(1);
}

preg_match_all(
    "/'([^'\\\\]+|\\\\.)*'\\s*=>\\s*(?:'[^'\\\\]*'|\"(?:[^\"\\\\]|\\\\.)*\")\\s*,?/u",
    $src,
    $matches
);
$lang = [];
foreach ($matches[0] as $assignment) {
    //   'cle'   =>   'valeur',
    [$key, $value] = array_map('trim', explode('=>', $assignment, 2));
    $key   = trim($key,   " \t\n\r\0\x0B'\"");
    $value = rtrim(ltrim($value, " \t\n\r\0\x0B"), ',');
    // garde la **première** occurrence (changez en = $value pour garder la dernière)
    if (!isset($lang[$key])) {
        $lang[$key] = $value;
    }
}

ksort($lang, SORT_STRING);                 // tri alphabétique (facultatif)
echo "<?php\n// lang/he.php – VERSION NETTOYÉE\n\$lang_data = [\n";
foreach ($lang as $k => $v) {
    echo "    '{$k}' => {$v},\n";
}
echo "];\n?>";
