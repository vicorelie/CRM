<?php
// viewMiss.php

session_start();
require 'config.php';

// Détermination du sens d'écriture (RTL ou LTR)
$isRTL = in_array($_SESSION['lang'] ?? 'fr', ['ar', 'he', 'fa', 'ur']);

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}
include 'includes/header.php';

// Vérifier si l'URL contient document_id ou subject_document_id
if (isset($_GET['document_id'])) {
    $id = (int) $_GET['document_id'];
    // Requête pour récupérer les exercices à trous par document_id
    $stmt = $pdo->prepare("
        SELECT text_content 
        FROM documentMiss 
        WHERE document_id = :id AND uuid = :uuid
        ORDER BY created_time DESC
        LIMIT 1
    ");
    $stmt->execute([
        'id'   => $id,
        'uuid' => $_SESSION['user_uuid']
    ]);
} elseif (isset($_GET['subject_document_id'])) {
    $id = (int) $_GET['subject_document_id'];
    // Requête pour récupérer les exercices à trous par subject_document_id
    $stmt = $pdo->prepare("
        SELECT text_content 
        FROM documentMiss 
        WHERE subject_document_id = :id AND uuid = :uuid
        ORDER BY created_time DESC
        LIMIT 1
    ");
    $stmt->execute([
        'id'   => $id,
        'uuid' => $_SESSION['user_uuid']
    ]);
} else {
    die("Erreur : Document ID manquant.");
}

$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    die($lang_data['no_flashcards'] ?? "Aucun exercice à trous n'a été trouvé pour ce document.");
}

$missTexts = json_decode($row['text_content'], true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($missTexts)) {
    die($lang_data['error_invalid_json'] ?? "Erreur : Format JSON invalide pour les textes à trous.");
}
shuffle($missTexts);
// Déterminer l'URL de retour selon la provenance
if (isset($_SERVER['HTTP_REFERER']) && strpos($_SERVER['HTTP_REFERER'], 'studyList.php') !== false) {
    $backUrl = 'studyList.php';
} else {
    $backUrl = 'missList.php';
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>" dir="<?= $isRTL ? 'rtl' : 'ltr' ?>">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($lang_data['miss_view_title'] ?? 'Exercices à Trous') ?></title>
    <!-- Inclusion de Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .miss-container {
            margin: 50px auto;
            max-width: 800px;
            padding: 15px;
            text-align: center;
        }
        /* Style de la carte */
        .miss-card {
            border-top: 15px solid #0097b2;
            background-color: #fff;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            padding: 20px;
            margin: 50px auto 20px auto;
            position: relative;
            transition: border-color 0.3s;
            max-width: 600px;
            min-height: 400px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        .miss-card.correct {
            border-color: #2ecc71;
        }
        .miss-card.incorrect {
            border-color: #e74c3c;
        }
        .propositions {
            margin-top: 15px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
        }
        .proposition-btn {
            flex: 1 1 calc(50% - 10px);
            padding: 10px;
            background-color: #f0f0f0;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
            text-align: center;
            transition: background-color 0.3s;
        }
        .proposition-btn:hover {
            background-color: #ddd;
        }
        /* Navigation avec flèches */
        .navigation-buttons {
            display: flex;
            justify-content: center;
            gap: 50px;
            margin-top: 20px;
        }
        .arrow-btn {
            background: none;
            border: none;
            font-size: 3em;
            color: #0097b2;
            cursor: pointer;
            outline: none;
        }
        .arrow-btn:hover {
            color: #007a91;
        }
        /* Animations pour la transition entre les cartes */
        @keyframes slideOutLeft {
            0% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(-100%); opacity: 0; }
        }
        @keyframes slideInRight {
            0% { transform: translateX(100%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            0% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes slideInLeft {
            0% { transform: translateX(-100%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
        }
        .slide-out-left {
            animation: slideOutLeft 0.5s forwards;
        }
        .slide-in-right {
            animation: slideInRight 0.5s forwards;
        }
        .slide-out-right {
            animation: slideOutRight 0.5s forwards;
        }
        .slide-in-left {
            animation: slideInLeft 0.5s forwards;
        }
    </style>
</head>
<body>
<div class="container miss-container">
    <h1><?= htmlspecialchars($lang_data['miss_view_title'] ?? 'Exercices à Trous') ?></h1>
    <!-- Conteneur de la carte -->
    <div id="miss-card-display" class="miss-card"></div>
    <!-- Navigation avec flèches -->
    <div class="navigation-buttons">
        <button id="prev-btn" class="arrow-btn">
            <?= $isRTL ? '<i class="fa-solid fa-caret-right"></i>' : '<i class="fa-solid fa-caret-left"></i>' ?>
        </button>
        <button id="next-btn" class="arrow-btn">
            <?= $isRTL ? '<i class="fa-solid fa-caret-left"></i>' : '<i class="fa-solid fa-caret-right"></i>' ?>
        </button>
    </div>
</div>
<!-- Bouton pour retourner à la liste -->
<div class="text-center mt-4">
    <a href="<?= $backUrl ?>" class="btn btn-primary">
        <i class="bi bi-arrow-left-circle me-2"></i>
        <?= $lang_data['back_to_summaryList'] ?? 'Back to summary list' ?>
    </a>
</div>
<script>
    // Fonction de mélange (Fisher-Yates)
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Les exercices à trous récupérés depuis PHP
    const missTexts = <?php echo json_encode($missTexts); ?>;
    let currentIndex = 0;
    let isAnimating = false;
    const isRTL = <?php echo $isRTL ? 'true' : 'false'; ?>;

    function displayMiss(index) {
        const container = document.getElementById('miss-card-display');
        container.innerHTML = ''; // Vider le contenu
        container.classList.remove('correct', 'incorrect'); // Réinitialiser la bordure

        const exercise = missTexts[index];

        // Création du paragraphe contenant le texte complet (avec le placeholder "___")
        const textPara = document.createElement('p');
        textPara.style.fontSize = "1.2rem";
        textPara.style.margin = "0 0 15px 0";
        textPara.innerText = exercise.texte_complet;
        container.appendChild(textPara);

        // Préparer les propositions
        let props = exercise.propositions.map((prop, idx) => ({
            text: prop,
            isCorrect: idx === exercise.correct_index
        }));
        shuffle(props);

        // Création du conteneur pour les propositions
        const propsDiv = document.createElement('div');
        propsDiv.classList.add('propositions');

        props.forEach(item => {
            const btn = document.createElement('div');
            btn.classList.add('proposition-btn');
            btn.innerText = item.text;
            btn.addEventListener('click', function() {
                if (item.isCorrect) {
                    // Remplacer le placeholder ___ par la bonne réponse
                    textPara.innerText = exercise.texte_complet.replace('___', item.text);
                    container.classList.add('correct');
                } else {
                    container.classList.add('incorrect');
                    setTimeout(() => {
                        container.classList.remove('incorrect');
                    }, 1000);
                }
            });
            propsDiv.appendChild(btn);
        });
        container.appendChild(propsDiv);
    }

    function animateCardTransition(slideOutClass, slideInClass, newIndex) {
        if (isAnimating) return;
        isAnimating = true;
        const cardDisplay = document.getElementById('miss-card-display');
        cardDisplay.classList.add(slideOutClass);
        cardDisplay.addEventListener('animationend', function handler() {
            cardDisplay.removeEventListener('animationend', handler);
            currentIndex = newIndex;
            displayMiss(currentIndex);
            cardDisplay.classList.remove(slideOutClass);
            cardDisplay.classList.add(slideInClass);
            cardDisplay.addEventListener('animationend', function handler2() {
                cardDisplay.removeEventListener('animationend', handler2);
                cardDisplay.classList.remove(slideInClass);
                isAnimating = false;
            });
        });
    }

    // Afficher le premier exercice
    displayMiss(currentIndex);

    // Navigation "Suivant"
    document.getElementById('next-btn').addEventListener('click', function() {
        if (missTexts.length > 0 && !isAnimating) {
            let newIndex = (currentIndex + 1) % missTexts.length;
            if (isRTL) {
                animateCardTransition("slide-out-right", "slide-in-left", newIndex);
            } else {
                animateCardTransition("slide-out-left", "slide-in-right", newIndex);
            }
        }
    });

    // Navigation "Précédent"
    document.getElementById('prev-btn').addEventListener('click', function() {
        if (missTexts.length > 0 && !isAnimating) {
            let newIndex = (currentIndex - 1 + missTexts.length) % missTexts.length;
            if (isRTL) {
                animateCardTransition("slide-out-left", "slide-in-right", newIndex);
            } else {
                animateCardTransition("slide-out-right", "slide-in-left", newIndex);
            }
        }
    });
</script>
<?php include 'includes/footer.php'; ?>
</body>
</html>
