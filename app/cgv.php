<?php
// cgv.php

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
    <title><?= htmlspecialchars($lang_data['cgv_title']) ?></title>

    <!-- Exemple d'icônes Font Awesome si vous le souhaitez -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">

    <style>
        /* Personnalisation de la couleur principale #0097b2 */
        .bg-wana-gradient {
            /* Dégradé incluant la couleur principale #0097b2 */
            background: linear-gradient(90deg, #0097b2 0%, #00b5cc 100%);
        }
        .text-wana-primary {
            color: #0097b2 !important;
        }
        .card-header-cgv {
            color: #fff;
            padding: 1.5rem;
            text-align: center;
        }
    </style>
</head>

<body>
<div class="container my-5">
    <div class="card border-0 shadow-lg rounded-4 overflow-hidden">
        <!-- En-tête de la card avec un dégradé autour de #0097b2 -->
        <div class="card-header-cgv bg-wana-gradient">
            <h1 class="h3 mb-0">
                <i class="fas fa-file-contract me-2"></i>
                <?= htmlspecialchars($lang_data['cgv_title']) ?>
            </h1>
        </div>

        <div class="card-body p-5 bg-light">
            <!-- SECTION 1 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-play me-2"></i>
                    <?= htmlspecialchars($lang_data['cgv_section1_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['cgv_section1_text'] ?>
                </p>
            </section>

            <!-- SECTION 2 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-tags me-2"></i>
                    <?= htmlspecialchars($lang_data['cgv_section2_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['cgv_section2_text'] ?>
                </p>
            </section>

            <!-- SECTION 3 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-user-plus me-2"></i>
                    <?= htmlspecialchars($lang_data['cgv_section3_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['cgv_section3_text'] ?>
                </p>
            </section>

            <!-- SECTION 4 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-chart-bar me-2"></i>
                    <?= htmlspecialchars($lang_data['cgv_section4_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['cgv_section4_text'] ?>
                </p>
            </section>

            <!-- SECTION 5 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-ban me-2"></i>
                    <?= htmlspecialchars($lang_data['cgv_section5_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['cgv_section5_text'] ?>
                </p>
            </section>

            <!-- SECTION 6 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-exchange-alt me-2"></i>
                    <?= htmlspecialchars($lang_data['cgv_section6_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['cgv_section6_text'] ?>
                </p>
            </section>

            <!-- SECTION 7 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-envelope-open-text me-2"></i>
                    <?= htmlspecialchars($lang_data['cgv_section7_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['cgv_section7_text'] ?>
                </p>
            </section>

            <!-- SECTION 8 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-comment-dots me-2"></i>
                    <?= htmlspecialchars($lang_data['cgv_section8_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['cgv_section8_text'] ?>
                </p>
            </section>

            <!-- SECTION 9 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-user-shield me-2"></i>
                    <?= htmlspecialchars($lang_data['cgv_section9_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['cgv_section9_text'] ?>
                </p>
            </section>

            <!-- SECTION 10 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-user-lock me-2"></i>
                    <?= htmlspecialchars($lang_data['cgv_section10_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['cgv_section10_text'] ?>
                </p>
            </section>

            <!-- SECTION 11 -->
            <section class="mb-5">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-gavel me-2"></i>
                    <?= htmlspecialchars($lang_data['cgv_section11_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['cgv_section11_text'] ?>
                </p>
            </section>

            <!-- SECTION 12 -->
            <section class="mb-3">
                <h2 class="h5 text-uppercase text-wana-primary fw-bold mb-3">
                    <i class="fas fa-pen-nib me-2"></i>
                    <?= htmlspecialchars($lang_data['cgv_section12_title']) ?>
                </h2>
                <p class="text-dark">
                    <?= $lang_data['cgv_section12_text'] ?>
                </p>
            </section>

        </div> <!-- /.card-body -->
    </div> <!-- /.card -->
</div> <!-- /.container -->

<!-- Inclure le footer -->
<?php include 'includes/footer.php'; ?>
</body>
</html>