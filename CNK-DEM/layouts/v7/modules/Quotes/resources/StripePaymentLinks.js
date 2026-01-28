/**
 * Module Stripe Payment Links pour les Devis
 * Gestion des paiements multiples Stripe
 * Version: 2.0 - 2026-01-20
 */

(function() {
    console.log('StripePaymentLinks.js chargé');

    function addStripeButtons() {
        console.log('Tentative d\'ajout des boutons Stripe');

        // Vérifier si on est sur une page de devis
        var isQuotePage = window.location.href.indexOf('module=Quotes') > -1;
        var isDetailView = window.location.href.indexOf('view=Detail') > -1;

        if (!isQuotePage || !isDetailView) {
            console.log('Pas sur une page de détail de devis, arrêt');
            return;
        }

        // Vérifier si les boutons existent déjà
        if (jQuery('.manageStripePaymentsBtn').length > 0) {
            console.log('Boutons déjà présents, arrêt');
            return;
        }

        // Récupérer l'ID du devis depuis l'URL
        var urlParams = new URLSearchParams(window.location.search);
        var recordId = urlParams.get('record');

        if (!recordId) {
            console.log('Pas de record ID trouvé, arrêt');
            return;
        }

        // Chercher le conteneur des boutons
        var buttonContainer = jQuery('.detailViewTitle .detailViewButtoncontainer');

        if (buttonContainer.length === 0) {
            buttonContainer = jQuery('.detailview-header .btn-toolbar');
        }

        if (buttonContainer.length === 0) {
            buttonContainer = jQuery('.detailViewInfo .row .col-lg-7');
        }

        if (buttonContainer.length === 0) {
            console.error('Aucun conteneur de boutons trouvé!');
            return;
        }

        // Créer le bouton "Gérer paiements Stripe"
        var manageButton = '<button class="btn btn-primary manageStripePaymentsBtn" type="button" style="margin-left: 5px;">' +
                          '<i class="fa fa-credit-card"></i> Gérer paiements Stripe' +
                          '</button>';

        buttonContainer.append(manageButton);

        // Gérer le clic sur le bouton de gestion
        jQuery(document).on('click', '.manageStripePaymentsBtn', function(e) {
            e.preventDefault();
            openStripePaymentsModal(recordId);
        });

        console.log('Boutons Stripe ajoutés avec succès');
    }

    // Attendre que jQuery et le DOM soient prêts
    if (typeof jQuery !== 'undefined') {
        jQuery(document).ready(function() {
            setTimeout(addStripeButtons, 500);
        });
    }
})();

/**
 * Ouvrir le modal de gestion des paiements Stripe
 */
function openStripePaymentsModal(recordId) {
    console.log('Ouverture du modal de gestion Stripe pour le devis', recordId);

    // Créer le HTML du modal s'il n'existe pas
    if (jQuery('#stripePaymentsModal').length === 0) {
        var modalHtml = `
        <div class="modal fade" id="stripePaymentsModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-lg" role="document" style="width: 900px;">
                <div class="modal-content">
                    <div class="modal-header" style="background: #2c3e50; color: white;">
                        <button type="button" class="close" data-dismiss="modal" style="color: white; opacity: 1;">
                            <span>&times;</span>
                        </button>
                        <h4 class="modal-title">
                            <i class="fa fa-credit-card"></i> Gestion des paiements Stripe
                        </h4>
                    </div>
                    <div class="modal-body" id="stripePaymentsModalBody" style="max-height: 70vh; overflow-y: auto;">
                        <div class="text-center">
                            <i class="fa fa-spinner fa-spin fa-3x"></i>
                            <p>Chargement des données...</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-default" data-dismiss="modal">Fermer</button>
                    </div>
                </div>
            </div>
        </div>`;
        jQuery('body').append(modalHtml);
    }

    // Afficher le modal
    jQuery('#stripePaymentsModal').modal('show');

    // Charger les données
    loadStripePaymentsData(recordId);
}

/**
 * Charger les données de paiement
 */
function loadStripePaymentsData(recordId) {
    var params = {
        module: 'Quotes',
        action: 'ManageStripePayments',
        mode: 'getPaymentInfo',
        record: recordId
    };

    AppConnector.request(params).then(
        function(response) {
            console.log('Données reçues:', response);
            if (response && response.result && response.result.success) {
                renderStripePaymentsContent(recordId, response.result.data);
            } else {
                var errorMsg = (response && response.result && response.result.message)
                    ? response.result.message
                    : 'Erreur lors du chargement des données';
                jQuery('#stripePaymentsModalBody').html(
                    '<div class="alert alert-danger"><i class="fa fa-exclamation-circle"></i> ' + errorMsg + '</div>'
                );
            }
        },
        function(error) {
            console.error('Erreur:', error);
            jQuery('#stripePaymentsModalBody').html(
                '<div class="alert alert-danger"><i class="fa fa-exclamation-circle"></i> Erreur de connexion au serveur</div>'
            );
        }
    );
}

/**
 * Afficher le contenu du modal
 */
