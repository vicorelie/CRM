# Migration vers helpers.php

Ce document explique comment migrer les fichiers existants pour utiliser les fonctions centralisées de `helpers.php`.

## Fonctions disponibles

### Database Helpers

#### `ensurePdo(PDO $pdo): PDO`
Vérifie que la connexion PDO est active, reconnecte si nécessaire.

**AVANT** (dupliqué dans chaque fichier):
```php
function ensurePdo(PDO $pdo): PDO {
    try {
        $pdo->query('SELECT 1');
        return $pdo;
    } catch (PDOException) {
        global $dsn;
        return new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
}
```

**APRÈS** (utilise helpers.php):
```php
// Fonction déjà disponible via config.php qui inclut helpers.php
$pdo = ensurePdo($pdo);
```

#### `fetchOne(PDO $pdo, string $sql, array $params): ?array`
Récupère une ligne de la base de données.

**AVANT**:
```php
function fetchOne(PDO $pdo, string $sql, array $p): ?array {
    $s = $pdo->prepare($sql);
    $s->execute($p);
    return $s->fetch(PDO::FETCH_ASSOC) ?: null;
}

$doc = fetchOne($pdo, "SELECT * FROM documents WHERE id = :id", [':id' => $id]);
```

**APRÈS**:
```php
// Fonction déjà disponible
$doc = fetchOne($pdo, "SELECT * FROM documents WHERE id = :id", [':id' => $id]);
```

#### `fetchAll(PDO $pdo, string $sql, array $params): array`
Récupère toutes les lignes.

```php
$subjects = fetchAll($pdo, "SELECT * FROM subjects WHERE uuid = :uuid", [':uuid' => $userUuid]);
```

#### `fetchColumn(PDO $pdo, string $sql, array $params)`
Récupère une seule colonne.

```php
$count = fetchColumn($pdo, "SELECT COUNT(*) FROM users WHERE active = 1", []);
```

### JSON Helpers

#### `fixJsonQuotes(string $json): string`
Corrige les guillemets dans une chaîne JSON.

**AVANT** (dupliqué):
```php
function fixJsonQuotes(string $j): string {
    return preg_replace_callback(
        '/"((?:\\\\.|[^"\\\\])*)"/u',
        fn($m) => '"' . str_replace('"','\"',$m[1]) . '"',
        $j
    );
}

$fixed = fixJsonQuotes($jsonString);
```

**APRÈS**:
```php
$fixed = fixJsonQuotes($jsonString);
```

#### `isJson(string $string): bool`
Vérifie si une chaîne est un JSON valide.

```php
if (isJson($response)) {
    $data = json_decode($response, true);
}
```

#### `parseJson(string $json, bool $assoc = true)`
Parse du JSON avec gestion d'erreurs.

**AVANT**:
```php
$data = json_decode($json, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("JSON error: " . json_last_error_msg());
    die("Invalid JSON");
}
```

**APRÈS**:
```php
$data = parseJson($json);
if ($data === null) {
    error_die("Invalid JSON response", ErrorCode::API_INVALID_RESPONSE);
}
```

### File Helpers

#### `sanitizeFilename(string $filename): string`
Nettoie un nom de fichier.

```php
$safeName = sanitizeFilename($_FILES['document']['name']);
```

#### `generateUniqueFilename(string $original): string`
Génère un nom de fichier unique.

```php
$uniqueName = generateUniqueFilename('document.pdf');
// Résultat: "20251104123045_a1b2c3d4e5f6g7h8_document.pdf"
```

#### `formatBytes(int $bytes): string`
Formate une taille en octets.

```php
echo formatBytes(1536000); // "1.46 MB"
```

### Text Helpers

#### `truncate(string $text, int $length): string`
Tronque un texte.

```php
echo truncate($longText, 100); // "Long text here..."
```

#### `cleanText(string $text): string`
Nettoie le texte (espaces, retours à la ligne).

```php
$clean = cleanText($userInput);
```

### Array Helpers

#### `arrayGet(array $array, $key, $default = null)`
Récupère une valeur avec fallback.

```php
$name = arrayGet($_POST, 'name', 'Anonymous');
```

#### `arrayHasKeys(array $array, array $keys): bool`
Vérifie si toutes les clés existent.

```php
if (arrayHasKeys($_POST, ['name', 'email', 'password'])) {
    // Tous les champs sont présents
}
```

### Math Helpers

#### `percentage($value, $total, int $decimals = 2): float`
Calcule un pourcentage.

```php
$score = percentage(15, 20); // 75.0
```

### String Helpers

