<?php
// fetch_pairs.php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/config.php';
require __DIR__ . '/vendor/autoload.php';

use OpenAI\Client;

// 1) Clé API
if (!defined('OPENAI_API_KEY') || !OPENAI_API_KEY) {
    echo json_encode(['error'=>'Missing OPENAI_API_KEY']);
    exit;
}

// 2) Params
$topic = trim($_GET['topic']     ?? '');
$sub   = trim($_GET['sub_topic'] ?? '');
$lang  = trim($_GET['lang']      ?? 'fr');
$rtl   = in_array($lang, ['he','ar'], true);

// 3) Construire prompt SANS aucun backtick ni Markdown
$dirNote = $rtl
    ? "Écris chaque mot de droite à gauche, sans voyelles ni harakāt."
    : "Les mots s’écrivent de gauche à droite.";
$userPrompt = <<<P
Langue cible : {$lang}
Je veux exactement 20 paires JSON {"word":"...","clue":"..."}  
pour le thème "{$topic}" {$sub}.  
– "word" : 1 mot, MAJ, ≤ 12 lettres, sans espace ni ponc.  
– "clue" : ≤ 10 mots, ne contient pas le mot.  
{$dirNote}
Réponds **uniquement** par ces 20 objets JSON.
P;

// 4) Définir la fonction
$functions = [
    [
        'name'        => 'return_pairs',
        'description' => 'Renvoie les paires mot–définition',
        'parameters'  => [
            'type'       => 'object',
            'properties' => [
                'pairs' => [
                    'type'  => 'array',
                    'items' => [
                        'type'       => 'object',
                        'properties' => [
                            'word' => ['type'=>'string'],
                            'clue' => ['type'=>'string'],
                        ],
                        'required'   => ['word','clue'],
                    ],
                ],
            ],
            'required'   => ['pairs'],
        ],
    ],
];

try {
    $client = Client::create(OPENAI_API_KEY);
    $resp = $client->chat()->create([
        'model'            => OPENAI_MODEL,
        'messages'         => [['role'=>'user','content'=>$userPrompt]],
        'functions'        => $functions,
        'function_call'    => ['name'=>'return_pairs'],
        'temperature'      => 0.0,
        'frequency_penalty'=> 1.0,
        'max_tokens'       => 600,
    ]);

    $fc = $resp->choices[0]->message->function_call ?? null;
    if (!$fc || !isset($fc->arguments)) {
        throw new \Exception('No function call in response');
    }
    $args = json_decode($fc->arguments, true);
    if (json_last_error() !== JSON_ERROR_NONE || !isset($args['pairs']) || !is_array($args['pairs'])) {
        throw new \Exception('Invalid function arguments');
    }

    // 5) On renvoie directement le tableau de paires
    echo json_encode($args['pairs'], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    // En cas d’erreur, log et on renvoie un JSON d’erreur
    @file_put_contents(__DIR__.'/logs/fetch_pairs_error.log',
        date('c')." — ".$e->getMessage()."\n", FILE_APPEND);
    echo json_encode(['error'=>'OpenAI error','detail'=>$e->getMessage()]);
}
