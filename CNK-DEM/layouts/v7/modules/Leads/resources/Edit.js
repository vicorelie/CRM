/*+***********************************************************************************
 * Leads (Prospects) Edit View - Gestion automatique des rappels
 *************************************************************************************/

Vtiger_Edit_Js("Leads_Edit_Js", {}, {

    /**
     * Fonction appelée après le chargement de la page
     */
    registerEvents: function() {
        this._super();
        console.log('[RAPPEL LEADS] registerEvents appelé');

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
                    console.log('[RAPPEL LEADS] Rappel en attente trouvé:', data);

                    // Supprimer de localStorage
                    localStorage.removeItem('rappel_pending');

                    // Ouvrir le popup
                    this.openRappelPopup(data.recordId, data.recordName);
                } else {
                    // Trop vieux, supprimer
                    console.log('[RAPPEL LEADS] Rappel expiré, suppression');
                    localStorage.removeItem('rappel_pending');
                }
            } catch(e) {
                console.error('[RAPPEL LEADS] Erreur lors de la lecture de localStorage:', e);
                localStorage.removeItem('rappel_pending');
            }
        }
    },

    /**
     * Détecte le changement de statut vers "A Rappeler" et stocke dans localStorage
     */
    registerRappelDetection: function() {
        var thisInstance = this;

        // Surveiller le changement du champ leadstatus
        var statutField = jQuery('[name="leadstatus"]');
        if (statutField.length > 0) {
            var initialStatus = statutField.val();
            console.log('[RAPPEL LEADS] Statut initial:', initialStatus);

            // Écouter la soumission du formulaire
            jQuery('#EditView').on('submit', function() {
                var newStatus = statutField.val();
                console.log('[RAPPEL LEADS] Soumission formulaire, statut:', newStatus);

                // Si le statut change vers "A Rappeler"
                if (newStatus === 'A Rappeler' && initialStatus !== 'A Rappeler') {
                    var recordId = jQuery('[name="record"]').val();

                    // Construire le nom du prospect
                    var firstname = jQuery('[name="firstname"]').val() || '';
                    var lastname = jQuery('[name="lastname"]').val() || '';
                    var company = jQuery('[name="company"]').val() || '';

                    var recordName = '';
                    if (firstname || lastname) {
                        recordName = (firstname + ' ' + lastname).trim();
                    }
                    if (company && recordName) {
                        recordName += ' (' + company + ')';
                    } else if (company) {
                        recordName = company;
                    }
                    if (!recordName) {
                        recordName = 'Ce prospect';
                    }

                    // Stocker dans localStorage pour ouvrir le popup après redirection
                    localStorage.setItem('rappel_pending', JSON.stringify({
                        module: 'Leads',
                        recordId: recordId,
                        recordName: recordName,
                        timestamp: new Date().getTime()
                    }));

                    console.log('[RAPPEL LEADS] Info stockée dans localStorage');
                }
            });
        }
    },

    /**
     * Ouvre le popup de création de rappel
     */
    openRappelPopup: function(recordId, recordName) {
        console.log('[RAPPEL LEADS] openRappelPopup appelé avec recordId:', recordId, 'recordName:', recordName);
        var module = 'Leads';

        // Récupérer l'ID de l'utilisateur connecté
        var userId = 1; // Défaut
        try {
            if (typeof app !== 'undefined' && app.getUser) {
                userId = app.getUser().get('id');
                console.log('[RAPPEL LEADS] User ID récupéré:', userId);
            }
        } catch(e) {
            console.log('[RAPPEL LEADS] Impossible de récupérer l\'ID utilisateur, utilisation de 1 par défaut');
        }

        // Utiliser l'URL de base du site
        var baseUrl = window.location.protocol + '//' + window.location.host + '/';
        var popupUrl = baseUrl + 'rappel_popup.php?module=' + module +
                       '&record_id=' + recordId +
                       '&record_name=' + encodeURIComponent(recordName) +
                       '&user_id=' + userId;

        console.log('[RAPPEL LEADS] URL du popup:', popupUrl);

        // Ouvrir dans un nouvel onglet
        var newTab = window.open(popupUrl, '_blank');
        if (newTab) {
            console.log('[RAPPEL LEADS] Onglet ouvert avec succès');
            newTab.focus();
        } else {
            console.error('[RAPPEL LEADS] Impossible d\'ouvrir l\'onglet');
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
