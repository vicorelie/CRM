<?php
/***************************************************************************
 *  generateGeneralCrosswordApi.php  –  robuste, sans doublons, retry DB
 ***************************************************************************/
ini_set('display_errors', 1);
error_reporting(E_ALL);
set_time_limit(240);             // 4 minutes maxi

require_once __DIR__ . '/config.php';
csrf_protect_post();
require_once __DIR__ . '/CrosswordGrid.php';

// ------------------- sécurité session ---------------------
if (!isset($_SESSION['user_uuid'])) {
    exit('login');
}
$uuid = $_SESSION['user_uuid'];

// ------------------- paramètres POST ---------------------
$sdId = (int)($_POST['subject_document_id'] ?? 0);
$lang = trim($_POST['crossword_language'] ?? 'fr');
if (!$sdId) {
    exit('param');
}
$rtl = in_array($lang, ['he','ar'], true);

// ------------------- récupérer le sujet -------------------
$stmt = $pdo->prepare("
    SELECT topic, sub_topic
    FROM   subjectDocuments
    WHERE  id = :id AND uuid = :u
    LIMIT 1
");
$stmt->execute(['id' => $sdId, 'u' => $uuid]);
$doc = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$doc) {
    exit('doc');
}

// ====================================================================
// fetchPairs() – 3 appels max, extrait jusqu’à 30 couples uniques
// Prompt serré, temp=0.2, fréquence_penalty=1.0 pour cohérence
// ====================================================================
function fetchPairs(string $topic, string $sub, string $lang, bool $rtl): array
{
    $clean = [];
    $seen  = [];
    $last  = '';

    for ($try = 0; $try < 3 && count($clean) < 30; $try++) {
        $dirNote = $rtl
            ? "Écris chaque mot de droite à gauche, sans voyelles ni harakāt."
            : "Les mots s’écrivent de gauche à droite.";

        $prompt = <<<PROMPT
Langue cible : {$lang}

Je veux un JSON strict de 30 objets {"word":"...","clue":"..."}  
TOUS liés au thème "{$topic}" {$sub}.  
1. "word" ≤ 12 lettres, sans espace ni ponctuation.  
2. "clue" ≤ 10 mots, ne contient jamais le mot.  
{$dirNote}

Réponds seulement par le tableau JSON, sans explications ni Markdown.
PROMPT;

        $payload = [
            'model'             => OPENAI_MODEL,
            'messages'          => [['role'=>'user','content'=>$prompt]],
            'temperature'       => 0.2,
            'max_tokens'        => 800,
            'frequency_penalty' => 1.0,
        ];
        $ctx = stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => [
                    'Content-Type: application/json',
                    'Authorization: Bearer '.OPENAI_API_KEY
                ],
                'content' => json_encode($payload),
                'timeout' => 60
            ]
        ]);
        $raw = @file_get_contents('https://api.openai.com/v1/chat/completions', false, $ctx);
        if (!$raw) {
            continue;
        }

        $j = json_decode($raw, true);
        $txt = trim($j['choices'][0]['message']['content'] ?? '');
        $last = $txt;

        // extraire JSON s'il est encadré
        if (preg_match('/```(?:json)?\s*(\[[\s\S]*?])\s*```/i', $txt, $m)) {
            $txt = $m[1];
        } elseif ($txt !== '' && $txt[0] !== '[' && preg_match('/\[[\s\S]*]/', $txt, $m)) {
            $txt = $m[0];
        }

        $arr = json_decode($txt, true) ?: [];
        foreach ($arr as $o) {
            if (empty($o['word']) || empty($o['clue'])) {
                continue;
            }
            $w = trim($o['word']);
            if (mb_strlen($w, 'UTF-8') > 12) {
                continue;
            }
            // filtre caractères selon sens
            $w = $rtl
                ? preg_replace('/[^א-תء-ي]/u','',$w)
                : preg_replace('/[^A-Za-z]/','',strtoupper($w));
            if ($w === '') {
                continue;
            }
            $rev = strrev($w);
            if (isset($seen[$w]) || isset($seen[$rev])) {
                continue;
            }
            $seen[$w] = true;
            $clean[]  = ['word'=>$w,'clue'=>trim($o['clue'])];
            if (count($clean) === 30) {
                break;
            }
        }
    }

    if (empty($clean)) {
        file_put_contents('/tmp/cw_openai_last.txt', $last);
    }

    return $clean;
}

