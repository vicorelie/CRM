# Guide de Configuration CRM ARIDEM - Société de Déménagement

**Version**: 2.0  
**Date**: 19 Novembre 2024  
**CRM**: Vtiger 8.4.0  
**Domaine**: https://crm-aridem.webama.fr/

---

## 📋 Table des Matières

1. [Champs Personnalisés Configurés](#champs-personnalisés-configurés)
2. [Modules et Pipeline](#modules-et-pipeline)
3. [Workflows Automatiques](#workflows-automatiques)
4. [Configuration Email](#configuration-email)
5. [Intégration avec Comparateur](#intégration-avec-comparateur)
6. [Rapports et Tableaux de Bord](#rapports-et-tableaux-de-bord)

---

## 🎯 Champs Personnalisés Configurés

### Module LEADS (Demandes de Devis)

✅ **Informations Géographiques Départ**:
- `cf_adresse_complete_depart` - Adresse départ (Text)
- `cf_code_postal_depart` - Code postal départ (Text)
- `cf_departement_depart` - Département départ (Text)
- `cf_ville_depart` - Ville départ (Text)

✅ **Informations Géographiques Arrivée**:
- `cf_adresse_complete_arrivee` - Adresse arrivée (Text)
- `cf_code_postal_arrivee` - Code postal arrivée (Text)
- `cf_departement_arrivee` - Département arrivée (Text)
- `cf_ville_arrivee` - Ville arrivée (Text)

✅ **Détails du Déménagement**:
- `cf_date_demenagement_souhaitee` - Date souhaitée (Date)
- `cf_volume_pieces` - Volume (pièces) (Text)
- `cf_volume_m3_estime` - Volume estimé (m³) (Text)
- `cf_besoin_cartons` - Besoin cartons (Text)

✅ **Qualification**:
- `cf_societe_marque` - Société/Marque (Text)
- `cf_901` - Source du lead (Picklist)
- `cf_895` - Type de projet (Picklist)
- `cf_899` - Urgence (Picklist)

### Module POTENTIALS (Opportunités/Devis)

✅ **Localisation Origine**:
- `cf_adresse_complete_depart` - Adresse départ (Text)
- `cf_adresse_origine` - Adresse complète origine (Text Area)
- `cf_code_postal_depart` / `cf_code_postal_origine` - Code postal (Text)
- `cf_departement_depart` - Département départ (Text)
- `cf_ville_depart` / `cf_ville_origine` - Ville (Text)
- `cf_type_propriete_depart` - Type propriété départ (Checkbox)

✅ **Localisation Destination**:
- `cf_adresse_complete_arrivee` - Adresse arrivée (Text)
- `cf_adresse_destination` - Adresse complète destination (Text Area)
- `cf_code_postal_arrivee` / `cf_code_postal_destination` - Code postal (Text)
- `cf_departement_arrivee` - Département arrivée (Text)
- `cf_ville_arrivee` / `cf_ville_destination` - Ville (Text)

✅ **Calculs et Estimations**:
- `cf_distance_km` - Distance (km) (Decimal)
- `cf_volume_pieces` - Volume (pièces) (Text)
- `cf_volume_m3_estime` - Volume estimé (m³) (Text)
- `cf_volume_total_calcule` - Volume total calculé (m³) (Decimal - Auto-calculé)
- `cf_nombre_cartons_calcule` - Nombre de cartons calculé (Integer - Auto-calculé)

✅ **Planning**:
- `closingdate` - Période déménagement (Date)
- `cf_date_souhaitee` - Date souhaitée (Date)
- `cf_date_inventaire` - Date inventaire (DateTime)
- `cf_type_date` - Type de date (Checkbox)

✅ **Services**:
- `cf_besoin_cartons` - Besoin cartons (Checkbox)
- `cf_societe_marque` - Société/Marque (Checkbox)
- `cf_source_lead` - Source (Checkbox)

---

## 📊 Modules et Pipeline

### Pipeline de Vente Recommandé

**Étapes du Processus**:

1. **Prospection** 
   - Lead reçu depuis le comparateur aridem.webama.fr
   - Qualification initiale

2. **Qualification**
   - Vérification des informations
   - Calcul volume et distance
   - Estimation coût

3. **Visite/Inventaire** 
   - Planification visite sur site
   - Inventaire détaillé des biens
   - Photos et notes

4. **Devis Envoyé**
   - Génération du devis
   - Envoi au client
   - Suivi ouverture email

5. **Négociation**
   - Discussions avec le client
   - Ajustements tarifaires
   - Conditions spéciales

6. **Gagné/Perdu**
   - Signature contrat
   - Acompte reçu
   - Planification déménagement

### Modules Additionnels Configurés

**Products (Produits/Services)**:
- `cf_909` - Catégorie (Picklist)
- `cf_903` - Coût fournisseur (Decimal)
- `cf_907` - Fournisseur principal (Text)
- `cf_905` - Marge (Percentage)

**Services**:
- `cf_915` - Catégorie (Picklist)
- `cf_913` - Durée estimée (Integer)
- `cf_911` - Type de service (Picklist)

**Vendors (Fournisseurs)**:
- `cf_923` - Corps de métier (Picklist)
- `cf_919` - Délai moyen (Integer)
- `cf_917` - Type (Picklist)
- `cf_921` - Zones d'intervention (Text)

**Accounts (Organisations)**:
- `cf_925` - Adresse du chantier (Text)
- `cf_927` - Type de bien (Picklist)

---

## ⚙️ Workflows Automatiques

### Workflows Existants

1. **Contact - Notification Propriétaire** (ID: 3)
   - Condition: ON_EVERY_SAVE
   - Action: Envoi email quand NotifyOwner = True

2. **Contact - Portail Utilisateur** (ID: 4)
   - Condition: ON_MODIFY
   - Action: Email lors création compte portail

3. **Potential - Création Opportunité** (ID: 5)
   - Condition: ON_FIRST_SAVE
   - Action: Email aux utilisateurs

4. **Potential - Calcul Forecast** (ID: 12)
   - Condition: ON_MODIFY
   - Action: Mise à jour montant prévisionnel

### Workflows Recommandés à Ajouter

#### 1. Calcul Automatique Distance
```yaml
Module: Potentials
Trigger: ON_MODIFY
Conditions: 
  - Code postal départ changé OU
  - Code postal arrivée changé
Actions:
  - Calculer distance via API
  - Mettre à jour cf_distance_km
```

#### 2. Calcul Volume et Cartons
```yaml
Module: Potentials
Trigger: ON_MODIFY
Conditions:
  - cf_volume_pieces changé
Actions:
  - Calculer cf_volume_total_calcule
  - Calculer cf_nombre_cartons_calcule
  - Formule: volume_m3 = pieces × 15
  - Formule: cartons = volume_m3 × 8
```

#### 3. Notification Client - Devis Envoyé
```yaml
Module: Potentials
Trigger: ON_MODIFY
Conditions:
  - Sales Stage = "Devis Envoyé"
Actions:
  - Envoyer email client avec devis PDF
  - Créer tâche suivi J+3
```

#### 4. Conversion Lead → Potential
```yaml
Module: Leads
Trigger: ON_MODIFY
Conditions:
  - Lead Status = "Qualified"
Actions:
  - Convertir en Opportunity
  - Copier tous les champs cf_*
  - Créer Contact si n'existe pas
```

---

## 📧 Configuration Email

### Configuration SMTP Actuelle

```
Serveur: smtp-relay.brevo.com:587
Username: 937314001@smtp-brevo.com
From Email: contact@tcerenov-design.com
Authentication: Activée
Protocole: TLS
```

### Templates Email Recommandés

#### 1. Email Confirmation Demande
**Objet**: Votre demande de devis ARIDEM - Ref #{potential_no}

```html
Bonjour {contact_firstname},

Nous avons bien reçu votre demande de devis pour votre déménagement:

📍 Départ: {cf_ville_depart} ({cf_code_postal_depart})
📍 Arrivée: {cf_ville_arrivee} ({cf_code_postal_arrivee})
📅 Date souhaitée: {cf_date_souhaitee}
📦 Volume estimé: {cf_volume_m3_estime} m³

Notre équipe va étudier votre demande et vous contactera dans les 24h.

Cordialement,
L'équipe ARIDEM
```

#### 2. Email Envoi Devis
**Objet**: Votre devis ARIDEM #{quote_no}

```html
Bonjour {contact_firstname},

Veuillez trouver ci-joint votre devis personnalisé pour votre déménagement.

Détails:
- Distance: {cf_distance_km} km
- Volume: {cf_volume_total_calcule} m³
- Montant: {amount} €

Validité: 30 jours

Pour accepter ce devis, répondez simplement à cet email.

Cordialement,
L'équipe ARIDEM
```

---

## 🔗 Intégration avec Comparateur

### Flux de Données

**aridem.webama.fr** → **CRM ARIDEM**

#### API Endpoint à Créer
```php
// /var/www/CRM/ARIDEM/api/create_lead.php

POST /api/create_lead.php
{
  "ville_depart": "Paris",
  "code_postal_depart": "75001",
  "ville_arrivee": "Lyon",
  "code_postal_arrivee": "69001",
  "date_demenagement": "2024-12-15",
  "type_logement": "t3",
  "surface": 70,
  "nom_client": "Jean Dupont",
  "email_client": "jean@example.com",
  "telephone_client": "0612345678",
  "services": ["emballage", "monte-meuble"]
}
```

#### Mapping Champs
```
Comparateur → CRM Lead
─────────────────────────
ville_depart → cf_ville_depart
code_postal_depart → cf_code_postal_depart
ville_arrivee → cf_ville_arrivee
code_postal_arrivee → cf_code_postal_arrivee
date_demenagement → cf_date_demenagement_souhaitee
type_logement → cf_volume_pieces
nom_client → lastname
email_client → email
telephone_client → mobile
services → cf_besoin_cartons
```

---

## 📈 Rapports et Tableaux de Bord

### Rapports Essentiels

#### 1. Devis en Cours
**Filtres**:
- Module: Potentials
- Sales Stage: NOT IN (Closed Won, Closed Lost)
- Created Time: Last 30 Days

**Colonnes**:
- Nom client
- Ville départ → Ville arrivée
- Volume (m³)
- Distance (km)
- Montant
- Date souhaitée
- Responsable

#### 2. Taux de Conversion
**Métriques**:
- Leads créés / mois
- Leads qualifiés / total leads
- Devis envoyés / leads qualifiés
- Devis acceptés / devis envoyés
- CA moyen par déménagement

#### 3. Analyse Géographique
**Groupements**:
- Par département départ
- Par département arrivée
- Par distance (0-50km, 50-200km, 200km+)
- Par volume (<20m³, 20-50m³, 50m³+)

### Dashboard Recommandé

**Widgets**:
1. Total Opportunités en cours (Card)
2. Devis envoyés cette semaine (Card)
3. CA prévisionnel mois (Card)
4. Pipeline par étape (Funnel)
5. Devis par zone géographique (Map)
6. Volume moyen par type logement (Bar Chart)
7. Tendance mensuelle CA (Line Chart)
8. Top 5 clients (Table)

---

## 🎯 Actions Post-Configuration

### ✅ Checklist Finale

- [ ] Vérifier tous les champs personnalisés
- [ ] Configurer les picklists (Sources, Urgence, etc.)
- [ ] Créer les workflows de calcul automatique
- [ ] Paramétrer les templates email
- [ ] Créer l'API d'intégration comparateur
- [ ] Configurer les rapports essentiels
- [ ] Former les utilisateurs
- [ ] Tester le flux complet Lead → Devis → Facture
- [ ] Configurer les sauvegardes automatiques
- [ ] Activer les notifications email

### 📚 Documentation Associée

- **Comparateur**: /var/www/aridem/README.md
- **API Comparateur**: /var/www/aridem/api/
- **Base de données**: aridem_demenagement
- **CRM**: https://crm-aridem.webama.fr/

---

## 🔧 Maintenance

### Optimisations Appliquées

**PHP** (/etc/php/8.2/fpm/conf.d/99-vtiger.ini):
- max_execution_time = 600
- max_input_vars = 10000
- memory_limit = 512M
- upload_max_filesize = 50M

**MySQL** (/etc/mysql/mariadb.conf.d/99-vtiger.cnf):
- sql_mode = NO_ENGINE_SUBSTITUTION
- max_allowed_packet = 128M
- innodb_buffer_pool_size = 256M

**CRON**:
```bash
*/5 * * * * /usr/bin/php /var/www/CRM/ARIDEM/vtigercron.php >> /var/www/CRM/ARIDEM/logs/cron.log 2>&1
```

---

**Dernière mise à jour**: 19 Novembre 2024  
**Auteur**: Configuration automatique CRM ARIDEM
