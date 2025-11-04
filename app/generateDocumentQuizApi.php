<?php
/****************  generateDocumentQuizAPI.php  *****************
 *  QCM basés sur un document – lots de 5 + reconnexion MySQL
 *  + Questions ouvertes optionnelles avec choix du nombre
 ***************************************************************/

ignore_user_abort(true);
set_time_limit(0);
ini_set('memory_limit', '1024M');

require_once __DIR__ . '/config.php';     // DSN, DB_USER, DB_PASS, $pdo, constantes
csrf_protect_post();

/* ---------- utilitaires ---------- */
function fixJsonQuotes(string $j): string {
    return preg_replace_callback(
        '/"((?:\\\\.|[^"\\\\])*)"/u',
        fn($m) => '"' . str_replace('"','\"',$m[1]) . '"',
        $j
    );
}

function ensurePdo(PDO $pdo): PDO {
    try {
        $pdo->query('SELECT 1');
        return $pdo;
    } catch (PDOException) {
        global $dsn;
        return new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
}

function fetchOne(PDO $pdo, string $sql, array $p): ?array {
    $s = $pdo->prepare($sql);
    $s->execute($p);
    return $s->fetch(PDO::FETCH_ASSOC) ?: null;
}

/* ---------- 1. Contrôles ---------- */
if (!isset($_SESSION['user_uuid'])) {
    die('Erreur : connexion requise.');
}
$userUuid          = $_SESSION['user_uuid'];
$subjectDocumentId = (int)($_POST['subject_document_id'] ?? 0);
if ($subjectDocumentId <= 0) {
    header('Location: questionForm.php?generateQCMError=ID_du_document_manquant');
    exit;
}

$quizLanguage = trim($_POST['quiz_language'] ?? 'he');
$quizLevel    = trim($_POST['quiz_level']    ?? 'moyen');
$numQuestions = max(1, (int)($_POST['quiz_number_of_questions'] ?? 5));

/* Options questions ouvertes */
$wantOpenQuestions = !empty($_POST['include_open_questions']);
$openCount         = $wantOpenQuestions ? max(1, min(20, (int)($_POST['open_questions_count'] ?? 2))) : 0;

/* ---------- 2. Lecture BDD ---------- */
$pdo = ensurePdo($pdo);

$doc = fetchOne(
    $pdo,
    'SELECT study_subjects_id, topic, sub_topic, documents_id
       FROM subjectDocuments
      WHERE id = :id AND uuid = :u
      LIMIT 1',
    [':id' => $subjectDocumentId, ':u' => $userUuid]
);
if (!$doc) {
    header('Location: questionForm.php?generateQCMError=Document_non_trouvé&subject_document_id=' . $subjectDocumentId);
    exit;
}

$subject = fetchOne(
    $pdo,
    'SELECT subject_name, subject_unit, course_name
       FROM studySubjects
      WHERE id = :sid AND uuid = :u
      LIMIT 1',
    [':sid' => $doc['study_subjects_id'], ':u' => $userUuid]
);
if (!$subject) {
    header('Location: questionForm.php?generateQCMError=Matière_non_trouvée&subject_document_id=' . $subjectDocumentId);
    exit;
}

$curr = fetchOne(
    $pdo,
    'SELECT * FROM studentCurriculum WHERE uuid = :u LIMIT 1',
    [':u' => $userUuid]
);
if (!$curr) {
    header('Location: questionForm.php?generateQCMError=Curriculum_non_trouvé');
    exit;
}

/* ========== 0. Paramètres dynamiques (avant l’échantillonnage) ========== */
$nbQuestions   = $numQuestions;
const CHAR_PER_Q = 2500;   // ≃ 600 tokens GPT-4o / question
const HARD_TOP   = 12000;  // plafond absolu
const MIN_CHARS  = 1000;   // plancher

/* ---------- 3. Contenu du document : échantillonnage régulier + aléatoire ---------- */
$docTopic      = trim($doc['topic']        ?? '');
$docSubTopic   = trim($doc['sub_topic']    ?? '');
$documentsId   = (int)($doc['documents_id'] ?? 0);
$subjectName   = trim($subject['subject_name'] ?? '');
$subjectUnit   = trim($subject['subject_unit'] ?? '');
$docCourseName = trim($subject['course_name']  ?? '');

$plainText = '';

if ($documentsId) {
    /* 3-A. Récupération de l’extrait (JSON ou blob) + métriques */
    $row = fetchOne(
        $pdo,
        'SELECT extract_content, word_number, char_number
           FROM Documents
          WHERE id = :d AND uuid = :u
          LIMIT 1',
        [':d' => $documentsId, ':u' => $userUuid]
    );
    if (!$row) {
        header('Location: questionForm.php?generateQCMError=Document_content_non_trouvé&subject_document_id=' . $subjectDocumentId);
        exit;
    }

    /* 3-B. Limite dynamique de texte à envoyer */
    $docChars   = (int)($row['char_number'] ?? 0);
    $CHAR_LIMIT = min(
        HARD_TOP,                   // plafond global
        $nbQuestions * CHAR_PER_Q,  // proportionnel au nb de Q
        max(MIN_CHARS, $docChars)   // sans descendre sous MIN_CHARS
    );

    $segments = json_decode($row['extract_content'] ?? '', true);

    /* 3-C. Cas 1 : monobloc (non-JSON) */
    if (!is_array($segments)) {
        $plainText = mb_substr((string)$row['extract_content'], 0, $CHAR_LIMIT, 'UTF-8');
    }
    /* 3-D. Cas 2 : tableau de segments [{page,content}, …] */
    else {
        $totalSeg = count($segments);
        if ($totalSeg) {
            /* Calcul de la longueur moyenne */
            $avgLen = array_sum(
                array_map(fn($s) => mb_strlen($s['content'] ?? '', 'UTF-8'), $segments)
            ) / max(1, $totalSeg);
            $hardCap = max(1, (int)floor($CHAR_LIMIT / max(1, $avgLen)));

            /* A. Échantillonnage régulier (stratifié) */
            $step   = max(1, (int)floor($totalSeg / $hardCap));
            $picked = [];
            for ($i = 0; $i < $totalSeg && count($picked) < $hardCap; $i += $step) {
                $picked[] = $i;  // 0, step, 2×step…
            }

            /* B. Complément aléatoire (~ 30 %) */
            $extraNeed = (int)floor(count($picked) * 0.30);
            if ($extraNeed) {
                $rest = array_values(array_diff(range(0, $totalSeg - 1), $picked));
                if ($rest) {
                    $rnd = (array)array_rand($rest, min($extraNeed, count($rest)));
                    foreach ($rnd as $rk) {
                        $picked[] = $rest[$rk];
                    }
                }
            }

            /* C. Assemblage ordonné */
            sort($picked);
            foreach ($picked as $idx) {
                if (mb_strlen($plainText, 'UTF-8') >= $CHAR_LIMIT) {
                    break;
                }
                $chunk = trim($segments[$idx]['content'] ?? '');
                if (mb_strlen($chunk, 'UTF-8') < 30) {
                    continue;  // ignorer segments quasi vides
                }
                $plainText .= $chunk . "\n";
            }

            /* Tronquer une dernière fois si nécessaire */
            $plainText = mb_substr($plainText, 0, $CHAR_LIMIT, 'UTF-8');
        }
    }
}

/* Texte brut tronqué prêt à être injecté dans le prompt */
$safeContent = addslashes($plainText);

/* ---------- 3 bis. Découpage en sous-sections : (Q / 2) × 2 ---------- */
$bigCount = (int)ceil($nbQuestions / 2);        // ex : 7 Q → 4 grands blocs
$totalLen = mb_strlen($plainText, 'UTF-8');
$bigSize  = max(1, (int)ceil($totalLen / $bigCount));

$subSections = [];  // contiendra jusqu’à 2×$bigCount
for ($i = 0; $i < $bigCount; $i++) {
    $bigPart = trim(mb_substr($plainText, $i * $bigSize, $bigSize, 'UTF-8'));
    if ($bigPart === '') {
        continue;
    }
    $half = (int)ceil(mb_strlen($bigPart, 'UTF-8') / 2);
    $subA = trim(mb_substr($bigPart, 0,     $half, 'UTF-8'));
    $subB = trim(mb_substr($bigPart, $half, null,   'UTF-8'));

    if ($subA !== '') {
        $subSections[] = $subA;
    }
    if ($subB !== '') {
        $subSections[] = $subB;
    }
}

/* ---------- 4. Préparation du template du prompt ---------- */
$totalSections    = count($subSections);
$nextSectionIndex = 0;
$sectionsPerLot   = [];

$batchSize    = 5;
$totalBatches = (int)ceil($nbQuestions / $batchSize);

for ($b = 0; $b < $totalBatches; $b++) {
    $remainingQ    = $nbQuestions - $b * $batchSize;
    $needQuestions = min($batchSize, $remainingQ);
    $needSections  = (int)ceil($needQuestions / 2);

    $lotSections = array_slice($subSections, $nextSectionIndex, $needSections);
    $sectionsPerLot[$b] = $lotSections;
    $nextSectionIndex += count($lotSections);
}

$baseTemplateSchool = <<<SYS
You are a highly sophisticated system generating top‐quality multiple‐choice examinations for Israeli school learners.

Instructions :
1. The source material is divided into several sections below.
   • Generate **max 2 different questions per section**.
   • Stop once you have **exactly {NUMQ} different questions**.
2. Each question must be written at "{LEVEL}" difficulty and entirely in "{LANG}".
3. Provide 4 plausible options (A–D), indicate the correct one, and give a concise explanation.
4. Do **not** mix information between sections and do **not** invent facts.
5. Cover diverse notions of the topic; avoid redundancy.
6. **Do not** phrase any question as “based on the text/paragraph” or refer to “Section A” etc. Simply ask the question without pointing to a specific fragment.
7. Use the JSON format shown after the sections.

[SECTIONS]
### JSON OUTPUT FORMAT
[
  {
    "question": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correct": "",
    "explanation": "..."
  }
]

Difficulty & style rules :
- 25 % : long question + long answers  
- 25 % : long question + short answers  
- 25 % : short question + long answers  
- 25 % : short question + short answers  

8. Questions and answers must be challenging, accurate, and suitable for a student in class {CLASS}, encouraging deep reflection.
9. Distribute the correct option uniformly among A, B, C, D.
10. Distractors must be very close to the correct answer, with subtle nuances to increase difficulty.
11. When referring to the subject or subtopic, provide context without inventing fictitious references; use only elements from the Israeli school curriculum.
12. Avoid redundancy; do not repeat the same idea in different wording.
13. Use technical language, comparative analysis, conceptual connections, and precise references to stimulate deep thinking.
14. Return only the JSON array, without any extra text.
SYS;

$baseTemplateAcademic = <<<SYS
You are a highly sophisticated system generating university‐level multiple‐choice examinations for Israeli higher‐education learners.

Instructions :
1. The source material is divided into several sections below.
   • Generate **max 2 different questions per section**.
   • Stop once you have **exactly {NUMQ} different questions**.
2. Each question must be written at "{LEVEL}" difficulty and entirely in "{LANG}".
3. Provide 4 plausible options (A–D), indicate the correct one, and give a concise explanation.
4. Do **not** mix information between sections and do **not** invent facts.
5. Cover diverse notions of the academic course; avoid redundancy.
6. **Do not** phrase any question as “based on the text/paragraph” or refer to “Section A” etc. Simply ask the question without pointing to a specific fragment.
7. Use the JSON format shown after the sections.

[SECTIONS]
### JSON OUTPUT FORMAT
[
  {
    "question": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correct": "",
    "explanation": "..."
  }
]

Difficulty & style rules :
- 25 % : long question + long answers  
- 25 % : long question + short answers  
- 25 % : short question + long answers  
- 25 % : short question + short answers  

8. Questions and answers must be complex, precise, and tailored to a {DIPLOMA} student (year {YEAR}), encouraging deep reflection.
9. Distribute the correct answer uniformly among A, B, C, D.
10. Distractors must be very close to the correct answer, with subtle nuances to increase difficulty.
11. When referring to the academic course or topic, provide context without inventing fictitious references; use only elements from the Israeli university program.
12. Avoid redundancy; do not repeat the same idea in different wording.
13. Use technical language, comparative analysis, conceptual connections, and precise references to stimulate deep thinking.
14. Return only the JSON array, without any extra text.
SYS;

/* ---------- 5. Appels OpenAI en lots (QCM) ---------- */
$allQcm   = [];
$seenQs   = [];     // pour détection des doublons
$openaiId = 'multi';

for ($b = 0; $b < $totalBatches; $b++) {
    $need       = min($batchSize, $nbQuestions - count($allQcm));
    if ($need <= 0) {
        break; // plus aucune question à générer
    }

    // Construire le bloc [SECTIONS] pour ce lot
    $lotSections    = $sectionsPerLot[$b] ?? [];
    $sectionsTxtBat = '';
    foreach ($lotSections as $idxSec => $txtSec) {
        if ($idxSec < 26) {
            $labelSec = chr(65 + $idxSec); // A…Z
        } else {
            $labelSec = 'S' . ($idxSec + 1);
        }
        $escapedSec = addslashes($txtSec);
        $sectionsTxtBat .= "### SECTION {$labelSec}\n{$escapedSec}\n\n";
    }

    // Choisir le template selon student_type
    if ($curr['student_type'] === 'school') {
        $template = $baseTemplateSchool;
        $classCtx = trim($curr['student_school_class'] ?? '');
        $template = str_replace('{CLASS}', addslashes($classCtx), $template);
    } else {
        $template = $baseTemplateAcademic;
        $dip = ''; $yr = '';
        for ($i = 1; $i <= 3; $i++) {
            if (trim($docCourseName) === trim($curr["student_academic_course_{$i}"] ?? '')) {
                $dip = $curr["student_academic_diploma_{$i}"];
                $yr  = $curr["student_academic_year_{$i}"];
                break;
            }
        }
        if (!$dip) {
            $dip = addslashes($docCourseName);
        }
        $template = str_replace('{DIPLOMA}', addslashes($dip), $template);
        $template = str_replace('{YEAR}', addslashes($yr), $template);
    }

    // Insérer "{NUMQ}", "{LEVEL}", "{LANG}", et "[SECTIONS]" dans le prompt
    $systemPrompt = str_replace(
        ['{NUMQ}', '{LEVEL}', '{LANG}', '[SECTIONS]'],
        [$need, addslashes($quizLevel), addslashes($quizLanguage), $sectionsTxtBat],
        $template
    );

    $ok = false;
    for ($t = 1; $t <= 3 && !$ok; $t++) {
        $payload = [
            'model'       => OPENAI_MODEL_QCM,
            'messages'    => [['role' => 'system', 'content' => $systemPrompt]],
            'temperature' => 0.5,
            'max_tokens'  => 2000
        ];
        if ($t === 1) {
            $payload['response_format'] = ['type' => 'json_object'];
        }

        // appel cURL
        $ch = curl_init('https://api.openai.com/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_POST           => 1,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . OPENAI_API_KEY
            ],
            CURLOPT_POSTFIELDS     => json_encode($payload)
        ]);
        $raw  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($err || $code !== 200) {
            usleep(200000);
            continue;
        }
        $data = json_decode($raw, true);
        $content = preg_replace('/^```json\s*|```$/i', '', trim($data['choices'][0]['message']['content'] ?? ''));
        $json    = json_decode($content, true) ?? json_decode(fixJsonQuotes($content), true);
        if (!$json) {
            usleep(150000);
            continue;
        }

        $openaiId = $data['id'] ?? $openaiId;
        $list     = $json['questions'] ?? $json;
        foreach ($list as $q) {
            if (!isset($q['question'])) {
                continue;
            }
            $questionText = trim($q['question']);
            // Si cette question a déjà été vue, on l'ignore
            if (in_array($questionText, $seenQs, true)) {
                continue;
            }
            $opt = $q['options'] ?? [];
            // normaliser format options si array indexé
            if (array_keys($opt) === range(0, count($opt) - 1)) {
                $letters = ['A', 'B', 'C', 'D'];
                $tmp = [];
                foreach ($opt as $i => $v) {
                    $tmp[$letters[$i] ?? chr(65 + $i)] = $v;
                }
                $opt = $tmp;
            }
            $correct = $q['correct'] ?? $q['correct_answer'] ?? '';
            // si correct_answer est la valeur, trouver la lettre
            if (!$correct && isset($q['correct_answer'])) {
                foreach ($opt as $l => $v) {
                    if ($v === $q['correct_answer']) {
                        $correct = $l;
                        break;
                    }
                }
            }
            $allQcm[] = [
                'question'    => $questionText,
                'options'     => $opt,
                'correct'     => $correct,
                'explanation' => $q['explanation'] ?? ''
            ];
            $seenQs[] = $questionText;
            // Si on a atteint le nombre total de questions demandé, on peut arrêter
            if (count($allQcm) >= $numQuestions) {
                break 2; // quitte les deux boucles
            }
        }
        $ok = true;
    }

    if (!$ok) {
        error_log("Lot {$b} ignoré (échec JSON)");
    }
    usleep(250000);
}

