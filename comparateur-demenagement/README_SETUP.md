# 🚀 Setup Complet - Comparateur de Déménagement

## Résumé de l'installation

Tous les fichiers nécessaires ont été créés pour faire fonctionner votre site de comparateur de déménagement.

## 📦 Fichiers créés

### 1. Configuration et Base de données

- **[config.php](config.php)** - Configuration de la base de données et paramètres globaux
- **[setup_database.sql](setup_database.sql)** - Script SQL complet pour créer toutes les tables, vues et données de test
- **[/var/www/api/dev/Database.php](/var/www/api/dev/Database.php)** - Classe PDO sécurisée pour les connexions DB

### 2. Scripts d'installation

- **[install.sh](install.sh)** - Script bash automatique pour tout installer
- **[test_db.php](test_db.php)** - Page de test pour vérifier l'installation

### 3. Documentation

- **[INSTALLATION.md](INSTALLATION.md)** - Guide d'installation détaillé étape par étape
- **[README_SETUP.md](README_SETUP.md)** (ce fichier) - Résumé rapide

### 4. Fichiers mis à jour

- **[api/submit-devis.php](api/submit-devis.php)** - Mise à jour pour utiliser la nouvelle configuration

## ⚡ Installation Rapide

### Option 1: Installation automatique (recommandé)

```bash
cd /var/www/comparateur-demenagement
./install.sh
```

Le script vous demandera:
- Host MySQL (défaut: 127.0.0.1)
- Utilisateur MySQL
- Mot de passe MySQL
- Nom de la base (défaut: comparateur_demenagement)

Il créera automatiquement:
- ✅ La base de données
- ✅ Toutes les tables et vues
- ✅ 5 déménageurs de test
- ✅ La configuration dans config.php

### Option 2: Installation manuelle

1. **Créer la base de données** via cPanel ou phpMyAdmin:
   - Nom: `comparateur_demenagement`
   - Charset: `utf8mb4_unicode_ci`

2. **Importer les tables**:
   ```bash
   mysql -h 127.0.0.1 -u VOTRE_USER -p comparateur_demenagement < setup_database.sql
   ```

3. **Configurer les credentials** dans [config.php](config.php):
   ```php
   define('DB_HOST', '127.0.0.1');
   define('DB_NAME', 'comparateur_demenagement');
   define('DB_USER', 'VOTRE_UTILISATEUR');
   define('DB_PASS', 'VOTRE_MOT_DE_PASSE');
   ```

## 🧪 Tester l'installation

Ouvrez dans votre navigateur:

```
https://spots101.spotifone.com/comparateur-demenagement/test_db.php
```

Cette page vérifie:
- ✅ Fichiers de configuration
- ✅ Connexion à la base de données
- ✅ Présence des tables
- ✅ Déménageurs de test
- ✅ Vues SQL

## 🏗️ Structure de la base de données

### Tables créées:

1. **demandes_devis**
   - Stocke toutes les demandes de devis des clients
   - Champs: ville départ/arrivée, date, type logement, contact client, etc.

2. **demenageurs**
   - Liste des déménageurs partenaires
   - 5 exemples pré-chargés (Paris, Lyon, Marseille, Bordeaux, National)

3. **devis**
   - Devis envoyés par les déménageurs aux clients
   - Montants HT/TTC, statut, validité

4. **avis**
   - Avis et notes des clients sur les déménageurs
   - Notes détaillées: ponctualité, professionnalisme, qualité/prix

### Vues créées:

1. **demandes_recentes** - Les 50 dernières demandes
2. **stats_globales** - Statistiques du site (total demandes, nouveaux, terminés, etc.)

## 🎯 Prochaines étapes

Une fois l'installation réussie:

1. **Tester le formulaire**:
   - Allez sur [index.html](https://spots101.spotifone.com/comparateur-demenagement/index.html)
   - Remplissez une demande de test
   - Vérifiez dans phpMyAdmin que la demande est enregistrée

2. **Personnaliser**:
   - Modifier les déménageurs dans la table `demenageurs`
   - Ajuster les styles CSS dans [css/style.css](css/style.css)
   - Configurer l'envoi d'emails dans [config.php](config.php)

3. **Développements futurs**:
   - Dashboard administrateur
   - Espace déménageur pour gérer les devis
   - Système d'envoi d'emails automatiques
   - Page de comparaison des devis
   - Système d'avis clients public

## 📊 Exemples de requêtes SQL

### Voir toutes les demandes:
```sql
SELECT * FROM demandes_devis ORDER BY created_at DESC;
```

### Voir les statistiques:
```sql
SELECT * FROM stats_globales;
```

### Ajouter un déménageur:
```sql
INSERT INTO demenageurs (uuid, nom_entreprise, email, telephone, ville, code_postal, zone_intervention, actif, verifie)
VALUES (MD5(RAND()), 'Nom Entreprise', 'email@example.com', '0123456789', 'Paris', '75001', '["75"]', 1, 0);
```

## 🔐 Sécurité

Le système utilise:
- ✅ **PDO avec prepared statements** - Protection contre SQL injection
- ✅ **Validation des inputs** - Email, téléphone, dates
- ✅ **UUID uniques** - Pour chaque demande
- ✅ **Headers CORS** - Configurés dans l'API
- ✅ **Gestion des erreurs** - Logs sécurisés

## 🆘 Support et Troubleshooting

### Problèmes de connexion DB:
1. Vérifiez les credentials dans [config.php](config.php)
2. Testez la connexion: `mysql -h 127.0.0.1 -u USER -p`
3. Vérifiez que l'extension PDO est activée: `php -m | grep pdo`

### Tables manquantes:
1. Réimportez le fichier SQL: `mysql -u USER -p DB < setup_database.sql`
2. Vérifiez les permissions de votre utilisateur MySQL

### Erreur 500:
1. Vérifiez les logs: `/var/log/php-fpm/error.log`
2. Vérifiez les permissions: `chmod 755 /var/www/comparateur-demenagement`
3. Vérifiez que Database.php existe: `ls -la /var/www/api/dev/Database.php`

### Formulaire ne soumet pas:
1. Ouvrez la console du navigateur (F12)
2. Vérifiez que l'API répond: `curl -X POST https://spots101.spotifone.com/comparateur-demenagement/api/submit-devis.php`
3. Vérifiez les logs Apache: `/var/log/httpd/ssl_error_log`

## 📞 Fichiers de logs

- Application: `/var/www/comparateur-demenagement/logs/error.log`
- PHP: `/var/log/php-fpm/error.log`
- Apache: `/var/log/httpd/ssl_error_log`

## ✅ Checklist finale

- [ ] Base de données créée
- [ ] Tables importées (4 tables + 2 vues)
- [ ] 5 déménageurs de test présents
- [ ] config.php configuré avec les bons credentials
- [ ] test_db.php affiche tout en vert
- [ ] Formulaire sur index.html fonctionne
- [ ] Les demandes sont enregistrées en base

## 🎉 Conclusion

Votre comparateur de déménagement est maintenant prêt à l'emploi!

**URLs importantes:**
- Site principal: https://spots101.spotifone.com/comparateur-demenagement/
- Test DB: https://spots101.spotifone.com/comparateur-demenagement/test_db.php
- API: https://spots101.spotifone.com/comparateur-demenagement/api/submit-devis.php

Pour toute question, consultez [INSTALLATION.md](INSTALLATION.md) pour plus de détails.

---

**Créé le:** 2025-11-11
**Par:** Claude AI Assistant
**Version:** 1.0
