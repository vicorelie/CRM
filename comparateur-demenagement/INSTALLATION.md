# Guide d'Installation - Comparateur de Déménagement

## Prérequis

- Accès cPanel ou phpMyAdmin
- PHP 7.4 ou supérieur
- MySQL 5.7 ou MariaDB 10.3 ou supérieur
- Extension PDO PHP activée

## Étape 1: Créer la base de données

### Via cPanel:

1. Connectez-vous à votre cPanel
2. Allez dans **MySQL® Databases** ou **Bases de données MySQL**
3. Dans la section "Créer une nouvelle base de données":
   - Nom: `comparateur_demenagement`
   - Cliquez sur **Créer une base de données**
4. Attribuez votre utilisateur MySQL à cette base de données avec tous les privilèges

### Via phpMyAdmin:

1. Connectez-vous à phpMyAdmin
2. Cliquez sur l'onglet **Bases de données**
3. Créez une nouvelle base:
   - Nom: `comparateur_demenagement`
   - Interclassement: `utf8mb4_unicode_ci`
4. Cliquez sur **Créer**

## Étape 2: Importer les tables

### Via phpMyAdmin:

1. Dans phpMyAdmin, sélectionnez la base `comparateur_demenagement`
2. Cliquez sur l'onglet **Importer**
3. Cliquez sur **Choisir un fichier**
4. Sélectionnez le fichier: `/var/www/comparateur-demenagement/setup_database.sql`
5. Cliquez sur **Exécuter**

### Via ligne de commande:

```bash
mysql -h 127.0.0.1 -u VOTRE_UTILISATEUR -p comparateur_demenagement < /var/www/comparateur-demenagement/setup_database.sql
```

Remplacez `VOTRE_UTILISATEUR` par votre nom d'utilisateur MySQL.

## Étape 3: Configurer les credentials

Éditez le fichier [config.php](config.php) et modifiez ces lignes:

```php
define('DB_HOST', '127.0.0.1');              // Host de votre base de données
define('DB_NAME', 'comparateur_demenagement'); // Nom de votre base de données
define('DB_USER', 'VOTRE_UTILISATEUR');      // Votre utilisateur MySQL
define('DB_PASS', 'VOTRE_MOT_DE_PASSE');     // Votre mot de passe MySQL
```

## Étape 4: Vérifier la structure

Après l'importation, votre base de données doit contenir:

### Tables:
- ✅ `demandes_devis` - Stocke les demandes de devis des clients
- ✅ `demenageurs` - Liste des déménageurs partenaires (5 exemples pré-insérés)
- ✅ `devis` - Devis envoyés par les déménageurs
- ✅ `avis` - Avis clients sur les déménageurs

### Vues:
- ✅ `demandes_recentes` - Les 50 dernières demandes
- ✅ `stats_globales` - Statistiques globales du site

### Vérification rapide:

Exécutez cette requête dans phpMyAdmin:

```sql
SELECT * FROM demenageurs;
```

Vous devriez voir 5 déménageurs de test:
1. DéménExpress Paris
2. MobiTransport Lyon
3. SecurDém Marseille
4. ProMove Bordeaux
5. TransFrance National

## Étape 5: Tester l'installation

### Test 1: Vérifier la connexion à la base de données

Créez un fichier test: `/var/www/comparateur-demenagement/test_db.php`

```php
<?php
require_once(__DIR__ . '/config.php');

try {
    $pdo = getDbConnection();
    echo "✅ Connexion à la base de données réussie!<br>";

    // Compter les déménageurs
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM demenageurs");
    $result = $stmt->fetch();
    echo "✅ Nombre de déménageurs: " . $result['count'] . "<br>";

    // Tester les vues
    $stmt = $pdo->query("SELECT * FROM stats_globales");
    $stats = $stmt->fetch();
    echo "✅ Statistiques récupérées avec succès<br>";

    echo "<br><strong>Installation réussie!</strong>";
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage();
}
?>
```

Accédez à: `https://spots101.spotifone.com/comparateur-demenagement/test_db.php`

### Test 2: Tester le formulaire de demande

Accédez à: `https://spots101.spotifone.com/comparateur-demenagement/index.html`

1. Remplissez le formulaire en 3 étapes
2. Soumettez votre demande
3. Vérifiez dans phpMyAdmin:

```sql
SELECT * FROM demandes_devis ORDER BY created_at DESC LIMIT 1;
```

Vous devriez voir votre demande enregistrée.

## Structure des fichiers

```
/var/www/comparateur-demenagement/
├── index.html                    # Page principale
├── config.php                    # Configuration (nouvellement créé)
├── setup_database.sql            # Script d'installation SQL (nouvellement créé)
├── database.sql                  # Ancien fichier SQL (peut être supprimé)
├── api/
│   └── submit-devis.php         # API pour soumettre les demandes (mis à jour)
├── css/
│   └── style.css                # Styles du site
├── js/
│   └── app.js                   # JavaScript du formulaire
└── assets/                      # Images et autres ressources

/var/www/api/dev/
└── Database.php                 # Classe de connexion PDO (nouvellement créée)
```

## Fonctionnalités actuelles

✅ Formulaire multi-étapes pour demande de devis
✅ Validation côté client et serveur
✅ Protection contre les injections SQL (prepared statements)
✅ Stockage sécurisé des demandes en base de données
✅ 5 déménageurs de test pré-chargés
✅ Vues SQL pour statistiques et rapports

## Fonctionnalités à développer

- [ ] Envoi d'emails de confirmation aux clients
- [ ] Notification des déménageurs partenaires
- [ ] Dashboard administrateur
- [ ] Espace déménageur (login, gestion des devis)
- [ ] Page de comparaison des devis reçus
- [ ] Système d'avis clients
- [ ] Intégration SMTP pour les emails

## Sécurité

✅ Prepared statements PDO (protection SQL injection)
✅ Validation des inputs (email, téléphone, dates)
✅ CORS configuré
✅ UUID unique pour chaque demande
✅ Sanitization des données
✅ Gestion des erreurs sécurisée

## Support

Pour toute question ou problème:

1. Vérifiez les logs:
   - Apache: `/var/log/httpd/ssl_error_log`
   - PHP: `/var/log/php-fpm/error.log`
   - Application: `/var/www/comparateur-demenagement/logs/error.log`

2. Vérifiez les permissions:
   ```bash
   chmod 755 /var/www/comparateur-demenagement
   chmod 644 /var/www/comparateur-demenagement/config.php
   chmod 755 /var/www/api/dev
   chmod 644 /var/www/api/dev/Database.php
   ```

3. Vérifiez la configuration PHP:
   - Extension PDO activée: `php -m | grep pdo`
   - Extension PDO MySQL: `php -m | grep pdo_mysql`

## Commandes utiles

### Voir les demandes récentes:
```sql
SELECT * FROM demandes_recentes;
```

### Voir les statistiques:
```sql
SELECT * FROM stats_globales;
```

### Ajouter un nouveau déménageur:
```sql
INSERT INTO demenageurs (uuid, nom_entreprise, email, telephone, ville, code_postal, zone_intervention, actif, verifie)
VALUES (MD5(RAND()), 'Nom Entreprise', 'email@example.com', '0123456789', 'Paris', '75001', '["75"]', 1, 0);
```

### Supprimer toutes les demandes de test:
```sql
DELETE FROM demandes_devis WHERE email_client LIKE '%@test.com';
```

---

**Date de création:** 2025-11-11
**Version:** 1.0
**Auteur:** Claude AI Assistant
