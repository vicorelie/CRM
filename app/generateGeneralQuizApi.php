<?php
/****************  generateGeneralQuizAPI.php  *****************
 * mutualisé o2switch – lots de 5 + reconnexion MySQL
 ***************************************************************/

ignore_user_abort(true);
set_time_limit(0);
ini_set('memory_limit', '1024M');

require_once __DIR__.'/config.php';   // DSN, DB_USER, DB_PASS, $pdo, constantes
csrf_protect_post();

/* ---------- utilitaires ---------- */
function fixJsonQuotes(string $j): string
{
    return preg_replace_callback(
        '/"((?:\\\\.|[^"\\\\])*)"/u',
        fn($m)=>'"'.str_replace('"','\"',$m[1]).'"',
        $j
    );
}
function ensurePdo(PDO $pdo): PDO
{
    try{ $pdo->query('SELECT 1'); return $pdo; }
    catch(PDOException){
        global $dsn;
        return new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
        ]);
    }
}
function fetchOne(PDO $pdo,string $sql,array $p):?array{
    $s=$pdo->prepare($sql);$s->execute($p);return $s->fetch(PDO::FETCH_ASSOC)?:null;
}

/* ---------- 1. contrôles ---------- */
if(!isset($_SESSION['user_uuid'])) die('Erreur : connexion requise.');
$userUuid=$_SESSION['user_uuid'];
$subjectDocumentId=(int)($_POST['subject_document_id']??0);
if($subjectDocumentId<=0){header('Location: questionForm.php?generateQCMError=ID_du_document_manquant');exit;}
$quizLanguage=trim($_POST['quiz_language']??'he');
$quizLevel   =trim($_POST['quiz_level']??'moyen');
$numQuestions=max(1,(int)($_POST['quiz_number_of_questions']??5));

/* ---------- 2. lecture BDD ---------- */
$pdo=ensurePdo($pdo);

$doc=fetchOne($pdo,
    'SELECT study_subjects_id,topic,sub_topic
       FROM subjectDocuments
      WHERE id=:id AND uuid=:u LIMIT 1',
    [':id'=>$subjectDocumentId,':u'=>$userUuid]);
if(!$doc){header('Location: questionForm.php?generateQCMError=Document_non_trouvé&subject_document_id='.$subjectDocumentId);exit;}

$subject=fetchOne($pdo,
    'SELECT subject_name,subject_unit,course_name
       FROM studySubjects
      WHERE id=:sid AND uuid=:u LIMIT 1',
    [':sid'=>$doc['study_subjects_id'],':u'=>$userUuid]);
if(!$subject){header('Location: questionForm.php?generateQCMError=Matière_non_trouvée&subject_document_id='.$subjectDocumentId);exit;}

$curr=fetchOne($pdo,
    'SELECT * FROM studentCurriculum WHERE uuid=:u LIMIT 1',
    [':u'=>$userUuid]);
if(!$curr){header('Location: questionForm.php?generateQCMError=Curriculum_non_trouvé');exit;}

/* ---------- variables utiles ---------- */
$docTopic      = trim($doc['topic'] ?? '');
$docSubTopic   = trim($doc['sub_topic'] ?? '');
$subjectName   = trim($subject['subject_name'] ?? '');
$subjectUnit   = trim($subject['subject_unit'] ?? '');
$docCourseName = trim($subject['course_name'] ?? '');