/* ---------- 5bis. Génération des questions ouvertes (optionnel) ---------- */
$openQuestions = [];
$openAnswers   = [];

if ($wantOpenQuestions && $openCount > 0) {
    // Utiliser un extrait raisonnable (≤ 6000 chars) pour les questions ouvertes
    $contextForOpen = mb_substr($plainText, 0, 6000, 'UTF-8');

    $promptOpen = <<<SYS
You are an advanced educational system.

Create **exactly {$openCount} open-ended questions** strictly based on the following course material (no external facts). 
Each question must be written in "{$quizLanguage}" and be suitable for "{$quizLevel}" level.
After each question, provide a **model answer** of about 150–300 words in "{$quizLanguage}".

Rules:
- The question must stand on its own (do not mention "section", "paragraph", "according to the text", etc.)
- No invented facts; stick strictly to the provided material.
- Questions should cover different subtopics/aspects and avoid redundancy.
- Return **pure JSON** in the exact form below (no additional text).

Material:
---
{$contextForOpen}
---

JSON format to return:

[
  {"question":"...", "answer":"..."},
  {"question":"...", "answer":"..."}
]
SYS;

    $payload = [
        'model'       => OPENAI_MODEL_QCM,
        'messages'    => [['role' => 'system', 'content' => $promptOpen]],
        'temperature' => 0.4,
        'max_tokens'  => 2000
    ];

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch,[
        CURLOPT_RETURNTRANSFER=>1,
        CURLOPT_POST=>1,
        CURLOPT_HTTPHEADER=>[
            'Content-Type: application/json',
            'Authorization: Bearer '.OPENAI_API_KEY
        ],
        CURLOPT_POSTFIELDS=>json_encode($payload, JSON_UNESCAPED_UNICODE)
    ]);
    $raw = curl_exec($ch); curl_close($ch);

    $json    = json_decode($raw, true);
    $content = trim($json['choices'][0]['message']['content'] ?? '');
    $open    = json_decode($content, true);

    // robustesse sur la structure
    if (is_array($open)) {
        if (isset($open['questions']) && is_array($open['questions'])) {
            $open = $open['questions'];
        } elseif (isset($open['question'], $open['answer'])) {
            $open = [$open];
        }
    } else {
        $open = [];
    }

    foreach ($open as $q) {
        if (isset($q['question'], $q['answer'])) {
            $openQuestions[] = trim($q['question']);
            $openAnswers[]   = trim($q['answer']);
        }
    }

    // Tronquer au nombre demandé si besoin
    if (count($openQuestions) > $openCount) {
        $openQuestions = array_slice($openQuestions, 0, $openCount);
        $openAnswers   = array_slice($openAnswers,   0, $openCount);
    }
}

