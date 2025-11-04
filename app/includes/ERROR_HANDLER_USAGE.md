# Guide d'utilisation du gestionnaire d'erreurs centralisé

## Remplacement des patterns existants

### AVANT : die() partout

```php
if (!isset($_SESSION['user_uuid'])) {
    die('Erreur : connexion requise.');
}

if (!$document) {
    die("Erreur : Document introuvable.");
}
```

### APRÈS : Gestion cohérente

```php
require_auth(); // Gère automatiquement la vérification et la redirection

if (!$document) {
    error_redirect('documents.php', 'Document introuvable', ErrorCode::VALIDATION_NOT_FOUND);
}
```

## Fonctions disponibles

### 1. error_redirect() - Pour les formulaires HTML

Redirige vers une page avec un message d'erreur stocké en session.

```php
// Remplacement de: header("Location: page.php?error=message")
error_redirect('studyList.php', 'Le nom du sujet est requis', ErrorCode::VALIDATION_REQUIRED_FIELD);

// Remplacement de: die("Erreur...")
if (empty($subjectName)) {
    error_redirect('studyList.php', 'Le nom du sujet ne peut pas être vide');
}
```

### 2. error_die() - Pour les scripts terminaux

Pour les scripts qui doivent se terminer avec un message.

```php
// AVANT
if (!$doc) {
    die("Erreur : Document introuvable.");
}

// APRÈS
if (!$doc) {
    error_die("Document introuvable", ErrorCode::VALIDATION_NOT_FOUND, 404);
}
```

### 3. error_json() - Pour les API/AJAX

Renvoie une réponse JSON structurée.

```php
// AVANT
if ($error) {
    echo json_encode(['error' => 'Something went wrong']);
    exit();
}

// APRÈS
if ($error) {
    error_json('Une erreur est survenue', ErrorCode::API_INVALID_RESPONSE, 400);
}

// Avec données supplémentaires
error_json(
    'Validation failed',
    ErrorCode::VALIDATION_INVALID_FORMAT,
    422,
    ['fields' => ['email', 'phone']]
);
```

### 4. error_display_alert() - Afficher les erreurs

Dans vos vues, afficher l'erreur stockée en session.

```php
<!DOCTYPE html>
<html>
<body>
    <?= error_display_alert() ?>

    <!-- Votre contenu -->
</body>
</html>
```

### 5. require_auth() - Vérifier l'authentification

Remplace le pattern répété de vérification de session.

```php
// AVANT
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// APRÈS
require_auth();

// Ou avec redirection personnalisée
require_auth('index.php');
```

### 6. validate_required_post() - Validation des champs

Valide et retourne les champs POST requis.

```php
// AVANT
if (empty($_POST['subject_name'])) {
    header("Location: studyList.php?error=name_required");
    exit();
}
if (empty($_POST['subject_unit'])) {
    header("Location: studyList.php?error=unit_required");
    exit();
}
$name = trim($_POST['subject_name']);
$unit = trim($_POST['subject_unit']);

// APRÈS
$data = validate_required_post(
    ['subject_name', 'subject_unit'],
    'studyList.php'
);
// Si on arrive ici, les champs sont validés et nettoyés
$name = $data['subject_name'];
$unit = $data['subject_unit'];
```

### 7. handle_db_error() - Gestion d'erreurs PDO

Gérer proprement les exceptions de base de données.

```php
// AVANT
try {
    $stmt->execute();
} catch (PDOException $e) {
    die("Erreur DB: " . $e->getMessage());
}

// APRÈS
try {
    $stmt->execute();
} catch (PDOException $e) {
    handle_db_error($e, "Insertion de sujet", "studyList.php");
}
```

## Codes d'erreur disponibles

```php
// Authentification (1xxx)
ErrorCode::AUTH_REQUIRED
ErrorCode::AUTH_INVALID_CREDENTIALS
ErrorCode::AUTH_SESSION_EXPIRED
ErrorCode::AUTH_INSUFFICIENT_PERMISSIONS

// Validation (2xxx)
ErrorCode::VALIDATION_REQUIRED_FIELD
ErrorCode::VALIDATION_INVALID_FORMAT
ErrorCode::VALIDATION_ALREADY_EXISTS
ErrorCode::VALIDATION_NOT_FOUND

// Base de données (3xxx)
ErrorCode::DB_CONNECTION_FAILED
ErrorCode::DB_QUERY_FAILED
ErrorCode::DB_TRANSACTION_FAILED

// API externes (4xxx)
ErrorCode::API_RATE_LIMIT
ErrorCode::API_INVALID_RESPONSE
ErrorCode::API_CONNECTION_FAILED

// Fichiers (5xxx)
ErrorCode::FILE_UPLOAD_FAILED
ErrorCode::FILE_NOT_FOUND
ErrorCode::FILE_INVALID_TYPE

// Général (9xxx)
ErrorCode::GENERAL_ERROR
ErrorCode::NOT_IMPLEMENTED
```