// ------------------- récupérer les couples -------------------
$pairs = fetchPairs($doc['topic'], $doc['sub_topic'], $lang, $rtl);
if (empty($pairs)) {
    exit('OpenAI vide (voir /tmp/cw_openai_last.txt)');
}

// ================= backtracking 15→31 (min 10 mots) ==============
$sizes = [15,17,19,21,23,25,27,29,31];
$grid  = null;
foreach ($sizes as $sz) {
    $g = new CrosswordGrid($sz, $rtl);
    if ($g->build($pairs, 10) !== false) {
        $grid = $g;
        break;
    }
}

// ================ fallback horizontal si nécessaire ===============
if ($grid === null) {
    $gs      = 31;
    $cells   = array_fill(0, $gs, array_fill(0, $gs, null));
    $across  = [];
    $row     = 0;
    $num     = 1;

    foreach ($pairs as $p) {
        $w = $p['word'];
        $L = mb_strlen($w, 'UTF-8');
        if ($L > $gs || $row + $L > $gs) {
            continue;
        }
        for ($i = 0; $i < $L; $i++) {
            $cells[$row][$i] = mb_substr($w, $i, 1, 'UTF-8');
        }
        $across[] = [
            'num'     => $num++,
            'answer'  => $w,
            'clue'    => $p['clue'],
            'pattern' => '(' . $L . ')',
            'dir'     => 'across',
            'x'       => 0,
            'y'       => $row
        ];
        $row += 2;
        if (count($across) >= 8) {
            break;
        }
    }
    if (count($across) < 8) {
        // retenter quelques mots en plus
        $more = fetchPairs($doc['topic'], $doc['sub_topic'], $lang, $rtl);
        foreach ($more as $p) {
            if (count($across) >= 8) {
                break;
            }
            $w = $p['word'];
            $L = mb_strlen($w, 'UTF-8');
            if ($L > $gs || in_array($w, array_column($across, 'answer'), true)) {
                continue;
            }
            if ($row + $L > $gs) {
                break;
            }
            for ($i = 0; $i < $L; $i++) {
                $cells[$row][$i] = mb_substr($w, $i, 1, 'UTF-8');
            }
            $across[] = [
                'num'     => $num++,
                'answer'  => $w,
                'clue'    => $p['clue'],
                'pattern' => '(' . $L . ')',
                'dir'     => 'across',
                'x'       => 0,
                'y'       => $row
            ];
            $row += 2;
        }
    }
    if (count($across) < 8) {
        exit('Fallback insuffisant (<8 mots).');
    }
    $down = [];
    $cellsList = $cells;
} else {
    list($cellsList, $across, $down) = $grid->export();
}

// ============== stockage en base avec retry PDO ================
$flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
$sql = "INSERT INTO documentCrossword
    (uuid,created_time,subject_document_id,subject,language,
     grid_json,across_json,down_json,openaiCost)
 VALUES
    (:u,NOW(),:sd,:s,:l,:g,:a,:d,0.02)";
$params = [
    ':u'  => $uuid,
    ':sd' => $sdId,
    ':s'  => $doc['topic'],
    ':l'  => $lang,
    ':g'  => json_encode($cellsList, $flags),
    ':a'  => json_encode($across,    $flags),
    ':d'  => json_encode($down,      $flags),
];

$stmt = $pdo->prepare($sql);
try {
    $stmt->execute($params);
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Server has gone away') !== false) {
        require __DIR__ . '/config.php';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    } else {
        throw $e;
    }
}

// --------------- redirection finale ------------------
header('Location: viewCrossword.php?subject_document_id=' . $sdId);
exit;
