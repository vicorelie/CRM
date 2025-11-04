<?php
// index.php

require 'config.php';
require_once 'vendor/autoload.php';

// Démarrer la session si ce n'est pas déjà fait
if (session_status() == PHP_SESSION_NONE) {
    session_start();
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
    unset($queryParams['lang']);
    $redirectUrl = strtok($_SERVER['REQUEST_URI'], '?');
    if (!empty($queryParams)) {
        $redirectUrl .= '?' . http_build_query($queryParams);
    }
    header("Location: $redirectUrl");
    exit();
}

// Charger le fichier de langue
$lang = $_SESSION['lang'];
$lang_file = __DIR__ . "/lang/{$lang}.php";
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= isset($title) ? htmlspecialchars($title) : 'WANATEST' ?></title>
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="assets/img/favicon.png">
    <?php if (in_array($lang, ['rtl'])): ?>
        <!-- Bootstrap RTL CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
    <?php else: ?>
        <!-- Bootstrap LTR CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <?php endif; ?>
    
    <!-- FontAwesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    
    <!-- Google Font -->
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet">

    <!-- Votre CSS personnalisé -->
    <link href="assets/css/one-page-style.css" rel="stylesheet">
</head>
<body>
    <!-- Spinner de chargement -->
    <div id="spinner" class="spinner">
        <div class="spinner-border" role="status">
            <span class="visually-hidden">Chargement...</span>
        </div>
    </div>
    
    <header>
        <nav class="navbar navbar-expand-lg navbar-custom">
            <div class="container-fluid">
                <!-- Logo -->
                <a class="navbar-brand d-flex align-items-center" href="index.php">
                    <img src="assets/img/logo.svg" alt="Logo" class="logo">
                </a>
                <!-- Icônes de profil et langue -->
                <div class="d-flex align-items-center order-lg-2">
                    <div class="dropdown">
                        <div class="profile-icon" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fas fa-user"></i>
                        </div>
                        <ul class="dropdown-menu <?= in_array($lang, ['he', 'ar']) ? 'dropdown-menu-start' : 'dropdown-menu-end' ?>">
                            <li><a class="dropdown-item" href="login.php"><?= $lang_data['login'] ?></a></li>
                            <li><a class="dropdown-item" href="register.php"><?= $lang_data['register'] ?></a></li>
                        </ul>
                    </div>
                    <div class="dropdown me-2">
                        <button class="btn dropdown-toggle p-0" type="button" id="dropdownLang" data-bs-toggle="dropdown" aria-expanded="false">
                            <img src="assets/img/flags/<?= $lang ?>.png" alt="<?= $lang ?>" class="flag-icon">
                        </button>
                        <ul class="dropdown-menu <?= in_array($lang, ['he', 'ar']) ? 'dropdown-menu-start' : 'dropdown-menu-end' ?>" aria-labelledby="dropdownLang">
                            <?php foreach (['fr', 'en', 'he', 'ar', 'ru'] as $code): ?>
                                <li>
                                    <a class="dropdown-item" href="?<?= http_build_query(array_merge($_GET, ['lang' => $code])) ?>">
                                        <img src="assets/img/flags/<?= $code ?>.png" alt="<?= $code ?>" class="flag-icon">
                                    </a>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                </div>
                <!-- Bouton mobile -->
                <button class="navbar-toggler order-lg-3 ms-2" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                        aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <!-- Liens -->
                <div class="collapse navbar-collapse order-lg-1" id="navbarNav">
                    <ul class="navbar-nav">
                        <li class="nav-item"><a class="nav-link" href="#quizz"><?= $lang_data['quiz'] ?></a></li>
                        <li class="nav-item"><a class="nav-link" href="#summary"><?= $lang_data['summary'] ?></a></li>
                        <li class="nav-item"><a class="nav-link" href="#pairs"><?= $lang_data['pairs'] ?></a></li>
                        <li class="nav-item"><a class="nav-link" href="#flash"><?= $lang_data['flash'] ?></a></li>
                        <li class="nav-item"><a class="nav-link" href="#miss"><?= $lang_data['miss'] ?></a></li>
                        <li class="nav-item"><a class="nav-link" href="#statistics"><?= $lang_data['statistics'] ?></a></li>
                        <li class="nav-item"><a class="nav-link" href="#exams"><?= $lang_data['exams'] ?></a></li>
                    </ul>
                </div>
            </div>
        </nav>
    </header>
    
    <!-- Script pour le spinner -->
    <script>
        document.addEventListener("DOMContentLoaded", function () {
            const spinner = document.getElementById('spinner');
            window.addEventListener('load', function () {
                spinner.style.display = 'none';
            });
        });
    </script>
    
    <!-- Loader -->
    <div id="homeloader">
        <img src="assets/img/logo.svg" alt="Logo">
    </div>
    
    <!-- Hero Desktop -->
    <div class="hero desktop-only" 
         style="background: url('assets/img/<?= ($_SESSION['lang'] === 'he' || $_SESSION['lang'] === 'ar') ? 'home-first-section-background-inverse.png' : 'home-first-section-background.png' ?>') center/cover no-repeat;">
        <div class="hero-content">
            <h1><?= $lang_data['hero_title'] ?></h1>
            <p><?= $lang_data['hero_description'] ?></p>
            <ul>
                <?php foreach ($lang_data['hero_points'] as $point): ?>
                    <li><?= $point ?></li>
                <?php endforeach; ?>
            </ul>
            <button onclick="window.location.href='documentsList.php'"><?= $lang_data['start_now'] ?></button>
        </div>
    </div>
    
    <!-- Hero Mobile/Tablet -->
    <div class="hero mobile-tablet-only" 
         style="background: url('assets/img/home-first-section-responsive.png') center/cover no-repeat;">
        <div class="hero-content">
            <h1><?= $lang_data['hero_title'] ?></h1>
            <p><?= $lang_data['hero_description'] ?></p>
            <img src="assets/img/home-first-section.png" alt="home Image">
            <button onclick="window.location.href='documentsList.php'"><?= $lang_data['start_now'] ?></button>
        </div>
    </div>
    
    <!-- =================== SECTIONS VIDEO ALTERNÉES =================== -->
    
    <!-- Section 2 (Quizz) : Vidéo à gauche, Texte à droite -->
    <div id="quizz" class="homepage-section quizz-section video-section-added video-left">
      <div class="container">
        <div class="row">
          <h1><?= $lang_data['quiz_section_title'] ?></h1>
          <!-- Colonne vidéo -->
          <div class="col-md-6 col-video d-flex justify-content-center mb-4 mb-md-0">
            <!-- Attribut data-video défini sur le chemin de la vidéo quiz -->
            <div class="video-overlay-container" data-bs-toggle="modal" data-bs-target="#myVideoModal" data-video="assets/video/quiz.mp4">
              <img src="assets/img/home-quizz-section.png" alt="Quizz Image" class="video-image">
              <div class="play-icon">
                <i class="fas fa-play play-icon"></i>
              </div>
            </div>
          </div>
          <!-- Colonne texte -->
          <div class="col-md-6 col-text text-white">
            <h2 class="text-white"><?= $lang_data['quiz_section_subtitle'] ?></h2>
            <p><?= $lang_data['quiz_section_description'] ?></p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Section 3 (Summary) : Vidéo à droite, Texte à gauche -->
    <div id="summary" class="homepage-section summary-section video-section-added video-right">
      <div class="container">
        <div class="row">
          <h1><?= $lang_data['summary_section_title'] ?></h1>
          <!-- Colonne texte -->
          <div class="col-md-6 col-text">
            <h2><?= $lang_data['summary_section_subtitle'] ?></h2>
            <p><?= $lang_data['summary_section_description'] ?></p>
          </div>
          <!-- Colonne vidéo -->
          <div class="col-md-6 col-video d-flex justify-content-center mb-4 mb-md-0">
            <!-- Attribut data-video défini sur le chemin de la vidéo summary -->
            <div class="video-overlay-container" data-bs-toggle="modal" data-bs-target="#myVideoModal" data-video="assets/video/summary.mp4">
              <img src="assets/img/home-summary-section.png" alt="Summary Image" class="video-image">
              <div class="play-icon">
                <i class="fas fa-play play-icon"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Section 4 (pairs) : Vidéo à gauche, Texte à droite -->
    <div id="pairs" class="homepage-section pairs-section video-section-added video-left">
      <div class="container">
        <div class="row">
          <h1><?= $lang_data['pairs_section_title'] ?></h1>
          <!-- Colonne vidéo -->
          <div class="col-md-6 col-video d-flex justify-content-center mb-4 mb-md-0">
            <!-- Attribut data-video défini sur le chemin de la vidéo quiz -->
            <div class="video-overlay-container" data-bs-toggle="modal" data-bs-target="#myVideoModal" data-video="assets/video/quiz.mp4">
              <img src="assets/img/home-pairs-section.png" alt="Pairs Image" class="video-image">
              <div class="play-icon">
                <i class="fas fa-play play-icon"></i>
              </div>
            </div>
          </div>
          <!-- Colonne texte -->
          <div class="col-md-6 col-text text-white">
            <h2 class="text-white"><?= $lang_data['pairs_section_subtitle'] ?></h2>
            <p><?= $lang_data['pairs_section_description'] ?></p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Section 5 (flash) : Vidéo à droite, Texte à gauche -->
    <div id="flash" class="homepage-section flash-section video-section-added video-right">
      <div class="container">
        <div class="row">
          <h1><?= $lang_data['flash_section_title'] ?></h1>
          <!-- Colonne texte -->
          <div class="col-md-6 col-text">
            <h2><?= $lang_data['flash_section_subtitle'] ?></h2>
            <p><?= $lang_data['flash_section_description'] ?></p>
          </div>
          <!-- Colonne vidéo -->
          <div class="col-md-6 col-video d-flex justify-content-center mb-4 mb-md-0">
            <!-- Attribut data-video défini sur le chemin de la vidéo summary -->
            <div class="video-overlay-container" data-bs-toggle="modal" data-bs-target="#myVideoModal" data-video="assets/video/summary.mp4">
              <img src="assets/img/home-flash-section.png" alt="Flash Image" class="video-image">
              <div class="play-icon">
                <i class="fas fa-play play-icon"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 6 (miss) : Vidéo à gauche, Texte à droite -->
    <div id="miss" class="homepage-section miss-section video-section-added video-left">
      <div class="container">
        <div class="row">
          <h1><?= $lang_data['miss_section_title'] ?></h1>
          <!-- Colonne vidéo -->
          <div class="col-md-6 col-video d-flex justify-content-center mb-4 mb-md-0">
            <!-- Attribut data-video défini sur le chemin de la vidéo quiz -->
            <div class="video-overlay-container" data-bs-toggle="modal" data-bs-target="#myVideoModal" data-video="assets/video/quiz.mp4">
              <img src="assets/img/home-miss-section.png" alt="Miss Image" class="video-image">
              <div class="play-icon">
                <i class="fas fa-play play-icon"></i>
              </div>
            </div>
          </div>
          <!-- Colonne texte -->
          <div class="col-md-6 col-text text-white">
            <h2 class="text-white"><?= $lang_data['miss_section_subtitle'] ?></h2>
            <p><?= $lang_data['miss_section_description'] ?></p>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 7 (Statistics) : Vidéo à droite, Texte à gauche -->
    <div id="statistics" class="homepage-section statistics-section video-section-added video-right">
      <div class="container">
        <div class="row">
          <h1><?= $lang_data['statistics_section_title'] ?></h1>
          <!-- Colonne texte -->
          <div class="col-md-6 col-text">
            <h2><?= $lang_data['statistics_section_subtitle'] ?></h2>
            <p><?= $lang_data['statistics_section_description'] ?></p>
          </div>
          <!-- Colonne vidéo -->
          <div class="col-md-6 col-video d-flex justify-content-center mb-4 mb-md-0">
            <!-- Attribut data-video défini sur le chemin de la vidéo summary -->
            <div class="video-overlay-container" data-bs-toggle="modal" data-bs-target="#myVideoModal" data-video="assets/video/summary.mp4">
              <img src="assets/img/home-statistics-section.png" alt="Statistics Image" class="video-image">
              <div class="play-icon">
                <i class="fas fa-play play-icon"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Section 8 (Exams) : Vidéo à gauche, Texte à droite -->
    <div id="exams" class="homepage-section exams-section video-section-added video-left">
      <div class="container">
        <div class="row">
          <h1><?= $lang_data['exams_section_title'] ?></h1>
          <!-- Colonne vidéo -->
          <div class="col-md-6 col-video d-flex justify-content-center mb-4 mb-md-0">
            <!-- Attribut data-video défini sur le chemin de la vidéo quiz -->
            <div class="video-overlay-container" data-bs-toggle="modal" data-bs-target="#myVideoModal" data-video="assets/video/quiz.mp4">
              <img src="assets/img/home-exams-section.png" alt="Exams Image" class="video-image">
              <div class="play-icon">
                <i class="fas fa-play play-icon"></i>
              </div>
            </div>
          </div>
          <!-- Colonne texte -->
          <div class="col-md-6 col-text text-white">
            <h2 class="text-white"><?= $lang_data['exams_section_subtitle'] ?></h2>
            <p><?= $lang_data['exams_section_description'] ?></p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- MODAL Bootstrap pour la vidéo MP4 -->
    <div class="modal fade modal-video" id="myVideoModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-body">
            <video controls autoplay>
              <!-- La source sera définie dynamiquement -->
              <source src="" type="video/mp4">
              Votre navigateur ne supporte pas la lecture de vidéos HTML5.
            </video>
          </div>
        </div>
      </div>
    </div>
    
    <!-- GSAP Scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
    <script>
    document.addEventListener('DOMContentLoaded', function () {
        gsap.registerPlugin(ScrollTrigger);
        const homeloader = document.getElementById('homeloader');
        setTimeout(() => {
            homeloader.style.opacity = '0';
            setTimeout(() => homeloader.style.display = 'none', 1000);
        }, 3000);
        setTimeout(() => { homeloader.style.display = 'none'; }, 2000);
        const panels = gsap.utils.toArray(".homepage-section, .hero");
        panels.forEach((panel, i) => {
            ScrollTrigger.create({
                trigger: panel,
                start: "top top",
                end: (i === panels.length - 1) ? "bottom bottom" : "top+=100% top",
                pin: true,
                pinSpacing: false
            });
        });
        ScrollTrigger.create({
            trigger: ".homepage-section:last-child",
            start: "bottom bottom",
            end: "bottom top",
            onEnter: () => document.querySelector('footer').classList.add('visible'),
            onLeaveBack: () => document.querySelector('footer').classList.remove('visible'),
        });
    });
    </script>

    <!-- Script pour changer dynamiquement la source de la vidéo dans la modale -->
    <script>
    document.addEventListener('DOMContentLoaded', function () {
        var myVideoModal = document.getElementById('myVideoModal');
        myVideoModal.addEventListener('show.bs.modal', function (event) {
            // L'élément qui a déclenché l'ouverture de la modale
            var triggerElement = event.relatedTarget;
            // Récupérer le chemin de la vidéo depuis data-video
            var videoSrc = triggerElement.getAttribute('data-video');
            var video = myVideoModal.querySelector('video');
            var source = video.querySelector('source');
            source.src = videoSrc;
            video.load();
        });
        // Réinitialiser la vidéo lors de la fermeture de la modale
        myVideoModal.addEventListener('hidden.bs.modal', function () {
            var video = myVideoModal.querySelector('video');
            video.pause();
            video.currentTime = 0;
        });
    });
    </script>
</body>
</html>
<?php
include 'includes/footer.php';
?>
