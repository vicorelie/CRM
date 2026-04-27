# API Création de Leads - CNK Déménagement

## Informations de connexion

| Paramètre | Valeur |
|-----------|--------|
| **URL** | `https://crm.cnkdem.com/api_create_lead.php` |
| **Méthode** | `POST` |
| **Clé API** | `5b7371c8da6d17e52e3f92994da8553dd9c8006927eb725f296c930483724c4f` |

## Authentification

La clé API doit être envoyée de l'une des manières suivantes :
- **Header HTTP** (recommandé) : `X-API-Key: VOTRE_CLE_API`
- **Paramètre URL** : `?api_key=VOTRE_CLE_API`

## Format des données

L'API accepte deux formats :
- `application/json` (recommandé)
- `application/x-www-form-urlencoded`

---

## Champs supportés

### Contact (informations de base)

| Champ | Alias acceptés | Type | Requis | Description |
|-------|---------------|------|--------|-------------|
| Nom | `lastname`, `nom` | string | **Oui** | Nom de famille du contact |
| Prénom | `firstname`, `prenom` | string | Non | Prénom du contact |
| Email | `email`, `mail` | string | Non | Adresse email |
| Téléphone | `phone`, `telephone`, `tel` | string | Non | Téléphone fixe |
| Mobile | `mobile`, `portable` | string | Non | Téléphone mobile |
| Société | `company`, `societe`, `entreprise` | string | Non | Nom de l'entreprise |

### Adresse de départ

| Champ | Alias acceptés | Type | Description |
|-------|---------------|------|-------------|
| Adresse | `address`, `adresse`, `adresse_depart`, `lane` | string | Rue et numéro |
| Ville | `city`, `ville`, `ville_depart` | string | Ville de départ |
| Code postal | `postalcode`, `code_postal`, `cp`, `cp_depart`, `code` | string | Code postal |
| Pays | `country`, `pays` | string | Pays (défaut: France) |

### Adresse d'arrivée

| Champ | Alias acceptés | Type | Description |
|-------|---------------|------|-------------|
| Adresse arrivée | `adresse_arrivee`, `adresse_livraison` | string | Rue et numéro d'arrivée |
| Ville arrivée | `ville_arrivee` | string | Ville de destination |
| Code postal arrivée | `cp_arrivee`, `code_postal_arrivee` | string | CP de destination |
| Département arrivée | `departement_arrivee`, `dept_arrivee` | string | Département (ex: 69) |

### Informations déménagement

| Champ | Alias acceptés | Type | Format | Description |
|-------|---------------|------|--------|-------------|
| Date déménagement | `date_demenagement`, `date_souhaitee` | string | `YYYY-MM-DD` | Date souhaitée |
| Volume | `volume` | string | - | Volume estimé en m³ |
| Description | `description`, `commentaire`, `message` | string | - | Détails supplémentaires |

### Options avancées

| Champ | Alias acceptés | Valeur par défaut | Description |
|-------|---------------|-------------------|-------------|
| Source | `leadsource`, `source` | `API External` | Source du lead |
| Statut | `leadstatus`, `statut` | `New` | Statut initial |
| Utilisateur assigné | `assigned_user`, `utilisateur` | `admin` | Commercial assigné |

---

## Exemples

### Exemple simple (JSON)

```bash
curl -X POST "https://crm.cnkdem.com/api_create_lead.php" \
  -H "X-API-Key: 5b7371c8da6d17e52e3f92994da8553dd9c8006927eb725f296c930483724c4f" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@email.com",
    "telephone": "0612345678"
  }'
```

### Exemple complet (déménagement)

```bash
curl -X POST "https://crm.cnkdem.com/api_create_lead.php" \
  -H "X-API-Key: 5b7371c8da6d17e52e3f92994da8553dd9c8006927eb725f296c930483724c4f" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@email.com",
    "telephone": "0612345678",
    "mobile": "0712345678",
    "adresse_depart": "123 Rue de la Paix",
    "ville_depart": "Paris",
    "cp_depart": "75001",
    "adresse_arrivee": "456 Avenue des Champs",
    "ville_arrivee": "Lyon",
    "cp_arrivee": "69001",
    "date_demenagement": "2026-03-15",
    "volume": "30",
    "description": "Déménagement appartement 3 pièces, 2ème étage avec ascenseur"
  }'
```

### Exemple PHP

```php
<?php
$data = [
    'nom' => 'Dupont',
    'prenom' => 'Jean',
    'email' => 'jean.dupont@email.com',
    'telephone' => '0612345678',
    'ville_depart' => 'Paris',
    'ville_arrivee' => 'Lyon',
    'date_demenagement' => '2026-03-15',
    'volume' => '30'
];

$ch = curl_init('https://crm.cnkdem.com/api_create_lead.php');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'X-API-Key: 5b7371c8da6d17e52e3f92994da8553dd9c8006927eb725f296c930483724c4f',
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode($data)
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result = json_decode($response, true);
print_r($result);
```

---

## Réponses

### Succès (HTTP 201)

```json
{
  "success": true,
  "message": "Lead créé avec succès",
  "lead_id": 123,
  "lead_no": "P-0018254"
}
```

### Erreurs

| Code HTTP | Signification | Exemple de réponse |
|-----------|--------------|-------------------|
| 400 | Requête invalide | `{"success":false,"error":"Le champ lastname (nom) est requis"}` |
| 401 | Clé API invalide | `{"success":false,"error":"Invalid API key"}` |
| 405 | Méthode non autorisée | `{"success":false,"error":"Method not allowed. Use POST."}` |
| 500 | Erreur serveur | `{"success":false,"error":"Erreur lors de la création du lead: ..."}` |

---

## Support

En cas de problème, contactez l'administrateur du CRM avec les informations suivantes :
- Code HTTP reçu
- Message d'erreur
- Données envoyées (sans informations sensibles)
- Date et heure de la requête

---

*Documentation générée le 03/02/2026*
