# 📚 Wanatest - Plateforme Éducative Interactive

Wanatest est une plateforme éducative qui permet de générer automatiquement du contenu pédagogique interactif (quiz, résumés, flashcards, etc.) à partir de documents ou de sujets d'étude, en utilisant l'intelligence artificielle.

## 🌟 Fonctionnalités principales

- **Quiz interactifs** : Génération automatique de QCM à partir de documents
- **Résumés intelligents** : Création de synthèses de cours
- **Flashcards** : Cartes mémoire pour l'apprentissage
- **Jeu des paires** : Association de concepts
- **Textes à trous** : Exercices de complétion
- **Vrai/Faux** : Questions de validation des connaissances
- **Mots croisés** : Grilles générées automatiquement
- **Examens personnalisés** : Création d'examens complets
- **Statistiques** : Suivi de progression
- **Multi-langues** : Support de FR, EN, HE, AR, RU

## 🛠️ Technologies utilisées

### Backend
- **PHP 8.1+** avec PDO
- **MySQL** pour la base de données
- **Python 3.11** pour l'extraction de contenu
- **Composer** pour la gestion des dépendances PHP

### APIs externes
- **OpenAI API** (GPT-4o-mini) pour la génération de contenu
- **DeepSeek API** en alternative
- **Brevo** (Sendinblue) pour les emails
- **PayPal** pour les paiements

### Frontend
- **Bootstrap 5.3**
- **GSAP** pour les animations
- **Font Awesome** pour les icônes
- HTML5, CSS3, JavaScript vanilla

### Traitement de contenu
- **FFmpeg** pour le traitement vidéo/audio
- **Whisper.cpp** pour la transcription audio
- **yt-dlp** pour le téléchargement YouTube
- **Tesseract OCR** pour la reconnaissance de texte
- **PHPWord, PHPSpreadsheet** pour les documents Office

## 📋 Prérequis

### Système
- **PHP** >= 8.1
- **MySQL** >= 5.7 ou MariaDB >= 10.3
- **Python** >= 3.11
- **Composer**
- **Git**

### Extensions PHP requises
```bash
php-pdo php-pdo-mysql php-mbstring php-json php-curl php-xml php-zip php-gd
```

### Packages Python requis
```bash
python3-venv python3-pip
```

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone https://github.com/vicorelie/wanatest.git
cd wanatest
```

### 2. Configuration de l'environnement

Copier le fichier d'exemple et configurer les variables :

```bash
cp app/.env.example app/.env
nano app/.env  # ou vim, code, etc.
```

Remplir les variables suivantes dans `.env` :

```env
# Database
DB_HOST=127.0.0.1
DB_NAME=votre_base_de_donnees
DB_USER=votre_utilisateur
DB_PASS="votre_mot_de_passe"

# SMTP
SMTP_HOST=votre_smtp
SMTP_PORT=465
SMTP_USERNAME=votre_email
SMTP_PASSWORD="votre_password"

# APIs
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
BREVO_API_KEY=xkeysib-...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

**Important : Permissions du fichier .env**

Le fichier `.env` doit être lisible par le serveur web :

```bash
# Donner les bonnes permissions
sudo chown www-data:www-data app/.env
sudo chmod 640 app/.env
```

### 3. Installer les dépendances PHP

```bash
cd app
composer install
```

### 4. Configurer Python

```bash
cd app
python3 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# ou
.venv\Scripts\activate  # Windows

pip install --upgrade pip
pip install -r requirements.txt  # Si le fichier existe
# Sinon installer manuellement :
pip install python-docx pypdf2 pillow pytesseract python-pptx langdetect openpyxl
```

### 5. Créer les dossiers nécessaires

```bash
cd /var/www  # ou votre racine projet
mkdir -p uploads logs app/tmp app/temp
chmod 770 uploads logs
chown www-data:www-data uploads logs  # Linux, adapter selon votre système
```

### 6. Configuration de la base de données

Importer le schéma de base de données :

```bash
mysql -u votre_user -p votre_database < app/script.sql
```

### 7. Configuration du serveur web

#### Apache

Créer un VirtualHost :

```apache
<VirtualHost *:80>
    ServerName wanatest.local
    DocumentRoot /var/www/app

    <Directory /var/www/app>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/wanatest_error.log
    CustomLog ${APACHE_LOG_DIR}/wanatest_access.log combined
</VirtualHost>
```

#### Nginx