function renderStripePaymentsContent(recordId, data) {
    var html = '';

    // Section Résumé des montants
    html += `
    <div class="panel panel-info">
        <div class="panel-heading">
            <h5 class="panel-title"><i class="fa fa-calculator"></i> Résumé des montants</h5>
        </div>
        <div class="panel-body">
            <div class="row">
                <div class="col-md-4">
                    <div class="well well-sm text-center">
                        <h5 style="margin: 0; color: #666;">Total Acompte</h5>
                        <h3 style="margin: 5px 0; color: #3498db;">${formatMoney(data.total_acompte)} €</h3>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="well well-sm text-center">
                        <h5 style="margin: 0; color: #666;">Total Solde</h5>
                        <h3 style="margin: 5px 0; color: #e67e22;">${formatMoney(data.total_solde)} €</h3>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="well well-sm text-center">
                        <h5 style="margin: 0; color: #666;">Total Général</h5>
                        <h3 style="margin: 5px 0; color: #2c3e50;">${formatMoney(data.total_general)} €</h3>
                    </div>
                </div>
            </div>
            <hr style="margin: 15px 0;">
            <div class="row">
                <div class="col-md-4">
                    <div class="well well-sm text-center" style="background: ${data.total_paid > 0 ? '#d5f5e3' : '#f8f9fa'};">
                        <h5 style="margin: 0; color: #666;">Déjà payé</h5>
                        <h3 style="margin: 5px 0; color: #27ae60;">${formatMoney(data.total_paid)} €</h3>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="well well-sm text-center" style="background: ${data.total_pending > 0 ? '#fef9e7' : '#f8f9fa'};">
                        <h5 style="margin: 0; color: #666;">En attente</h5>
                        <h3 style="margin: 5px 0; color: #f39c12;">${formatMoney(data.total_pending)} €</h3>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="well well-sm text-center" style="background: ${data.remaining > 0 ? '#fadbd8' : '#d5f5e3'};">
                        <h5 style="margin: 0; color: #666;">Reste à payer</h5>
                        <h3 style="margin: 5px 0; color: ${data.remaining > 0 ? '#e74c3c' : '#27ae60'};">${formatMoney(data.remaining)} €</h3>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // Section Historique des paiements
    html += `
    <div class="panel panel-default">
        <div class="panel-heading">
            <h5 class="panel-title"><i class="fa fa-history"></i> Historique des paiements</h5>
        </div>
        <div class="panel-body" style="padding: 0;">`;

    if (data.payments && data.payments.length > 0) {
        html += `
        <table class="table table-striped table-hover" style="margin: 0;">
            <thead>
                <tr style="background: #f5f5f5;">
                    <th>Date</th>
                    <th>Description</th>
                    <th class="text-right">Montant</th>
                    <th class="text-center">Statut</th>
                    <th>Lien</th>
                </tr>
            </thead>
            <tbody>`;

        // Email du contact pour le prefilled_email
        var contactEmail = data.contact_email || '';

        data.payments.forEach(function(payment) {
            var statusBadge = getStatusBadge(payment.status);
            var dateStr = payment.created_date ? formatDate(payment.created_date) : '-';
            var paidDateStr = payment.paid_date ? formatDate(payment.paid_date) : '';
            var paymentTypeLabel = getPaymentTypeLabel(payment.type);

            // Ajouter l'email au lien si pas déjà présent
            var paymentLink = payment.link || '';
            if (paymentLink && contactEmail && paymentLink.indexOf('prefilled_email') === -1) {
                var separator = paymentLink.indexOf('?') === -1 ? '?' : '&';
                paymentLink = paymentLink + separator + 'prefilled_email=' + encodeURIComponent(contactEmail);
            }

            // Bouton de suppression seulement si le paiement n'est pas déjà payé
            var deleteBtn = (payment.status !== 'paid')
                ? `<button class="btn btn-xs btn-danger deletePaymentBtn" data-id="${payment.id}" data-record="${recordId}" title="Supprimer"><i class="fa fa-trash"></i></button>`
                : '';

            // Bouton de modification de statut
            var changeStatusBtn = `<button class="btn btn-xs btn-warning changeStatusBtn" data-id="${payment.id}" data-record="${recordId}" data-status="${payment.status}" title="Modifier le statut"><i class="fa fa-edit"></i></button>`;

            var linkHtml = '';
            if (paymentLink) {
                linkHtml = `<a href="${paymentLink}" target="_blank" class="btn btn-xs btn-info" title="Ouvrir le lien"><i class="fa fa-external-link"></i></a>
                   <button class="btn btn-xs btn-default copyLinkBtn" data-link="${paymentLink}" title="Copier le lien"><i class="fa fa-copy"></i></button>
                   <button class="btn btn-xs btn-primary sendEmailBtn" data-link="${paymentLink}" data-amount="${payment.amount}" data-description="${payment.description || 'Paiement'}" data-record="${recordId}" title="Envoyer par email"><i class="fa fa-envelope"></i></button>`;
            }

            // Bouton facture PDF (si une facture est liée au paiement)
            var invoiceBtn = '';
            if (payment.invoice_id) {
                invoiceBtn = `<a href="index.php?module=PDFMaker&action=CreatePDFFromTemplate&mode=CreatePDF&source_module=Invoice&formodule=Invoice&record=${payment.invoice_id}&pdftemplateid=26" target="_blank" class="btn btn-xs btn-success" title="Voir la facture PDF"><i class="fa fa-file-pdf-o"></i></a>`;
            }
            linkHtml += ` ${invoiceBtn} ${changeStatusBtn} ${deleteBtn}`;

            html += `
            <tr>
                <td>${dateStr}${paidDateStr ? '<br><small class="text-success">Payé: ' + paidDateStr + '</small>' : ''}</td>
                <td><span class="label label-default">${paymentTypeLabel}</span> ${payment.description || '-'}</td>
                <td class="text-right"><strong>${formatMoney(payment.amount)} €</strong></td>
                <td class="text-center">${statusBadge}</td>
                <td>${linkHtml}</td>
            </tr>`;
        });

        html += `
            </tbody>
        </table>`;
    } else {
        html += `<p class="text-center text-muted" style="padding: 20px;">Aucun paiement enregistré</p>`;
    }

    html += `
        </div>
    </div>`;

    // Section Nouveau paiement (si reste à payer > 0)
    if (data.remaining > 0) {
        html += `
        <div class="panel panel-success">
            <div class="panel-heading">
                <h5 class="panel-title"><i class="fa fa-plus-circle"></i> Créer un nouveau paiement</h5>
            </div>
            <div class="panel-body">
                <form id="newPaymentForm" class="form-horizontal">
                    <input type="hidden" id="newPaymentRecordId" value="${recordId}">
                    <div class="form-group">
                        <label class="col-sm-3 control-label">Méthode de paiement</label>
                        <div class="col-sm-6">
                            <select class="form-control" id="newPaymentMethod" style="color: #333; padding: 6px 12px; height: auto; font-size: 14px;">
                                <option value="stripe">💳 Carte bancaire (Stripe)</option>
                                <option value="virement">🏦 Virement bancaire</option>
                                <option value="especes">💵 Espèces</option>
                                <option value="cheque">📝 Chèque</option>
                                <option value="autre">📋 Autre</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="col-sm-3 control-label">Montant (€)</label>
                        <div class="col-sm-4">
                            <input type="number" step="0.01" class="form-control" id="newPaymentAmount"
                                   value="${Math.min(Math.max(0, data.total_acompte - data.total_paid), data.remaining).toFixed(2)}" min="0.01" max="${data.remaining.toFixed(2)}" required>
                            <p class="help-block">Acompte restant: ${formatMoney(Math.max(0, data.total_acompte - data.total_paid))} € | Max: ${formatMoney(data.remaining)} €</p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="col-sm-3 control-label">Description</label>
                        <div class="col-sm-9">
                            <input type="text" class="form-control" id="newPaymentDescription"
                                   value="Acompte" placeholder="Ex: Acompte, Solde, etc." maxlength="255">
                        </div>
                    </div>
                    <div class="form-group" id="markAsPaidGroup" style="display: none;">
                        <div class="col-sm-offset-3 col-sm-9">
                            <div class="checkbox">
                                <label>
                                    <input type="checkbox" id="markAsPaid">
                                    <strong style="color: #27ae60;">Marquer comme déjà payé</strong>
                                    <span class="text-muted">(cocher si le paiement a déjà été reçu)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="col-sm-offset-3 col-sm-9">
                            <button type="button" class="btn btn-success" id="createStripePaymentBtn">
                                <i class="fa fa-credit-card"></i> Générer lien Stripe
                            </button>
                            <button type="button" class="btn btn-primary" id="createManualPaymentBtn" style="display: none;">
                                <i class="fa fa-plus"></i> Enregistrer le paiement
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>`;
    } else {
        html += `
        <div class="alert alert-success">
            <i class="fa fa-check-circle"></i> <strong>Tous les paiements ont été effectués !</strong>
        </div>`;
    }

    jQuery('#stripePaymentsModalBody').html(html);

    // Attacher les événements
    jQuery('#createStripePaymentBtn').off('click').on('click', function() {
        createNewStripePayment(recordId);
    });

    jQuery('#createManualPaymentBtn').off('click').on('click', function() {
        createManualPayment(recordId);
    });

    // Gérer le changement de méthode de paiement
    jQuery('#newPaymentMethod').off('change').on('change', function() {
        var method = jQuery(this).val();
        if (method === 'stripe') {
            jQuery('#createStripePaymentBtn').show();
            jQuery('#createManualPaymentBtn').hide();
            jQuery('#markAsPaidGroup').hide();
        } else {
            jQuery('#createStripePaymentBtn').hide();
            jQuery('#createManualPaymentBtn').show();
            jQuery('#markAsPaidGroup').show();
        }
    });

    jQuery('.copyLinkBtn').off('click').on('click', function() {
        var link = jQuery(this).data('link');
        copyToClipboard(link);
    });

    jQuery('.sendEmailBtn').off('click').on('click', function() {
        var link = jQuery(this).data('link');
        var amount = jQuery(this).data('amount');
        var description = jQuery(this).data('description');
        var recordId = jQuery(this).data('record');
        sendPaymentLinkByEmail(recordId, link, amount, description);
    });

    jQuery('.deletePaymentBtn').off('click').on('click', function() {
        var paymentId = jQuery(this).data('id');
        var recordId = jQuery(this).data('record');
        deletePayment(paymentId, recordId);
    });

    // Gérer le changement de statut
    jQuery('.changeStatusBtn').off('click').on('click', function() {
        var paymentId = jQuery(this).data('id');
        var recordId = jQuery(this).data('record');
        var currentStatus = jQuery(this).data('status');
        showChangeStatusModal(paymentId, recordId, currentStatus);
    });
}

/**
 * Créer un nouveau paiement Stripe
 */
function createNewStripePayment(recordId) {
    var amount = parseFloat(jQuery('#newPaymentAmount').val());
    var description = jQuery('#newPaymentDescription').val();

    if (!amount || amount <= 0) {
        Vtiger_Helper_Js.showPnotify({
            text: 'Veuillez entrer un montant valide',
            type: 'error'
        });
        return;
    }

    // Afficher le loader
    jQuery('#createStripePaymentBtn').prop('disabled', true).html(
        '<i class="fa fa-spinner fa-spin"></i> Création en cours...'
    );

    var params = {
        module: 'Quotes',
        action: 'ManageStripePayments',
        mode: 'createPaymentLink',
        record: recordId,
        amount: amount,
        description: description
    };

    AppConnector.request(params).then(
        function(response) {
            console.log('Réponse création paiement:', response);

            if (response && response.result && response.result.success) {
                Vtiger_Helper_Js.showPnotify({
                    text: 'Lien de paiement créé avec succès !',
                    type: 'success'
                });

                // Recharger les données
                loadStripePaymentsData(recordId);
            } else {
                var errorMsg = (response && response.result && response.result.message)
                    ? response.result.message
                    : 'Erreur lors de la création du lien';
                Vtiger_Helper_Js.showPnotify({
                    text: errorMsg,
                    type: 'error'
                });
                jQuery('#createStripePaymentBtn').prop('disabled', false).html(
                    '<i class="fa fa-credit-card"></i> Générer lien Stripe'
                );
            }
        },
        function(error) {
            console.error('Erreur:', error);
            Vtiger_Helper_Js.showPnotify({
                text: 'Erreur de connexion au serveur',
                type: 'error'
            });
            jQuery('#createStripePaymentBtn').prop('disabled', false).html(
                '<i class="fa fa-credit-card"></i> Générer lien Stripe'
            );
        }
    );
}

/**
 * Supprimer un paiement Stripe
 */
function deletePayment(paymentId, recordId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce paiement ?\n\nCette action est irréversible.')) {
        return;
    }

    var params = {
        module: 'Quotes',
        action: 'ManageStripePayments',
        mode: 'deletePayment',
        payment_id: paymentId,
        record: recordId
    };

    AppConnector.request(params).then(
        function(response) {
            console.log('Réponse suppression paiement:', response);

            if (response && response.result && response.result.success) {
                Vtiger_Helper_Js.showPnotify({
                    text: 'Paiement supprimé avec succès !',
                    type: 'success'
                });

                // Recharger les données
                loadStripePaymentsData(recordId);
            } else {
                var errorMsg = (response && response.result && response.result.message)
                    ? response.result.message
                    : 'Erreur lors de la suppression du paiement';
                Vtiger_Helper_Js.showPnotify({
                    text: errorMsg,
                    type: 'error'
                });
            }
        },
        function(error) {
            console.error('Erreur:', error);
            Vtiger_Helper_Js.showPnotify({
                text: 'Erreur de connexion au serveur',
                type: 'error'
            });
        }
    );
}

/**
 * Créer un paiement manuel (virement, espèces, chèque)
 */
function createManualPayment(recordId) {
    var amount = parseFloat(jQuery('#newPaymentAmount').val());
    var description = jQuery('#newPaymentDescription').val();
    var paymentMethod = jQuery('#newPaymentMethod').val();
    var markAsPaid = jQuery('#markAsPaid').is(':checked') ? '1' : '0';

    if (!amount || amount <= 0) {
        Vtiger_Helper_Js.showPnotify({
            text: 'Veuillez entrer un montant valide',
            type: 'error'
        });
        return;
    }

    // Afficher le loader
    jQuery('#createManualPaymentBtn').prop('disabled', true).html(
        '<i class="fa fa-spinner fa-spin"></i> Enregistrement...'
    );

    var params = {
        module: 'Quotes',
        action: 'ManageStripePayments',
        mode: 'addManualPayment',
        record: recordId,
        amount: amount,
        description: description,
        payment_method: paymentMethod,
        mark_as_paid: markAsPaid
    };

    AppConnector.request(params).then(
        function(response) {
            console.log('Réponse création paiement manuel:', response);

            if (response && response.result && response.result.success) {
                Vtiger_Helper_Js.showPnotify({
                    text: 'Paiement enregistré avec succès !',
                    type: 'success'
                });

                // Recharger les données
                loadStripePaymentsData(recordId);
            } else {
                var errorMsg = (response && response.result && response.result.message)
                    ? response.result.message
                    : 'Erreur lors de l\'enregistrement du paiement';
                Vtiger_Helper_Js.showPnotify({
                    text: errorMsg,
                    type: 'error'
                });
                jQuery('#createManualPaymentBtn').prop('disabled', false).html(
                    '<i class="fa fa-plus"></i> Enregistrer le paiement'
                );
            }
        },
        function(error) {
            console.error('Erreur:', error);
            Vtiger_Helper_Js.showPnotify({
                text: 'Erreur de connexion au serveur',
                type: 'error'
            });
            jQuery('#createManualPaymentBtn').prop('disabled', false).html(
                '<i class="fa fa-plus"></i> Enregistrer le paiement'
            );
        }
    );
}

/**
 * Afficher le modal de changement de statut
 */
function showChangeStatusModal(paymentId, recordId, currentStatus) {
    // Créer le modal s'il n'existe pas
    if (jQuery('#changeStatusModal').length === 0) {
        var modalHtml = `
        <div class="modal fade" id="changeStatusModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-sm" role="document">
                <div class="modal-content">
                    <div class="modal-header" style="background: #f39c12; color: white;">
                        <button type="button" class="close" data-dismiss="modal" style="color: white; opacity: 1;">
                            <span>&times;</span>
                        </button>
                        <h4 class="modal-title">
                            <i class="fa fa-edit"></i> Modifier le statut
                        </h4>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="changeStatusPaymentId">
                        <input type="hidden" id="changeStatusRecordId">
                        <div class="form-group">
                            <label>Nouveau statut</label>
                            <select class="form-control" id="newStatusSelect" style="color: #333; padding: 6px 12px; height: auto; font-size: 14px;">
                                <option value="pending">⏳ En attente</option>
                                <option value="paid">✅ Payé</option>
                                <option value="failed">❌ Échoué</option>
                                <option value="cancelled">🚫 Annulé</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-default" data-dismiss="modal">Annuler</button>
                        <button type="button" class="btn btn-warning" id="confirmChangeStatusBtn">
                            <i class="fa fa-save"></i> Enregistrer
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        jQuery('body').append(modalHtml);

        // Attacher l'événement de confirmation
        jQuery('#confirmChangeStatusBtn').on('click', function() {
            updatePaymentStatus();
        });
    }

    // Pré-remplir les valeurs
    jQuery('#changeStatusPaymentId').val(paymentId);
    jQuery('#changeStatusRecordId').val(recordId);
    jQuery('#newStatusSelect').val(currentStatus);

    // Afficher le modal
    jQuery('#changeStatusModal').modal('show');
}