/* ---------- 6. Insertion DB ---------- */
if (!$allQcm) {
    header('Location: questionForm.php?generateQCMError=aucune_question_valide&subject_document_id=' . $subjectDocumentId);
    exit;
}

$pdo = ensurePdo($pdo);
try {
    $pdo->beginTransaction();
    $stmtIns = $pdo->prepare('
        INSERT INTO documentQuestions
            (uuid, created_time, questions, answers, explanation,
             open_questions, open_answers,
             subject_document_id, aiCost, ai_id)
        VALUES
            (:u, NOW(), :q, :a, :e,
             :oq, :oa,
             :doc, 0.02, :ai)
    ');
    // Ne garder que les premières $numQuestions (au cas où on en aurait récupéré un peu plus)
    $allQcmTrimmed   = array_slice($allQcm, 0, $numQuestions);
    $questionsArr    = array_column($allQcmTrimmed, 'question');
    $answersArr      = $allQcmTrimmed;
    $explanationsArr = array_column($allQcmTrimmed, 'explanation');

    $stmtIns->execute([
        ':u'   => $userUuid,
        ':q'   => json_encode($questionsArr,    JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP),
        ':a'   => json_encode($answersArr,      JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP),
        ':e'   => json_encode($explanationsArr, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP),
        ':oq'  => json_encode($openQuestions,   JSON_UNESCAPED_UNICODE),
        ':oa'  => json_encode($openAnswers,     JSON_UNESCAPED_UNICODE),
        ':doc' => $subjectDocumentId,
        ':ai'  => $openaiId
    ]);
    $pdo->commit();
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('DB insert: ' . $e->getMessage());
    header('Location: questionForm.php?generateQCMError=db_insert&subject_document_id=' . $subjectDocumentId);
    exit;
}

/* ---------- 7. Succès ---------- */
header('Location: questionForm.php?generateQCMSuccess=1&subject_document_id=' . $subjectDocumentId);
exit;
