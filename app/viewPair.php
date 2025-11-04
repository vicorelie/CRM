<?php
// viewPair.php

session_start();
require 'config.php';
include 'includes/header.php';

if (!isset($_SESSION['user_uuid'])) {
    die("Erreur : Accès non autorisé. Veuillez vous connecter.");
}

// Vérifier que l'URL contient soit document_id, soit subject_document_id
$document_id = isset($_GET['document_id']) ? (int)$_GET['document_id'] : 0;
$subject_document_id = isset($_GET['subject_document_id']) ? (int)$_GET['subject_document_id'] : 0;

if ($document_id === 0 && $subject_document_id === 0) {
    die("Erreur : Aucun ID de document fourni.");
}

try {
    if ($document_id > 0) {
        // Récupérer les paires en fonction de document_id
        $stmt = $pdo->prepare("
            SELECT text_content 
            FROM documentPairs 
            WHERE document_id = :document_id
              AND uuid = :uuid
            ORDER BY created_time DESC
            LIMIT 1
        ");
        $stmt->execute([
            'document_id' => $document_id,
            'uuid'        => $_SESSION['user_uuid']
        ]);
    } else {
        // Récupérer les paires en fonction de subject_document_id
        $stmt = $pdo->prepare("
            SELECT text_content 
            FROM documentPairs 
            WHERE subject_document_id = :subject_document_id
              AND uuid = :uuid
            ORDER BY created_time DESC
            LIMIT 1
        ");
        $stmt->execute([
            'subject_document_id' => $subject_document_id,
            'uuid'                => $_SESSION['user_uuid']
        ]);
    }
    
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        die($lang_data['no_pairs_found'] ?? 'Aucune paire trouvée pour ce document.');
    }
} catch (PDOException $e) {
    die("Erreur lors de la récupération des paires : " . $e->getMessage());
}

$pairs = json_decode($row['text_content'], true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($pairs)) {
    die("Erreur : Format JSON invalide pour les paires.");
}

$cards = [];
$pairCounter = 1;
foreach ($pairs as $pair) {
    $pairId = "pair_" . $pairCounter;
    $cards[] = [
        'text'    => $pair['texte1'] ?? '',
        'pair_id' => $pairId
    ];
    $cards[] = [
        'text'    => $pair['texte2'] ?? '',
        'pair_id' => $pairId
    ];
    $pairCounter++;
}

shuffle($cards);
$totalPairs = count($cards) / 2;

// Déterminer l'URL de retour selon la provenance
if (isset($_SERVER['HTTP_REFERER']) && strpos($_SERVER['HTTP_REFERER'], 'studyList.php') !== false) {
    $backUrl = 'studyList.php';
} else {
    $backUrl = 'pairsList.php';
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= htmlspecialchars($lang_data['pairs_view_title'] ?? 'Vue des Paires') ?></title>
    <style>
        .pair-page-container {
            margin: 50px auto;
            max-width: 1200px;
            padding: 0 15px;
        }
        .pair-card {
            height: 160px;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 7px;
            background-color: #fff;
            border-top: 15px solid #0097b2;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: transform 0.3s, border-top-color 0.3s;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }
        .pair-card:hover {
            transform: scale(1.02);
        }
        .pair-card.selected {
            border-top-color: #19d1f1;
            border: 2px solid #19d1f1;
        }
        .pair-card.found {
            border-top-color: #2ecc71;
            border: 2px solid #2ecc71;
        }
        @keyframes correctAnim {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        @keyframes incorrectAnim {
            0% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            50% { transform: translateX(10px); }
            75% { transform: translateX(-10px); }
            100% { transform: translateX(0); }
        }
        .pair-card.correct {
            animation: correctAnim 0.7s forwards;
        }
        .pair-card.incorrect {
            animation: incorrectAnim 0.7s forwards;
        }
        .found-badge {
            position: absolute;
            top: 5px;
            right: 5px;
            background-color: #2ecc71;
            color: #fff;
            padding: 4px 6px;
            border-radius: 50%;
            font-size: 0.8rem;
            z-index: 10;
        }
        @media (max-width: 576px) {
            .found-badge {
                top: 1px;
                right: 1px;
                font-size: 0.7rem;
                padding: 2px 4px;
            }
        }
        .pair-card span {
            display: block;
            width: 100%;
            line-height: 1.2;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body>
<div class="container pair-page-container">
    <h1 class="text-center mb-5"><?= htmlspecialchars($lang_data['pairs_view_title'] ?? 'Vue des Paires') ?></h1>
    <div class="row g-4">
        <?php foreach ($cards as $card): ?>
            <div class="col-4 col-md-4 col-lg-3 d-flex">
                <div class="pair-card flex-fill" data-pair-id="<?= htmlspecialchars($card['pair_id']) ?>">
                    <span><?= $card['text'] ?></span>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>
<!-- Bouton de retour -->
<div class="text-center mt-4">
    <a href="<?= htmlspecialchars($backUrl) ?>" class="btn btn-primary">
        <i class="bi bi-arrow-left-circle me-2"></i>
        <?= $lang_data['back_to_summaryList'] ?? 'Back to summary list' ?>
    </a>
</div>
<script>
    const totalPairs = <?= $totalPairs ?>;
    let selectedCards = [];
    let foundPairCount = 0;
    const foundSymbol = "<?= $lang_data['pairs_found_symbol'] ?? '✓' ?>";

    const cards = document.querySelectorAll('.pair-card');
    cards.forEach(card => {
        card.addEventListener('click', onCardClick);
    });

    function onCardClick() {
        if (this.classList.contains('found')) return;

        if (selectedCards.includes(this)) {
            this.classList.remove('selected');
            selectedCards = selectedCards.filter(c => c !== this);
            return;
        }

        this.classList.add('selected');
        selectedCards.push(this);

        if (selectedCards.length === 2) {
            const pairId1 = selectedCards[0].getAttribute('data-pair-id');
            const pairId2 = selectedCards[1].getAttribute('data-pair-id');

            if (pairId1 === pairId2) {
                foundPairCount++;
                selectedCards.forEach(card => {
                    card.classList.add('correct');
                    card.classList.remove('selected');
                    card.classList.add('found');

                    const badge = document.createElement('div');
                    badge.classList.add('found-badge');
                    badge.innerText = foundSymbol + " " + foundPairCount;
                    card.appendChild(badge);

                    card.removeEventListener('click', onCardClick);
                });
                setTimeout(() => {
                    selectedCards.forEach(card => card.classList.remove('correct'));
                    selectedCards = [];
                    if (foundPairCount === totalPairs) {
                        Swal.fire({
                            title: "<?= addslashes($lang_data['swal_title'] ?? 'Félicitations !') ?>",
                            text: "<?= addslashes($lang_data['swal_text'] ?? 'Toutes les paires ont été trouvées.') ?>",
                            icon: "success",
                            confirmButtonColor: "#0097b2"
                        });
                    }
                }, 700);
            } else {
                selectedCards.forEach(card => card.classList.add('incorrect'));
                setTimeout(() => {
                    selectedCards.forEach(card => {
                        card.classList.remove('selected', 'incorrect');
                    });
                    selectedCards = [];
                }, 700);
            }
        }
    }

    function adjustCardTextSize() {
        cards.forEach(card => {
            const span = card.querySelector('span');
            span.style.fontSize = '1rem';
            while (span.scrollHeight > card.clientHeight - 10 && parseFloat(window.getComputedStyle(span).fontSize) > 10) {
                const currentSize = parseFloat(window.getComputedStyle(span).fontSize);
                span.style.fontSize = (currentSize - 1) + 'px';
            }
        });
    }
    window.addEventListener('load', adjustCardTextSize);
    window.addEventListener('resize', adjustCardTextSize);
</script>
<?php include 'includes/footer.php'; ?>
</body>
</html>
