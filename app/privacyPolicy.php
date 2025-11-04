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
    <title><?= htmlspecialchars($lang_data['privacy_title']) ?></title>
    
    <!-- Lien vers Font Awesome (ex: pour ajouter des icônes) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">

    <style>
        /* Personnalisation de la couleur principale #0097b2 */
        .bg-wana-gradient {
            /* Gradient principal autour du #0097b2 */
            background: linear-gradient(90deg, #0097b2 0%, #00b5cc 100%);
        }
        .text-wana-primary {
            color: #0097b2 !important;
        }
        .card-header-privacy {
            /* Couleur du header (texte blanc) + padding vertical */
            color: #fff;
            padding: 1.5rem;
            text-align: center;
        }
    </style>
</head>

<body>
<div class="container my-5">
    <div class="card border-0 shadow-lg rounded-4 overflow-hidden">
        <!-- Header de la card avec un dégradé bleu -->
        <div class="card-header-privacy bg-wana-gradient">
            <h1 class="h3 mb-0">
                <i class="fas fa-user-secret me-2"></i> 
                <?= htmlspecialchars($lang_data['privacy_title']) ?>
            </h1>
        </div>

        <!-- Corps de la card -->
        <div class="card-body p-5 bg-light">

            <!-- SECTION 1 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-circle-info me-2"></i>
                    <?= htmlspecialchars($lang_data['pp_section1_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['pp_section1_text'] ?>
                </p>
            </section>

            <!-- SECTION 2 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-database me-2"></i>
                    <?= htmlspecialchars($lang_data['pp_section2_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['pp_section2_text'] ?>
                </p>
            </section>

            <!-- SECTION 3 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-clipboard-list me-2"></i>
                    <?= htmlspecialchars($lang_data['pp_section3_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['pp_section3_text'] ?>
                </p>
            </section>

            <!-- SECTION 4 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-share me-2"></i>
                    <?= htmlspecialchars($lang_data['pp_section4_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['pp_section4_text'] ?>
                </p>
            </section>

            <!-- SECTION 5 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-shield-halved me-2"></i>
                    <?= htmlspecialchars($lang_data['pp_section5_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['pp_section5_text'] ?>
                </p>
            </section>

            <!-- SECTION 6 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-user-check me-2"></i>
                    <?= htmlspecialchars($lang_data['pp_section6_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['pp_section6_text'] ?>
                </p>
            </section>

            <!-- SECTION 7 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-cookie-bite me-2"></i>
                    <?= htmlspecialchars($lang_data['pp_section7_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['pp_section7_text'] ?>
                </p>
            </section>

            <!-- SECTION 8 -->
            <section class="mb-3">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-pencil-ruler me-2"></i>
                    <?= htmlspecialchars($lang_data['pp_section8_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['pp_section8_text'] ?>
                </p>
            </section>

        </div> <!-- /.card-body -->
    </div> <!-- /.card -->
</div> <!-- /.container -->

<!-- Inclure le footer -->
<?php include 'includes/footer.php'; ?>

</body>
</html>