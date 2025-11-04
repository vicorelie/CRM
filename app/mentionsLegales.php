<?php
// mentions-legales.php

session_start();

// Inclure le header (qui doit normalement inclure Bootstrap CSS/JS)
include 'includes/header.php';

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}
?>

<!DOCTYPE html>
<html lang="<?= htmlspecialchars($lang) ?>">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($lang_data['mentions_legales_title']) ?></title>

    <!-- Exemples d'icônes Font Awesome si nécessaires -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">

    <style>
        /* Personnalisation de la couleur primaire (#0097b2) */
        .bg-wana-primary {
            background-color: #0097b2 !important;
        }
        .text-wana-primary {
            color: #0097b2 !important;
        }
        .bg-wana-gradient {
            /* Exemple de gradient personnalisé autour de #0097b2 */
            background: linear-gradient(90deg, #0097b2 0%, #00b5cc 100%);
        }
        .section-icon {
            width: 1em;
            height: 1em;
        }
    </style>
</head>
<body>

<div class="container my-5">
    <!-- Card principal avec design "fun" et moderne -->
    <div class="card border-0 shadow-lg rounded-4 overflow-hidden">
        
        <!-- En-tête de la card avec un effet gradient autour de la couleur #0097b2 -->
        <div class="card-header bg-wana-gradient text-white text-center py-4">
            <h1 class="h3 mb-0">
                <i class="fas fa-gavel me-2"></i>
                <?= htmlspecialchars($lang_data['mentions_legales_title']) ?>
            </h1>
        </div>
        
        <!-- Corps de la card -->
        <div class="card-body p-5 bg-light">
            
            <!-- SECTION 1 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-user-tie me-2"></i>
                    <?= htmlspecialchars($lang_data['ml_section1_title']) ?>
                </h2>
                <p class="text-dark"><?= $lang_data['ml_section1_text'] ?></p>
            </section>

            <!-- SECTION 2 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-server me-2"></i>
                    <?= htmlspecialchars($lang_data['ml_section2_title']) ?>
                </h2>
                <p class="text-dark"><?= $lang_data['ml_section2_text'] ?></p>
            </section>

            <!-- SECTION 3 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-user-shield me-2"></i>
                    <?= htmlspecialchars($lang_data['ml_section3_title']) ?>
                </h2>
                <p class="text-dark"><?= $lang_data['ml_section3_text'] ?></p>
            </section>

            <!-- SECTION 4 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-cookie-bite me-2"></i>
                    <?= htmlspecialchars($lang_data['ml_section4_title']) ?>
                </h2>
                <p class="text-dark"><?= $lang_data['ml_section4_text'] ?></p>
            </section>

            <!-- SECTION 5 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-lightbulb me-2"></i>
                    <?= htmlspecialchars($lang_data['ml_section5_title']) ?>
                </h2>
                <p class="text-dark"><?= $lang_data['ml_section5_text'] ?></p>
            </section>

            <!-- SECTION 6 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <?= htmlspecialchars($lang_data['ml_section6_title']) ?>
                </h2>
                <p class="text-dark"><?= $lang_data['ml_section6_text'] ?></p>
            </section>

            <!-- SECTION 7 -->
            <section class="mb-3">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-pen-fancy me-2"></i>
                    <?= htmlspecialchars($lang_data['ml_section7_title']) ?>
                </h2>
                <p class="text-dark"><?= $lang_data['ml_section7_text'] ?></p>
            </section>
        </div> <!-- /.card-body -->
    </div> <!-- /.card -->
</div> <!-- /.container -->

<!-- Inclure le footer -->
<?php include 'includes/footer.php'; ?>

</body>
</html>