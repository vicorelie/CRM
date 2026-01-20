#!/bin/bash
#
# Script de backup complet pour CNK-DEM VTiger CRM
# Backup: Base de données + Fichiers
#

set -e

echo "========================================"
echo "  BACKUP COMPLET CNK-DEM VTIGER CRM"
echo "========================================"
echo ""

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/www/backups"
BACKUP_NAME="CNK-DEM_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

CRM_DIR="/var/www/CNK-DEM"
DB_NAME="cnk_dem"
DB_USER="cnk_dem_user"
DB_PASS="cedcff26783d08a13a92997c415db618"

# Créer le répertoire de backup
echo "📁 Création du répertoire de backup..."
mkdir -p "${BACKUP_PATH}"

# 1. BACKUP DE LA BASE DE DONNÉES
echo ""
echo "🗄️  Backup de la base de données..."
mysqldump -u"${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" | gzip > "${BACKUP_PATH}/cnk-dem-dump.sql.gz"
DB_SIZE=$(du -h "${BACKUP_PATH}/cnk-dem-dump.sql.gz" | cut -f1)
echo "   ✓ Base de données sauvegardée: ${DB_SIZE}"

# 2. BACKUP DES FICHIERS
echo ""
echo "📦 Backup des fichiers CRM..."
cd /var/www
tar czf "${BACKUP_PATH}/CNK-DEM_files.tar.gz" \
    --exclude='CNK-DEM/test/templates_c' \
    --exclude='CNK-DEM/cache' \
    --exclude='CNK-DEM/logs' \
    --exclude='CNK-DEM-bis' \
    CNK-DEM/

FILES_SIZE=$(du -h "${BACKUP_PATH}/CNK-DEM_files.tar.gz" | cut -f1)
echo "   ✓ Fichiers sauvegardés: ${FILES_SIZE}"

# Résumé
echo ""
echo "========================================"
echo "  ✅ BACKUP TERMINÉ AVEC SUCCÈS"
echo "========================================"
echo ""
echo "📁 Dossier de backup: ${BACKUP_PATH}"
echo ""
echo "Contenu du backup:"
echo "  • cnk-dem-dump.sql.gz (${DB_SIZE})"
echo "  • CNK-DEM_files.tar.gz (${FILES_SIZE})"
echo ""
echo "Pour restaurer ce backup:"
echo "  1. Base de données: gunzip -c ${BACKUP_PATH}/cnk-dem-dump.sql.gz | mysql -u${DB_USER} -p ${DB_NAME}"
echo "  2. Fichiers: tar xzf ${BACKUP_PATH}/CNK-DEM_files.tar.gz -C /var/www/"
echo ""
