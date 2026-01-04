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

        // Vérifier si un rappel est en attente dans localStorage
        this.checkPendingRappel();

        this.registerRappelDetection();
    },

    /**
     * Vérifie si un rappel est en attente et l'ouvre si nécessaire
     */
    checkPendingRappel: function() {
        var rappelData = localStorage.getItem('rappel_pending');
        if (rappelData) {
            try {
                var data = JSON.parse(rappelData);

                // Vérifier que ce n'est pas trop vieux (max 5 minutes)
                var now = new Date().getTime();
                if (now - data.timestamp < 300000) { // 5 minutes = 300000ms
                    console.log('[RAPPEL] Rappel en attente trouvé:', data);

                    // Supprimer de localStorage
                    localStorage.removeItem('rappel_pending');

                    // Ouvrir le popup
                    this.openRappelPopup(data.recordId, data.recordName);
                } else {
                    // Trop vieux, supprimer
                    console.log('[RAPPEL] Rappel expiré, suppression');
                    localStorage.removeItem('rappel_pending');
                }
            } catch(e) {
                console.error('[RAPPEL] Erreur lors de la lecture de localStorage:', e);
                localStorage.removeItem('rappel_pending');
            }
        }
    },

    /**
     * Détecte le changement de statut vers "A Rappeler" et stocke dans localStorage
     */
    registerRappelDetection: function() {
        // Surveiller le changement du champ cf_971 (statut)
        var statutField = jQuery('[name="cf_971"]');
        if (statutField.length > 0) {
            var initialStatus = statutField.val();
            console.log('[RAPPEL] Statut initial:', initialStatus);

            // Écouter la soumission du formulaire
            jQuery('#EditView').on('submit', function() {
                var newStatus = statutField.val();
                console.log('[RAPPEL] Soumission formulaire, statut:', newStatus);

                // Si le statut change vers "A Rappeler"
                if (newStatus === 'A Rappeler' && initialStatus !== 'A Rappeler') {
                    var recordId = jQuery('[name="record"]').val();
                    var recordName = jQuery('[name="potentialname"]').val() || 'Cette affaire';

                    // Stocker dans localStorage pour ouvrir le popup après redirection
                    localStorage.setItem('rappel_pending', JSON.stringify({
                        module: 'Potentials',
                        recordId: recordId,
                        recordName: recordName,
                        timestamp: new Date().getTime()
                    }));

                    console.log('[RAPPEL] Info stockée dans localStorage');
                }
            });
        }
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

        // Ouvrir dans un nouvel onglet
        var newTab = window.open(popupUrl, '_blank');
        if (newTab) {
            console.log('[RAPPEL] Onglet ouvert avec succès');
            newTab.focus();
        } else {
            console.error('[RAPPEL] Impossible d\'ouvrir l\'onglet');
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
