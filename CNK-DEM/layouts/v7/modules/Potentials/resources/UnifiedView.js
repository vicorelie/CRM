/**
 * Unified Tabbed View Controller for Potentials Module
 * Handles tab switching, AJAX content loading, and component initialization
 */
(function() {
    'use strict';

    window.UnifiedTabbedView = {
        recordId: null,
        loadedTabs: {},
        googleMapsLoaded: false,

        /**
         * Initialize the unified tabbed view
         */
        init: function(recordId) {
            var self = this;
            this.recordId = recordId;

            console.log('[UnifiedView] Initializing for record:', recordId);

            // Register tab click handlers
            jQuery('#unifiedTabNav a[data-toggle="tab"]').on('show.bs.tab', function(e) {
                var tabName = jQuery(e.target).data('tab');
                self.loadTabContent(tabName);
            });

            // Load the initially active tab
            var activeTab = jQuery('#unifiedTabNav li.active a').data('tab');
            if (activeTab) {
                this.loadTabContent(activeTab);
            }
        },

        /**
         * Invalidate a tab so it reloads on next access
         */
        invalidateTab: function(tabName) {
            this.loadedTabs[tabName] = false;
            console.log('[UnifiedView] Tab invalidated:', tabName);
        },

        /**
         * Force reload a tab (invalidate + reload if currently active)
         */
        forceReloadTab: function(tabName) {
            this.invalidateTab(tabName);
            var activeTab = jQuery('#unifiedTabNav li.active a').data('tab');
            if (activeTab === tabName) {
                this.loadTabContent(tabName);
            }
        },

        /**
         * Load tab content via AJAX
         */
        loadTabContent: function(tabName, forceReload) {
            var self = this;
            var tabPane = jQuery('#unified-tab-' + tabName);
            var tabLoader = tabPane.find('.tab-loader');

            // Check if already loaded (unless force reload)
            if (this.loadedTabs[tabName] && !forceReload) {
                console.log('[UnifiedView] Tab already loaded:', tabName);
                // For map tab, reinitialize on show
                if (tabName === 'map' && window.UnifiedMap && window.UnifiedMap.map) {
                    setTimeout(function() {
                        UnifiedMap.reinitialize();
                    }, 100);
                }
                return;
            }

            console.log('[UnifiedView] Loading tab:', tabName);

            // Use dedicated AJAX view for loading tab content
            var ajaxUrl = 'index.php?module=Potentials&view=UnifiedTabAjax&record=' + this.recordId + '&tab=' + tabName;

            console.log('[UnifiedView] AJAX URL:', ajaxUrl);

            jQuery.ajax({
                url: ajaxUrl,
                type: 'GET',
                dataType: 'html',
                cache: false,
                success: function(response) {
                    console.log('[UnifiedView] Tab response received for:', tabName, 'Length:', response ? response.length : 0);

                    if (!response || response.length === 0) {
                        tabLoader.html('<div class="alert alert-warning">Aucun contenu recu pour cet onglet</div>');
                        return;
                    }

                    // Check if response contains an error
                    if (response.indexOf('Fatal error') !== -1 || response.indexOf('Parse error') !== -1) {
                        console.error('[UnifiedView] PHP Error in response');
                        tabLoader.html('<div class="alert alert-danger">Erreur PHP detectee</div>');
                        return;
                    }

                    // Replace loader with content using .html() to ensure scripts are executed
                    console.log('[UnifiedView] Inserting content into tabPane, content length:', response.length);
                    tabPane.html(response);
                    self.loadedTabs[tabName] = true;
                    console.log('[UnifiedView] Content inserted, tabPane children:', tabPane.children().length);

                    // Longer delay to ensure DOM is fully updated
                    setTimeout(function() {
                        console.log('[UnifiedView] Timeout fired, calling initializeTab for:', tabName);
                        console.log('[UnifiedView] inventaireTabContainer exists now:', jQuery('#inventaireTabContainer').length);
                        self.initializeTab(tabName);
                    }, 200);

                    console.log('[UnifiedView] Tab loaded successfully:', tabName);
                },
                error: function(xhr, status, error) {
                    console.error('[UnifiedView] Error loading tab:', error, 'Status:', status, 'Response:', xhr.responseText);
                    tabLoader.html('<div class="alert alert-danger">Erreur de chargement: ' + error + '<br>Status: ' + status + '</div>');
                }
            });
        },

        /**
         * Initialize tab-specific functionality after content is loaded
         */
        initializeTab: function(tabName) {
            switch(tabName) {
                case 'details':
                    // Re-register VTiger detail view events if needed
                    break;

                case 'devis':
                    if (window.UnifiedDevis) {
                        UnifiedDevis.init();
                    }
                    break;

                case 'map':
                    this.initializeGoogleMaps();
                    break;

                case 'inventaire':
                    console.log('[UnifiedView] Initializing inventaire tab');
                    console.log('[UnifiedView] UnifiedInventaire exists:', !!window.UnifiedInventaire);
                    console.log('[UnifiedView] Container exists:', jQuery('#inventaireTabContainer').length);
                    if (window.UnifiedInventaire) {
                        UnifiedInventaire.init();
                    } else {
                        console.error('[UnifiedView] UnifiedInventaire not defined!');
                    }
                    break;
            }
        },

        /**
         * Load Google Maps API and initialize map
         */
        initializeGoogleMaps: function() {
            var self = this;

            if (this.googleMapsLoaded) {
                if (window.UnifiedMap) {
                    UnifiedMap.init();
                }
                return;
            }

            // Check if Google Maps is already loaded
            if (typeof google !== 'undefined' && google.maps) {
                this.googleMapsLoaded = true;
                if (window.UnifiedMap) {
                    UnifiedMap.init();
                }
                return;
            }

            // Load Google Maps API
            var script = document.createElement('script');
            script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDAZCUe6KGJIB7INTcvhureUd8AojU67CE&callback=UnifiedMapCallback&libraries=geometry';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);

            // Define callback
            window.UnifiedMapCallback = function() {
                self.googleMapsLoaded = true;
                if (window.UnifiedMap) {
                    UnifiedMap.init();
                }
            };
        }
    };

    /**
     * Devis (Quote) Tab Controller
     */
    window.UnifiedDevis = {
        potentialId: null,
        contactId: null,
        csrfToken: null,
        selectedProducts: {},
        productCounter: 0,
        TVA_RATE: 1.20,

        init: function() {
            var container = jQuery('#devisTabContainer');
            this.potentialId = container.data('potential-id');
            this.contactId = container.data('contact-id');
            this.csrfToken = container.data('csrf-token');

            this.initProductSearch();
            this.registerEventHandlers();

            console.log('[UnifiedDevis] Initialized');
        },

        registerEventHandlers: function() {
            var self = this;

            // HT/TTC calculations
            jQuery('#unified_cf_1127').on('input change', function() { self.updateFromHT(); });
            jQuery('#unified_cf_1127_ttc').on('input change', function() { self.updateFromTTC(); });
            jQuery('#unified_cf_1129').on('input change', function() { self.updateTotalTTC(); });
            jQuery('#unified_cf_1139').on('change', function() { self.updateMontantTotal(); });

            // Disable scroll on number inputs
            jQuery('#devisTabContainer').on('wheel', 'input[type="number"]', function(e) {
                jQuery(this).blur();
            });
        },

        initProductSearch: function() {
            var self = this;
            var searchInput = jQuery('#unified_productSearch');
            var resultsDiv = jQuery('#unified_productResults');
            var searchTimeout;

            searchInput.on('input', function() {
                clearTimeout(searchTimeout);
                var query = jQuery(this).val().toLowerCase();
                searchTimeout = setTimeout(function() {
                    var filtered = query.length === 0 ? unifiedAllProducts : unifiedAllProducts.filter(function(p) {
                        return p.productname && p.productname.toLowerCase().indexOf(query) !== -1;
                    });
                    self.displayProductResults(filtered, resultsDiv);
                }, 200);
            });

            searchInput.on('focus', function() {
                self.displayProductResults(unifiedAllProducts, resultsDiv);
            });

            jQuery(document).on('click', function(e) {
                if (!searchInput.is(e.target) && !resultsDiv.is(e.target) && resultsDiv.has(e.target).length === 0) {
                    resultsDiv.hide();
                }
            });
        },

        displayProductResults: function(products, resultsDiv) {
            var self = this;
            resultsDiv.empty();

            if (products.length === 0) {
                resultsDiv.html('<div style="padding:10px;color:#999">Aucun produit trouve</div>');
                resultsDiv.show();
                return;
            }

            products.forEach(function(product) {
                var div = jQuery('<div style="padding:10px;cursor:pointer;border-bottom:1px solid #eee"></div>');
                div.html('<strong>' + product.productname + '</strong><br><small>' + parseFloat(product.unit_price || 0).toFixed(2) + ' EUR | Acompte: ' + (product.pct_acompte || 43) + '% / Solde: ' + (product.pct_solde || 57) + '%</small>');
                div.on('mouseenter', function() { jQuery(this).css('background', '#f0f0f0'); });
                div.on('mouseleave', function() { jQuery(this).css('background', 'white'); });
                div.on('click', function() {
                    self.addProduct({
                        id: product.id,
                        name: product.productname,
                        unit_price: product.unit_price,
                        pct_acompte: product.pct_acompte || 43,
                        pct_solde: product.pct_solde || 57
                    }, 1);
                    jQuery('#unified_productSearch').val('');
                    resultsDiv.hide();
                });
                resultsDiv.append(div);
            });
            resultsDiv.show();
        },

        addProduct: function(product, qty) {
            if (this.selectedProducts[product.id]) {
                app.helper.showErrorNotification({message: 'Ce produit est deja dans la liste'});
                return;
            }

            this.productCounter++;
            this.selectedProducts[product.id] = true;

            var productName = product.name || 'Produit inconnu';
            var unitPrice = parseFloat(product.unit_price || 0).toFixed(2);
            var quantity = qty || 1;
            var lineTotal = (parseFloat(unitPrice) * parseInt(quantity)).toFixed(2);
            var pctAcompte = product.pct_acompte || 43;
            var pctSolde = product.pct_solde || 57;
            var counter = this.productCounter;

            var row = jQuery('<tr></tr>');
            row.attr('data-product-id', product.id);
            row.attr('data-pct-acompte', pctAcompte);
            row.attr('data-pct-solde', pctSolde);
            row.css('border-bottom', '1px solid #dee2e6');
            row.html(
                '<td style="padding:10px"><input type="text" name="productName' + counter + '" value="' + productName.replace(/"/g, '&quot;') + '" class="form-control"></td>' +
                '<td style="padding:10px"><input type="number" name="qty' + counter + '" value="' + quantity + '" step="1" min="1" class="form-control unified-qty-input" onchange="UnifiedDevis.updateLineTotal(this)" oninput="UnifiedDevis.updateLineTotal(this)"></td>' +
                '<td style="padding:10px"><input type="number" name="listPrice' + counter + '" value="' + unitPrice + '" step="0.01" min="0" class="form-control unified-price-input" onchange="UnifiedDevis.updateLineTotal(this)" oninput="UnifiedDevis.updateLineTotal(this)"></td>' +
                '<td style="padding:10px"><span class="product-total" style="font-weight:bold;color:#667eea;">' + lineTotal + '</span> EUR</td>' +
                '<td style="padding:10px"><button type="button" onclick="UnifiedDevis.removeProduct(this,' + product.id + ')" class="btn btn-danger btn-sm"><i class="fa fa-trash"></i></button></td>'
            );

            jQuery('#unified_productsList').append(row);
            jQuery('#unified_productsTable').show();
            this.updateMontantTotal();
        },

        updateLineTotal: function(input) {
            var row = jQuery(input).closest('tr');
            var qtyInput = row.find('input[name^="qty"]');
            var priceInput = row.find('input[name^="listPrice"]');
            var totalSpan = row.find('.product-total');

            var qty = parseFloat(qtyInput.val()) || 0;
            var price = parseFloat(priceInput.val()) || 0;
            var total = (qty * price).toFixed(2);

            totalSpan.text(total);
            this.updateMontantTotal();
        },

        removeProduct: function(btn, productId) {
            jQuery(btn).closest('tr').remove();
            delete this.selectedProducts[productId];
            if (jQuery('#unified_productsList').children().length === 0) {
                jQuery('#unified_productsTable').hide();
            }
            this.updateMontantTotal();
        },

        updateFromHT: function() {
            var ht = parseFloat(jQuery('#unified_cf_1127').val()) || 0;
            var ttc = ht * this.TVA_RATE;
            jQuery('#unified_cf_1127_ttc').val(ttc.toFixed(2));
            this.updateTotalTTC();
        },

        updateFromTTC: function() {
            var ttc = parseFloat(jQuery('#unified_cf_1127_ttc').val()) || 0;
            var ht = ttc / this.TVA_RATE;
            jQuery('#unified_cf_1127').val(ht.toFixed(2));
            this.updateTotalTTC();
        },

        updateTotalTTC: function() {
            var forfaitHT = parseFloat(jQuery('#unified_cf_1127').val()) || 0;
            var supplementHT = parseFloat(jQuery('#unified_cf_1129').val()) || 0;
            var totalTTC = (forfaitHT + supplementHT) * this.TVA_RATE;
            jQuery('#unified_forfait_total_ttc').val(totalTTC.toFixed(2));
            this.updateMontantTotal();
        },

        updateMontantTotal: function() {
            var PCT_ACOMPTE_FORFAIT = 43;
            var PCT_SOLDE_FORFAIT = 57;

            var forfaitHT = parseFloat(jQuery('#unified_cf_1127').val()) || 0;
            var supplementHT = parseFloat(jQuery('#unified_cf_1129').val()) || 0;

            var produitsHT = 0;
            var produitsAcompteHT = 0;
            var produitsSoldeHT = 0;

            jQuery('#unified_productsList tr').each(function() {
                var row = jQuery(this);
                var totalCell = row.find('.product-total');
                if (totalCell.length) {
                    var lineTotal = parseFloat(totalCell.text()) || 0;
                    produitsHT += lineTotal;

                    var pctAcompte = parseFloat(row.attr('data-pct-acompte')) || 43;
                    var pctSolde = 100 - pctAcompte;

                    produitsAcompteHT += lineTotal * pctAcompte / 100;
                    produitsSoldeHT += lineTotal * pctSolde / 100;
                }
            });

            var assuranceValue = parseFloat(jQuery('#unified_cf_1139').val()) || 0;
            var assuranceHT = assuranceValue > 0 ? ((assuranceValue - 4000) / 1000) * 14 : 0;

            var forfaitAcompteHT = (forfaitHT * PCT_ACOMPTE_FORFAIT / 100) + supplementHT;
            var totalAcompteHT = forfaitAcompteHT + produitsAcompteHT + assuranceHT;

            var forfaitSoldeHT = forfaitHT * PCT_SOLDE_FORFAIT / 100;
            var totalSoldeHT = forfaitSoldeHT + produitsSoldeHT;

            var acompteTTC = totalAcompteHT * this.TVA_RATE;
            var soldeTTC = totalSoldeHT * this.TVA_RATE;

            var totalHT = forfaitHT + supplementHT + produitsHT + assuranceHT;
            var totalTTC = totalHT * this.TVA_RATE;

            jQuery('#unified_acompte_ttc').text(acompteTTC.toFixed(2) + ' €');
            jQuery('#unified_solde_ttc').text(soldeTTC.toFixed(2) + ' €');
            jQuery('#unified_montant_total_ht').text(totalHT.toFixed(2) + ' €');
            jQuery('#unified_montant_total_ttc').text(totalTTC.toFixed(2) + ' €');
        },

        loadQuote: function(quoteId) {
            var self = this;

            console.log('[UnifiedDevis] loadQuote called with quoteId:', quoteId);

            // Update selection (support both old quote-card and new quote-chip)
            jQuery('.quote-card, .quote-chip').removeClass('selected');
            jQuery('.quote-card[data-quoteid="' + quoteId + '"], .quote-chip[data-quoteid="' + quoteId + '"]').addClass('selected');
            jQuery('#unified_selectedQuoteId').val(quoteId);
            console.log('[UnifiedDevis] unified_selectedQuoteId set to:', jQuery('#unified_selectedQuoteId').val());
            jQuery('#unified_btnSave').show();
            jQuery('#unified_btnPaiement').show();
            jQuery('#unified_btnBDC').show();
            jQuery('#unified_btnViewPdf').show();

            jQuery.get('get_quote_data.php?quoteid=' + quoteId, function(data) {
                if (!data.success) {
                    app.helper.showErrorNotification({message: 'Erreur: ' + data.message});
                    return;
                }

                var quote = data.quote;
                jQuery('#unified_subject').val(quote.subject || '');
                jQuery('#unified_cf_1005').val(quote.cf_1005 || '');
                jQuery('#unified_cf_1125').val(quote.cf_1125 || '');
                jQuery('#unified_cf_1269').val(quote.cf_1269 || '');
                jQuery('#unified_cf_1127').val(quote.cf_1127 || 0);
                jQuery('#unified_cf_1129').val(quote.cf_1129 || 0);
                jQuery('#unified_cf_1139').val(quote.cf_1139 || '');

                self.updateFromHT();

                if (quote.cf_1055) {
                    jQuery('#unified_acompte_ttc').text(parseFloat(quote.cf_1055).toFixed(2) + ' €');
                }
                if (quote.cf_1057) {
                    jQuery('#unified_solde_ttc').text(parseFloat(quote.cf_1057).toFixed(2) + ' €');
                }

                // Load products
                jQuery('#unified_productsList').empty();
                self.productCounter = 0;
                self.selectedProducts = {};

                (data.products || []).forEach(function(product) {
                    if (product.productid) {
                        self.addProduct({
                            id: product.productid,
                            name: product.productname,
                            unit_price: product.listprice,
                            pct_acompte: product.pct_acompte || 43,
                            pct_solde: product.pct_solde || 57
                        }, product.quantity);
                    }
                });

            }, 'json').fail(function() {
                app.helper.showErrorNotification({message: 'Erreur lors du chargement du devis'});
            });
        },

        togglePdfTemplate: function(element, templateId) {
            var checkbox = jQuery(element).find('input[type="checkbox"]');
            checkbox.prop('checked', !checkbox.prop('checked'));
            jQuery(element).toggleClass('selected').css('border-color', checkbox.prop('checked') ? '#e74c3c' : '#e0e0e0');
            this.updatePdfSendStatus();
        },

        viewPDF: function() {
            var quoteId = jQuery('#unified_selectedQuoteId').val();
            console.log('[UnifiedDevis] viewPDF called, quoteId:', quoteId);

            if (!quoteId) {
                app.helper.showErrorNotification({message: 'Veuillez d\'abord selectionner un devis'});
                return;
            }

            // Use template "DEVIS (CNK DEM)" - ID 21
            // Format similar to StripePaymentLinks.js invoice PDF
            var url = 'index.php?module=PDFMaker&action=CreatePDFFromTemplate&mode=CreatePDF' +
                      '&source_module=Quotes&formodule=Quotes' +
                      '&record=' + quoteId +
                      '&pdftemplateid=21';

            console.log('[UnifiedDevis] PDF URL:', url);
            window.open(url, '_blank');
        },

        openStripePayments: function() {
            var quoteId = jQuery('#unified_selectedQuoteId').val();
            if (!quoteId) {
                app.helper.showErrorNotification({message: 'Veuillez d\'abord selectionner un devis'});
                return;
            }

            // Use the Stripe payment modal from StripePaymentLinks.js if available
            if (typeof openStripePaymentsModal === 'function') {
                openStripePaymentsModal(quoteId);
            } else {
                // Load StripePaymentLinks.js dynamically then open modal
                this.loadStripePaymentLinksScript(quoteId);
            }
        },

        /**
         * Open BDC (Bon de Commande) Modal
         */
        openBDCModal: function() {
            var quoteId = jQuery('#unified_selectedQuoteId').val();
            if (!quoteId) {
                app.helper.showErrorNotification({message: 'Veuillez d\'abord selectionner un devis'});
                return;
            }

            var self = this;
            var modalId = 'bdcModal';
            var modal = jQuery('#' + modalId);

            // Create modal if it doesn't exist
            if (modal.length === 0) {
                modal = jQuery('<div class="modal fade" id="' + modalId + '" tabindex="-1" role="dialog">' +
                    '<div class="modal-dialog modal-lg" role="document" style="width: 800px;">' +
                        '<div class="modal-content">' +
                            '<div class="modal-header" style="background: #27ae60; color: white;">' +
                                '<button type="button" class="close" data-dismiss="modal" style="color: white; opacity: 1;">&times;</button>' +
                                '<h4 class="modal-title"><i class="fa fa-file-text-o"></i> Bons de Commande</h4>' +
                            '</div>' +
                            '<div class="modal-body" id="bdcModalBody" style="max-height: 70vh; overflow-y: auto;">' +
                                '<div class="text-center"><i class="fa fa-spinner fa-spin fa-3x"></i><p>Chargement...</p></div>' +
                            '</div>' +
                            '<div class="modal-footer">' +
                                '<button type="button" class="btn btn-default" data-dismiss="modal">Fermer</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>');
                jQuery('body').append(modal);
            }

            // Show modal
            modal.modal('show');

            // Load BDC data
            this.loadBDCData(quoteId);
        },

        /**
         * Load BDC data for a quote
         */
        loadBDCData: function(quoteId) {
            var self = this;
            jQuery('#bdcModalBody').html('<div class="text-center"><i class="fa fa-spinner fa-spin fa-3x"></i><p>Chargement des bons de commande...</p></div>');

            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                data: {
                    module: 'Potentials',
                    view: 'UnifiedTabAjax',
                    mode: 'getBDCList',
                    quote_id: quoteId
                },
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        self.renderBDCList(quoteId, response.data);
                    } else {
                        jQuery('#bdcModalBody').html('<div class="alert alert-danger"><i class="fa fa-exclamation-circle"></i> ' + (response.message || 'Erreur lors du chargement') + '</div>');
                    }
                },
                error: function(xhr, status, error) {
                    console.error('[UnifiedDevis] BDC load error:', error);
                    jQuery('#bdcModalBody').html('<div class="alert alert-danger"><i class="fa fa-exclamation-circle"></i> Erreur de connexion</div>');
                }
            });
        },

        /**
         * Render BDC list in modal
         */
        renderBDCList: function(quoteId, data) {
            var self = this;
            var html = '';

            // BDC List
            html += '<div class="panel panel-default">';
            html += '<div class="panel-heading"><h5 class="panel-title"><i class="fa fa-list"></i> Liste des Bons de Commande</h5></div>';
            html += '<div class="panel-body" style="padding: 0;">';

            if (data.salesorders && data.salesorders.length > 0) {
                html += '<table class="table table-striped table-hover" style="margin: 0;">';
                html += '<thead><tr style="background: #f5f5f5;"><th>N° BDC</th><th>Sujet</th><th>Date</th><th class="text-right">Total</th><th>Statut</th><th>Actions</th></tr></thead><tbody>';

                data.salesorders.forEach(function(so) {
                    var statusClass = 'label-default';
                    if (so.sostatus === 'Approved') statusClass = 'label-success';
                    else if (so.sostatus === 'Created') statusClass = 'label-info';
                    else if (so.sostatus === 'Delivered') statusClass = 'label-primary';
                    else if (so.sostatus === 'Cancelled') statusClass = 'label-danger';

                    html += '<tr>';
                    html += '<td><strong>' + (so.salesorder_no || '-') + '</strong></td>';
                    html += '<td>' + (so.subject || '-') + '</td>';
                    html += '<td>' + (so.createdtime || '-') + '</td>';
                    html += '<td class="text-right"><strong>' + self.formatMoney(so.hdnGrandTotal) + ' €</strong></td>';
                    html += '<td><span class="label ' + statusClass + '">' + (so.sostatus || '-') + '</span></td>';
                    html += '<td>';
                    html += '<a href="index.php?module=SalesOrder&view=Detail&record=' + so.salesorderid + '" target="_blank" class="btn btn-xs btn-info" title="Voir"><i class="fa fa-eye"></i></a> ';
                    html += '<a href="index.php?module=PDFMaker&action=CreatePDFFromTemplate&mode=CreatePDF&source_module=SalesOrder&formodule=SalesOrder&record=' + so.salesorderid + '" target="_blank" class="btn btn-xs btn-success" title="PDF"><i class="fa fa-file-pdf-o"></i></a>';
                    html += '</td>';
                    html += '</tr>';
                });

                html += '</tbody></table>';
            } else {
                html += '<p class="text-center text-muted" style="padding: 20px;"><i class="fa fa-info-circle"></i> Aucun bon de commande pour ce devis</p>';
            }

            html += '</div></div>';

            // Create new BDC section
            html += '<div class="panel panel-success">';
            html += '<div class="panel-heading"><h5 class="panel-title"><i class="fa fa-plus-circle"></i> Creer un Bon de Commande</h5></div>';
            html += '<div class="panel-body">';
            html += '<p class="text-muted">Creer un nouveau bon de commande a partir de ce devis. Les produits et montants seront automatiquement copies.</p>';
            html += '<button type="button" class="btn btn-success" onclick="UnifiedDevis.createBDCFromQuote(' + quoteId + ')">';
            html += '<i class="fa fa-plus"></i> Creer un BDC depuis ce devis';
            html += '</button>';
            html += '</div></div>';

            jQuery('#bdcModalBody').html(html);
        },

        /**
         * Create BDC from Quote
         */
        createBDCFromQuote: function(quoteId) {
            var self = this;

            if (!confirm('Voulez-vous creer un bon de commande a partir de ce devis?')) {
                return;
            }

            // Show loading
            jQuery('#bdcModalBody .btn-success').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Creation en cours...');

            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                data: {
                    module: 'Potentials',
                    view: 'UnifiedTabAjax',
                    mode: 'createBDCFromQuote',
                    quote_id: quoteId
                },
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        app.helper.showSuccessNotification({message: 'Bon de commande cree avec succes!'});
                        // Reload BDC list
                        self.loadBDCData(quoteId);
                    } else {
                        app.helper.showErrorNotification({message: response.message || 'Erreur lors de la creation'});
                        jQuery('#bdcModalBody .btn-success').prop('disabled', false).html('<i class="fa fa-plus"></i> Creer un BDC depuis ce devis');
                    }
                },
                error: function(xhr, status, error) {
                    console.error('[UnifiedDevis] BDC create error:', error);
                    app.helper.showErrorNotification({message: 'Erreur de connexion'});
                    jQuery('#bdcModalBody .btn-success').prop('disabled', false).html('<i class="fa fa-plus"></i> Creer un BDC depuis ce devis');
                }
            });
        },

        loadStripePaymentLinksScript: function(quoteId) {
            var self = this;
            var scriptUrl = 'layouts/v7/modules/Quotes/resources/StripePaymentLinks.js';

            // Check if script is already loading
            if (this.stripeScriptLoading) {
                // Wait and retry
                setTimeout(function() {
                    if (typeof openStripePaymentsModal === 'function') {
                        openStripePaymentsModal(quoteId);
                    }
                }, 500);
                return;
            }

            this.stripeScriptLoading = true;

            // Show loading indicator
            app.helper.showProgress('Chargement du module de paiement...');

            jQuery.getScript(scriptUrl)
                .done(function() {
                    self.stripeScriptLoading = false;
                    app.helper.hideProgress();
                    console.log('[UnifiedDevis] StripePaymentLinks.js loaded successfully');

                    // Now the function should be available
                    if (typeof openStripePaymentsModal === 'function') {
                        openStripePaymentsModal(quoteId);
                    } else {
                        console.error('[UnifiedDevis] openStripePaymentsModal not found after loading script');
                        app.helper.showErrorNotification({message: 'Erreur de chargement du module de paiement'});
                    }
                })
                .fail(function(jqxhr, settings, exception) {
                    self.stripeScriptLoading = false;
                    app.helper.hideProgress();
                    console.error('[UnifiedDevis] Failed to load StripePaymentLinks.js:', exception);
                    app.helper.showErrorNotification({message: 'Erreur de chargement du module de paiement'});
                });
        },

        loadStripePaymentsModal: function(quoteId) {
            // Create modal if it doesn't exist
            var modalId = 'stripePaymentsModal';
            var modal = jQuery('#' + modalId);

            if (modal.length === 0) {
                modal = jQuery('<div class="modal fade" id="' + modalId + '" tabindex="-1" role="dialog">' +
                    '<div class="modal-dialog modal-lg" role="document" style="width: 900px;">' +
                        '<div class="modal-content">' +
                            '<div class="modal-header" style="background: #2c3e50; color: white;">' +
                                '<button type="button" class="close" data-dismiss="modal" style="color: white; opacity: 1;">&times;</button>' +
                                '<h4 class="modal-title"><i class="fa fa-credit-card"></i> Gestion des paiements Stripe</h4>' +
                            '</div>' +
                            '<div class="modal-body" id="stripePaymentsModalBody" style="max-height: 70vh; overflow-y: auto;">' +
                                '<div class="text-center"><i class="fa fa-spinner fa-spin fa-2x"></i></div>' +
                            '</div>' +
                            '<div class="modal-footer">' +
                                '<button type="button" class="btn btn-default" data-dismiss="modal">Fermer</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>');
                jQuery('body').append(modal);
            }

            // Show modal
            modal.modal('show');

            // Load payment data via AJAX - use same mode as StripePaymentLinks.js
            jQuery('#stripePaymentsModalBody').html('<div class="text-center"><i class="fa fa-spinner fa-spin fa-3x"></i><p>Chargement des donnees...</p></div>');

            AppConnector.request({
                module: 'Quotes',
                action: 'ManageStripePayments',
                mode: 'getPaymentInfo',
                record: quoteId
            }).then(function(response) {
                console.log('Donnees recues:', response);
                if (response && response.result && response.result.success) {
                    UnifiedDevis.renderStripePaymentsContent(quoteId, response.result.data);
                } else {
                    var errorMsg = (response && response.result && response.result.message)
                        ? response.result.message
                        : 'Erreur lors du chargement des donnees';
                    jQuery('#stripePaymentsModalBody').html('<div class="alert alert-danger"><i class="fa fa-exclamation-circle"></i> ' + errorMsg + '</div>');
                }
            }).fail(function(error) {
                console.error('Erreur:', error);
                jQuery('#stripePaymentsModalBody').html('<div class="alert alert-danger"><i class="fa fa-exclamation-circle"></i> Erreur de connexion au serveur</div>');
            });
        },

        formatMoney: function(amount) {
            return parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        },

        renderStripePaymentsContent: function(quoteId, data) {
            var self = this;
            var html = '';

            // Payment summary - same layout as StripePaymentLinks.js
            html += '<div class="panel panel-info">';
            html += '<div class="panel-heading"><h5 class="panel-title"><i class="fa fa-calculator"></i> Resume des montants</h5></div>';
            html += '<div class="panel-body">';
            html += '<div class="row">';
            html += '<div class="col-md-4"><div class="well well-sm text-center"><h5 style="margin: 0; color: #666;">Total Acompte</h5><h3 style="margin: 5px 0; color: #3498db;">' + self.formatMoney(data.total_acompte) + ' €</h3></div></div>';
            html += '<div class="col-md-4"><div class="well well-sm text-center"><h5 style="margin: 0; color: #666;">Total Solde</h5><h3 style="margin: 5px 0; color: #e67e22;">' + self.formatMoney(data.total_solde) + ' €</h3></div></div>';
            html += '<div class="col-md-4"><div class="well well-sm text-center"><h5 style="margin: 0; color: #666;">Total General</h5><h3 style="margin: 5px 0; color: #2c3e50;">' + self.formatMoney(data.total_general) + ' €</h3></div></div>';
            html += '</div>';
            html += '<hr style="margin: 15px 0;">';
            html += '<div class="row">';
            html += '<div class="col-md-4"><div class="well well-sm text-center" style="background: ' + (data.total_paid > 0 ? '#d5f5e3' : '#f8f9fa') + ';"><h5 style="margin: 0; color: #666;">Deja paye</h5><h3 style="margin: 5px 0; color: #27ae60;">' + self.formatMoney(data.total_paid) + ' €</h3></div></div>';
            html += '<div class="col-md-4"><div class="well well-sm text-center" style="background: ' + (data.total_pending > 0 ? '#fef9e7' : '#f8f9fa') + ';"><h5 style="margin: 0; color: #666;">En attente</h5><h3 style="margin: 5px 0; color: #f39c12;">' + self.formatMoney(data.total_pending) + ' €</h3></div></div>';
            html += '<div class="col-md-4"><div class="well well-sm text-center" style="background: ' + (data.remaining > 0 ? '#fadbd8' : '#d5f5e3') + ';"><h5 style="margin: 0; color: #666;">Reste a payer</h5><h3 style="margin: 5px 0; color: ' + (data.remaining > 0 ? '#e74c3c' : '#27ae60') + ';">' + self.formatMoney(data.remaining) + ' €</h3></div></div>';
            html += '</div>';
            html += '</div></div>';

            // Payment history
            html += '<div class="panel panel-default">';
            html += '<div class="panel-heading"><h5 class="panel-title"><i class="fa fa-history"></i> Historique des paiements</h5></div>';
            html += '<div class="panel-body" style="padding: 0;">';

            if (data.payments && data.payments.length > 0) {
                html += '<table class="table table-striped table-hover" style="margin: 0;">';
                html += '<thead><tr style="background: #f5f5f5;"><th>Date</th><th>Description</th><th class="text-right">Montant</th><th class="text-center">Statut</th><th>Actions</th></tr></thead><tbody>';

                data.payments.forEach(function(payment) {
                    var statusBadge = self.getStatusBadge(payment.status);
                    var dateStr = payment.created_date ? self.formatDate(payment.created_date) : '-';

                    html += '<tr>';
                    html += '<td>' + dateStr + '</td>';
                    html += '<td>' + (payment.description || '-') + '</td>';
                    html += '<td class="text-right"><strong>' + self.formatMoney(payment.amount) + ' €</strong></td>';
                    html += '<td class="text-center">' + statusBadge + '</td>';
                    html += '<td>';
                    if (payment.link) {
                        html += '<a href="' + payment.link + '" target="_blank" class="btn btn-xs btn-info" title="Ouvrir le lien"><i class="fa fa-external-link"></i></a> ';
                    }
                    html += '</td>';
                    html += '</tr>';
                });

                html += '</tbody></table>';
            } else {
                html += '<p class="text-center text-muted" style="padding: 20px;">Aucun paiement enregistre</p>';
            }

            html += '</div></div>';

            // New payment form (if remaining > 0)
            if (data.remaining > 0) {
                html += '<div class="panel panel-success">';
                html += '<div class="panel-heading"><h5 class="panel-title"><i class="fa fa-plus-circle"></i> Creer un nouveau paiement</h5></div>';
                html += '<div class="panel-body">';
                html += '<div class="form-horizontal">';
                html += '<div class="form-group"><label class="col-sm-3 control-label">Montant (€)</label><div class="col-sm-4"><input type="number" step="0.01" class="form-control" id="stripe_payment_amount" value="' + Math.min(Math.max(0, data.total_acompte - data.total_paid), data.remaining).toFixed(2) + '" min="0.01" max="' + data.remaining.toFixed(2) + '"><p class="help-block">Max: ' + self.formatMoney(data.remaining) + ' €</p></div></div>';
                html += '<div class="form-group"><label class="col-sm-3 control-label">Description</label><div class="col-sm-9"><input type="text" class="form-control" id="stripe_payment_description" value="Acompte" placeholder="Ex: Acompte, Solde, etc."></div></div>';
                html += '<div class="form-group"><div class="col-sm-offset-3 col-sm-9"><button type="button" class="btn btn-success" onclick="UnifiedDevis.createStripePaymentLink(' + quoteId + ')"><i class="fa fa-credit-card"></i> Generer lien Stripe</button></div></div>';
                html += '</div>';
                html += '</div></div>';
            } else {
                html += '<div class="alert alert-success"><i class="fa fa-check-circle"></i> <strong>Tous les paiements ont ete effectues !</strong></div>';
            }

            jQuery('#stripePaymentsModalBody').html(html);
        },

        getStatusBadge: function(status) {
            var badges = {
                'pending': '<span class="label label-warning"><i class="fa fa-clock-o"></i> En attente</span>',
                'paid': '<span class="label label-success"><i class="fa fa-check"></i> Paye</span>',
                'failed': '<span class="label label-danger"><i class="fa fa-times"></i> Echoue</span>',
                'cancelled': '<span class="label label-default"><i class="fa fa-ban"></i> Annule</span>'
            };
            return badges[status] || '<span class="label label-default">' + status + '</span>';
        },

        formatDate: function(dateStr) {
            if (!dateStr) return '-';
            var date = new Date(dateStr);
            return date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        createStripePaymentLink: function(quoteId) {
            var amount = jQuery('#stripe_payment_amount').val();
            var description = jQuery('#stripe_payment_description').val() || 'Paiement';

            if (!amount || parseFloat(amount) <= 0) {
                app.helper.showErrorNotification({message: 'Veuillez entrer un montant valide'});
                return;
            }

            // Disable button and show loader
            var btn = jQuery('#stripePaymentsModalBody .btn-success');
            btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Creation en cours...');

            AppConnector.request({
                module: 'Quotes',
                action: 'ManageStripePayments',
                mode: 'createPaymentLink',
                record: quoteId,
                amount: amount,
                description: description
            }).then(function(response) {
                console.log('Reponse creation paiement:', response);
                if (response && response.result && response.result.success) {
                    app.helper.showSuccessNotification({message: 'Lien de paiement cree avec succes!'});
                    // Reload payment data
                    UnifiedDevis.loadStripePaymentsModal(quoteId);
                } else {
                    var errorMsg = (response && response.result && response.result.message)
                        ? response.result.message
                        : 'Erreur lors de la creation du lien';
                    app.helper.showErrorNotification({message: errorMsg});
                    btn.prop('disabled', false).html('<i class="fa fa-credit-card"></i> Generer lien Stripe');
                }
            }).fail(function(error) {
                console.error('Erreur:', error);
                app.helper.showErrorNotification({message: 'Erreur de connexion au serveur'});
                btn.prop('disabled', false).html('<i class="fa fa-credit-card"></i> Generer lien Stripe');
            });
        },

        toggleAllPdfTemplates: function() {
            var checkboxes = jQuery('.unified-pdf-template-checkbox');
            var allChecked = checkboxes.filter(':checked').length === checkboxes.length;

            checkboxes.each(function() {
                jQuery(this).prop('checked', !allChecked);
                jQuery(this).closest('.pdf-template-item')
                    .toggleClass('selected', !allChecked)
                    .css('border-color', !allChecked ? '#e74c3c' : '#e0e0e0');
            });
            this.updatePdfSendStatus();
        },

        getSelectedPdfTemplates: function() {
            var selected = [];
            jQuery('.unified-pdf-template-checkbox:checked').each(function() {
                selected.push({
                    id: jQuery(this).val(),
                    name: jQuery(this).data('name')
                });
            });
            return selected;
        },

        updatePdfSendStatus: function() {
            var selected = this.getSelectedPdfTemplates();
            var statusDiv = jQuery('#unified_pdfSendStatus');
            if (selected.length > 0) {
                statusDiv.html('<span style="color: #e74c3c;"><i class="fa fa-info-circle"></i> ' + selected.length + ' document(s) seront envoyes par email apres sauvegarde</span>');
            } else {
                statusDiv.html('');
            }
        },

        saveQuote: function() {
            var quoteId = jQuery('#unified_selectedQuoteId').val();
            if (!quoteId) {
                app.helper.showErrorNotification({message: 'Veuillez d\'abord selectionner un devis a modifier'});
                return;
            }
            this.submitToVtiger(quoteId);
        },

        createQuote: function() {
            this.submitToVtiger('');
        },

        submitToVtiger: function(recordId) {
            var self = this;

            jQuery('#unified_recordId').val(recordId || '');
            jQuery('#unified_hidden_subject').val(jQuery('#unified_subject').val());
            jQuery('#unified_hidden_cf_1005').val(jQuery('#unified_cf_1005').val());
            jQuery('#unified_hidden_cf_1125').val(jQuery('#unified_cf_1125').val());
            jQuery('#unified_hidden_cf_1269').val(jQuery('#unified_cf_1269').val());
            jQuery('#unified_hidden_cf_1127').val(jQuery('#unified_cf_1127').val() || '0');
            jQuery('#unified_hidden_cf_1129').val(jQuery('#unified_cf_1129').val() || '0');
            jQuery('#unified_hidden_cf_1139').val(jQuery('#unified_cf_1139').val());

            // Prepare products
            var container = jQuery('#unifiedHiddenProductsContainer');
            container.empty();

            var rows = jQuery('#unified_productsList tr');
            jQuery('#unified_hidden_totalProductCount').val(rows.length);

            rows.each(function(i) {
                var idx = i + 1;
                var row = jQuery(this);
                var productId = row.attr('data-product-id');
                var productName = row.find('input[name^="productName"]').val();
                var qty = row.find('input[name^="qty"]').val();
                var listPrice = row.find('input[name^="listPrice"]').val();

                var fields = [
                    {name: 'hdnProductId' + idx, value: productId},
                    {name: 'productName' + idx, value: productName},
                    {name: 'productDescription' + idx, value: productName},
                    {name: 'qty' + idx, value: qty},
                    {name: 'listPrice' + idx, value: listPrice},
                    {name: 'comment' + idx, value: ''},
                    {name: 'discount_percent' + idx, value: '0'},
                    {name: 'discount_amount' + idx, value: '0'},
                    {name: 'productDeleted' + idx, value: '0'},
                    {name: 'lineItemType' + idx, value: 'Products'},
                    {name: 'subproduct_ids' + idx, value: ''}
                ];

                fields.forEach(function(field) {
                    container.append('<input type="hidden" name="' + field.name + '" value="' + field.value + '">');
                });
            });

            // Show loading
            app.helper.showProgress();

            var form = jQuery('#unifiedQuoteForm');
            var formData = new FormData(form[0]);

            var selectedPdfs = this.getSelectedPdfTemplates();
            var recipientEmail = jQuery('#unified_pdfRecipientEmail').val();

            fetch('/index.php', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            })
            .then(function(response) {
                if (!recordId) {
                    return fetch('/get_last_quote.php?potential_id=' + self.potentialId)
                        .then(function(resp) { return resp.json(); })
                        .then(function(data) {
                            return data.success && data.quote_id ? data.quote_id : null;
                        });
                }
                return recordId;
            })
            .then(function(quoteId) {
                if (selectedPdfs.length > 0 && recipientEmail && quoteId) {
                    return self.sendPdfEmails(quoteId).then(function(pdfResult) {
                        return { quoteId: quoteId, pdfResult: pdfResult };
                    });
                }
                return { quoteId: quoteId };
            })
            .then(function(result) {
                app.helper.hideProgress();

                if (result.pdfResult && result.pdfResult.success) {
                    app.helper.showSuccessNotification({message: 'Devis sauvegarde et email envoye avec succes!'});
                } else {
                    app.helper.showSuccessNotification({message: 'Devis sauvegarde avec succes!'});
                }

                // Reload the page to show updated quotes
                setTimeout(function() {
                    window.location.reload();
                }, 1500);
            })
            .catch(function(error) {
                app.helper.hideProgress();
                app.helper.showErrorNotification({message: 'Erreur: ' + error.message});
            });
        },

        sendPdfEmails: function(quoteId) {
            var selectedTemplates = this.getSelectedPdfTemplates();
            var email = jQuery('#unified_pdfRecipientEmail').val();

            if (selectedTemplates.length === 0 || !email) {
                return Promise.resolve({ skip: true });
            }

            var formData = new FormData();
            formData.append('record', quoteId);
            formData.append('email', email);
            selectedTemplates.forEach(function(t) {
                formData.append('templates[]', t.id);
            });

            if (unifiedCsrfToken) {
                formData.append('__vtrftk', unifiedCsrfToken);
            }

            return fetch('/index.php?module=Quotes&action=SendQuotePDFs', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            })
            .then(function(response) { return response.text(); })
            .then(function(text) {
                try {
                    var data = JSON.parse(text);
                    return data.result || data;
                } catch (e) {
                    return { success: false, error: 'Parse error' };
                }
            })
            .catch(function(error) {
                return { success: false, error: error.message };
            });
        }
    };

    /**
     * Google Map Tab Controller
     */
    window.UnifiedMap = {
        map: null,
        directionsService: null,
        directionsRenderer: null,

        init: function() {
            if (!window.UnifiedMapData) {
                console.error('[UnifiedMap] No map data available');
                return;
            }

            var data = window.UnifiedMapData;
            if (!data.origin && !data.destination) {
                console.log('[UnifiedMap] No addresses to display');
                return;
            }

            this.initializeMap(data.origin, data.destination, data.recordId);
            console.log('[UnifiedMap] Initialized');
        },

        reinitialize: function() {
            if (this.map) {
                google.maps.event.trigger(this.map, 'resize');
            }
        },

        initializeMap: function(origin, destination, recordId) {
            var self = this;
            var geocoder = new google.maps.Geocoder();

            this.directionsService = new google.maps.DirectionsService();
            this.directionsRenderer = new google.maps.DirectionsRenderer();

            // Initialize Street Views
            if (origin) {
                this.initStreetView('unified-streetview-origin', origin, geocoder);
            }
            if (destination) {
                this.initStreetView('unified-streetview-destination', destination, geocoder);
            }

            // Initialize main map with route
            if (origin && destination) {
                this.initMapWithRoute(origin, destination, recordId);
            } else if (origin || destination) {
                this.initMapWithSingleLocation(origin || destination);
            }
        },

        initStreetView: function(elementId, address, geocoder) {
            var element = document.getElementById(elementId);
            if (!element) return;

            geocoder.geocode({ address: address }, function(results, status) {
                if (status === 'OK' && results[0]) {
                    new google.maps.StreetViewPanorama(element, {
                        position: results[0].geometry.location,
                        pov: { heading: 0, pitch: 0 },
                        zoom: 1,
                        addressControl: true,
                        enableCloseButton: false,
                        fullscreenControl: true
                    });
                } else {
                    element.innerHTML = '<div style="padding: 40px; text-align: center; color: #dc3545;">Street View non disponible</div>';
                }
            });
        },

        initMapWithRoute: function(origin, destination, recordId) {
            var self = this;

            this.map = new google.maps.Map(document.getElementById('unified-map'), {
                zoom: 7,
                center: { lat: 48.8566, lng: 2.3522 }
            });

            this.directionsRenderer.setMap(this.map);

            var request = {
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING
            };

            this.directionsService.route(request, function(result, status) {
                if (status === 'OK') {
                    self.directionsRenderer.setDirections(result);

                    var leg = result.routes[0].legs[0];
                    var distanceKm = (leg.distance.value / 1000).toFixed(1);
                    var durationMin = Math.round(leg.duration.value / 60);

                    var hours = Math.floor(durationMin / 60);
                    var minutes = durationMin % 60;
                    var durationText = hours > 0 ? hours + 'h ' + minutes + 'min' : minutes + ' min';

                    jQuery('#unified-distance-display').text(distanceKm + ' km');
                    jQuery('#unified-duration-display').text(durationText);

                    // Save distance to CRM
                    self.saveDistance(recordId, distanceKm, durationText);
                }
            });
        },

        initMapWithSingleLocation: function(address) {
            var self = this;
            var geocoder = new google.maps.Geocoder();

            geocoder.geocode({ address: address }, function(results, status) {
                if (status === 'OK' && results[0]) {
                    var location = results[0].geometry.location;

                    self.map = new google.maps.Map(document.getElementById('unified-map'), {
                        zoom: 15,
                        center: location
                    });

                    new google.maps.Marker({
                        position: location,
                        map: self.map,
                        title: address
                    });

                    jQuery('#unified-distance-box').hide();
                }
            });
        },

        saveDistance: function(recordId, distance, duration) {
            fetch('index.php?module=Potentials&action=CalculateDistance&record=' + recordId + '&distance=' + distance + '&duration=' + encodeURIComponent(duration))
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    if (data && data.result && data.result.success) {
                        console.log('[UnifiedMap] Distance saved');
                        // Invalidate Details tab so it reloads with new distance
                        if (window.UnifiedTabbedView) {
                            UnifiedTabbedView.invalidateTab('details');
                        }
                    }
                })
                .catch(function(error) {
                    console.error('[UnifiedMap] Error saving distance:', error);
                });
        }
    };

    /**
     * Inventaire Tab Controller
     */
    window.UnifiedInventaire = {
        recordId: null,
        inventory: {},
        itemsDb: {},
        categoriesInfo: {},

        init: function() {
            var self = this;
            var container = jQuery('#inventaireTabContainer');

            console.log('[UnifiedInventaire] Init called');
            console.log('[UnifiedInventaire] Container found:', container.length > 0);

            if (container.length === 0) {
                console.error('[UnifiedInventaire] Container not found! Retrying in 500ms...');
                setTimeout(function() {
                    self.init();
                }, 500);
                return;
            }

            // Read data from data attributes (more reliable than script tags in AJAX content)
            this.recordId = container.data('record-id');
            var savedInventoryB64 = container.attr('data-saved-inventory-b64') || '';

            console.log('[UnifiedInventaire] Record ID:', this.recordId);
            console.log('[UnifiedInventaire] Saved inventory B64 length:', savedInventoryB64.length);

            // Decode base64 and parse JSON
            var savedInventory = {};
            if (savedInventoryB64) {
                try {
                    var savedInventoryStr = atob(savedInventoryB64);
                    console.log('[UnifiedInventaire] Decoded inventory string:', savedInventoryStr.substring(0, 100));
                    savedInventory = JSON.parse(savedInventoryStr);
                    console.log('[UnifiedInventaire] Parsed saved inventory, keys:', Object.keys(savedInventory));
                } catch(e) {
                    console.error('[UnifiedInventaire] Error decoding/parsing saved inventory:', e);
                }
            }

            // Load items from database
            console.log('[UnifiedInventaire] Starting loadItemsFromDatabase...');
            this.loadItemsFromDatabase().then(function() {
                console.log('[UnifiedInventaire] Items loaded from DB, itemsDb keys:', Object.keys(self.itemsDb));

                // Check if we got any items
                if (Object.keys(self.itemsDb).length === 0) {
                    console.error('[UnifiedInventaire] No items loaded from database!');
                    jQuery('#unified-categories-container').html(
                        '<div class="alert alert-danger">Aucun article trouve dans la base de donnees</div>'
                    );
                    return;
                }

                // Restore saved inventory
                if (savedInventory && Object.keys(savedInventory).length > 0) {
                    console.log('[UnifiedInventaire] Using saved inventory object');
                    self.inventory = savedInventory;
                    console.log('[UnifiedInventaire] Inventory keys:', Object.keys(self.inventory));
                } else {
                    console.log('[UnifiedInventaire] No saved inventory, initializing empty');
                    self.initEmptyInventory();
                }

                console.log('[UnifiedInventaire] Calling renderAllCategories...');
                self.renderAllCategories();
                console.log('[UnifiedInventaire] Calling updateTotalVolume...');
                self.updateTotalVolume();
                console.log('[UnifiedInventaire] Calling initSearch...');
                self.initSearch();

                console.log('[UnifiedInventaire] All done!');
            }).catch(function(error) {
                console.error('[UnifiedInventaire] Error in promise chain:', error);
                jQuery('#unified-categories-container').html(
                    '<div class="alert alert-danger">Erreur: ' + (error.message || error) + '</div>'
                );
            });

            console.log('[UnifiedInventaire] Init function completed (async loading started)');
        },

        loadItemsFromDatabase: function() {
            var self = this;
            console.log('[UnifiedInventaire] Loading items from database...');
            return jQuery.ajax({
                url: 'get_inventory_items.php',
                dataType: 'json'
            }).then(function(data) {
                console.log('[UnifiedInventaire] Items loaded successfully:', data);
                if (data && data.success) {
                    self.itemsDb = data.items;
                    self.categoriesInfo = data.categories;
                    console.log('[UnifiedInventaire] itemsDb populated with', Object.keys(self.itemsDb).length, 'categories');
                } else {
                    console.error('[UnifiedInventaire] API returned success=false or invalid data');
                    jQuery('#unified-categories-container').html(
                        '<div class="alert alert-warning">Donnees invalides recues du serveur</div>'
                    );
                }
            }).fail(function(xhr, status, error) {
                console.error('[UnifiedInventaire] AJAX error:', status, error);
                console.error('[UnifiedInventaire] Response:', xhr.responseText);
                jQuery('#unified-categories-container').html(
                    '<div class="alert alert-danger">Erreur de chargement des articles: ' + error + '</div>'
                );
            });
        },

        initEmptyInventory: function() {
            var self = this;
            Object.keys(this.itemsDb).forEach(function(category) {
                self.inventory[category] = {};
                self.itemsDb[category].forEach(function(item) {
                    self.inventory[category][item.name] = 0;
                });
            });
        },

        renderAllCategories: function() {
            var self = this;
            var container = jQuery('#unified-categories-container');
            var html = '';

            Object.keys(this.itemsDb).forEach(function(categoryId) {
                var catInfo = self.categoriesInfo[categoryId];
                html += self.renderCategory(categoryId, catInfo);
            });

            container.html(html);
        },

        renderCategory: function(categoryId, catInfo) {
            var self = this;
            var items = this.itemsDb[categoryId];

            var html = '<div class="category-section" id="unified-category-' + categoryId + '">';
            html += '<div class="items-list">';

            items.forEach(function(item) {
                var qty = self.inventory[categoryId] ? (self.inventory[categoryId][item.name] || 0) : 0;
                var safeId = 'unified_qty_' + categoryId + '_' + item.name.replace(/[^a-z0-9]/gi, '_');
                var safeName = item.name.replace(/'/g, "\\'");

                html += '<div class="item-row">';
                html += '<div style="flex: 1; display: flex; align-items: center; gap: 8px;">';
                html += '<div class="item-name">' + item.name + '</div>';
                html += '<div class="item-volume">' + item.volume + ' m³</div>';
                html += '</div>';
                html += '<div style="display: flex; align-items: center; gap: 4px;">';
                html += '<button class="btn-qty" onclick="UnifiedInventaire.changeQty(\'' + categoryId + '\', \'' + safeName + '\', -1)">-</button>';
                html += '<input type="number" class="qty-input" id="' + safeId + '" value="' + qty + '" min="0" onchange="UnifiedInventaire.setQty(\'' + categoryId + '\', \'' + safeName + '\', this.value)">';
                html += '<button class="btn-qty" onclick="UnifiedInventaire.changeQty(\'' + categoryId + '\', \'' + safeName + '\', 1)">+</button>';
                html += '</div>';
                html += '</div>';
            });

            html += '</div></div>';
            return html;
        },

        changeQty: function(category, itemName, delta) {
            if (!this.inventory[category]) this.inventory[category] = {};
            this.inventory[category][itemName] = Math.max(0, (this.inventory[category][itemName] || 0) + delta);

            var safeId = 'unified_qty_' + category + '_' + itemName.replace(/[^a-z0-9]/gi, '_');
            jQuery('#' + safeId).val(this.inventory[category][itemName]);

            this.updateTotalVolume();
        },

        setQty: function(category, itemName, value) {
            if (!this.inventory[category]) this.inventory[category] = {};
            this.inventory[category][itemName] = Math.max(0, parseInt(value) || 0);
            this.updateTotalVolume();
        },

        updateTotalVolume: function() {
            var self = this;
            var totalVolume = 0;

            console.log('[UnifiedInventaire] updateTotalVolume - inventory:', this.inventory);
            console.log('[UnifiedInventaire] updateTotalVolume - itemsDb:', this.itemsDb);

            Object.keys(this.inventory).forEach(function(category) {
                if (self.itemsDb[category]) {
                    self.itemsDb[category].forEach(function(item) {
                        var qty = self.inventory[category][item.name] || 0;
                        if (qty > 0) {
                            console.log('[UnifiedInventaire] Item with qty > 0:', category, item.name, 'qty:', qty, 'volume:', item.volume);
                        }
                        totalVolume += qty * item.volume;
                    });
                }
            });

            console.log('[UnifiedInventaire] Total volume calculated:', totalVolume);
            jQuery('#unified-totalVolume').val(totalVolume.toFixed(2));
        },

        initSearch: function() {
            var self = this;
            jQuery('#unified-inventory-search').on('input', function() {
                var searchTerm = jQuery(this).val().toLowerCase().trim();
                var allItems = jQuery('.inventaire-tab-container .item-row');
                var allSections = jQuery('.inventaire-tab-container .category-section');
                var visibleCount = 0;

                if (searchTerm === '') {
                    allItems.show();
                    allSections.show();
                    jQuery('#unified-inventory-search-results').text('');
                    return;
                }

                allSections.hide();
                allItems.hide();

                var visibleSections = [];

                allItems.each(function() {
                    var itemName = jQuery(this).find('.item-name').text().toLowerCase();
                    if (itemName.indexOf(searchTerm) !== -1) {
                        jQuery(this).show();
                        visibleCount++;
                        var parentSection = jQuery(this).closest('.category-section');
                        if (visibleSections.indexOf(parentSection[0]) === -1) {
                            visibleSections.push(parentSection[0]);
                        }
                    }
                });

                jQuery(visibleSections).show();

                var resultsDiv = jQuery('#unified-inventory-search-results');
                if (visibleCount === 0) {
                    resultsDiv.text('Aucun article trouve').css('color', '#e74c3c');
                } else {
                    resultsDiv.text(visibleCount + ' article(s) trouve(s)').css('color', '#27ae60');
                }
            });
        },

        toggleNewArticleForm: function() {
            var form = jQuery('#unified-new-article-form');
            form.toggle();
            if (form.is(':visible')) {
                jQuery('#unified-new-article-name').focus();
            }
        },

        createNewArticle: function() {
            var self = this;
            var name = jQuery('#unified-new-article-name').val().trim();
            var volume = parseFloat(jQuery('#unified-new-article-volume').val());
            var quantity = parseInt(jQuery('#unified-new-article-quantity').val()) || 0;

            if (!name) {
                app.helper.showErrorNotification({message: 'Veuillez entrer un nom d\'article'});
                return;
            }

            if (isNaN(volume) || volume < 0) {
                app.helper.showErrorNotification({message: 'Veuillez entrer un volume valide'});
                return;
            }

            jQuery.post('create_divers_product.php', {
                productname: name,
                unit_price: volume
            }, function(result) {
                if (result.success) {
                    app.helper.showSuccessNotification({message: 'Article cree avec succes!'});
                    self.toggleNewArticleForm();

                    // Reload items and re-render
                    self.loadItemsFromDatabase().then(function() {
                        if (!self.inventory['divers']) {
                            self.inventory['divers'] = {};
                        }
                        self.inventory['divers'][name] = quantity;
                        self.renderAllCategories();
                        self.updateTotalVolume();
                    });
                } else {
                    app.helper.showErrorNotification({message: 'Erreur: ' + (result.error || 'Erreur inconnue')});
                }
            }, 'json').fail(function() {
                app.helper.showErrorNotification({message: 'Erreur lors de la creation'});
            });
        },

        save: function() {
            var self = this;
            var totalVolume = 0;

            Object.keys(this.inventory).forEach(function(category) {
                if (self.itemsDb[category]) {
                    self.itemsDb[category].forEach(function(item) {
                        var qty = self.inventory[category][item.name] || 0;
                        totalVolume += qty * item.volume;
                    });
                }
            });

            var volumeFinal = parseFloat(jQuery('#unified-volumeFinal').val()) || 0;
            var totalBoxes = Math.ceil(totalVolume * 7);

            app.helper.showProgress();

            jQuery.ajax({
                url: 'save_inventory_direct.php',
                type: 'POST',
                data: {
                    record_id: this.recordId,
                    volume: totalVolume.toFixed(2),
                    volume_final: volumeFinal.toFixed(2),
                    boxes: totalBoxes,
                    inventory: JSON.stringify(this.inventory)
                },
                success: function(response) {
                    app.helper.hideProgress();
                    var result = typeof response === 'string' ? JSON.parse(response) : response;
                    if (result.success) {
                        app.helper.showSuccessNotification({message: 'Inventaire enregistre avec succes!'});
                        // Invalidate Details tab so it reloads with new volume
                        if (window.UnifiedTabbedView) {
                            UnifiedTabbedView.invalidateTab('details');
                        }
                    } else {
                        app.helper.showErrorNotification({message: 'Erreur: ' + (result.error || 'Erreur inconnue')});
                    }
                },
                error: function(xhr, status, error) {
                    app.helper.hideProgress();
                    app.helper.showErrorNotification({message: 'Erreur: ' + error});
                }
            });
        },

        cancel: function() {
            // Reload the tab to discard changes
            UnifiedTabbedView.loadedTabs['inventaire'] = false;
            UnifiedTabbedView.loadTabContent('inventaire');
        }
    };

})();