```nginx
server {
    listen 80;
    server_name wanatest.local;
    root /var/www/app;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

### 8. Tester l'installation

Ouvrir dans le navigateur :
```
http://wanatest.local
```

Ou selon votre configuration locale.

## 📁 Structure du projet

```
wanatest/
├── app/
│   ├── assets/          # CSS, JS, images, vidéos
│   ├── bin/             # Binaires (ffmpeg, yt-dlp, etc.)
│   ├── config/          # Fichiers de configuration Google Cloud
│   ├── cron/            # Scripts cron (reminders)
│   ├── includes/        # Header, footer, helpers
│   ├── lang/            # Fichiers de traduction (fr, en, he, ar, ru)
│   ├── paypal/          # Intégration PayPal
│   ├── vendor/          # Dépendances PHP (via Composer)
│   ├── .venv/           # Environnement virtuel Python
│   ├── .env             # Configuration (NON versionné)
│   ├── .env.example     # Template de configuration
│   ├── config.php       # Configuration principale
│   ├── index.php        # Page d'accueil
│   ├── login.php        # Authentification
│   ├── register.php     # Inscription
│   ├── dashboard.php    # Tableau de bord utilisateur
│   ├── generate*.php    # APIs de génération de contenu
│   ├── view*.php        # Pages de visualisation
│   └── *List.php        # Pages de listing
├── uploads/             # Fichiers uploadés par les utilisateurs (NON versionné)
├── logs/                # Logs applicatifs (NON versionné)
├── .gitignore           # Fichiers exclus de Git
└── README.md            # Ce fichier
```

## 🔐 Sécurité

### Actions importantes après installation

1. **Régénérer toutes les clés API** si c'est un environnement de production
2. **Changer les credentials** de base de données
3. **Configurer HTTPS** avec Let's Encrypt
4. **Vérifier les permissions** des dossiers :
   - `uploads/` et `logs/` : 770 (www-data:www-data)
   - `.env` : 600 (accessible uniquement par le propriétaire)
5. **Désactiver display_errors** en production (php.ini)
6. **Configurer les backups** réguliers de la base de données

### Fichiers sensibles (ne JAMAIS commiter)

- `.env` - Contient toutes les clés secrètes
- `uploads/` - Données utilisateurs
- `logs/` - Contient des informations système
- `app/vendor/` - Dépendances (installer via Composer)
- `app/.venv/` - Environnement Python (créer localement)
- `app/config/*.json` - Credentials Google Cloud

## 🌍 Configuration multi-langues

Le système supporte 5 langues :
- Français (fr)
- Anglais (en)
- Hébreu (he) - RTL
- Arabe (ar) - RTL
- Russe (ru)

Les fichiers de traduction sont dans `app/lang/`.

Pour ajouter une langue :
1. Créer `app/lang/XX.php` basé sur `app/lang/en.php`
2. Ajouter la langue dans les listes de sélection
3. Ajouter le flag dans `app/assets/img/flags/XX.png`

## 💳 Configuration PayPal

1. Créer une application sur https://developer.paypal.com
2. Récupérer Client ID et Secret
3. Configurer le webhook pour les événements de paiement
4. Ajouter l'URL du webhook dans `.env`

Mode sandbox pour les tests, mode live pour la production.

## 📧 Configuration des emails (Brevo)

1. Créer un compte sur https://www.brevo.com
2. Générer une clé API
3. Créer des listes de contacts
4. Configurer les IDs dans `.env`

## 🐛 Dépannage

### Erreur "Vendor directory not found"
```bash
cd app && composer install
```

### Erreur "Python module not found"
```bash
cd app
source .venv/bin/activate
pip install [module_manquant]
```

### Erreur de permissions sur uploads/
```bash
chmod 770 uploads logs
chown www-data:www-data uploads logs
```

### Base de données inaccessible
Vérifier que MySQL est démarré et que les credentials dans `.env` sont corrects.

## 📝 TODO / Améliorations futures

- [ ] Ajouter protection CSRF sur tous les formulaires
- [ ] Implémenter des tests automatisés
- [ ] Refactoring vers architecture MVC
- [ ] Ajouter un système de cache (Redis)
- [ ] Mettre les jobs longs en queue
- [ ] Documentation API complète
- [ ] Améliorer la gestion d'erreurs
- [ ] Ajouter monitoring (Sentry, etc.)

## 📄 Licence

Propriétaire - Tous droits réservés

## 👥 Contact

Pour toute question ou support :
- Email : contact@wanatest.com
- Site : https://wanatest.com

---

**Note** : Ce projet est en développement actif. Des modifications importantes de l'architecture sont prévues.
