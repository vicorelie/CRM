#!/bin/bash

#########################################################
# Script d'installation automatique
# Comparateur de Déménagement
#########################################################

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  🚀 Installation - Comparateur de Déménagement           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
function print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function print_error() {
    echo -e "${RED}❌ $1${NC}"
}

function print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Vérifier que le script est exécuté dans le bon répertoire
if [ ! -f "setup_database.sql" ]; then
    print_error "Fichier setup_database.sql introuvable!"
    print_info "Veuillez exécuter ce script depuis le répertoire /var/www/comparateur-demenagement/"
    exit 1
fi

# Demander les credentials MySQL
echo "Configuration de la base de données:"
echo "─────────────────────────────────────"
read -p "Host MySQL [127.0.0.1]: " DB_HOST
DB_HOST=${DB_HOST:-127.0.0.1}

read -p "Utilisateur MySQL: " DB_USER
if [ -z "$DB_USER" ]; then
    print_error "L'utilisateur MySQL est requis"
    exit 1
fi

read -sp "Mot de passe MySQL: " DB_PASS
echo ""
if [ -z "$DB_PASS" ]; then
    print_error "Le mot de passe MySQL est requis"
    exit 1
fi

read -p "Nom de la base de données [comparateur_demenagement]: " DB_NAME
DB_NAME=${DB_NAME:-comparateur_demenagement}

echo ""
echo "─────────────────────────────────────"
echo "Paramètres:"
echo "  Host: $DB_HOST"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo "─────────────────────────────────────"
read -p "Continuer? [y/N]: " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    print_info "Installation annulée"
    exit 0
fi

echo ""
echo "📦 Étape 1: Création de la base de données"
echo "─────────────────────────────────────"

# Tester la connexion MySQL
if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1" > /dev/null 2>&1; then
    print_success "Connexion MySQL réussie"
else
    print_error "Impossible de se connecter à MySQL"
    print_info "Vérifiez vos credentials et réessayez"
    exit 1
fi

# Créer la base de données
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null

if [ $? -eq 0 ]; then
    print_success "Base de données '$DB_NAME' créée/vérifiée"
else
    print_error "Erreur lors de la création de la base de données"
    print_info "Vous devrez peut-être créer la base manuellement via cPanel/phpMyAdmin"
    DB_EXISTS_CHECK=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "SHOW DATABASES LIKE '$DB_NAME';" 2>/dev/null | grep "$DB_NAME")

    if [ -z "$DB_EXISTS_CHECK" ]; then
        print_error "La base de données n'existe pas et n'a pas pu être créée"
        print_info "Créez la base '$DB_NAME' manuellement puis relancez ce script"
        exit 1
    else
        print_info "La base existe déjà, on continue..."
    fi
fi

echo ""
echo "📥 Étape 2: Import des tables et données"
echo "─────────────────────────────────────"

# Importer le fichier SQL
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < setup_database.sql 2>/dev/null

if [ $? -eq 0 ]; then
    print_success "Tables et données importées"
else
    print_error "Erreur lors de l'import SQL"
    print_info "Essayez d'importer manuellement via phpMyAdmin"
    exit 1
fi

echo ""
echo "⚙️  Étape 3: Configuration du fichier config.php"
echo "─────────────────────────────────────"

# Mettre à jour config.php avec les bons credentials
if [ -f "config.php" ]; then
    # Backup du fichier original
    cp config.php config.php.backup
    print_info "Backup créé: config.php.backup"

    # Remplacer les valeurs
    sed -i "s/define('DB_HOST', '.*');/define('DB_HOST', '$DB_HOST');/" config.php
    sed -i "s/define('DB_NAME', '.*');/define('DB_NAME', '$DB_NAME');/" config.php
    sed -i "s/define('DB_USER', '.*');/define('DB_USER', '$DB_USER');/" config.php
    sed -i "s/define('DB_PASS', '.*');/define('DB_PASS', '$DB_PASS');/" config.php

    print_success "Fichier config.php mis à jour"
else
    print_error "Fichier config.php introuvable"
    exit 1
fi

echo ""
echo "🧪 Étape 4: Tests de vérification"
echo "─────────────────────────────────────"

# Vérifier que les tables existent
TABLES=("demandes_devis" "demenageurs" "devis" "avis")
ALL_TABLES_OK=true

for TABLE in "${TABLES[@]}"; do
    RESULT=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES LIKE '$TABLE';" 2>/dev/null | grep "$TABLE")
    if [ -n "$RESULT" ]; then
        print_success "Table '$TABLE' existe"
    else
        print_error "Table '$TABLE' manquante"
        ALL_TABLES_OK=false
    fi
done

# Vérifier les déménageurs de test
DEMENAGEURS_COUNT=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT COUNT(*) FROM demenageurs;" 2>/dev/null | tail -1)
if [ "$DEMENAGEURS_COUNT" -ge 5 ]; then
    print_success "$DEMENAGEURS_COUNT déménageurs trouvés"
else
    print_error "Seulement $DEMENAGEURS_COUNT déménageurs (attendu: 5)"
    ALL_TABLES_OK=false
fi

echo ""
echo "📁 Étape 5: Vérification des fichiers"
echo "─────────────────────────────────────"

FILES_TO_CHECK=(
    "index.html"
    "config.php"
    "api/submit-devis.php"
    "../../api/dev/Database.php"
    "css/style.css"
    "js/app.js"
)

ALL_FILES_OK=true

for FILE in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$FILE" ]; then
        print_success "Fichier '$FILE' existe"
    else
        print_error "Fichier '$FILE' manquant"
        ALL_FILES_OK=false
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"

if [ "$ALL_TABLES_OK" = true ] && [ "$ALL_FILES_OK" = true ]; then
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║  ✅ INSTALLATION RÉUSSIE!                                 ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "🌐 Accès au site:"
    echo "   https://spots101.spotifone.com/comparateur-demenagement/"
    echo ""
    echo "🧪 Test de connexion:"
    echo "   https://spots101.spotifone.com/comparateur-demenagement/test_db.php"
    echo ""
    echo "📖 Documentation:"
    echo "   cat INSTALLATION.md"
    echo ""
else
    echo -e "${RED}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║  ⚠️  INSTALLATION INCOMPLÈTE                              ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "Consultez le fichier INSTALLATION.md pour résoudre les problèmes"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
