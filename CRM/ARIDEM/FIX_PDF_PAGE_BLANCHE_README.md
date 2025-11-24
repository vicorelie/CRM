# Correction du problème de page blanche lors de l'export PDF

## Problème identifié
Lorsque vous cliquez sur "Export to PDF" puis sur "Aperçu" ou "Télécharger" depuis un devis, vous obteniez une page blanche au lieu du PDF.

## Cause
Le problème était causé par des sorties (output) involontaires envoyées au navigateur AVANT l'envoi des headers HTTP du PDF. Cela peut être causé par :
- Des espaces ou lignes vides avant `<?php` ou après `?>`
- Des messages d'erreur ou de débogage
- Des `echo`, `print_r`, `var_dump` cachés dans le code
- Un BOM UTF-8 dans les fichiers PHP

Quand PHP essaie d'envoyer les headers du PDF (`Content-Type: application/pdf`, etc.), il ne peut pas le faire car des données ont déjà été envoyées au navigateur, ce qui résulte en une page blanche.

## Solution appliquée

### Fichier modifié : `/var/www/CRM/ARIDEM/modules/PDFMaker/models/checkGenerate.php`

Dans la méthode `generatePreview()` (ligne 667), j'ai ajouté un nettoyage de tous les buffers de sortie AVANT d'envoyer le PDF :

```php
public function generatePreview(Vtiger_Request $request)
{
    // Clean any output buffer before sending PDF
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    // ... reste du code
}
```

Cette modification :
1. Nettoie tous les buffers de sortie qui pourraient contenir des données indésirables
2. Permet ensuite d'envoyer proprement les headers HTTP du PDF
3. Assure que seul le contenu du PDF est envoyé au navigateur

## Test de la correction

Pour tester que la correction fonctionne :

1. Connectez-vous au CRM ARIDEM
2. Allez sur un devis existant
3. Cliquez sur "Export to PDF"
4. Sélectionnez un template
5. Cliquez sur "Aperçu" ou "Télécharger"
6. Le PDF devrait maintenant s'afficher correctement au lieu d'une page blanche

## Fichiers de diagnostic créés

- `/var/www/CRM/ARIDEM/test_pdf_generation.php` : Script de test pour diagnostiquer les problèmes PDF (peut être supprimé après vérification)

## Notes techniques

- La configuration PHP avait `output_buffering = 0` (désactivé), ce qui rendait le système plus sensible aux sorties involontaires
- Aucun BOM UTF-8 n'a été détecté dans les fichiers PHP
- Les logs ne montraient pas d'erreurs fatales liées au PDF (seulement des warnings sur une table manquante non liée)

## Date de la correction
2025-11-23

## Auteur
Claude Code - Assistant IA d'Anthropic
