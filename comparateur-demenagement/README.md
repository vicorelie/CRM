# 🚚 DéménagePro - Comparateur de Déménagement

Un comparateur moderne de devis de déménagement, inspiré de Sirelo.fr, développé avec des technologies web modernes et sécurisées.

---

## 📋 Table des Matières

- [Fonctionnalités](#fonctionnalités)
- [Technologies Utilisées](#technologies-utilisées)
- [Installation](#installation)
- [Structure du Projet](#structure-du-projet)
- [Configuration](#configuration)
- [API](#api)
- [Base de Données](#base-de-données)
- [Sécurité](#sécurité)
- [Utilisation](#utilisation)

---

## ✨ Fonctionnalités

### Pour les Clients
- ✅ **Formulaire multi-étapes** intuitif (3 étapes)
- ✅ **Validation en temps réel** des données
- ✅ **Obtention de devis gratuits** jusqu'à 5 déménageurs
- ✅ **Interface responsive** (mobile, tablette, desktop)
- ✅ **Design moderne** avec animations fluides

### Pour les Déménageurs
- ✅ Réception des demandes de devis
- ✅ Gestion des devis envoyés
- ✅ Système d'avis clients
- ✅ Dashboard de gestion (à développer)

### Fonctionnalités Techniques
- ✅ **Architecture sécurisée** avec PDO et prepared statements
- ✅ **Protection contre les injections SQL**
- ✅ **Validation complète** côté client et serveur
- ✅ **API REST** pour la communication
- ✅ **Base de données relationnelle** bien structurée

---

## 🛠️ Technologies Utilisées

### Frontend
- **HTML5** - Structure sémantique
- **CSS3** - Design moderne avec variables CSS
- **JavaScript ES6+** - Logique interactive
- **Font Awesome** - Icônes
- **Google Fonts** (Inter) - Typographie

### Backend
- **PHP 7.4+** - Langage serveur
- **MySQL 8.0** - Base de données
- **PDO** - Accès sécurisé à la base
- **JSON** - Format d'échange de données

### Sécurité
- ✅ Prepared statements (PDO)
- ✅ Validation des données
- ✅ Headers CORS configurés
- ✅ Protection XSS
- ✅ Filtrage des inputs

---

## 📦 Installation

### Prérequis
- PHP 7.4 ou supérieur
- MySQL 8.0 ou supérieur
- Apache ou Nginx
- Extension PHP PDO activée

### Étape 1 : Cloner/Copier le projet

```bash
# Le projet est déjà dans /var/www/comparateur-demenagement
cd /var/www/comparateur-demenagement
```

### Étape 2 : Créer la base de données

```bash
# La base est déjà créée, mais si besoin :
mysql -u root -p < database.sql
```

### Étape 3 : Configurer les permissions

```bash
# Donner les bonnes permissions
chown -R apache:apache /var/www/comparateur-demenagement
chmod -R 755 /var/www/comparateur-demenagement
chmod 600 api/*.php  # Protéger les fichiers API
```

### Étape 4 : Configurer le serveur web

#### Avec Apache

Créer `/etc/httpd/conf.d/comparateur-demenagement.conf` :

```apache
<VirtualHost *:80>
    ServerName demenagement.votredomaine.fr
    DocumentRoot /var/www/comparateur-demenagement

    <Directory /var/www/comparateur-demenagement>
        AllowOverride All
        Require all granted
        DirectoryIndex index.html
    </Directory>

    ErrorLog /var/log/httpd/demenagement-error.log
    CustomLog /var/log/httpd/demenagement-access.log combined
</VirtualHost>
```

#### Avec Nginx

Créer `/etc/nginx/conf.d/comparateur-demenagement.conf` :

```nginx
server {
    listen 80;
    server_name demenagement.votredomaine.fr;
    root /var/www/comparateur-demenagement;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php-fpm/php-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

### Étape 5 : Redémarrer le serveur web

```bash
# Apache
sudo systemctl restart httpd

# Nginx
sudo systemctl restart nginx
sudo systemctl restart php-fpm
```

---

## 📁 Structure du Projet

```
comparateur-demenagement/
├── index.html              # Page d'accueil
├── css/
│   └── style.css          # Styles CSS
├── js/
│   └── app.js             # Logique JavaScript
├── api/
│   └── submit-devis.php   # API de soumission
├── assets/
│   └── images/            # Images (logo, etc.)
├── database.sql           # Script de création DB
└── README.md              # Ce fichier
```

---

## ⚙️ Configuration

### Modifier la connexion à la base de données

Dans `api/submit-devis.php`, ligne 43 :

```php
$db = new Database(
    'localhost',                    // Host
    'comparateur_demenagement',     // Database name
    'root',                         // Username
    'VotreMotDePasse'              // Password
);
```

### Personnaliser les couleurs

Dans `css/style.css`, modifier les variables CSS :

```css
:root {
    --primary-color: #3184F9;      /* Couleur principale */
    --primary-dark: #2563EB;       /* Couleur foncée */
    --secondary-color: #10B981;    /* Couleur secondaire */
}
```

---

## 🔌 API

### Endpoint: Soumettre une demande de devis

**URL:** `POST /api/submit-devis.php`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
    "depart": "75001",
    "arrivee": "69001",
    "date_demenagement": "2025-12-15",
    "type_logement": "t3",
    "surface": 65,
    "services": ["emballage", "demontage"],
    "nom": "Jean Dupont",
    "email": "jean.dupont@exemple.fr",
    "telephone": "0612345678",
    "consent": true
}
```

**Réponse (succès):**
```json
{
    "success": true,
    "message": "Demande envoyée avec succès",
    "data": {
        "id": 123,
        "uuid": "a1b2c3d4e5f6..."
    }
}
```

**Réponse (erreur):**
```json
{
    "success": false,
    "message": "Le champ 'email' est requis"
}
```

---

## 💾 Base de Données

### Tables Principales

#### `demandes_devis`
Stocke toutes les demandes de clients

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT | ID auto-incrémenté |
| uuid | VARCHAR(32) | Identifiant unique |
| ville_depart | VARCHAR(255) | Ville de départ |
| ville_arrivee | VARCHAR(255) | Ville d'arrivée |
| date_demenagement | DATE | Date souhaitée |
| type_logement | ENUM | studio, t2, t3, t4+ |
| nom_client | VARCHAR(255) | Nom du client |
| email_client | VARCHAR(255) | Email |
| statut | ENUM | nouveau, en_cours, termine, etc. |

#### `demenageurs`
Liste des déménageurs partenaires

#### `devis`
Devis envoyés par les déménageurs

#### `avis`
Avis clients sur les déménageurs

### Vues Disponibles

```sql
-- Statistiques globales
SELECT * FROM stats_globales;

-- Dernières demandes
SELECT * FROM demandes_recentes;
```

---

## 🔒 Sécurité

### Mesures de Sécurité Implémentées

✅ **Prepared Statements (PDO)** - Protection contre SQL injection
✅ **Validation des inputs** - Côté client et serveur
✅ **Filtrage email/téléphone** - Validation stricte
✅ **Headers CORS** - Accès contrôlé
✅ **Validation des dates** - Doit être dans le futur
✅ **Logs d'erreurs** - Traçabilité

### Bonnes Pratiques

```php
// ✅ BON - Prepared statements
$db->query("SELECT * FROM users WHERE email = ?");
$db->execute([$email]);

// ❌ MAUVAIS - Concaténation directe
$query = "SELECT * FROM users WHERE email = '$email'";
```

---

## 📱 Utilisation

### Pour les Clients

1. **Accéder au site** : https://demenagement.votredomaine.fr
2. **Remplir le formulaire** en 3 étapes :
   - Étape 1 : Informations du déménagement
   - Étape 2 : Volume et services
   - Étape 3 : Coordonnées
3. **Soumettre** la demande
4. **Recevoir** jusqu'à 5 devis sous 24h

### Pour les Administrateurs

```sql
-- Voir les dernières demandes
SELECT * FROM demandes_recentes;

-- Statistiques du jour
SELECT COUNT(*) as demandes_aujourdhui
FROM demandes_devis
WHERE DATE(created_at) = CURDATE();

-- Déménageurs les plus actifs
SELECT d.nom_entreprise, COUNT(dv.id) as nb_devis
FROM demenageurs d
LEFT JOIN devis dv ON d.id = dv.id_demenageur
GROUP BY d.id
ORDER BY nb_devis DESC;
```

---

## 🚀 Prochaines Fonctionnalités

### À Développer

- [ ] Dashboard administrateur
- [ ] Espace déménageur (connexion, gestion devis)
- [ ] Envoi d'emails automatiques
- [ ] Système de notation des déménageurs
- [ ] Calculateur de volume avancé
- [ ] Blog de conseils déménagement
- [ ] Comparateur de devis côté client
- [ ] Paiement en ligne des arrhes
- [ ] Suivi du déménagement en temps réel

---

## 🐛 Dépannage

### Erreur: "Cannot connect to database"

```bash
# Vérifier que MySQL est démarré
sudo systemctl status mysql

# Vérifier les credentials dans submit-devis.php
```

### Erreur: "Class Database not found"

```bash
# Vérifier que Database.php existe dans /var/www/api/dev/
ls -l /var/www/api/dev/Database.php

# Vérifier le chemin dans submit-devis.php ligne 10
```

### Le formulaire ne s'affiche pas

```bash
# Vérifier les erreurs JavaScript dans la console navigateur (F12)
# Vérifier que les fichiers CSS et JS sont bien chargés
```

---

## 📞 Support

Pour toute question ou problème :
- Email: support@demenagepro.fr
- Docs: /var/www/comparateur-demenagement/README.md
- Logs: /var/log/httpd/ ou /var/log/nginx/

---

## 📄 Licence

Ce projet est développé pour usage interne.

---

## 👨‍💻 Développeur

Créé par **Claude Code**
Date: 2025-11-10
Version: 1.0.0

---

## 📝 Changelog

### Version 1.0.0 (2025-11-10)
- ✅ Création du projet
- ✅ Formulaire multi-étapes
- ✅ API sécurisée avec PDO
- ✅ Base de données complète
- ✅ Design responsive
- ✅ Validation complète
- ✅ Documentation

---

**🎉 Prêt à recevoir vos premières demandes de devis !**
