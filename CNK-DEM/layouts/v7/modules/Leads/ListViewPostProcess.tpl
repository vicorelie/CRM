	</div>
</div>

<script>
/* Fix Android Chrome : le clavier virtuel se ferme immédiatement sur les inputs de recherche.
   navigator.virtualKeyboard.overlaysContent = true (Chrome 94+) empêche le clavier
   de déclencher tout resize/scroll. */
if ('virtualKeyboard' in navigator) {
    navigator.virtualKeyboard.overlaysContent = true;
}

/* Script pour le transfert vers AMYAS */
function transferToAMYAS() {
    console.log('=== TRANSFERT AMYAS - DEBUG DETAILLE ===');
    
    // Analyser tous les checkboxes de la page
    var allCheckboxes = jQuery('input[type=checkbox]');
    console.log('Total checkboxes sur la page:', allCheckboxes.length);
    
    var checkedCheckboxes = jQuery('input[type=checkbox]:checked');
    console.log('Total checkboxes cochées:', checkedCheckboxes.length);
    
    // Détailler chaque checkbox cochée
    checkedCheckboxes.each(function(index) {
        var $this = jQuery(this);
        console.log('Checkbox cochée ' + (index + 1) + ':', {
            id: this.id,
            name: this.name,
            value: this.value,
            class: this.className,
            'data-id': $this.data('id'),
            'closest-tr': $this.closest('tr').attr('id') || 'pas de tr parent'
        });
    });
    
    // Essayer différentes méthodes de sélection des IDs
    var selectedIds = [];
    var method = '';
    
    // Méthode 1: Sélecteurs VTiger standards
    var method1 = jQuery('input[name="selected_ids[]"]:checked');
    if (method1.length > 0) {
        method1.each(function() {
            selectedIds.push(jQuery(this).val());
        });
        method = 'selected_ids[]';
    }
    
    // Méthode 2: Attribut data-id sur les checkboxes
    if (selectedIds.length === 0) {
        jQuery('input[type=checkbox]:checked').each(function() {
            var dataId = jQuery(this).data('id');
            if (dataId && dataId.toString().match(/^\d+$/)) {
                selectedIds.push(dataId.toString());
            }
        });
        if (selectedIds.length > 0) method = 'data-id';
    }
    
    // Méthode 3: Value des checkboxes qui sont des nombres
    if (selectedIds.length === 0) {
        jQuery('input[type=checkbox]:checked').each(function() {
            var value = jQuery(this).val();
            if (value && value.toString().match(/^\d+$/) && !this.id.includes('selectAll')) {
                selectedIds.push(value.toString());
            }
        });
        if (selectedIds.length > 0) method = 'checkbox value';
    }
    
    // Méthode 4: Examiner les lignes de tableau avec data-id
    if (selectedIds.length === 0) {
        jQuery('tr[data-id]').each(function() {
            var $row = jQuery(this);
            var checkbox = $row.find('input[type=checkbox]:checked');
            if (checkbox.length > 0) {
                var recordId = $row.data('id');
                if (recordId) {
                    selectedIds.push(recordId.toString());
                }
            }
        });
        if (selectedIds.length > 0) method = 'tr data-id';
    }
    
    // Méthode 5: Fallback ultime - chercher dans tout input avec value numérique en lignes sélectionnées
    if (selectedIds.length === 0) {
        console.log('Essai méthode 5 - fallback ultime');
        jQuery('tbody tr').each(function() {
            var $row = jQuery(this);
            var checkbox = $row.find('input[type=checkbox]:checked');
            if (checkbox.length > 0) {
                // Chercher un ID dans tous les inputs hidden de la ligne
                var hiddenInputs = $row.find('input[type=hidden]');
                hiddenInputs.each(function() {
                    var value = jQuery(this).val();
                    if (value && value.toString().match(/^\d+$/) && parseInt(value) > 0) {
                        selectedIds.push(value.toString());
                        return false; // sortir de each
                    }
                });
            }
        });
        if (selectedIds.length > 0) method = 'hidden inputs fallback';
    }
    
    console.log('IDs sélectionnés pour le transfert:', selectedIds);
    console.log('Méthode utilisée:', method);
    
    if (selectedIds.length === 0) {
        if (typeof Vtiger_Helper_Js !== 'undefined' && Vtiger_Helper_Js.showPnotify) {
            Vtiger_Helper_Js.showPnotify({
                text: 'Veuillez sélectionner au moins un prospect à transférer.',
                type: 'error'
            });
        } else {
            alert('Veuillez sélectionner au moins un prospect à transférer.');
        }
        return;
    }
    
    var message = 'Êtes-vous sûr de vouloir transférer ' + selectedIds.length + ' prospect(s) vers AMYAS (EXPERT-DEM) ?';
    
    // Utiliser confirm() natif si VTiger Helper n'est pas disponible
    var confirmAction = function() {
        if (typeof Vtiger_Helper_Js !== 'undefined' && Vtiger_Helper_Js.showConfirmationBox) {
            return Vtiger_Helper_Js.showConfirmationBox({ message: message });
        } else {
            return Promise.resolve(confirm(message));
        }
    };
    
    confirmAction().then(function(e) {
        if (e) {
            var progressIndicatorElement = null;
            if (typeof jQuery.progressIndicator === 'function') {
                progressIndicatorElement = jQuery.progressIndicator({
                    message: 'Transfert en cours vers AMYAS...',
                    position: 'html',
                    blockInfo: { enabled: true }
                });
            } else {
                console.log('Transfert en cours...');
            }
            
            var postData = {
                'module': 'Leads',
                'action': 'TransferToAMYAS',
                'selected_ids': selectedIds,
                'selectAll': false,
                'excludedIds': []
            };
            
            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                data: postData,
                dataType: 'json'
            }).always(function(data, status, xhr) {
                if (progressIndicatorElement) {
                    progressIndicatorElement.progressIndicator({ mode: 'hide' });
                }
                
                console.log('AJAX terminé - Status:', status, 'Data:', data);
                
                // Si c'est un succès jQuery ET que nous avons des données
                if (status === 'success' && data && data.success) {
                    var message = 'Transfert réussi ! ' + (data.transferred || 0) + ' prospect(s) transféré(s) vers AMYAS.';
                    
                    try {
                        if (typeof Vtiger_Helper_Js !== 'undefined' && typeof Vtiger_Helper_Js.showPnotify === 'function') {
                            Vtiger_Helper_Js.showPnotify({
                                text: message,
                                type: 'success'
                            });
                        } else {
                            alert(message);
                        }
                    } catch(e) {
                        console.log('Erreur affichage notification:', e);
                        alert(message);
                    }
                    
                    // Recharger la page pour voir les changements
                    setTimeout(function() {
                        window.location.reload();
                    }, 2000);
                    
                } else if (status === 'success' && data && data.success === false) {
                    // Erreur métier mais HTTP OK
                    var errorMsg = 'Erreur lors du transfert : ' + (data.error || 'Erreur inconnue');
                    
                    try {
                        if (typeof Vtiger_Helper_Js !== 'undefined' && typeof Vtiger_Helper_Js.showPnotify === 'function') {
                            Vtiger_Helper_Js.showPnotify({
                                text: errorMsg,
                                type: 'error'
                            });
                        } else {
                            alert(errorMsg);
                        }
                    } catch(e) {
                        console.log('Erreur affichage notification:', e);
                        alert(errorMsg);
                    }
                    
                } else {
                    // Erreur de connexion ou autre
                    console.log('Erreur AJAX complète - Status:', status, 'XHR:', xhr);
                    
                    try {
                        if (typeof Vtiger_Helper_Js !== 'undefined' && typeof Vtiger_Helper_Js.showPnotify === 'function') {
                            Vtiger_Helper_Js.showPnotify({
                                text: 'Erreur de connexion lors du transfert.',
                                type: 'error'
                            });
                        } else {
                            alert('Erreur de connexion lors du transfert.');
                        }
                    } catch(e) {
                        console.log('Erreur affichage notification:', e);
                        alert('Erreur de connexion lors du transfert.');
                    }
                }
            });
        }
    });
}