/* ---------- 3. construction du prompt (version améliorée) ---------- */
if ($curr['student_type'] === 'school') {
    $student_country      = trim($curr['student_country']         ?? '');
    $student_school_class = trim($curr['student_school_class']    ?? '');
    $systemTemplate = <<<SYS
You are a highly sophisticated system designed to generate multiple-choice exams at the highest possible quality, taking into account and based on every piece of information provided to you. Your ultimate goal is to educate learners in Israel by producing professional-level exam questions that align precisely with the style and requirements of Israeli university exams.
Instructions:
1. Generate exactly "{$numQuestions}" questions exclusively on the subject "{$docTopic}" with subtopic "{$docSubTopic}".
2. Each question must be written at a "{$quizLevel}" difficulty level and wholly in "{$quizLanguage}".
3. For each question, provide 4 plausible options (A, B, C, D) with a single correct answer (field "correct").
4. Include a clear, detailed explanation (field "explanation") indicating the correct choice via the placeholder {correct}.
5. Do not invent information.
6. Cover different notions or themes of the subject.
7. Respect exactly the following JSON format:

[
  {
    "question": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correct": "",
    "explanation": "..."
  },
  ...
]

Difficulty & style rules:
- 25% questions: long questions + long answers.
- 25% questions: long questions + short answers.
- 25% questions: short questions + long answers.
- 25% questions: short questions + short answers.
8. Questions and answers must be complex, precise, and tailored to a student in class {$student_school_class} studying {$subjectName} (coefficient {$subjectUnit}), encouraging deep reflection.
9. Distribute the correct answer uniformly among A, B, C, and D.
10. Distractors must be very close to the correct answer, with subtle nuances to increase difficulty.
11. When referring to the subject or subtopic, provide context without inventing fictitious references; use only elements from the Israeli school curriculum.
12. Avoid redundancy; do not repeat the same idea in different wording.
13. Use technical language, comparative analysis, conceptual connections, and precise references to stimulate deep thinking.
14. Return only the JSON array, without any extra text.
SYS;
}
elseif ($curr['student_type'] === 'academic') {
    $student_country           = trim($curr['student_country']               ?? '');
    $student_academic_course   = ''; $student_academic_diploma = ''; $student_academic_year = '';
    for ($i = 1; $i <= 3; $i++) {
        if ($docCourseName === trim($curr["student_academic_course_$i"] ?? '')) {
            $student_academic_course   = $curr["student_academic_course_$i"];
            $student_academic_diploma  = $curr["student_academic_diploma_$i"];
            $student_academic_year     = $curr["student_academic_year_$i"];
            break;
        }
    }
    if (!$student_academic_course) {
        $student_academic_course = $docCourseName;
    }
    $systemTemplate = <<<SYS
You are a highly sophisticated system designed to generate multiple-choice exams at the highest possible quality, 
taking into account and based on every piece of information provided to you. 
Your ultimate goal is to educate university students in Israel by producing professional-level exam questions that align precisely with the style and requirements of Israeli higher-education exams.
Instructions:
1. Generate exactly "{$numQuestions}" questions exclusively on the subject "{$docTopic}" with subtopic "{$docSubTopic}".
2. Each question must be written at a "{$quizLevel}" difficulty level and wholly in "{$quizLanguage}".
3. For each question, provide 4 plausible options (A, B, C, D) with a single correct answer (field "correct").
4. Include a clear, detailed explanation (field "explanation") indicating the correct choice via the placeholder {correct}.
5. Do not invent information.
6. Cover different notions or themes of the subject.
7. Respect exactly the following JSON format:

[
  {
    "question": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correct": "",
    "explanation": "..."
  },
  ...
]

Difficulty & style rules:
- 25% questions: long questions + long answers.
- 25% questions: long questions + short answers.
- 25% questions: short questions + long answers.
- 25% questions: short questions + short answers.
8. Questions and answers must be complex, precise, and tailored to a {$student_academic_diploma} student in year {$student_academic_year}, encouraging deep reflection.
9. Distribute the correct answer uniformly among A, B, C, and D.
10. Distractors must be very close to the correct answer, with subtle nuances to increase difficulty.
11. When referring to the academic course or topic, provide context without inventing fictitious references; use only elements from the Israeli university program.
12. Avoid redundancy; do not repeat the same idea in different wording.
13. Use technical language, comparative analysis, conceptual connections, and precise references to stimulate deep thinking.
14. Return only the JSON array, without any extra text.
SYS;
}
else {
    $systemTemplate = 'Erreur : type d’étudiant non reconnu.';
}

/* ---------- 3-bis. questions ouvertes si demandé ---------- */
$openQuestions = $openAnswers = [];
if (!empty($_POST['include_open_questions'])) {
    $openCount = max(1, min(10, (int)($_POST['open_questions_count'] ?? 2)));

    $sys = "You generate university-style open-ended questions and model answers. ".
           "Return ONLY valid JSON with an array field named \"items\". No extra text.";
    $usr = "Topic: \"{$docTopic}\"".($docSubTopic ? " — Subtopic: \"{$docSubTopic}\"" : "")."\n".
           "Language: {$quizLanguage}\n".
           "Generate EXACTLY {$openCount} items. For each, return:\n".
           "{ \"question\": \"...\", \"answer\": \"...\" }\n\n".
           "JSON schema:\n".
           "{ \"items\": [ {\"question\":\"...\",\"answer\":\"...\"}, ... ] }";

    $payload = [
        'model'           => OPENAI_MODEL_QCM,
        'messages'        => [
            ['role'=>'system','content'=>$sys],
            ['role'=>'user',  'content'=>$usr],
        ],
        'response_format' => ['type'=>'json_object'],
        'temperature'     => 0.2,
        'max_tokens'      => 2000
    ];

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch,[
        CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_POST=>true,
        CURLOPT_HTTPHEADER=>[
            'Content-Type: application/json',
            'Authorization: Bearer '.OPENAI_API_KEY
        ],
        CURLOPT_POSTFIELDS=>json_encode($payload, JSON_UNESCAPED_UNICODE)
    ]);
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    $items = [];
    if ($raw !== false && !$err) {
        $data    = json_decode($raw, true);
        $content = $data['choices'][0]['message']['content'] ?? '{}';
        $json    = json_decode($content, true);
        if (!$json) {
            $content = preg_replace('/^```json\s*|\s*```$/i', '', trim($content));
            $json    = json_decode($content, true);
        }
        if (isset($json['items']) && is_array($json['items'])) {
            $items = $json['items'];
        }
    }

    foreach ($items as $it) {
        if (!empty($it['question']) && !empty($it['answer'])) {
            $openQuestions[] = trim($it['question']);
            $openAnswers[]   = trim($it['answer']);
        }
    }
}