#### `randomString(int $length = 32): string`
Génère une chaîne aléatoire.

```php
$token = randomString(32);
```

## Exemple de migration complète

### AVANT: generateDocumentQuizApi.php (lignes 15-41)

```php
<?php
require_once __DIR__ . '/config.php';
session_start();
require_once 'vendor/autoload.php';

/* ---------- utilitaires ---------- */
function fixJsonQuotes(string $j): string {
    return preg_replace_callback(
        '/"((?:\\\\.|[^"\\\\])*)"/u',
        fn($m) => '"' . str_replace('"','\"',$m[1]) . '"',
        $j
    );
}

function ensurePdo(PDO $pdo): PDO {
    try {
        $pdo->query('SELECT 1');
        return $pdo;
    } catch (PDOException) {
        global $dsn;
        return new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
}

function fetchOne(PDO $pdo, string $sql, array $p): ?array {
    $s = $pdo->prepare($sql);
    $s->execute($p);
    return $s->fetch(PDO::FETCH_ASSOC) ?: null;
}

// Reste du code...
```

### APRÈS: generateDocumentQuizApi.php

```php
<?php
require_once __DIR__ . '/config.php'; // Inclut déjà helpers.php
// Les fonctions fixJsonQuotes, ensurePdo, fetchOne sont déjà disponibles

// Reste du code...
```

**Gain**: 27 lignes supprimées, code plus maintenable.

## Ordre de migration

### Priorité 1: Fichiers generate*Api.php (10+ fichiers)

Ces fichiers ont tous les 3 fonctions dupliquées :
1. `generateDocumentQuizApi.php`
2. `generateDocumentFlashApi.php`
3. `generateDocumentSummaryApi.php`
4. `generateDocumentPairApi.php`
5. `generateDocumentMissApi.php`
6. `generateDocumentTrueFalseApi.php`
7. `generateGeneralQuizApi.php`
8. `generateGeneralFlashApi.php`
9. `generateGeneralSummaryApi.php`
10. `generateGeneralPairApi.php`
11. `generateGeneralMissApi.php`
12. `generateGeneralTrueFalseApi.php`
13. `generateGeneralCrosswordApi.php`

**Actions pour chaque fichier**:
1. Supprimer les fonctions `fixJsonQuotes`, `ensurePdo`, `fetchOne`
2. Vérifier que `require 'config.php'` est présent (il inclut helpers.php)
3. Tester que le fichier fonctionne toujours

### Priorité 2: Autres fichiers avec logique répétée

Remplacer les patterns répétés par les helpers :
- Upload de fichiers → `sanitizeFilename()`, `generateUniqueFilename()`
- Vérification JSON → `isJson()`, `parseJson()`
- Requêtes DB simples → `fetchOne()`, `fetchAll()`, `fetchColumn()`

## Script de migration automatique

Pour accélérer la migration, voici un script bash:

```bash
#!/bin/bash
# migrate_helpers.sh

FILES=(
    "generateDocumentQuizApi.php"
    "generateDocumentFlashApi.php"
    "generateDocumentSummaryApi.php"
    "generateDocumentPairApi.php"
    "generateDocumentMissApi.php"
    "generateDocumentTrueFalseApi.php"
    "generateGeneralQuizApi.php"
    "generateGeneralFlashApi.php"
    "generateGeneralSummaryApi.php"
    "generateGeneralPairApi.php"
    "generateGeneralMissApi.php"
    "generateGeneralTrueFalseApi.php"
    "generateGeneralCrosswordApi.php"
)

for file in "${FILES[@]}"; do
    echo "Processing $file..."

    # Backup
    cp "app/$file" "app/${file}.backup"

    # Remove the three duplicate functions
    # (This is a simplified example, manual review recommended)

    echo "✓ $file processed (backup created)"
done

echo "Migration complete! Review changes before committing."
```

## Tests après migration

Après avoir migré un fichier, tester :

1. **Génération de contenu** : Créer un quiz/summary/flashcards
2. **Reconnexion DB** : Scripts longs (>60 secondes)
3. **Parsing JSON** : Vérifier que les réponses OpenAI sont bien parsées
4. **Logs** : Vérifier qu'il n'y a pas d'erreurs

## Bénéfices

- **-300 lignes** de code dupliqué (environ 25 lignes × 12 fichiers)
- **Maintenance simplifiée** : Un seul endroit à modifier
- **Nouvelles fonctions** disponibles partout (parseJson, sanitizeFilename, etc.)
- **Cohérence** : Même comportement dans tous les fichiers
- **Tests plus faciles** : Les helpers peuvent être testés unitairement
