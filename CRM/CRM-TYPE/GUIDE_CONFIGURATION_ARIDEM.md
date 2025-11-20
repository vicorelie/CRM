# 📦 GUIDE D'ADAPTATION CRM VTIGER POUR ARIDEM (DÉMÉNAGEMENT)

## 🏢 1. INFORMATIONS ENTREPRISE (À faire dans le CRM)

Allez dans **Paramètres > Paramètres de l'entreprise > Détails de l'entreprise**

- **Nom**: ARIDEM
- **Secteur**: Déménagement / Transport / Logistique
- **Adresse complète**: Votre adresse
- **Téléphone**: Votre numéro
- **Email**: contact@aridem.fr
- **Logo**: Uploadez le logo ARIDEM

---

## 📋 2. MODULES À ACTIVER/DÉSACTIVER

### Modules essentiels pour le déménagement:
✅ **Contacts** - Clients particuliers et professionnels
✅ **Organisations** - Entreprises clientes (déménagements d'entreprise)
✅ **Devis** - Estimations de déménagement
✅ **Factures** - Facturation des prestations
✅ **Projets** - Chaque déménagement = 1 projet
✅ **Calendrier** - Planning des déménagements
✅ **Documents** - Inventaires, photos, contrats

### À personnaliser:
- **Renommer "Opportunités"** → **"Demandes de déménagement"**
- **Renommer "Produits"** → **"Services"** (déménagement standard, longue distance, garde-meuble, etc.)

### Modules à désactiver (optionnel):
❌ Campagnes marketing (si pas utilisé)
❌ Tickets SAV (utiliser Projets à la place)

---

## 🎯 3. CHAMPS PERSONNALISÉS À CRÉER

### Pour le module "Demandes de déménagement" (Opportunités):

**Paramètres > Gestionnaire de modules > Opportunités > Champs**

1. **Type de déménagement** (Liste déroulante)
   - Déménagement résidentiel
   - Déménagement entreprise
   - Déménagement international
   - Déménagement longue distance
   - Déménagement local

2. **Volume estimé** (Nombre)
   - En m³

3. **Nombre de pièces** (Nombre)
   - Origine / Destination

4. **Étage origine** (Nombre)
5. **Étage destination** (Nombre)
6. **Ascenseur origine** (Case à cocher)
7. **Ascenseur destination** (Case à cocher)

8. **Date de déménagement souhaitée** (Date)
9. **Date de déménagement confirmée** (Date)

10. **Adresse complète origine** (Zone de texte)
11. **Adresse complète destination** (Zone de texte)
12. **Distance km** (Nombre)

13. **Services additionnels** (Multi-sélection)
    - Emballage
    - Déballage
    - Démontage meubles
    - Remontage meubles
    - Cartons fournis
    - Garde-meuble temporaire
    - Piano
    - Œuvres d'art
    - Nettoyage

14. **Statut du déménagement** (Liste déroulante)
    - Demande reçue
    - Devis envoyé
    - Devis accepté
    - Planifié
    - En cours
    - Terminé
    - Annulé

15. **Équipe assignée** (Nombre de déménageurs)
16. **Camion requis** (Liste déroulante)
    - 20m³
    - 30m³
    - 40m³
    - 60m³
    - Multiple

---

## 💼 4. CRÉER VOS SERVICES (PRODUITS)

**Ventes > Produits > Nouveau produit**

### Services de base:
1. **Déménagement standard local** (< 50km)
   - Prix/m³ ou forfait
   
2. **Déménagement longue distance** (> 50km)
   - Prix/m³ + km
   
3. **Déménagement express**
   - Majoration 30%

4. **Services complémentaires:**
   - Emballage (€/heure ou forfait)
   - Cartons (€/unité)
   - Démontage/Remontage meubles
   - Garde-meuble (€/m³/mois)
   - Transport piano
   - Assurance complémentaire

---

## 📊 5. PIPELINE DE VENTE PERSONNALISÉ

**Paramètres > Gestionnaire de modules > Opportunités > Pipelines**

Créer un pipeline "Déménagement":

1. **Demande reçue** (0%)
2. **Visite d'estimation** (20%)
3. **Devis envoyé** (40%)
4. **Négociation** (60%)
5. **Devis accepté** (80%)
6. **Acompte reçu** (90%)
7. **Déménagement planifié** (95%)
8. **Gagné** (100%)
9. **Perdu** (0%)

---

## 📅 6. WORKFLOWS AUTOMATIQUES À CRÉER

**Paramètres > Automation > Workflows**

### Workflow 1: Nouvelle demande de déménagement
**Déclencheur**: Nouvelle opportunité créée
**Actions**:
- Envoyer email de confirmation au client
- Créer tâche "Appeler client pour rendez-vous d'estimation"
- Notifier le commercial assigné

### Workflow 2: Devis envoyé
**Déclencheur**: Statut = "Devis envoyé"
**Actions**:
- Envoyer le devis par email
- Créer tâche de relance J+3
- Mettre à jour le pipeline

### Workflow 3: Déménagement confirmé
**Déclencheur**: Statut = "Devis accepté"
**Actions**:
- Créer un projet de déménagement
- Créer événement calendrier pour la date prévue
- Envoyer email de confirmation avec instructions
- Générer facture d'acompte

### Workflow 4: Rappel J-7
**Déclencheur**: 7 jours avant date de déménagement
**Actions**:
- Envoyer email de rappel client
- Créer tâche "Préparer camion et équipe"

### Workflow 5: Après déménagement
**Déclencheur**: 2 jours après date de déménagement
**Actions**:
- Envoyer email satisfaction client
- Créer tâche "Demander avis Google"

---

## 📧 7. MODÈLES D'EMAILS À CRÉER

**Paramètres > Modèles > Modèles d'emails**

1. **Confirmation de demande**
2. **Envoi de devis**
3. **Relance devis**
4. **Confirmation déménagement**
5. **Rappel J-7**
6. **Instructions veille déménagement**
7. **Remerciement après déménagement**
8. **Demande d'avis**

---

## 📄 8. MODÈLES DE DEVIS/FACTURES

**Paramètres > Modèles > Modèles de devis**

Personnaliser avec:
- Logo ARIDEM
- Détails des services
- Conditions générales de vente spécifiques au déménagement
- Mention légale transport
- Assurance

---

## 👥 9. RÔLES ET PERMISSIONS

**Paramètres > Utilisateurs > Rôles**

### Créer les rôles:
1. **Direction** - Accès total
2. **Commercial** - Créer devis, contacts, opportunités
3. **Chef d'équipe** - Voir planning, projets, mettre à jour statuts
4. **Déménageur** - Voir uniquement ses missions du jour
5. **Administration** - Facturation, comptabilité

---

## 📊 10. RAPPORTS ESSENTIELS À CRÉER

**Analytics > Rapports**

1. **Déménagements du mois**
   - Par statut, par commercial

2. **Taux de conversion devis**
   - Nb devis envoyés vs acceptés

3. **Chiffre d'affaires par type de déménagement**

4. **Planning des 30 prochains jours**

5. **Clients à relancer**

6. **Performance par commercial**

7. **Services les plus vendus**

---

## 🎨 11. PERSONNALISATION VISUELLE

1. **Changer le logo**: Paramètres > Entreprise > Logo
2. **Couleurs**: Paramètres > Apparence
3. **Modules visibles**: Paramètres > Gestionnaire de modules

---

## 📱 12. EXTENSIONS UTILES (OPTIONNEL)

- **Google Maps Integration** - Calcul automatique des distances
- **SMS Notifications** - Rappels SMS aux clients
- **Signature électronique** - Faire signer devis en ligne
- **Planning avancé** - Gestion d'équipe et camions

---

## ✅ CHECKLIST DE MISE EN ROUTE

- [ ] Mettre à jour infos entreprise
- [ ] Uploader logo ARIDEM
- [ ] Créer les services (produits)
- [ ] Créer champs personnalisés
- [ ] Configurer pipeline
- [ ] Créer modèles emails
- [ ] Créer workflows
- [ ] Créer rôles utilisateurs
- [ ] Importer contacts existants (si applicable)
- [ ] Former l'équipe

---

🎯 **VOTRE CRM SERA PRÊT À GÉRER:**
- Demandes de devis
- Planification des déménagements
- Suivi client
- Facturation
- Reporting et statistiques
- Gestion d'équipe