/* ------------------------------------------------------------------
 *  4.   appels OpenAI en lots (inchangé)
 * -----------------------------------------------------------------*/
$batchSize=5;$allQcm=[];$openaiId='multi';
for($b=1;$b<=ceil($numQuestions/$batchSize);$b++){
    $need=min($batchSize,$numQuestions-count($allQcm));
    $systemPrompt=preg_replace('/"'.$numQuestions.'"/',"\"$need\"",$systemTemplate,1);

    $ok=false;
    for($t=1;$t<=3&&!$ok;$t++){
        $payload=['model'=>OPENAI_MODEL_QCM,'messages'=>[['role'=>'system','content'=>$systemPrompt]],
                  'temperature'=>0.4,'max_tokens'=>2000];
        if($t===1)$payload['response_format']=['type'=>'json_object'];

        $ch=curl_init('https://api.openai.com/v1/chat/completions');
        curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>1,CURLOPT_POST=>1,
            CURLOPT_HTTPHEADER=>['Content-Type: application/json','Authorization: Bearer '.OPENAI_API_KEY],
            CURLOPT_POSTFIELDS=>json_encode($payload)]);
        $raw=curl_exec($ch);$code=curl_getinfo($ch,CURLINFO_HTTP_CODE);$err=curl_error($ch);curl_close($ch);

        if($err||$code!==200){usleep(200000);continue;}
        $data=json_decode($raw,true);
        $content=preg_replace('/^```json\s*|```$/i','',trim($data['choices'][0]['message']['content']??''));
        $json=json_decode($content,true)??json_decode(fixJsonQuotes($content),true);
        if(!$json){usleep(150000);continue;}

        $openaiId=$data['id']??$openaiId;
        foreach(($json['questions']??$json) as $q){
            if(!isset($q['question']))continue;
            $opt=$q['options']??[];
            if(array_keys($opt)===range(0,count($opt)-1)){
                $letters=['A','B','C','D'];$tmp=[];
                foreach($opt as $i=>$v)$tmp[$letters[$i]??chr(65+$i)]=$v;$opt=$tmp;
            }
            $correct=$q['correct']??$q['correct_answer']??'';
            if(!$correct&&isset($q['correct_answer'])){
                foreach($opt as $l=>$v)if($v===$q['correct_answer'])$correct=$l;
            }
            $allQcm[]=['question'=>trim($q['question']),'options'=>$opt,'correct'=>$correct,
                       'explanation'=>$q['explanation']??''];
        }
        $ok=true;
    }
    if(!$ok)error_log("Lot $b ignoré (échec JSON)");
    usleep(250000);
}

/* ---------- 5. insertion DB ---------- */
if(!$allQcm){
    header('Location: questionForm.php?generateQCMError=aucune_question_valide&subject_document_id='.$subjectDocumentId);exit;
}
$pdo=ensurePdo($pdo);

try{
    $pdo->beginTransaction();
    $pdo->prepare('INSERT INTO documentQuestions
    (uuid,created_time,questions,answers,explanation,
     open_questions,open_answers,
     subject_document_id,aiCost,ai_id)
    VALUES (:u,NOW(),:q,:a,:e,
            :oq,:oa,
            :doc,0.02,:ai)')
->execute([
    ':u'=>$userUuid,
    ':q'=>json_encode(array_column($allQcm,'question'),JSON_UNESCAPED_UNICODE),
    ':a'=>json_encode($allQcm,JSON_UNESCAPED_UNICODE),
    ':e'=>json_encode(array_column($allQcm,'explanation'),JSON_UNESCAPED_UNICODE),
    ':oq'=>json_encode($openQuestions,JSON_UNESCAPED_UNICODE),
    ':oa'=>json_encode($openAnswers,  JSON_UNESCAPED_UNICODE),
    ':doc'=>$subjectDocumentId,
    ':ai'=>$openaiId
]);
    $pdo->commit();
}catch(PDOException $e){
    if($pdo->inTransaction())$pdo->rollBack();
    error_log('DB insert: '.$e->getMessage());
    header('Location: questionForm.php?generateQCMError=db_insert&subject_document_id='.$subjectDocumentId);exit;
}

/* ---------- 6. succès ---------- */
header('Location: questionForm.php?generateQCMSuccess=1&subject_document_id='.$subjectDocumentId);
exit;