/* Initialisation du bouton de transfert une fois la page chargée */
jQuery(document).ready(function() {
    console.log('Initialisation du bouton de transfert AMYAS');
    
    // Vérifier que nous sommes bien dans la liste des Leads
    if (jQuery('input[name="module"]').val() === 'Leads') {
        console.log('Module Leads détecté, ajout des event listeners');
        
        // Étendre la fonction de mise à jour des actions de masse de VTiger
        var originalShowHide = Vtiger_List_Js.prototype.showHideListViewMassActions;
        if (typeof originalShowHide === 'function') {
            Vtiger_List_Js.prototype.showHideListViewMassActions = function() {
                originalShowHide.call(this);
                console.log('Mise à jour de la visibilité du bouton de transfert');
                
                var selectedRecords = jQuery('.selectRow:checked');
                var transferButton = jQuery('#Leads_listView_massAction_TRANSFER_TO_AMYAS').closest('li');
                
                if (selectedRecords.length > 0) {
                    transferButton.removeClass('hide');
                } else {
                    transferButton.addClass('hide');
                }
            };
        } else {
            console.log('Fonction showHideListViewMassActions non trouvée, utilisation alternative');
            
            // Alternative : surveiller les changements de sélection
            jQuery(document).on('change', '.selectRow', function() {
                var selectedRecords = jQuery('.selectRow:checked');
                var transferButton = jQuery('#Leads_listView_massAction_TRANSFER_TO_AMYAS').closest('li');
                
                console.log('Sélection changée, records sélectionnés:', selectedRecords.length);
                
                if (selectedRecords.length > 0) {
                    transferButton.removeClass('hide');
                    console.log('Bouton de transfert affiché');
                } else {
                    transferButton.addClass('hide');
                    console.log('Bouton de transfert masqué');
                }
            });
        }
        
        // Test initial au chargement
        setTimeout(function() {
            var selectedRecords = jQuery('.selectRow:checked');
            var transferButton = jQuery('#Leads_listView_massAction_TRANSFER_TO_AMYAS').closest('li');
            console.log('Test initial - Records sélectionnés:', selectedRecords.length, 'Bouton trouvé:', transferButton.length);
        }, 1000);
    }
});
</script>
