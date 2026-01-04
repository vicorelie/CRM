/*+***********************************************************************************
 * Potentials Edit View - Gestion automatique des rappels
 *************************************************************************************/

Vtiger_Edit_Js("Potentials_Edit_Js", {}, {

    /**
     * Fonction appelée après le chargement de la page
     */
    registerEvents: function() {
        this._super();
        console.log('[RAPPEL] registerEvents appelé');
        this.registerRappelDetection();
    },

    /**
     * Détecte le changement de statut vers "A Rappeler" via interception AJAX
     */
    registerRappelDetection: function() {
        var thisInstance = this;

        // Écouter les requêtes AJAX SaveAjax pour détecter les changements de statut
        jQuery(document).ajaxComplete(function(event, xhr, settings) {
            // Vérifier si c'est une requête SaveAjax pour Potentials
            if (settings.data && typeof settings.data === 'string' &&
                settings.data.indexOf('action=SaveAjax') > -1 &&
                settings.data.indexOf('module=Potentials') > -1) {

                console.log('[RAPPEL] SaveAjax détecté');

                // Vérifier si le champ cf_971 (statut) a été modifié vers "A Rappeler"
                if (settings.data.indexOf('cf_971=') > -1 &&
                    settings.data.indexOf('cf_971=A+Rappeler') > -1) {

                    // Extraire l'ID de l'enregistrement
                    var recordMatch = settings.data.match(/record=(\d+)/);
                    if (recordMatch) {
                        var recordId = recordMatch[1];
                        console.log('[RAPPEL] Statut changé vers A Rappeler via AJAX, ID:', recordId);

                        // Extraire le nom de l'affaire
                        var nameMatch = settings.data.match(/potentialname=([^&]*)/);
                        var recordName = nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, ' ')) : 'Cette affaire';

                        // Attendre que VTiger finisse de traiter la sauvegarde
                        setTimeout(function() {
                            console.log('[RAPPEL] Ouverture du popup...');
                            thisInstance.openRappelPopup(recordId, recordName);
                        }, 500);
                    }
                }
            }
        });
    },

    /**
     * Ouvre le popup de création de rappel
     */
    openRappelPopup: function(recordId, recordName) {
        console.log('[RAPPEL] openRappelPopup appelé avec recordId:', recordId, 'recordName:', recordName);
        var module = 'Potentials';

        // Récupérer l'ID de l'utilisateur connecté
        var userId = 1; // Défaut
        try {
            if (typeof app !== 'undefined' && app.getUser) {
                userId = app.getUser().get('id');
                console.log('[RAPPEL] User ID récupéré:', userId);
            }
        } catch(e) {
            console.log('[RAPPEL] Impossible de récupérer l\'ID utilisateur, utilisation de 1 par défaut');
        }

        // Utiliser l'URL de base du site
        var baseUrl = window.location.protocol + '//' + window.location.host + '/';
        var popupUrl = baseUrl + 'rappel_popup.php?module=' + module +
                       '&record_id=' + recordId +
                       '&record_name=' + encodeURIComponent(recordName) +
                       '&user_id=' + userId;

        console.log('[RAPPEL] URL du popup:', popupUrl);

        // Ouvrir dans une fenêtre popup
        var popup = window.open(
            popupUrl,
            'RappelPopup',
            'width=600,height=600,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=yes'
        );

        if (popup) {
            console.log('[RAPPEL] Popup ouvert avec succès');
            popup.focus();
        } else {
            console.error('[RAPPEL] Popup bloqué!');
            // Si le popup est bloqué, alerter l'utilisateur
            alert('Le popup de rappel a été bloqué. Veuillez autoriser les popups pour ce site.');
            // Essayer d'ouvrir dans un nouvel onglet
            window.open(popupUrl, '_blank');
        }
    },

    /**
     * Récupère l'ID du record actuel
     */
    getRecordId: function() {
        var recordId = jQuery('[name="record"]').val();
        if (!recordId) {
            // Si on est en mode Quick Create ou autre
            var url = window.location.href;
            var match = url.match(/record=(\d+)/);
            if (match) {
                recordId = match[1];
            }
        }
        return recordId;
    }
});