## Exemple complet de migration

### AVANT (addSubject.php)

```php
<?php
require 'config.php';

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $subjectName = trim($_POST['subject_name'] ?? '');

    if (empty($subjectName)) {
        header("Location: studyList.php?addSubjectError=1");
        exit();
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO subjects ...");
        $stmt->execute([...]);
    } catch (PDOException $e) {
        die("Erreur DB: " . $e->getMessage());
    }

    header("Location: studyList.php?addSubjectSuccess=1");
    exit();
}
?>
```

### APRÈS (addSubject.php)

```php
<?php
require 'config.php';

// Auth + CSRF
require_auth();
csrf_protect_post();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Validation simplifiée
    $data = validate_required_post(['subject_name'], 'studyList.php');
    $subjectName = $data['subject_name'];

    // Insertion sécurisée
    try {
        $stmt = $pdo->prepare("INSERT INTO subjects (name, uuid) VALUES (:name, :uuid)");
        $stmt->execute([
            'name' => $subjectName,
            'uuid' => $_SESSION['user_uuid']
        ]);

        // Success redirect
        $_SESSION['success_message'] = 'Sujet ajouté avec succès';
        header("Location: studyList.php");
        exit();

    } catch (PDOException $e) {
        handle_db_error($e, "Ajout de sujet", "studyList.php");
    }
}
?>
```

## Affichage des erreurs dans les vues

### Dans studyList.php (ou autre vue)

```php
<?php require 'config.php'; ?>
<!DOCTYPE html>
<html>
<head>
    <title>Liste des sujets</title>
</head>
<body>
    <div class="container">
        <!-- Afficher automatiquement les erreurs -->
        <?= error_display_alert() ?>

        <!-- Votre contenu -->
        <h1>Mes sujets</h1>
        ...
    </div>
</body>
</html>
```

## Mode production vs développement

En production (APP_ENV=production dans .env), les messages d'erreur techniques sont masqués :

```php
// Développement : "Error [2004]: Document not found in database"
// Production : "An error occurred. Please try again later."
```

## Logging automatique

Toutes les erreurs sont automatiquement loggées avec :
- Le code d'erreur
- Le message
- Le stack trace (pour error_die et handle_db_error)
- Le contexte

Les logs sont écrits dans le error_log du serveur PHP.

## Ordre de migration recommandé

1. **Ajouter error_display_alert()** dans toutes les vues principales
2. **Remplacer tous les require_auth patterns** par `require_auth()`
3. **Remplacer les die()** par `error_die()` ou `error_redirect()`
4. **Remplacer les redirects avec query params** par `error_redirect()`
5. **Ajouter handle_db_error()** dans les try-catch existants
6. **Utiliser error_json()** pour les endpoints AJAX

## Exemples par type de fichier

### API endpoints (generate*.php)

```php
<?php
require 'config.php';
require_auth();
csrf_protect_post();

try {
    // Votre logique
    $result = doSomething();

    // Success response
    echo json_encode(['success' => true, 'data' => $result]);
    exit();

} catch (Exception $e) {
    error_json($e->getMessage(), ErrorCode::GENERAL_ERROR, 500);
}
?>
```

### Delete actions

```php
<?php
require 'config.php';
require_auth();
csrf_protect_post();

$data = validate_required_post(['id'], 'studyList.php');

try {
    $stmt = $pdo->prepare("DELETE FROM subjects WHERE id = :id AND uuid = :uuid");
    $result = $stmt->execute([
        'id' => $data['id'],
        'uuid' => $_SESSION['user_uuid']
    ]);

    if ($stmt->rowCount() === 0) {
        error_redirect('studyList.php', 'Sujet introuvable', ErrorCode::VALIDATION_NOT_FOUND);
    }

    $_SESSION['success_message'] = 'Sujet supprimé';
    header("Location: studyList.php");
    exit();

} catch (PDOException $e) {
    handle_db_error($e, "Suppression de sujet", "studyList.php");
}
?>
```
