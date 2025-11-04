# Guide d'utilisation du système CSRF

## Protection automatique des formulaires POST

### Méthode 1 : Protection automatique (recommandée pour les APIs)

Ajouter au début de votre fichier PHP qui traite des POST :

```php
<?php
require 'config.php';

// Protection automatique de tous les POST
csrf_protect_post();

// Votre code continue normalement...
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Le token a déjà été vérifié, vous pouvez traiter les données
    $data = $_POST['data'];
    // ...
}
```

### Méthode 2 : Vérification manuelle (pour plus de contrôle)

```php
<?php
require 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Vérifier le token manuellement
    csrf_verify_or_die();

    // Si on arrive ici, le token est valide
    $data = $_POST['data'];
    // ...
}
```

## Ajout du token dans les formulaires HTML

### Option 1 : Fonction helper (recommandée)

```php
<form method="POST" action="addSubject.php">
    <?= csrf_field() ?>

    <input type="text" name="subject_name" required>
    <button type="submit">Ajouter</button>
</form>
```

### Option 2 : Token manuel

```php
<form method="POST" action="addSubject.php">
    <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">

    <input type="text" name="subject_name" required>
    <button type="submit">Ajouter</button>
</form>
```

## Requêtes AJAX

### Dans le HEAD de votre page

```php
<head>
    <?= csrf_meta() ?>
    <!-- Génère: <meta name="csrf-token" content="..."> -->
</head>
```

### Dans votre JavaScript

```javascript
// Récupérer le token depuis le meta tag
const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

// Méthode 1 : Ajouter dans le body de la requête
fetch('/api/endpoint.php', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({ data: 'value' })
});

// Méthode 2 : Ajouter dans FormData
const formData = new FormData();
formData.append('csrf_token', csrfToken);
formData.append('data', 'value');

fetch('/api/endpoint.php', {
    method: 'POST',
    body: formData
});
```

## Exemple complet : Formulaire d'ajout de sujet

### Fichier: addSubject.php

```php
<?php
require 'config.php';

// Protection CSRF automatique
csrf_protect_post();

// Vérifier l'authentification
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Le token CSRF a déjà été vérifié par csrf_protect_post()

    $subject_name = trim($_POST['subject_name'] ?? '');

    if (empty($subject_name)) {
        $errors[] = "Le nom du sujet est requis";
    }

    if (empty($errors)) {
        try {
            $stmt = $pdo->prepare("INSERT INTO subjects (name, user_uuid) VALUES (:name, :uuid)");
            $stmt->execute([
                'name' => $subject_name,
                'uuid' => $_SESSION['user_uuid']
            ]);

            header('Location: subjects.php?success=1');
            exit();
        } catch (PDOException $e) {
            $errors[] = "Erreur lors de l'ajout";
            error_log($e->getMessage());
        }
    }
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Ajouter un sujet</title>
</head>
<body>
    <h1>Ajouter un sujet</h1>

    <?php if (!empty($errors)): ?>
        <div class="errors">
            <?php foreach ($errors as $error): ?>
                <p><?= htmlspecialchars($error) ?></p>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <form method="POST">
        <?= csrf_field() ?>

        <label for="subject_name">Nom du sujet:</label>
        <input type="text" id="subject_name" name="subject_name" required>

        <button type="submit">Ajouter</button>
    </form>
</body>
</html>
```

## Migration des fichiers existants

### AVANT (vulnérable)

```php
<?php
require 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = $_POST['data'];
    // Traitement...
}
?>
```

### APRÈS (protégé)

```php
<?php
require 'config.php';
csrf_protect_post(); // AJOUTER CETTE LIGNE

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = $_POST['data'];
    // Traitement...
}
?>

<!-- Dans le formulaire HTML -->
<form method="POST">
    <?= csrf_field() ?> <!-- AJOUTER CETTE LIGNE -->
    <input type="text" name="data">
    <button type="submit">Envoyer</button>
</form>
```

## Ordre de migration recommandé

1. **Authentification** : login.php, register.php
2. **Actions critiques** : deleteSubject.php, deleteDocument.php, deleteExam.php
3. **Modifications de données** : addSubject.php, updateUserInfo.php, etc.
4. **Génération de contenu** : tous les generate*Api.php
5. **Reste des formulaires**

## Gestion des erreurs

Si un utilisateur voit l'erreur "CSRF token validation failed" :

**Causes possibles :**
1. Token expiré (> 1 heure)
2. Session expirée
3. Double soumission du formulaire
4. Token non présent dans le formulaire

**Solution :** Rafraîchir la page et réessayer

## Notes de sécurité

- Les tokens expirent après 1 heure
- Les tokens sont à usage unique (supprimés après validation)
- Maximum 10 tokens en session (les plus anciens sont supprimés)
- Fonctionne avec POST uniquement (GET ne devrait jamais modifier de données)
- Compatible avec les requêtes AJAX (header X-CSRF-Token)
