<!-- qcmConfig.php -->
<?php
// Inclure les configurations et les définitions des langues
require 'config.php';
session_start();

// Définir les langues disponibles
$available_languages = [
    'fr' => 'Français',
    'en' => 'Anglais',
    'es' => 'Espagnol',
    // Ajouter d'autres langues si nécessaire
];

// Générer un jeton CSRF
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Configuration du QCM</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-5">
        <h1>Configurer votre QCM</h1>
        <form action="generateQCMMixed.php" method="POST" class="mt-4">
            <!-- Jeton CSRF -->
            <input type="hidden" name="csrf_token" value="<?php echo $_SESSION['csrf_token']; ?>">

            <!-- ID du Document -->
            <div class="mb-3">
                <label for="document_id" class="form-label">ID du Document :</label>
                <input type="text" id="document_id" name="document_id" class="form-control" required>
            </div>

            <!-- Niveau de Difficulté -->
            <div class="mb-3">
                <label for="difficulty" class="form-label">Niveau de Difficulté :</label>
                <select id="difficulty" name="difficulty" class="form-select" required>
                    <option value="">-- Sélectionnez le niveau de difficulté --</option>
                    <option value="Facile">Facile</option>
                    <option value="Moyen">Moyen</option>
                    <option value="Difficile">Difficile</option>
                </select>
            </div>

            <!-- Matière -->
            <div class="mb-3">
                <label for="subject" class="form-label">Matière :</label>
                <input type="text" id="subject" name="subject" class="form-control" placeholder="Ex: Mathématiques, Histoire" required>
            </div>

            <!-- Sujet Principal -->
            <div class="mb-3">
                <label for="main_topic" class="form-label">Sujet Principal :</label>
                <input type="text" id="main_topic" name="main_topic" class="form-control" placeholder="Ex: Algèbre, Révolution Française" required>
            </div>

            <!-- Nombre de Questions -->
            <div class="mb-3">
                <label for="num_questions" class="form-label">Nombre de Questions :</label>
                <input type="number" id="num_questions" name="num_questions" class="form-control" min="1" max="50" value="10" required>
            </div>

            <!-- Langue du QCM Généré -->
            <div class="mb-3">
                <label for="qcm_language" class="form-label">Langue du QCM Généré :</label>
                <select id="qcm_language" name="qcm_language" class="form-select" required>
                    <option value="">-- Sélectionnez la langue --</option>
                    <?php
                    foreach ($available_languages as $code => $langue) {
                        echo "<option value=\"$code\">$langue</option>";
                    }
                    ?>
                </select>
            </div>

            <!-- Langue du Résumé Généré -->
            <div class="mb-3">
                <label for="summary_language" class="form-label">Langue du Résumé Généré :</label>
                <select id="summary_language" name="summary_language" class="form-select" required>
                    <option value="">-- Sélectionnez la langue --</option>
                    <?php
                    foreach ($available_languages as $code => $langue) {
                        echo "<option value=\"$code\">$langue</option>";
                    }
                    ?>
                </select>
            </div>

            <button type="submit" class="btn btn-primary">Générer le QCM</button>
        </form>
    </div>
</body>
</html>