/**
 * Mettre à jour le statut d'un paiement
 */
function updatePaymentStatus() {
    var paymentId = jQuery('#changeStatusPaymentId').val();
    var recordId = jQuery('#changeStatusRecordId').val();
    var newStatus = jQuery('#newStatusSelect').val();

    // Désactiver le bouton
    jQuery('#confirmChangeStatusBtn').prop('disabled', true).html(
        '<i class="fa fa-spinner fa-spin"></i> Mise à jour...'
    );

    var params = {
        module: 'Quotes',
        action: 'ManageStripePayments',
        mode: 'updatePaymentStatus',
        payment_id: paymentId,
        record: recordId,
        new_status: newStatus
    };

    AppConnector.request(params).then(
        function(response) {
            console.log('Réponse mise à jour statut:', response);

            if (response && response.result && response.result.success) {
                Vtiger_Helper_Js.showPnotify({
                    text: 'Statut mis à jour avec succès !',
                    type: 'success'
                });

                // Fermer le modal et recharger
                jQuery('#changeStatusModal').modal('hide');
                loadStripePaymentsData(recordId);
            } else {
                var errorMsg = (response && response.result && response.result.message)
                    ? response.result.message
                    : 'Erreur lors de la mise à jour du statut';
                Vtiger_Helper_Js.showPnotify({
                    text: errorMsg,
                    type: 'error'
                });
            }
            jQuery('#confirmChangeStatusBtn').prop('disabled', false).html(
                '<i class="fa fa-save"></i> Enregistrer'
            );
        },
        function(error) {
            console.error('Erreur:', error);
            Vtiger_Helper_Js.showPnotify({
                text: 'Erreur de connexion au serveur',
                type: 'error'
            });
            jQuery('#confirmChangeStatusBtn').prop('disabled', false).html(
                '<i class="fa fa-save"></i> Enregistrer'
            );
        }
    );
}

