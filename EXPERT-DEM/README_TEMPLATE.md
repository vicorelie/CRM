# CRM-TYPE - Template Vtiger CRM

Ce dossier contient un template Vtiger CRM 8.4.0 prêt à l'emploi pour créer rapidement de nouveaux CRM clients.

## 📋 Contenu du Template

- ✅ **Configuration générique** avec placeholders
- ✅ **Base de données template** (621 tables)
- ✅ **Script d'installation automatisé**
- ✅ **Optimisations PHP et MySQL** pré-configurées
- ✅ **Thème v7** par défaut
- ✅ **Permissions** correctement configurées

## 🚀 Créer un Nouveau CRM Client

### Méthode Rapide (Recommandée)

```bash
cd /var/www/CRM/CRM-TYPE
sudo ./INSTALL_NEW_CLIENT.sh "NomClient" "domaine.example.com"
```

### Avec Mode Non-Interactif

```bash
sudo ./INSTALL_NEW_CLIENT.sh "NomClient" "domaine.example.com" -y
```

### Exemple Concret

```bash
sudo ./INSTALL_NEW_CLIENT.sh "ARIDEM" "crm-aridem.webama.fr"
```

## 📦 Ce que le Script Fait Automatiquement

1. ✅ Copie le template CRM vers `/var/www/CRM/{NomClient}`
2. ✅ Crée une base de données dédiée `crm_{nomclient}`
3. ✅ Génère un utilisateur MySQL avec mot de passe sécurisé
4. ✅ Importe la structure de base (621 tables)
5. ✅ Configure tous les fichiers (URLs, chemins, DB)
6. ✅ Génère une clé d'application unique
7. ✅ Met à jour le nom de l'entreprise dans la DB
8. ✅ Réinitialise le mot de passe admin à `admin`
9. ✅ Nettoie les caches
10. ✅ Configure les permissions (www-data)
11. ✅ Crée le vhost Nginx (HTTP + HTTPS)
12. ✅ Active le site et recharge Nginx
13. ✅ Sauvegarde les informations d'installation

## 🔐 Informations de Connexion par Défaut

Après installation, vous pouvez vous connecter avec:
- **Utilisateur**: `admin`
- **Mot de passe**: `admin`

⚠️ **IMPORTANT**: Changez immédiatement le mot de passe après la première connexion!

## 📝 Fichiers Générés

Après installation, vous trouverez dans le dossier client:
- `INSTALLATION_INFO.txt` - Toutes les informations (credentials DB, URLs, etc.)

## 🔧 Configuration Requise

Le serveur doit avoir:
- PHP 8.2+ avec modules: mysqli, bcmath, curl, gd, zip, xml, mbstring
- MariaDB 10.11+
- Nginx avec PHP-FPM
- Certbot (pour SSL)

## 🌐 Configuration DNS et SSL

### 1. Configurer le DNS
Créez un enregistrement A pointant vers l'IP du serveur:
```
domaine.example.com -> IP_DU_SERVEUR
```

### 2. Générer le Certificat SSL
```bash
certbot --nginx -d domaine.example.com
```

Le script configure déjà le vhost Nginx pour SSL, mais il faut générer le certificat après l'installation.

## 📊 Structure de la Base de Données

La base de données template contient:
- **621 tables** Vtiger standard
- **Organisation**: TCE RENOV DESIGN (sera remplacée)
- **Utilisateur admin** avec mot de passe par défaut
- **Charset**: utf8mb3_general_ci
- **Engine**: InnoDB

## 🎨 Personnalisation Post-Installation

Après installation, connectez-vous et configurez:

1. **Informations de l'entreprise** (Settings → Company Details)
   - Nom, adresse, téléphone
   - Logo
   - Devise, timezone

2. **Utilisateurs et rôles** (Settings → Users)
   - Créer les utilisateurs
   - Configurer les rôles

3. **Modules** (Settings → Module Manager)
   - Activer/désactiver les modules nécessaires
   - Créer des champs personnalisés

4. **Email** (Settings → Outgoing Server)
   - Configurer SMTP (Brevo recommandé)

5. **CRON** (automatiquement configuré)
   - Vérifié via `crontab -l`

## 🛠️ Maintenance du Template

### Mettre à Jour le Template

Si vous faites des améliorations sur un CRM client et souhaitez les propager au template:

```bash
# 1. Copier les fichiers améliorés
rsync -av --exclude='cache' --exclude='storage' --exclude='logs' \
  /var/www/CRM/CLIENT-SOURCE/ /var/www/CRM/CRM-TYPE/

# 2. Réinitialiser les placeholders
cd /var/www/CRM/CRM-TYPE
# Modifier config.inc.php manuellement pour remettre les placeholders:
# __DB_USER__, __DB_PASS__, __DB_NAME__, __SITE_URL__, __ROOT_DIR__, __APP_KEY__

# 3. Exporter la nouvelle DB template
sudo -u mysql mariadb-dump crm_source > /tmp/crm_template_full.sql

# 4. Nettoyer logs et cache
rm -rf logs/*.log cache/templates_c/* cache/SOAP/*
```

### Sauvegarder le Template

```bash
tar -czf /backup/CRM-TYPE-$(date +%Y%m%d).tar.gz /var/www/CRM/CRM-TYPE/
```

## ❓ Dépannage

### Le site ne charge pas après installation
1. Vérifier les logs Nginx: `tail -f /var/log/nginx/error.log`
2. Vérifier les permissions: `ls -la /var/www/CRM/{Client}/`
3. Vérifier la configuration: `nginx -t`

### Erreur de connexion à la base de données
1. Vérifier le fichier d'installation: `cat /var/www/CRM/{Client}/INSTALLATION_INFO.txt`
2. Tester la connexion: `sudo -u mysql mariadb crm_{client}`
3. Vérifier config.inc.php: `grep db_password /var/www/CRM/{Client}/config.inc.php`

### Page blanche après connexion
1. Nettoyer les caches: `rm -rf /var/www/CRM/{Client}/cache/templates_c/*`
2. Vérifier les logs PHP: `tail -f /var/www/CRM/{Client}/logs/phperr.log`
3. Vérifier les permissions cache: `chown -R www-data:www-data /var/www/CRM/{Client}/cache`

## 📚 Documentation Vtiger

- Site officiel: https://www.vtiger.com/
- Documentation: https://www.vtiger.com/docs/
- Forums: https://discussions.vtiger.com/

## 🔄 Versions

- **Vtiger CRM**: 8.4.0
- **PHP**: 8.2+
- **MariaDB**: 10.11+
- **Nginx**: 1.22+

## 📄 Licence

Ce template est basé sur Vtiger CRM Open Source, sous licence Vtiger Public License 1.1.

---

**Template créé le**: 2025-11-14
**Dernière mise à jour**: 2025-11-14
**Serveur**: webama.fr
