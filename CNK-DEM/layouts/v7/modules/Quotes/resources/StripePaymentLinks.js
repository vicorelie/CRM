/**
 * Module Stripe Payment Links pour les Devis
 */

(function() {
    console.log('StripePaymentLinks.js chargé');

    function addStripeButton() {
        console.log('Tentative d\'ajout du bouton Stripe');

        // Vérifier si on est sur une page de devis
        var isQuotePage = window.location.href.indexOf('module=Quotes') > -1;
        var isDetailView = window.location.href.indexOf('view=Detail') > -1;

        console.log('Module Quotes:', isQuotePage);
        console.log('Vue Detail:', isDetailView);

        if (!isQuotePage || !isDetailView) {
            console.log('Pas sur une page de détail de devis, arrêt');
            return;
        }

        // Vérifier si le bouton existe déjà
        if (jQuery('.generateStripeLinksBtn').length > 0) {
            console.log('Bouton déjà présent, arrêt');
            return;
        }

        // Récupérer l'ID du devis depuis l'URL
        var urlParams = new URLSearchParams(window.location.search);
        var recordId = urlParams.get('record');

        console.log('Record ID:', recordId);

        if (!recordId) {
            console.log('Pas de record ID trouvé, arrêt');
            return;
        }

        // Chercher le conteneur des boutons
        var buttonContainer = jQuery('.detailViewTitle .detailViewButtoncontainer');

        console.log('Conteneur trouvé:', buttonContainer.length);

        if (buttonContainer.length === 0) {
            // Essayer un autre sélecteur
            buttonContainer = jQuery('.detailview-header .btn-toolbar');
            console.log('Conteneur alternatif trouvé:', buttonContainer.length);
        }

        if (buttonContainer.length === 0) {
            // Dernier essai
            buttonContainer = jQuery('.detailViewInfo .row .col-lg-7');
            console.log('Conteneur alternatif 2 trouvé:', buttonContainer.length);
        }

        if (buttonContainer.length === 0) {
            console.error('Aucun conteneur de boutons trouvé!');
            return;
        }

        // Créer le bouton
        var stripeButton = '<button class="btn btn-success generateStripeLinksBtn" type="button" style="margin-left: 5px;">' +
                          '<i class="fa fa-credit-card"></i> Générer liens Stripe' +
                          '</button>';

        console.log('Ajout du bouton au conteneur');
        buttonContainer.append(stripeButton);

        // Gérer le clic
        jQuery(document).on('click', '.generateStripeLinksBtn', function(e) {
            e.preventDefault();
            console.log('Bouton Stripe cliqué, recordId:', recordId);
            generateStripePaymentLinks(recordId);
        });

        console.log('Bouton Stripe ajouté avec succès');
    }

    // Attendre que jQuery et le DOM soient prêts
    if (typeof jQuery !== 'undefined') {
        jQuery(document).ready(function() {
            console.log('jQuery ready, ajout du bouton après 500ms');
            // Petit délai pour être sûr que le DOM est complètement chargé
            setTimeout(addStripeButton, 500);
        });
    } else {
        console.error('jQuery n\'est pas chargé!');
    }
})();

/**
 * Générer les liens de paiement Stripe
 */
function generateStripePaymentLinks(recordId) {
    console.log('Génération des liens pour le devis', recordId);

    // Afficher un message de chargement
    var progressIndicatorElement = jQuery.progressIndicator({
        message: 'Génération des liens de paiement Stripe en cours...',
        blockInfo: {
            enabled: true
        }
    });

    // Appeler l'action PHP
    var params = {
        module: 'Quotes',
        action: 'GenerateStripePaymentLinks',
        record: recordId
    };

    console.log('Envoi de la requête:', params);

    AppConnector.request(params).then(
        function(data) {
            console.log('Réponse reçue:', data);
            progressIndicatorElement.progressIndicator({'mode': 'hide'});

            if (data && data.result && data.result.success) {
                // Succès
                var message = data.result.message || 'Liens générés avec succès';
                var links = data.result.links || {};

                // Construire le message avec les liens
                var detailedMessage = '<div style="text-align:left;">';
                detailedMessage += '<p><strong>' + message + '</strong></p>';

                if (links.acompte) {
                    detailedMessage += '<p><strong>Lien Acompte:</strong><br/>';
                    detailedMessage += '<a href="' + links.acompte + '" target="_blank" style="word-break: break-all;">' + links.acompte + '</a></p>';
                }

                if (links.solde) {
                    detailedMessage += '<p><strong>Lien Solde:</strong><br/>';
                    detailedMessage += '<a href="' + links.solde + '" target="_blank" style="word-break: break-all;">' + links.solde + '</a></p>';
                }

                detailedMessage += '</div>';

                // Afficher une notification de succès
                var params = {
                    text: detailedMessage,
                    type: 'success',
                    title: 'Liens Stripe générés'
                };
                Vtiger_Helper_Js.showPnotify(params);

                // Recharger la page pour afficher les nouveaux liens dans les champs
                setTimeout(function() {
                    window.location.reload();
                }, 3000);

            } else {
                // Erreur
                var errorMessage = (data && data.result && data.result.message) ? data.result.message : 'Erreur lors de la génération des liens';
                console.error('Erreur:', errorMessage);

                var params = {
                    text: errorMessage,
                    type: 'error',
                    title: 'Erreur'
                };
                Vtiger_Helper_Js.showPnotify(params);
            }
        },
        function(error) {
            console.error('Erreur de connexion:', error);
            progressIndicatorElement.progressIndicator({'mode': 'hide'});

            var params = {
                text: 'Erreur de connexion au serveur',
                type: 'error',
                title: 'Erreur'
            };
            Vtiger_Helper_Js.showPnotify(params);
        }
    );
}