/**
 * Formater un montant en euros
 */
function formatMoney(amount) {
    return parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Formater une date
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    var date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Obtenir le badge de statut
 */
function getStatusBadge(status) {
    var badges = {
        'pending': '<span class="label label-warning"><i class="fa fa-clock-o"></i> En attente</span>',
        'paid': '<span class="label label-success"><i class="fa fa-check"></i> Payé</span>',
        'failed': '<span class="label label-danger"><i class="fa fa-times"></i> Échoué</span>',
        'cancelled': '<span class="label label-default"><i class="fa fa-ban"></i> Annulé</span>'
    };
    return badges[status] || '<span class="label label-default">' + status + '</span>';
}

/**
 * Obtenir le label du type de paiement
 */
function getPaymentTypeLabel(type) {
    var labels = {
        'custom': '💳 Stripe',
        'stripe': '💳 Stripe',
        'virement': '🏦 Virement',
        'especes': '💵 Espèces',
        'cheque': '📝 Chèque',
        'autre': '📋 Autre'
    };
    return labels[type] || type;
}

/**
 * Echapper les caractères HTML dangereux
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Générer le template HTML de l'email de paiement - Design moderne
 */
function generatePaymentEmailHTML(data, paymentLink, amount, description) {
    var contactName = (data.contact_firstname || '') + ' ' + (data.contact_lastname || '');
    contactName = contactName.trim() || 'Client';

    var userFullName = (data.user_firstname || '') + ' ' + (data.user_lastname || '');
    userFullName = userFullName.trim() || '';

    var logoUrl = data.company_logo ? ('https://crm.cnkdem.com/' + data.company_logo) : '';
    var companyName = data.company_name || 'CNK DEM';
    var companyWebsite = data.company_website || '';
    var quoteNo = data.quote_no || '';
    var userRole = data.user_role || '';
    var userEmail = data.user_email || '';
    var userPhone = data.user_phone || '';

    // Echapper les valeurs dynamiques pour eviter XSS
    contactName = escapeHtml(contactName);
    userFullName = escapeHtml(userFullName);
    companyName = escapeHtml(companyName);
    quoteNo = escapeHtml(quoteNo);
    userRole = escapeHtml(userRole);
    description = escapeHtml(description);

    var html = '<!DOCTYPE html>\n' +
'<html lang="fr">\n' +
'<head>\n' +
'    <meta charset="UTF-8">\n' +
'    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'    <title>Lien de paiement</title>\n' +
'</head>\n' +
'<body style="margin: 0; padding: 0; font-family: \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #07295b 0%, #0a3d7a 100%); min-height: 100vh;">\n' +
'    <table role="presentation" style="width: 100%; border-collapse: collapse;">\n' +
'        <tr>\n' +
'            <td style="padding: 40px 20px;">\n' +
'                <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">\n' +
'                    \n' +
'                    <!-- Header avec logo -->\n' +
'                    <tr>\n' +
'                        <td style="background-color: #bababa; padding: 30px; text-align: center;">\n' +
                            (logoUrl ? '<img src="' + logoUrl + '" alt="' + companyName + '" style="max-width: 220px; height: auto;">\n' : '<h1 style="color: #2d3436; margin: 0; font-size: 28px; font-weight: 700;">' + companyName + '</h1>\n') +
'                        </td>\n' +
'                    </tr>\n' +
'\n' +
'                    <!-- Bandeau de titre -->\n' +
'                    <tr>\n' +
'                        <td style="background: linear-gradient(90deg, #07295b 0%, #0a3d7a 100%); padding: 20px 30px; text-align: center;">\n' +
'                            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">\n' +
'                                Demande de paiement\n' +
'                            </h2>\n' +
'                        </td>\n' +
'                    </tr>\n' +
'\n' +
'                    <!-- Contenu principal -->\n' +
'                    <tr>\n' +
'                        <td style="padding: 40px 35px;">\n' +
'                            <p style="color: #2d3436; font-size: 18px; line-height: 1.6; margin: 0 0 25px 0;">\n' +
'                                Bonjour <strong>' + contactName + '</strong>,\n' +
'                            </p>\n' +
'\n' +
'                            <p style="color: #636e72; font-size: 15px; line-height: 1.8; margin-bottom: 30px;">\n' +
'                                Nous vous remercions pour votre confiance. Veuillez trouver ci-dessous les details de votre paiement ainsi que le lien securise pour proceder au reglement.\n' +
'                            </p>\n' +
'\n' +
'                            <!-- Carte des details du paiement -->\n' +
'                            <table role="presentation" style="width: 100%; background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #07295b;">\n' +
'                                <tr>\n' +
'                                    <td style="padding: 25px 30px;">\n' +
'                                        <table role="presentation" style="width: 100%;">\n' +
'                                            <tr>\n' +
'                                                <td style="padding: 12px 0; border-bottom: 1px dashed #dee2e6;">\n' +
'                                                    <span style="color: #6c757d; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Reference devis</span>\n' +
'                                                </td>\n' +
'                                                <td style="padding: 12px 0; border-bottom: 1px dashed #dee2e6; text-align: right;">\n' +
'                                                    <strong style="color: #2d3436; font-size: 15px; font-family: monospace; background: #fff; padding: 4px 10px; border-radius: 4px;">' + quoteNo + '</strong>\n' +
'                                                </td>\n' +
'                                            </tr>\n' +
'                                            <tr>\n' +
'                                                <td style="padding: 12px 0; border-bottom: 1px dashed #dee2e6;">\n' +
'                                                    <span style="color: #6c757d; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Description</span>\n' +
'                                                </td>\n' +
'                                                <td style="padding: 12px 0; border-bottom: 1px dashed #dee2e6; text-align: right;">\n' +
'                                                    <strong style="color: #2d3436; font-size: 15px;">' + description + '</strong>\n' +
'                                                </td>\n' +
'                                            </tr>\n' +
'                                            <tr>\n' +
'                                                <td style="padding: 20px 0 10px 0;">\n' +
'                                                    <span style="color: #2d3436; font-size: 16px; font-weight: 600;">MONTANT A REGLER</span>\n' +
'                                                </td>\n' +
'                                                <td style="padding: 20px 0 10px 0; text-align: right;">\n' +
'                                                    <strong style="color: #07295b; font-size: 32px; font-weight: 700;">' + formatMoney(amount) + ' EUR</strong>\n' +
'                                                </td>\n' +
'                                            </tr>\n' +
'                                        </table>\n' +
'                                    </td>\n' +
'                                </tr>\n' +
'                            </table>\n' +
'\n' +
'                            <!-- Bouton de paiement -->\n' +
'                            <table role="presentation" style="width: 100%; margin-bottom: 25px;">\n' +
'                                <tr>\n' +
'                                    <td style="text-align: center;">\n' +
'                                        <a href="' + paymentLink + '" style="display: inline-block; background: linear-gradient(135deg, #07295b 0%, #0a3d7a 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 30px rgba(7,41,91,0.4);">\n' +
'                                            Payer maintenant\n' +
'                                        </a>\n' +
'                                    </td>\n' +
'                                </tr>\n' +
'                            </table>\n' +
'\n' +
'                            <!-- Badge securite -->\n' +
'                            <table role="presentation" style="width: 100%; margin-bottom: 35px;">\n' +
'                                <tr>\n' +
'                                    <td style="text-align: center;">\n' +
'                                        <span style="display: inline-block; background-color: #dfe6e9; color: #636e72; font-size: 12px; padding: 8px 16px; border-radius: 20px;">\n' +
'                                            Paiement 100% securise par Stripe\n' +
'                                        </span>\n' +
'                                    </td>\n' +
'                                </tr>\n' +
'                            </table>\n' +
'\n' +
'                            <!-- Separateur -->\n' +
'                            <table role="presentation" style="width: 100%; margin-bottom: 30px;">\n' +
'                                <tr>\n' +
'                                    <td style="border-bottom: 2px solid #f1f2f6;"></td>\n' +
'                                </tr>\n' +
'                            </table>\n' +
'\n' +
'                            <!-- Section Votre interlocuteur -->\n' +
'                            <table role="presentation" style="width: 100%; background: linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%); border-radius: 12px; border: 1px solid #e9ecef;">\n' +
'                                <tr>\n' +
'                                    <td style="padding: 25px;">\n' +
'                                        <h3 style="color: #2d3436; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #07295b;">\n' +
'                                            Votre interlocuteur\n' +
'                                        </h3>\n' +
'                                        <table role="presentation" style="width: 100%;">\n' +
'                                            <tr>\n' +
'                                                <td style="vertical-align: top; width: 100%;">\n' +
'                                                    <p style="color: #2d3436; font-size: 18px; font-weight: 700; margin: 0 0 5px 0;">\n' +
'                                                        ' + userFullName + '\n' +
'                                                    </p>\n' +
                                                    (userRole ? '<p style="color: #07295b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px 0;">' + userRole + '</p>\n' : '<p style="margin: 0 0 20px 0;"></p>\n') +
'\n' +
'                                                    <table role="presentation" style="width: 100%;">\n' +
                                                        (userPhone ? '<tr>\n' +
'                                                            <td style="padding: 8px 0; vertical-align: middle;">\n' +
'                                                                <table role="presentation">\n' +
'                                                                    <tr>\n' +
'                                                                        <td style="background: linear-gradient(135deg, #07295b 0%, #0a3d7a 100%); width: 32px; height: 32px; border-radius: 8px; text-align: center; vertical-align: middle;">\n' +
'                                                                            <span style="color: #ffffff; font-size: 14px;">T</span>\n' +
'                                                                        </td>\n' +
'                                                                        <td style="padding-left: 12px;">\n' +
'                                                                            <span style="color: #6c757d; font-size: 11px; text-transform: uppercase; display: block;">Telephone</span>\n' +
'                                                                            <a href="tel:' + userPhone + '" style="color: #2d3436; font-size: 14px; text-decoration: none; font-weight: 500;">' + userPhone + '</a>\n' +
'                                                                        </td>\n' +
'                                                                    </tr>\n' +
'                                                                </table>\n' +
'                                                            </td>\n' +
'                                                        </tr>\n' : '') +
                                                        (userEmail ? '<tr>\n' +
'                                                            <td style="padding: 8px 0; vertical-align: middle;">\n' +
'                                                                <table role="presentation">\n' +
'                                                                    <tr>\n' +
'                                                                        <td style="background: linear-gradient(135deg, #07295b 0%, #0a3d7a 100%); width: 32px; height: 32px; border-radius: 8px; text-align: center; vertical-align: middle;">\n' +
'                                                                            <span style="color: #ffffff; font-size: 14px;">@</span>\n' +
'                                                                        </td>\n' +
'                                                                        <td style="padding-left: 12px;">\n' +
'                                                                            <span style="color: #6c757d; font-size: 11px; text-transform: uppercase; display: block;">Email</span>\n' +
'                                                                            <a href="mailto:' + userEmail + '" style="color: #2d3436; font-size: 14px; text-decoration: none; font-weight: 500;">' + userEmail + '</a>\n' +
'                                                                        </td>\n' +
'                                                                    </tr>\n' +
'                                                                </table>\n' +
'                                                            </td>\n' +
'                                                        </tr>\n' : '') +
                                                        (companyWebsite ? '<tr>\n' +
'                                                            <td style="padding: 8px 0; vertical-align: middle;">\n' +
'                                                                <table role="presentation">\n' +
'                                                                    <tr>\n' +
'                                                                        <td style="background: linear-gradient(135deg, #07295b 0%, #0a3d7a 100%); width: 32px; height: 32px; border-radius: 8px; text-align: center; vertical-align: middle;">\n' +
'                                                                            <span style="color: #ffffff; font-size: 14px;">W</span>\n' +
'                                                                        </td>\n' +
'                                                                        <td style="padding-left: 12px;">\n' +
'                                                                            <span style="color: #6c757d; font-size: 11px; text-transform: uppercase; display: block;">Site web</span>\n' +
'                                                                            <a href="' + (companyWebsite.indexOf('http') === 0 ? companyWebsite : 'https://' + companyWebsite) + '" style="color: #2d3436; font-size: 14px; text-decoration: none; font-weight: 500;">' + companyWebsite + '</a>\n' +
'                                                                        </td>\n' +
'                                                                    </tr>\n' +
'                                                                </table>\n' +
'                                                            </td>\n' +
'                                                        </tr>\n' : '') +
'                                                    </table>\n' +
'                                                </td>\n' +
'                                            </tr>\n' +
'                                        </table>\n' +
'                                    </td>\n' +
'                                </tr>\n' +
'                            </table>\n' +
'                        </td>\n' +
'                    </tr>\n' +
'\n' +
'                    <!-- Footer -->\n' +
'                    <tr>\n' +
'                        <td style="background-color: #07295b; padding: 30px; text-align: center;">\n' +
'                            <p style="color: #ffffff; font-size: 15px; font-weight: 600; margin: 0 0 8px 0;">\n' +
'                                ' + companyName + '\n' +
'                            </p>\n' +
'                            <p style="color: #a0a0a0; font-size: 12px; margin: 0; line-height: 1.6;">\n' +
'                                Cet email a ete envoye automatiquement.<br>\n' +
'                                Si vous avez des questions, n\'hesitez pas a nous contacter.\n' +
'                            </p>\n' +
'                        </td>\n' +
'                    </tr>\n' +
'\n' +
'                </table>\n' +
'            </td>\n' +
'        </tr>\n' +
'    </table>\n' +
'</body>\n' +
'</html>';

    return html;
}

/**
 * Envoyer le lien de paiement par email
 */
function sendPaymentLinkByEmail(recordId, link, amount, description) {
    console.log('Envoi email pour paiement:', {recordId, link, amount, description});

    // Créer le modal d'envoi d'email s'il n'existe pas
    if (jQuery('#sendPaymentEmailModal').length === 0) {
        var modalHtml = `
        <div class="modal fade" id="sendPaymentEmailModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-lg" role="document" style="width: 800px;">
                <div class="modal-content">
                    <div class="modal-header" style="background: #3498db; color: white;">
                        <button type="button" class="close" data-dismiss="modal" style="color: white; opacity: 1;">
                            <span>&times;</span>
                        </button>
                        <h4 class="modal-title">
                            <i class="fa fa-envelope"></i> Envoyer le lien de paiement
                        </h4>
                    </div>
                    <div class="modal-body">
                        <form id="sendPaymentEmailForm">
                            <input type="hidden" id="emailPaymentLink">
                            <input type="hidden" id="emailRecordId">
                            <input type="hidden" id="emailBodyHtml">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label>Email du destinataire</label>
                                        <input type="email" class="form-control" id="emailTo" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label>Sujet</label>
                                        <input type="text" class="form-control" id="emailSubject" required>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Aperçu de l'email</label>
                                <div id="emailPreview" style="border: 1px solid #ddd; border-radius: 4px; max-height: 400px; overflow-y: auto; background: #f9f9f9;"></div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-default" data-dismiss="modal">Annuler</button>
                        <button type="button" class="btn btn-primary" id="sendPaymentEmailBtn">
                            <i class="fa fa-paper-plane"></i> Envoyer
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        jQuery('body').append(modalHtml);

        // Attacher l'événement d'envoi
        jQuery('#sendPaymentEmailBtn').on('click', function() {
            sendPaymentEmail();
        });
    }

    // Récupérer l'email du contact lié au devis
    var params = {
        module: 'Quotes',
        action: 'ManageStripePayments',
        mode: 'getContactEmail',
        record: recordId
    };

    AppConnector.request(params).then(
        function(response) {
            var data = {};
            var contactEmail = '';
            var quoteNo = '';

            if (response && response.result && response.result.success) {
                data = response.result;
                contactEmail = data.email || '';
                quoteNo = data.quote_no || '';
            }

            // S'assurer que l'email est dans le lien Stripe (prefilled_email)
            var paymentLinkWithEmail = link;
            if (contactEmail && link.indexOf('prefilled_email') === -1) {
                var separator = link.indexOf('?') === -1 ? '?' : '&';
                paymentLinkWithEmail = link + separator + 'prefilled_email=' + encodeURIComponent(contactEmail);
            }

            // Générer le HTML de l'email avec le lien qui contient l'email
            var emailHtml = generatePaymentEmailHTML(data, paymentLinkWithEmail, amount, description);

            // Pré-remplir le formulaire avec le lien qui contient l'email
            jQuery('#emailPaymentLink').val(paymentLinkWithEmail);
            jQuery('#emailRecordId').val(recordId);
            jQuery('#emailBodyHtml').val(emailHtml);
            jQuery('#emailTo').val(contactEmail);
            jQuery('#emailSubject').val('Lien de paiement - Devis ' + quoteNo + ' - ' + formatMoney(amount) + ' €');

            // Afficher l'aperçu
            jQuery('#emailPreview').html('<iframe srcdoc="' + emailHtml.replace(/"/g, '&quot;') + '" style="width: 100%; height: 400px; border: none;"></iframe>');

            // Afficher le modal
            jQuery('#sendPaymentEmailModal').modal('show');
        },
        function(error) {
            console.error('Erreur récupération email:', error);
            // Afficher quand même le modal avec données par défaut
            var defaultData = {
                company_name: 'CNK DEM',
                user_firstname: '',
                user_lastname: ''
            };

            var emailHtml = generatePaymentEmailHTML(defaultData, link, amount, description);

            jQuery('#emailPaymentLink').val(link);
            jQuery('#emailRecordId').val(recordId);
            jQuery('#emailBodyHtml').val(emailHtml);
            jQuery('#emailTo').val('');
            jQuery('#emailSubject').val('Lien de paiement - ' + formatMoney(amount) + ' €');
            jQuery('#emailPreview').html('<iframe srcdoc="' + emailHtml.replace(/"/g, '&quot;') + '" style="width: 100%; height: 400px; border: none;"></iframe>');

            jQuery('#sendPaymentEmailModal').modal('show');
        }
    );
}

/**
 * Envoyer l'email de paiement
 */
function sendPaymentEmail() {
    var emailTo = jQuery('#emailTo').val();
    var emailSubject = jQuery('#emailSubject').val();
    var emailBody = jQuery('#emailBodyHtml').val();
    var recordId = jQuery('#emailRecordId').val();

    if (!emailTo || !emailSubject || !emailBody) {
        Vtiger_Helper_Js.showPnotify({
            text: 'Veuillez remplir tous les champs',
            type: 'error'
        });
        return;
    }

    // Désactiver le bouton
    jQuery('#sendPaymentEmailBtn').prop('disabled', true).html(
        '<i class="fa fa-spinner fa-spin"></i> Envoi en cours...'
    );

    var params = {
        module: 'Quotes',
        action: 'ManageStripePayments',
        mode: 'sendPaymentEmail',
        record: recordId,
        email_to: emailTo,
        email_subject: emailSubject,
        email_body: emailBody,
        is_html: 1
    };

    AppConnector.request(params).then(
        function(response) {
            if (response && response.result && response.result.success) {
                Vtiger_Helper_Js.showPnotify({
                    text: 'Email envoyé avec succès !',
                    type: 'success'
                });
                jQuery('#sendPaymentEmailModal').modal('hide');
            } else {
                var errorMsg = (response && response.result && response.result.message)
                    ? response.result.message
                    : 'Erreur lors de l\'envoi de l\'email';
                Vtiger_Helper_Js.showPnotify({
                    text: errorMsg,
                    type: 'error'
                });
            }
            jQuery('#sendPaymentEmailBtn').prop('disabled', false).html(
                '<i class="fa fa-paper-plane"></i> Envoyer'
            );
        },
        function(error) {
            console.error('Erreur envoi email:', error);
            Vtiger_Helper_Js.showPnotify({
                text: 'Erreur de connexion au serveur',
                type: 'error'
            });
            jQuery('#sendPaymentEmailBtn').prop('disabled', false).html(
                '<i class="fa fa-paper-plane"></i> Envoyer'
            );
        }
    );
}

/**
 * Copier dans le presse-papier
 */
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            Vtiger_Helper_Js.showPnotify({
                text: 'Lien copié dans le presse-papier !',
                type: 'success'
            });
        });
    } else {
        // Fallback pour les navigateurs plus anciens
        var textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        Vtiger_Helper_Js.showPnotify({
            text: 'Lien copié dans le presse-papier !',
            type: 'success'
        });
    }
}
