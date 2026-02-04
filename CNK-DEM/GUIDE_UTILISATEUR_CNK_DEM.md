# Guide Utilisateur CNK-DEM CRM

## Introduction

Bienvenue dans le guide d'utilisation du CRM CNK-DEM. Ce document vous accompagnera dans l'utilisation quotidienne du système pour gérer vos contacts, devis, factures et paiements.

---

## Table des matières

1. [Connexion au CRM](#1-connexion-au-crm)
2. [Navigation générale](#2-navigation-générale)
3. [Gestion des contacts](#3-gestion-des-contacts)
4. [Gestion des affaires (Potentiels)](#4-gestion-des-affaires-potentiels)
5. [Vue unifiée de gestion client](#5-vue-unifiée-de-gestion-client)
6. [Création de devis](#6-création-de-devis)
7. [Création rapide de devis (Popup)](#7-création-rapide-de-devis-popup)
8. [Gestion des paiements Stripe](#8-gestion-des-paiements-stripe)
9. [Génération de factures](#9-génération-de-factures)
10. [Génération de PDF](#10-génération-de-pdf)
11. [Envoi de devis par email](#11-envoi-de-devis-par-email)
12. [Bon de Commande (ODM)](#12-bon-de-commande-odm)
13. [Rappels et notifications](#13-rappels-et-notifications)
14. [Maintenance et administration](#14-maintenance-et-administration)

---

## 1. Connexion au CRM

### Accès au système

1. Ouvrez votre navigateur (Chrome, Firefox, Edge)
2. Allez sur : **https://crm.cnkdem.com**
3. Entrez vos identifiants :
   - **Nom d'utilisateur** : votre email ou identifiant
   - **Mot de passe** : votre mot de passe
4. Cliquez sur **Connexion**

### Première connexion

Lors de votre première connexion, il est recommandé de :
- Modifier votre mot de passe
- Vérifier vos informations de profil
- Configurer votre signature email

---

## 2. Navigation générale

### Menu principal (barre supérieure)

| Icône/Menu | Description |
|------------|-------------|
| **Accueil** | Tableau de bord avec vue d'ensemble |
| **Contacts** | Liste de tous vos contacts |
| **Organisations** | Liste des entreprises clientes |
| **Affaires** | Opportunités commerciales en cours |
| **Devis** | Liste de tous les devis |
| **Factures** | Liste de toutes les factures |
| **Calendrier** | Planning et rendez-vous |

### Recherche globale

- Utilisez la **barre de recherche** en haut pour trouver rapidement :
  - Un contact par nom ou email
  - Un devis par numéro
  - Une facture par référence

### Filtres et vues

Dans chaque module (Contacts, Devis, etc.) :
- **Filtres rapides** : cliquez sur les filtres à gauche
- **Recherche avancée** : cliquez sur l'icône entonnoir
- **Tri** : cliquez sur les en-têtes de colonnes

---

## 3. Gestion des contacts

### Créer un nouveau contact

1. Allez dans **Contacts**
2. Cliquez sur **+ Ajouter un contact**
3. Remplissez les informations :
   - **Civilité** : M., Mme, etc.
   - **Prénom** et **Nom** (obligatoires)
   - **Email** (important pour les paiements)
   - **Téléphone**
   - **Adresse complète**
4. Cliquez sur **Enregistrer**

### Informations importantes

> **Email obligatoire** : L'email du contact est nécessaire pour envoyer les liens de paiement Stripe.

### Modifier un contact

1. Ouvrez la fiche du contact
2. Cliquez sur le bouton **Modifier** (icône crayon)
3. Effectuez vos modifications
4. Cliquez sur **Enregistrer**

---

## 4. Gestion des affaires (Potentiels)

### Créer une affaire

1. Allez dans **Affaires**
2. Cliquez sur **+ Ajouter une affaire**
3. Remplissez :
   - **Nom de l'affaire** : description courte
   - **Contact** : sélectionnez le contact concerné
   - **Montant** : estimation du montant
   - **Date de clôture prévue**
   - **Étape** : Prospection, Négociation, etc.
4. Cliquez sur **Enregistrer**

### Suivi des affaires

- **Vue Kanban** : visualisez vos affaires par étape
- **Convertir en devis** : depuis une affaire, créez directement un devis
- **Vue unifiée** : accédez à la gestion complète du client (voir section suivante)

---

## 5. Vue unifiée de gestion client

La vue unifiée est une interface moderne qui centralise toutes les informations et actions liées à un client. Elle permet de gérer devis, carte, inventaire et détails depuis une seule page.

### Accéder à la vue unifiée

1. Ouvrez une **Affaire**
2. Cliquez sur le bouton **Gestion client** (icône grille)
3. La vue unifiée s'ouvre avec 4 onglets

### Les 4 onglets

| Onglet | Icône | Description |
|--------|-------|-------------|
| **Détails** | ℹ️ | Informations générales du client et de l'affaire |
| **Devis** | 📄 | Gestion des devis : création, modification, envoi |
| **Google Map** | 📍 | Visualisation des adresses de départ/arrivée avec calcul de distance |
| **Inventaire** | 📦 | Gestion de l'inventaire des biens à déménager |

### Onglet Devis

L'onglet Devis offre une interface complète pour gérer les devis :

#### Sélection des devis existants
- Les devis existants sont affichés sous forme de **chips** (pastilles)
- Cliquez sur un chip pour charger le devis
- Les devis **validés** ont un contour vert
- Le devis sélectionné est mis en surbrillance

#### Formulaire de devis
Le formulaire permet de créer ou modifier un devis avec :
- **Sujet** et **Date de validité**
- **Type de formule** : ECO, ECO PLUS, CONFORT, LUXE
- **Type de déménagement** : Groupage, Spécial
- **Forfait HT/TTC** et **Supplément**
- **Produits et services** avec recherche dynamique
- **Assurance**

#### Actions rapides (boutons en haut)
Quand un devis est sélectionné, trois boutons apparaissent :

| Bouton | Action |
|--------|--------|
| **💳 Paiement** | Ouvre le modal de gestion des paiements Stripe |
| **📋 ODM** | Génère un Ordre de Mission (Bon de Commande) |
| **📄 PDF** | Affiche le PDF du devis sélectionné |

#### Génération de PDF et envoi par email
1. Sélectionnez un ou plusieurs **modèles PDF** en cliquant dessus
2. Cliquez sur **Tout** pour tout sélectionner/désélectionner
3. Entrez l'**email du destinataire**
4. Cliquez sur **📧 Envoyer mail** pour envoyer les PDF par email

### Onglet Google Map

L'onglet Google Map affiche :
- L'**adresse de départ** (icône verte)
- L'**adresse d'arrivée** (icône rouge)
- La **carte interactive** avec l'itinéraire
- La **distance** calculée automatiquement

### Onglet Inventaire

L'onglet Inventaire permet de :
- Ajouter des éléments à l'inventaire par catégorie
- Calculer automatiquement le **volume total** en m³
- Utiliser les boutons +/- pour ajuster les quantités

---

## 6. Création de devis (mode classique)

### Créer un devis standard

1. Allez dans **Devis**
2. Cliquez sur **+ Ajouter un devis**
3. Remplissez les informations de base :
   - **Sujet** : titre du devis
   - **Contact** : client concerné
   - **Affaire** : liez à une affaire si applicable

### Section Forfait

Renseignez les informations de forfait :

| Champ | Description |
|-------|-------------|
| **Type de forfait** | Économique, Standard, Premium |
| **Type de déménagement** | Local, National, International |
| **Forfait Tarif HT** | Montant HT du forfait de base |
| **Forfait Supplément** | Suppléments éventuels |
| **Forfait Tarif TTC** | Calculé automatiquement |
| **Forfait + Supplément TTC** | Total forfait TTC |

### Section Paiements

| Champ | Description |
|-------|-------------|
| **Acompte TTC** | Montant de l'acompte demandé |
| **Solde TTC** | Montant restant à payer |
| **Statut Acompte** | Non payé / Partiel / Payé |
| **Statut Solde** | Non payé / Partiel / Payé |

### Ajouter des produits/services

1. Dans la section **Produits**
2. Cliquez sur **+ Ajouter une ligne**
3. Sélectionnez le produit ou tapez une description
4. Indiquez la quantité et le prix unitaire
5. Le total se calcule automatiquement

### Enregistrer le devis

Cliquez sur **Enregistrer** pour créer le devis.

---

## 7. Création rapide de devis (Popup)

### Accéder au formulaire rapide

Le formulaire popup permet de créer un devis rapidement depuis une affaire :

1. Ouvrez une **Affaire**
2. Cliquez sur le bouton **Créer Devis** (popup)
3. Le formulaire s'ouvre avec les informations pré-remplies

### Remplir le formulaire popup

Le formulaire est organisé en sections :

#### Section Contact
- Nom, prénom, email, téléphone
- Adresses de départ et d'arrivée

#### Section Forfait
- Type de forfait et de déménagement
- Tarifs HT et suppléments
- Totaux TTC calculés automatiquement

#### Section Assurance
- Montant couvert
- Tarif de l'assurance

#### Section Paiements
- Montant acompte
- Montant solde
- Reste à payer (calculé)

### Générer le devis

1. Vérifiez toutes les informations
2. Cliquez sur **Générer le devis**
3. Le devis est créé et vous êtes redirigé vers sa fiche

---

## 8. Gestion des paiements Stripe

### Accéder à la gestion des paiements

1. Ouvrez un **Devis**
2. Cliquez sur le bouton **Gérer paiements Stripe**
3. Le modal de gestion s'ouvre

### Comprendre le tableau de bord

Le modal affiche trois zones :

#### 1. Résumé des montants

| Montant | Description |
|---------|-------------|
| **Total Acompte** | Montant total de l'acompte prévu |
| **Total Solde** | Montant total du solde prévu |
| **Total Général** | Somme acompte + solde |
| **Déjà payé** | Montant reçu (en vert) |
| **En attente** | Paiements en cours (en jaune) |
| **Reste à payer** | Montant restant (en rouge si > 0) |

#### 2. Historique des paiements

Liste de tous les paiements avec :
- **Date** : date de création et de paiement
- **Description** : Acompte, Solde, etc.
- **Montant** : somme du paiement
- **Statut** : En attente, Payé, Échoué, Annulé
- **Actions** : boutons d'action (voir ci-dessous)

#### 3. Créer un nouveau paiement

Formulaire pour créer un paiement.

### Créer un lien de paiement Stripe

1. Dans le modal, section **Créer un nouveau paiement**
2. Sélectionnez **Carte bancaire (Stripe)**
3. Entrez le **montant** souhaité
4. Ajoutez une **description** (ex: "Acompte déménagement")
5. Cliquez sur **Générer lien Stripe**
6. Le lien est créé et apparaît dans l'historique

### Enregistrer un paiement manuel

Pour les paiements reçus par virement, chèque ou espèces :

1. Sélectionnez la **méthode de paiement** :
   - Virement bancaire
   - Espèces
   - Chèque
   - Autre
2. Entrez le **montant**
3. Ajoutez une **description**
4. Cochez **"Marquer comme déjà payé"** si le paiement est reçu
5. Cliquez sur **Enregistrer le paiement**

### Actions sur les paiements

| Icône | Action |
|-------|--------|
| 🔗 (bleu) | Ouvrir le lien de paiement Stripe |
| 📋 (gris) | Copier le lien dans le presse-papier |
| ✉️ (bleu) | Envoyer le lien par email au client |
| 📄 (vert) | Voir la facture PDF associée |
| ✏️ (orange) | Modifier le statut du paiement |
| 🗑️ (rouge) | Supprimer le paiement (si non payé) |

### Envoyer un lien par email

1. Cliquez sur l'icône **✉️ Email**
2. Un aperçu de l'email s'affiche
3. Vérifiez/modifiez l'email du destinataire
4. Vérifiez le sujet
5. Cliquez sur **Envoyer**

L'email contient :
- Un design professionnel avec votre logo
- Les détails du paiement
- Un bouton "Payer maintenant"
- Vos coordonnées

### Modifier le statut d'un paiement

1. Cliquez sur l'icône **✏️ Modifier**
2. Sélectionnez le nouveau statut :
   - **En attente** : paiement créé, non reçu
   - **Payé** : paiement reçu et validé
   - **Échoué** : paiement refusé
   - **Annulé** : paiement annulé
3. Cliquez sur **Enregistrer**

> **Note** : Passer un paiement en "Payé" génère automatiquement une facture.

---

## 9. Génération de factures

### Génération automatique

Les factures sont générées automatiquement quand :
- Un paiement Stripe est validé (webhook)
- Un paiement manuel est marqué comme "Payé"
- Vous changez le statut d'un paiement en "Payé"

### Voir une facture

Depuis le modal de paiements :
1. Repérez le paiement payé (statut vert)
2. Cliquez sur l'icône **📄 PDF** (bouton vert)
3. La facture s'ouvre dans un nouvel onglet

### Contenu de la facture

La facture générée contient :
- Numéro de facture unique
- Date de facturation
- Informations du client (depuis le contact)
- Détail des produits (copiés depuis le devis)
- Montants et TVA
- Référence du devis d'origine

---

## 10. Génération de PDF

### Générer un PDF de devis

1. Ouvrez le **Devis**
2. Dans le panneau latéral, section **PDF Maker**
3. Sélectionnez le template :
   - **DEVIS (CNK DEM)** : devis standard
   - **DEVIS SOCIÉTÉ(CNK DEM)** : devis entreprise
4. Cliquez sur **Télécharger** ou **Aperçu**

### Générer un PDF de facture

1. Ouvrez la **Facture**
2. Dans le panneau latéral, section **PDF Maker**
3. Sélectionnez le template :
   - **FACTURE (CNK DEM)** : facture standard
4. Cliquez sur **Télécharger** ou **Aperçu**

### Envoyer un PDF par email

1. Générez l'aperçu du PDF
2. Cliquez sur **Envoyer par email**
3. Sélectionnez le destinataire
4. Personnalisez le message si nécessaire
5. Cliquez sur **Envoyer**

---

## 11. Envoi de devis par email

### Depuis la vue unifiée

La méthode la plus simple pour envoyer des devis PDF par email :

1. Ouvrez la **Vue unifiée** d'une affaire
2. Allez dans l'onglet **Devis**
3. Sélectionnez un devis existant
4. Dans la section **Documents PDF** :
   - Cochez les modèles de PDF à envoyer
   - Vérifiez l'email du destinataire
5. Cliquez sur **📧 Envoyer mail**

### Contenu de l'email

L'email envoyé contient :
- Les PDF sélectionnés en pièces jointes
- Un message professionnel avec vos coordonnées
- Les détails du devis (numéro, montant)

### Depuis la fiche devis classique

1. Ouvrez un **Devis**
2. Dans le panneau latéral **PDF Maker**
3. Sélectionnez le template souhaité
4. Cliquez sur **Envoyer par email**

---

## 12. Bon de Commande (ODM)

Le Bon de Commande, aussi appelé **Ordre de Mission (ODM)**, est un document récapitulatif du déménagement.

### Générer un ODM

Depuis la **Vue unifiée** :

1. Sélectionnez le devis concerné
2. Cliquez sur le bouton **📋 ODM**
3. Le modal de génération s'ouvre
4. Vérifiez les informations :
   - Dates de déménagement
   - Adresses de départ/arrivée
   - Équipe assignée
   - Véhicules
5. Cliquez sur **Générer**

### Contenu de l'ODM

L'Ordre de Mission contient :
- Informations du client
- **Prestataire** (entreprise exécutante, récupéré du devis)
- Dates et horaires du déménagement (chargement/livraison)
- Adresses complètes (départ/arrivée) avec détails logistiques
- Volume et distance
- **Type de déménagement** (Groupage, Spécial)
- **Type de formule** (ECO, ECO PLUS, CONFORT, LUXE)
- Garantie assurance
- Matériel et produits associés
- Instructions particulières
- Montant à encaisser (solde)
- Zone de signature

### Champs automatiquement récupérés du devis

Lors de la création d'un ODM depuis un devis, les champs suivants sont automatiquement pré-remplis :
- Prestataire (entreprise exécutante)
- Adresse de facturation (depuis l'adresse du prestataire)
- Type de déménagement
- Type de formule
- Montants (forfait, assurance, acompte, solde)
- Produits et services

### Utilisation de l'ODM

L'ODM est destiné à :
- L'équipe de déménagement (feuille de route)
- Le chef d'équipe (planification)
- Le prestataire externe (si sous-traitance)
- L'archivage administratif

---

## 13. Rappels et notifications

### Créer un rappel

1. Ouvrez un enregistrement (Contact, Devis, Affaire)
2. Cliquez sur **+ Ajouter un rappel**
3. Remplissez :
   - **Date et heure** du rappel
   - **Description** : motif du rappel
4. Enregistrez

### Voir vos rappels

- Les rappels apparaissent sur votre **tableau de bord**
- Une notification popup s'affiche à l'heure prévue
- Vous pouvez les marquer comme "Terminé"

### Rappels automatiques

Le système peut envoyer des rappels automatiques pour :
- Devis en attente de réponse
- Paiements en attente
- Rendez-vous à venir

---

## Astuces et bonnes pratiques

### Organisation quotidienne

1. **Commencez par le tableau de bord** : vérifiez les tâches du jour
2. **Traitez les rappels** : ne laissez pas de rappels en retard
3. **Mettez à jour les statuts** : gardez les affaires à jour

### Gestion des devis

- **Numérotation automatique** : les devis sont numérotés automatiquement
- **Copier un devis** : utilisez "Dupliquer" pour créer un devis similaire
- **Historique** : consultez l'historique des modifications
- **Vue unifiée** : utilisez la vue unifiée pour gérer plusieurs devis rapidement

### Vue unifiée

- **Utilisez la vue unifiée** pour un accès rapide à toutes les fonctionnalités
- **Sélectionnez vos modèles PDF** avant d'envoyer par email
- **Vérifiez l'email** du destinataire avant l'envoi
- **Les devis validés** sont indiqués par un contour vert

### Paiements

- **Créez le lien avant d'appeler** : préparez le lien de paiement
- **Envoyez par email immédiatement** : le client a le lien sous les yeux
- **Vérifiez les statuts** : les paiements Stripe se mettent à jour automatiquement

---

## Résolution de problèmes

### Je ne trouve pas un contact

- Utilisez la **recherche globale** (barre en haut)
- Vérifiez les **filtres actifs** (désactivez-les)
- Cherchez par **email** ou **téléphone**

### Le bouton "Gérer paiements Stripe" n'apparaît pas

- Rafraîchissez la page (F5 ou Ctrl+R)
- Videz le cache du navigateur (Ctrl+Shift+Suppr)
- Vérifiez que vous êtes sur un **Devis** (pas une Facture)

### Un paiement Stripe n'est pas mis à jour

- Patientez quelques minutes (le webhook peut prendre du temps)
- Vérifiez dans le modal "Gérer paiements Stripe"
- Vous pouvez modifier le statut manuellement si nécessaire

### Le PDF ne s'ouvre pas

- Vérifiez que les popups sont autorisés dans votre navigateur
- Essayez avec un autre navigateur
- Cliquez sur "Télécharger" au lieu de "Aperçu"

### La vue unifiée ne charge pas

- Rafraîchissez la page (F5 ou Ctrl+R)
- Vérifiez votre connexion internet
- Videz le cache du navigateur (Ctrl+Shift+Suppr)
- Réessayez depuis la fiche affaire

### L'email avec les PDF n'est pas envoyé

- Vérifiez que l'adresse email est correcte
- Assurez-vous d'avoir sélectionné au moins un modèle PDF
- Vérifiez que le devis est bien chargé
- Consultez les logs si le problème persiste

### Le bouton ODM n'apparaît pas

- Assurez-vous d'avoir sélectionné un devis
- Rafraîchissez la page
- Vérifiez vos permissions utilisateur

---

## 14. Maintenance et administration

### Problème de création de champs

Si vous ne pouvez pas créer de nouveaux champs dans VTiger (le champ disparaît après rafraîchissement), exécutez le script de correction des séquences :

```bash
php /var/www/CNK-DEM/fix_sequences.php
```

Ce script vérifie et corrige les séquences d'ID désynchronisées dans la base de données.

### Vider le cache VTiger

En cas de problème d'affichage ou de fonctionnalités qui ne marchent pas :

```bash
rm -rf /var/www/CNK-DEM/cache/*
rm -rf /var/www/CNK-DEM/test/cache/*
```

Puis videz le cache de votre navigateur (Ctrl+Shift+R).

### Templates PDF

Les templates PDF personnalisés sont disponibles dans :
- `/var/www/CNK-DEM/docs/ODM_TEMPLATE_PDFMAKER_V2.html` - Template ODM

---

## Contacts et support

Pour toute question ou problème :

- **Email support** : [votre email support]
- **Téléphone** : [votre numéro]

---

*Document mis à jour : 4 Février 2026*
*Version CRM : CNK-DEM basé sur Vtiger 8.4.0*
*Dernières fonctionnalités : Vue unifiée, Envoi PDF par email, ODM avec prestataire, Script fix_sequences*
