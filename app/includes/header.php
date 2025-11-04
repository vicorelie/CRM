<?php
// includes/header.php
// Garantit que $dir existe toujours
if (!isset($dir)) {
    // Chemin relatif par défaut (répertoire parent) – ajustez si besoin.
    $dir = '../';
}

if (session_status() === PHP_SESSION_NONE) {
    session_start(); // Démarrer la session uniquement si aucune session active
}

// Définir la langue par défaut si elle n'est pas définie
if (!isset($_SESSION['lang'])) {
    $_SESSION['lang'] = 'he'; // Français par défaut
}

// Permettre le changement de langue via le paramètre GET
if (isset($_GET['lang']) && in_array($_GET['lang'], ['fr', 'en', 'he', 'ar', 'ru'])) {
    $_SESSION['lang'] = $_GET['lang'];

    // Inclure les paramètres actuels dans la redirection pour préserver l'URL
    $queryParams = $_GET;
    unset($queryParams['lang']); // Supprimer l'ancien paramètre de langue
    $redirectUrl = strtok($_SERVER['REQUEST_URI'], '?');
    if (!empty($queryParams)) {
        $redirectUrl .= '?' . http_build_query($queryParams);
    }

    header("Location: $redirectUrl");
    exit();
}

// Charger le fichier de langue
$lang = $_SESSION['lang'];
$lang_file = __DIR__ . "/../lang/{$lang}.php";
if (file_exists($lang_file)) {
    include $lang_file;
} else {
    die("Fichier de langue introuvable : $lang_file");
}
?>
<!DOCTYPE html>
<html lang="<?= $lang ?>" dir="<?= in_array($lang, ['he', 'ar']) ? 'rtl' : 'ltr' ?>">
<head>
    <meta charset="UTF-8">
    <title><?= isset($title) ? htmlspecialchars($title) : 'WANATEST' ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="assets/img/favicon.png">

    <?php if (in_array($lang, ['he', 'ar'])): ?>
        <!-- Bootstrap RTL CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
    <?php else: ?>
        <!-- Bootstrap LTR CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <?php endif; ?>
    
    <!-- Lien vers les icônes FontAwesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    
     <!-- Lien pour le font -->
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    
    <!-- Votre CSS personnalisé -->
    <link href="assets/css/style.css" rel="stylesheet">

    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-KPFSC7JR');</script>
    <!-- End Google Tag Manager -->
</head>
<body>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KPFSC7JR"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->

    <!-- Spinner de chargement (initialement visible au chargement) -->
    <div id="spinner" class="spinner">
        <div class="spinner-border" role="status">
            <span class="visually-hidden">Chargement...</span>
        </div>
            <p class="mt-3 fw-bold mb-0"><?= htmlspecialchars($lang_data['spinner-text'] ?? 'it may take a few minutes') ?></p>
    </div>



    <header>
        <nav class="navbar navbar-expand-lg navbar-custom">
            <div class="container-fluid">
                <!-- Logo -->
                <a class="navbar-brand d-flex align-items-center" href="dashboard.php">
                    <img src="assets/img/logo.png" alt="Logo" class="logo">
                </a>

                <!-- Icônes de profil et langue -->
                <div class="d-flex align-items-center order-lg-2">
                    <!-- Menu déroulant pour la langue -->
                    <div class="dropdown me-2">
                        <button class="btn dropdown-toggle p-0" type="button" id="dropdownLang" data-bs-toggle="dropdown" aria-expanded="false">
                            <img src="assets/img/flags/<?= $lang ?>.png" alt="<?= $lang ?>" class="flag-icon">
                        </button>
                        <ul class="dropdown-menu <?= $dir === 'rtl' ? 'dropdown-menu-start' : 'dropdown-menu-end' ?>" aria-labelledby="dropdownLang">
                            <?php foreach (['fr', 'en', 'he', 'ar', 'ru'] as $code): ?>
                                <li>
                                    <a class="dropdown-item" href="?<?= http_build_query(array_merge($_GET, ['lang' => $code])) ?>">
                                        <?= strtoupper($code) ?>
                                        <img src="assets/img/flags/<?= $code ?>.png" alt="<?= $code ?>" class="flag-icon">
                                    </a>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                        <ul class="dropdown-menu" aria-labelledby="dropdownLang">
                <?php foreach (['fr', 'en', 'he', 'ar', 'ru'] as $code): ?>
                    <li>
                        <a class="dropdown-item" href="?lang=<?= htmlspecialchars($code) ?>">
                            <img src="assets/img/flags/<?= htmlspecialchars($code) ?>.png" alt="<?= htmlspecialchars($code) ?>" class="flag-icon">
                            <?= strtoupper($code) ?>
                        </a>
                    </li>
                <?php endforeach; ?>
            </ul>
                    </div>

                    <!-- Icône de profil -->
                    <div class="dropdown">
                        <div class="profile-icon" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fas fa-user"></i>
                        </div>
                        <ul class="dropdown-menu <?= $dir === 'rtl' ? 'dropdown-menu-start' : 'dropdown-menu-end' ?>">
                            <li><a class="dropdown-item" href="profile.php"><?= $lang_data['profile'] ?></a></li>
                            <li><a class="dropdown-item" href="logout.php"><?= $lang_data['logout'] ?></a></li>
                        </ul>
                    </div>
                </div>

                <!-- Bouton pour mobile -->
                <button class="navbar-toggler order-lg-3 ms-2" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>

                <!-- Liens -->
                <div class="collapse navbar-collapse order-lg-1" id="navbarNav">
                    <ul class="navbar-nav">
                        <li class="nav-item"><a class="nav-link" href="dashboard.php"><?= $lang_data['dashboard'] ?></a></li>
                        <li class="nav-item"><a class="nav-link" href="studyList.php"><?= $lang_data['my_study_area'] ?></a></li>
                        <li class="nav-item"><a class="nav-link" href="quizList.php"><?= $lang_data['quiz'] ?></a></li>
                        <li class="nav-item"><a class="nav-link" href="summaryList.php"><?= $lang_data['summary'] ?></a></li>
                        <li class="nav-item"><a class="nav-link" href="pairsList.php"><?= $lang_data['pairs'] ?></a></li>
                        <li class="nav-item"><a class="nav-link" href="flashList.php"><?= $lang_data['flash'] ?></a></li>
                        <li class="nav-item"><a class="nav-link" href="missList.php"><?= $lang_data['miss'] ?></a></li>
                        <li class="nav-item"><a class="nav-link" href="trueFalseList.php"><?= $lang_data['truefalse'] ?></a></li>
                        <!-- <li class="nav-item"><a class="nav-link" href="examList.php"><?= $lang_data['exam-il'] ?></a></li> -->
                        <li class="nav-item"><a class="nav-link" href="statistics.php"><?= $lang_data['statistics'] ?></a></li>
                    </ul>
                </div>
            </div>
        </nav>
    </header>

    <!-- Script pour gérer l'affichage/masquage du spinner -->
    <script>
        document.addEventListener("DOMContentLoaded", function () {
            // 1) Masquer le spinner quand la page est entièrement chargée
            const spinner = document.getElementById('spinner');
            window.addEventListener('load', function () {
                spinner.style.display = 'none';
            });
        });
    </script>
</body>
</html>
