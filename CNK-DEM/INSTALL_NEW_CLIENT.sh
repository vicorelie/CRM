#!/bin/bash
#####################################################
# Script d'installation CRM Vtiger pour nouveau client
# Usage: ./INSTALL_NEW_CLIENT.sh <nom_client> <domaine> [-y]
# Exemple: ./INSTALL_NEW_CLIENT.sh "MonClient" "moncrm.example.com"
# Option -y: mode non-interactif (pas de confirmation)
#####################################################

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction d'affichage
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

# Vérification des arguments
AUTO_CONFIRM=false
if [ "$3" == "-y" ] || [ "$3" == "--yes" ]; then
    AUTO_CONFIRM=true
fi

if [ $# -lt 2 ]; then
    print_error "Usage: $0 <nom_client> <domaine> [-y]"
    echo "Exemple: $0 'MonClient' 'moncrm.example.com'"
    echo "Option -y: mode non-interactif"
    exit 1
fi

CLIENT_NAME="$1"
DOMAIN="$2"
SAFE_NAME=$(echo "$CLIENT_NAME" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]')
DB_NAME="crm_${SAFE_NAME}"
DB_USER="crm_${SAFE_NAME}"
DB_PASS=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
CRM_PATH="/var/www/CRM/${CLIENT_NAME}"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Installation CRM Vtiger pour nouveau client           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
print_info "Client: $CLIENT_NAME"
print_info "Domaine: $DOMAIN"
print_info "Chemin: $CRM_PATH"
print_info "Base de données: $DB_NAME"
echo ""

# Demander confirmation
if [ "$AUTO_CONFIRM" = false ]; then
    read -p "Continuer? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Installation annulée"
        exit 1
    fi
fi

# 1. Copier le template CRM
print_status "Copie du template CRM..."
if [ -d "$CRM_PATH" ]; then
    print_error "Le répertoire $CRM_PATH existe déjà!"
    exit 1
fi
cp -a /var/www/CRM/CRM-TYPE "$CRM_PATH"

# 2. Créer la base de données
print_status "Création de la base de données..."
sudo -u mysql mariadb <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

# 3. Importer la structure de base
print_status "Import de la structure de base..."
sudo -u mysql mariadb ${DB_NAME} < /tmp/crm_template_full.sql

# 4. Mettre à jour la configuration
print_status "Configuration du CRM..."
# Générer une clé d'application unique
APP_KEY=$(openssl rand -hex 16)

# Remplacer les placeholders dans config.inc.php
sed -i "s|__SITE_URL__|https://${DOMAIN}/|g" ${CRM_PATH}/config.inc.php
sed -i "s|__ROOT_DIR__|${CRM_PATH}/|g" ${CRM_PATH}/config.inc.php
sed -i "s|__DB_NAME__|${DB_NAME}|g" ${CRM_PATH}/config.inc.php
sed -i "s|__DB_USER__|${DB_USER}|g" ${CRM_PATH}/config.inc.php
sed -i "s|__DB_PASS__|${DB_PASS}|g" ${CRM_PATH}/config.inc.php
sed -i "s|__APP_KEY__|${APP_KEY}|g" ${CRM_PATH}/config.inc.php

# 5. Mettre à jour la base de données
print_status "Mise à jour des paramètres..."
sudo -u mysql mariadb ${DB_NAME} <<EOF
UPDATE vtiger_organizationdetails SET 
    organizationname = '${CLIENT_NAME}',
    address = '',
    city = '',
    state = '',
    country = 'France',
    phone = '',
    website = '${DOMAIN}'
WHERE organization_id = 1;

-- Réinitialiser le mot de passe admin
UPDATE vtiger_users SET user_password = '\$1\$ad\$hsl2KnUiHsDhKzMK8FoSj0' WHERE id = 1;
EOF

# 6. Nettoyer les caches
print_status "Nettoyage des caches..."
rm -rf ${CRM_PATH}/cache/templates_c/*
rm -rf ${CRM_PATH}/cache/SOAP/*

# 7. Permissions
print_status "Configuration des permissions..."
chown -R www-data:www-data ${CRM_PATH}
chmod -R 775 ${CRM_PATH}/cache ${CRM_PATH}/storage ${CRM_PATH}/test ${CRM_PATH}/user_privileges

# 8. Créer le vhost Nginx
print_status "Création du vhost Nginx..."
cat > /etc/nginx/sites-available/${DOMAIN} <<EOFNGINX
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\\\$server_name\\\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    
    root ${CRM_PATH};
    index index.php index.html;
    
    autoindex off;
    
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    
    location / {
        try_files \\\$uri \\\$uri/ /index.php?\\\$query_string;
    }
    
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \\\$document_root\\\$fastcgi_script_name;
        include fastcgi_params;
    }
    
    location ~ /\.ht {
        deny all;
    }
}
EOFNGINX

# Activer le site (sans SSL pour l'instant)
print_info "Activation du site (HTTP uniquement pour l'instant)..."
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/

# Tester la configuration
nginx -t && systemctl reload nginx

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              Installation terminée avec succès!            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
print_info "INFORMATIONS D'ACCÈS:"
echo ""
echo "  URL (temporaire HTTP): http://${DOMAIN}/"
echo "  Utilisateur: admin"
echo "  Mot de passe: admin"
echo ""
print_info "BASE DE DONNÉES:"
echo ""
echo "  Nom: ${DB_NAME}"
echo "  Utilisateur: ${DB_USER}"
echo "  Mot de passe: ${DB_PASS}"
echo ""
print_info "PROCHAINES ÉTAPES:"
echo ""
echo "  1. Configurer le DNS pour pointer vers ce serveur"
echo "  2. Générer le certificat SSL:"
echo "     certbot --nginx -d ${DOMAIN}"
echo "  3. Se connecter et changer le mot de passe admin"
echo "  4. Configurer les informations de l'entreprise"
echo ""

# Sauvegarder les infos dans un fichier
cat > ${CRM_PATH}/INSTALLATION_INFO.txt <<EOFINFO
Installation effectuée le: $(date)
Client: ${CLIENT_NAME}
Domaine: ${DOMAIN}
Chemin: ${CRM_PATH}

Base de données:
  Nom: ${DB_NAME}
  Utilisateur: ${DB_USER}
  Mot de passe: ${DB_PASS}

Accès CRM:
  URL: https://${DOMAIN}/
  Utilisateur: admin
  Mot de passe: admin (À CHANGER!)

Configuration Nginx: /etc/nginx/sites-available/${DOMAIN}
EOFINFO

print_status "Informations sauvegardées dans: ${CRM_PATH}/INSTALLATION_INFO.txt"
echo ""
