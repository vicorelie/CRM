#!/bin/bash
# Backup quotidien de la BDD WanaPush.
#
# Stratégie :
#   - mysqldump → fichier compressé gzip horodaté
#   - Conserve 30 jours en local
#   - Logs dans /var/log/wanapush-backup.log
#   - Code de sortie != 0 si échec → cron envoie un mail au root
#
# Setup :
#   chmod +x /var/www/wanapush/scripts/backup-db.sh
#   sudo cp /var/www/wanapush/scripts/wanapush-backup.cron /etc/cron.d/wanapush-backup
#
# ⚠️ Le script lit DATABASE_URL depuis .env.local — ne pas hardcoder les creds.

set -euo pipefail

WANAPUSH_DIR="/var/www/wanapush"
BACKUP_DIR="/var/backups/wanapush/daily"
LOG_FILE="/var/log/wanapush-backup.log"
RETENTION_DAYS=30

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

err() {
  log "ERROR: $*"
  echo "ERROR: $*" >&2
  exit 1
}

mkdir -p "$BACKUP_DIR"
touch "$LOG_FILE"

# Parse DATABASE_URL depuis .env.local. Format attendu :
# mysql://USER:PASS@HOST:PORT/DBNAME
ENV_FILE="$WANAPUSH_DIR/.env.local"
[ -f "$ENV_FILE" ] || err ".env.local introuvable à $ENV_FILE"

DB_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"')
[ -z "$DB_URL" ] && err "DATABASE_URL absent ou vide dans $ENV_FILE"

# Extraction des composants (regex compatible bash)
if [[ "$DB_URL" =~ mysql://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/(.+) ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASS="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]:-3306}"
  DB_NAME="${BASH_REMATCH[5]%%\?*}"  # vire les query params éventuels
else
  err "DATABASE_URL ne matche pas mysql://USER:PASS@HOST[:PORT]/DBNAME"
fi

TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
OUTPUT="$BACKUP_DIR/wanapush_${TIMESTAMP}.sql.gz"

log "Backup démarré : $DB_NAME → $OUTPUT"

# Dump compressé. --single-transaction permet un snapshot cohérent sans
# verrouiller les tables (OK pour InnoDB, parfait pour Prisma).
# --quick + --skip-extended-insert = streaming économe en mémoire.
MYSQL_PWD="$DB_PASS" mysqldump \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
  --single-transaction \
  --quick \
  --skip-extended-insert \
  --default-character-set=utf8mb4 \
  --routines \
  --triggers \
  --events \
  "$DB_NAME" 2>>"$LOG_FILE" | gzip > "$OUTPUT" || err "mysqldump a échoué"

# Vérif basique : le fichier existe et fait > 1 KB (un dump vide = échec silencieux)
SIZE=$(stat -c %s "$OUTPUT" 2>/dev/null || echo 0)
if [ "$SIZE" -lt 1024 ]; then
  err "Backup trop petit ($SIZE bytes) — probablement vide ou corrompu"
fi

log "Backup OK : $(du -h "$OUTPUT" | cut -f1)"

# Purge des anciens backups
DELETED=$(find "$BACKUP_DIR" -name 'wanapush_*.sql.gz' -mtime "+$RETENTION_DAYS" -print -delete | wc -l)
[ "$DELETED" -gt 0 ] && log "Purge : $DELETED ancien(s) backup(s) supprimé(s)"

log "Backup terminé"
