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

            // Check if we should restore a specific tab after reload
            var savedTab = sessionStorage.getItem('activeTab_' + recordId);
            if (savedTab) {
                console.log('[UnifiedView] Restoring saved tab:', savedTab);
                sessionStorage.removeItem('activeTab_' + recordId);
                // Activate the saved tab
                jQuery('#unifiedTabNav a[data-tab="' + savedTab + '"]').tab('show');
                // Explicitly load the content
                this.loadTabContent(savedTab);
            } else {
                // Load the initially active tab
                var activeTab = jQuery('#unifiedTabNav li.active a').data('tab');
                if (activeTab) {
                    this.loadTabContent(activeTab);
                }
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

            console.log('[UnifiedView] Loading tab:', tabName, 'forceReload:', forceReload);

            // Show loading indicator if reloading
            if (forceReload) {
                tabPane.html('<div class="tab-loader" style="padding: 40px; text-align: center;"><i class="fa fa-spinner fa-spin fa-2x"></i><br><br>Chargement...</div>');
            }

            // Use dedicated AJAX view for loading tab content
            // Add timestamp to prevent any caching
            var ajaxUrl = 'index.php?module=Potentials&view=UnifiedTabAjax&record=' + this.recordId + '&tab=' + tabName + '&_t=' + Date.now();

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

                case 'odm':
                    console.log('[UnifiedView] Initializing ODM tab');
                    if (window.UnifiedODM) {
                        UnifiedODM.init(this.recordId);
                    } else {
                        console.error('[UnifiedView] UnifiedODM not defined!');
                    }
                    break;

                case 'facture':
                    console.log('[UnifiedView] Initializing Facture tab');
                    if (window.UnifiedFacture) {
                        UnifiedFacture.init();
                    } else {
                        console.error('[UnifiedView] UnifiedFacture not defined!');
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
        isSaving: false,  // Flag to prevent concurrent saves
        isLoading: false, // Flag to prevent auto-save during quote loading
        autoSaveTimeout: null, // Timeout for debounced auto-save

        triggerDebouncedAutoSave: function() {
            var self = this;
            var quoteId = jQuery('#unified_selectedQuoteId').val();
            if (!quoteId) return;

            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(function() {
                self.autoSaveQuoteWithProducts();
            }, 500); // 500ms delay
        },

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
            jQuery('#unified_montant_total_ttc').on('input change', function() { self.updateFromTotalTTC(); });

            // Disable scroll on number inputs
            jQuery('#devisTabContainer').on('wheel', 'input[type="number"]', function(e) {
                jQuery(this).blur();
            });

            // Auto-save with debounce
            this.registerAutoSave();
        },

        registerAutoSave: function() {
            var self = this;

            // Debounced auto-save - waits 500ms after last change
            var triggerAutoSave = function() {
                clearTimeout(self.autoSaveTimeout);
                self.autoSaveTimeout = setTimeout(function() {
                    self.autoSaveQuoteWithProducts();
                }, 500);
            };

            // Delegate all events to container (like Details tab pattern)
            // Auto-save on change for selects (immediate)
            jQuery('#devisTabContainer').on('change', 'select', function() {
                var quoteId = jQuery('#unified_selectedQuoteId').val();
                if (quoteId) {
                    triggerAutoSave();
                }
            });

            // Auto-save on input for text/number/date inputs (debounced 500ms)
            jQuery('#devisTabContainer').on('input', 'input[type="text"], input[type="number"], input[type="date"]', function() {
                var quoteId = jQuery('#unified_selectedQuoteId').val();
                if (quoteId) {
                    triggerAutoSave();
                }
            });
        },

        saveQuoteField: function(quoteId, fieldName, fieldValue) {
            var self = this;

            // Skip auto-save during quote loading
            if (this.isLoading) {
                console.log('[UnifiedDevis] Skipping field auto-save during loading:', fieldName);
                return;
            }

            console.log('[UnifiedDevis] Auto-saving field:', fieldName, '=', fieldValue);

            // Visual feedback
            var field = jQuery('#unified_' + fieldName + ', #unified_' + fieldName.replace('cf_', ''));
            field.addClass('field-saving');

            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                data: {
                    module: 'Quotes',
                    action: 'SaveAjax',
                    record: quoteId,
                    field: fieldName,
                    value: fieldValue
                },
                success: function(response) {
                    field.removeClass('field-saving').addClass('field-saved');
                    setTimeout(function() {
                        field.removeClass('field-saved');
                    }, 1500);
                    console.log('[UnifiedDevis] Field saved:', fieldName);
                },
                error: function(xhr, status, error) {
                    field.removeClass('field-saving').addClass('field-error');
                    setTimeout(function() {
                        field.removeClass('field-error');
                    }, 3000);
                    console.error('[UnifiedDevis] Error saving field:', fieldName, error);
                }
            });
        },

        autoSaveQuoteWithProducts: function() {
            var self = this;
            var quoteId = jQuery('#unified_selectedQuoteId').val();

            if (!quoteId) {
                console.log('[UnifiedDevis] No quote selected, skipping auto-save');
                return;
            }

            // Skip auto-save during quote loading
            if (this.isLoading) {
                console.log('[UnifiedDevis] Skipping auto-save during loading');
                return;
            }

            // Prevent concurrent saves
            if (this.isSaving) {
                console.log('[UnifiedDevis] Already saving, skipping');
                return;
            }

            this.isSaving = true;
            console.log('[UnifiedDevis] Auto-saving quote with products (using FormData like Save button)...');

            // Prepare form exactly like submitToVtiger does
            jQuery('#unified_recordId').val(quoteId);
            jQuery('#unified_hidden_subject').val(jQuery('#unified_subject').val());
            jQuery('#unified_hidden_cf_1005').val(jQuery('#unified_cf_1005').val());
            jQuery('#unified_hidden_cf_1125').val(jQuery('#unified_cf_1125').val());
            jQuery('#unified_hidden_cf_1269').val(jQuery('#unified_cf_1269').val());
            jQuery('#unified_hidden_cf_1127').val(jQuery('#unified_cf_1127').val() || '0');
            jQuery('#unified_hidden_cf_1129').val(jQuery('#unified_cf_1129').val() || '0');
            jQuery('#unified_hidden_cf_1139').val(jQuery('#unified_cf_1139').val());
            jQuery('#unified_hidden_prestataire').val(jQuery('#unified_prestataire').val());
            jQuery('#unified_hidden_cf_1162').val(jQuery('#unified_cf_1162').val());

            // Copy discount (remise) values
            var remiseType = jQuery('input[name="unified_remise_type"]:checked').val() || 'none';
            if (remiseType === 'percent') {
                jQuery('#unified_hdnDiscountPercent').val(jQuery('#unified_remise_percent').val() || '0');
                jQuery('#unified_hdnDiscountAmount').val('0');
            } else if (remiseType === 'amount') {
                jQuery('#unified_hdnDiscountPercent').val('0');
                jQuery('#unified_hdnDiscountAmount').val(jQuery('#unified_remise_amount').val() || '0');
            } else {
                jQuery('#unified_hdnDiscountPercent').val('0');
                jQuery('#unified_hdnDiscountAmount').val('0');
            }

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

            // Calculate totals for VTiger (must match server-side Quotes_Save_Action logic)
            var productsTotal = 0;
            jQuery('#unified_productsList tr').each(function() {
                var qty = parseFloat(jQuery(this).find('input[name^="qty"]').val()) || 0;
                var price = parseFloat(jQuery(this).find('input[name^="listPrice"]').val()) || 0;
                productsTotal += qty * price;
            });

            var forfaitHT = parseFloat(jQuery('#unified_cf_1127').val()) || 0;
            var supplementHT = parseFloat(jQuery('#unified_cf_1129').val()) || 0;
            var assuranceValue = parseFloat(jQuery('#unified_cf_1139').val()) || 0;
            var assuranceHT = assuranceValue > 0 ? ((assuranceValue - 4000) / 1000) * 14 : 0;
            if (assuranceHT < 0) assuranceHT = 0;

            var subTotal = productsTotal + forfaitHT + supplementHT + assuranceHT;

            var remiseType = jQuery('input[name="unified_remise_type"]:checked').val() || 'none';
            var discountHT = 0;
            if (remiseType === 'percent') {
                discountHT = subTotal * (parseFloat(jQuery('#unified_remise_percent').val()) || 0) / 100;
            } else if (remiseType === 'amount') {
                discountHT = parseFloat(jQuery('#unified_remise_amount').val()) || 0;
            }
            var preTaxTotal = subTotal - discountHT;
            if (preTaxTotal < 0) preTaxTotal = 0;
            var grandTotal = preTaxTotal * 1.20; // TVA 20%

            jQuery('#unified_hdnSubTotal').val(subTotal.toFixed(2));
            jQuery('#unified_hdnGrandTotal').val(grandTotal.toFixed(2));
            jQuery('#unified_pre_tax_total').val(preTaxTotal.toFixed(2));

            // Show subtle saving indicator
            jQuery('#devisTabContainer').addClass('saving');

            // Use FormData exactly like submitToVtiger (which works)
            var form = jQuery('#unifiedQuoteForm');
            var formData = new FormData(form[0]);

            console.log('[UnifiedDevis] Submitting with FormData...');

            fetch('/index.php', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            })
            .then(function(response) {
                console.log('[UnifiedDevis] Save response status:', response.status);
                self.isSaving = false;

                // Wait a bit then fetch updated data to update chip
                setTimeout(function() {
                    jQuery.get('get_quote_data.php?quoteid=' + quoteId, function(data) {
                        jQuery('#devisTabContainer').removeClass('saving').addClass('saved');
                        setTimeout(function() {
                            jQuery('#devisTabContainer').removeClass('saved');
                        }, 1500);

                        console.log('[UnifiedDevis] Data from DB after save:', data);

                        if (data.success && data.quote) {
                            var chip = jQuery('.quote-chip[data-quoteid="' + quoteId + '"]');
                            if (chip.length) {
                                var total = parseFloat(data.quote.total) || 0;
                                var totalFormatted = Math.round(total).toLocaleString('fr-FR').replace(/\s/g, ' ') + '€';
                                chip.find('.chip-total').text(totalFormatted);
                                chip.find('.chip-formule').text(data.quote.cf_1125 || '-');
                                console.log('[UnifiedDevis] Updated chip to:', totalFormatted);
                            }
                        }
                    });
                }, 500);
            })
            .catch(function(error) {
                self.isSaving = false;
                jQuery('#devisTabContainer').removeClass('saving').addClass('save-error');
                setTimeout(function() {
                    jQuery('#devisTabContainer').removeClass('save-error');
                }, 3000);
                console.error('[UnifiedDevis] Save error:', error);
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

        MANUAL_PRODUCT_ID: 1879,

        addProduct: function(product, qty) {
            var isManual = (String(product.id) === String(this.MANUAL_PRODUCT_ID));

            // Allow duplicates for manual products, block for catalog products
            if (!isManual && this.selectedProducts[product.id]) {
                app.helper.showErrorNotification({message: 'Ce produit est deja dans la liste'});
                return;
            }

            this.productCounter++;
            if (!isManual) {
                this.selectedProducts[product.id] = true;
            }

            var productName = product.name || 'Produit inconnu';
            var unitPrice = parseFloat(product.unit_price || 0).toFixed(2);
            var quantity = qty || 1;
            var lineTotal = (parseFloat(unitPrice) * parseInt(quantity)).toFixed(2);
            var pctAcompte = product.pct_acompte || 43;
            var pctSolde = product.pct_solde || 57;
            var counter = this.productCounter;
            var removeFunc = isManual ? 'removeManualProduct' : 'removeProduct';
            var removeArgs = isManual ? 'this' : 'this,' + product.id;

            var row = jQuery('<tr></tr>');
            row.attr('data-product-id', product.id);
            row.attr('data-pct-acompte', pctAcompte);
            row.attr('data-pct-solde', pctSolde);
            row.css('border-bottom', '1px solid #dee2e6');
            row.html(
                '<td style="padding:10px"><input type="text" name="productName' + counter + '" value="' + productName.replace(/"/g, '&quot;') + '" class="form-control' + (isManual ? ' unified-name-input' : '') + '"></td>' +
                '<td style="padding:10px"><input type="number" name="qty' + counter + '" value="' + quantity + '" step="1" min="1" class="form-control unified-qty-input" onchange="UnifiedDevis.updateLineTotal(this)" oninput="UnifiedDevis.updateLineTotal(this)"></td>' +
                '<td style="padding:10px"><input type="number" name="listPrice' + counter + '" value="' + unitPrice + '" step="0.01" min="0" class="form-control unified-price-input" onchange="UnifiedDevis.updateLineTotal(this)" oninput="UnifiedDevis.updateLineTotal(this)"></td>' +
                '<td style="padding:10px"><span class="product-total" style="font-weight:bold;color:#667eea;">' + lineTotal + '</span> EUR</td>' +
                '<td style="padding:10px"><button type="button" onclick="UnifiedDevis.' + removeFunc + '(' + removeArgs + ')" class="btn btn-danger btn-sm"><i class="fa fa-trash"></i></button></td>'
            );

            // Auto-save on name change for manual products
            if (isManual) {
                var self = this;
                row.find('.unified-name-input').on('change', function() {
                    self.triggerDebouncedAutoSave();
                });
            }

            jQuery('#unified_productsList').append(row);
            jQuery('#unified_productsTable').show();
            this.updateMontantTotal();

            // Debounced auto-save for products
            this.triggerDebouncedAutoSave();
        },

        addManualProduct: function() {
            this.addProduct({
                id: this.MANUAL_PRODUCT_ID,
                name: '',
                unit_price: 0,
                pct_acompte: 43,
                pct_solde: 57
            }, 1);
            // Focus on the last added name input
            jQuery('#unified_productsList tr:last .unified-name-input').attr('placeholder', 'Nom du produit').focus();
        },

        removeManualProduct: function(btn) {
            jQuery(btn).closest('tr').remove();
            if (jQuery('#unified_productsList').children().length === 0) {
                jQuery('#unified_productsTable').hide();
            }
            this.updateMontantTotal();
            this.triggerDebouncedAutoSave();
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

            // Debounced auto-save for product changes
            this.triggerDebouncedAutoSave();
        },

        removeProduct: function(btn, productId) {
            jQuery(btn).closest('tr').remove();
            delete this.selectedProducts[productId];
            if (jQuery('#unified_productsList').children().length === 0) {
                jQuery('#unified_productsTable').hide();
            }
            this.updateMontantTotal();

            // Debounced auto-save after product removal
            this.triggerDebouncedAutoSave();
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

            // Calculate TOTAL HT BEFORE discount
            var totalHTBeforeDiscount = forfaitHT + supplementHT + produitsHT + assuranceHT;

            // Calculate discount (remise) - apply on TOTAL HT
            var remiseType = jQuery('input[name="unified_remise_type"]:checked').val() || 'none';
            var remiseHT = 0;
            var maxRemisePercent = 15;
            var maxRemiseAmount = totalHTBeforeDiscount * maxRemisePercent / 100;

            if (remiseType === 'percent') {
                var remisePercent = parseFloat(jQuery('#unified_remise_percent').val()) || 0;
                // Limit to 15%
                if (remisePercent > maxRemisePercent) {
                    remisePercent = maxRemisePercent;
                    jQuery('#unified_remise_percent').val(maxRemisePercent);
                }
                remiseHT = totalHTBeforeDiscount * remisePercent / 100;
            } else if (remiseType === 'amount') {
                remiseHT = parseFloat(jQuery('#unified_remise_amount').val()) || 0;
                // Limit to 15% of total HT
                if (remiseHT > maxRemiseAmount) {
                    remiseHT = maxRemiseAmount;
                    jQuery('#unified_remise_amount').val(maxRemiseAmount.toFixed(2));
                }
            }

            // Update discount display
            jQuery('#unified_remise_display').text(remiseHT.toFixed(2) + ' €');

            // Calculate acompte and solde BEFORE discount
            var forfaitAcompteHT = (forfaitHT * PCT_ACOMPTE_FORFAIT / 100) + supplementHT;
            var acompteHTBrut = forfaitAcompteHT + produitsAcompteHT + assuranceHT;
            var forfaitSoldeHT = forfaitHT * PCT_SOLDE_FORFAIT / 100;
            var soldeHTBrut = forfaitSoldeHT + produitsSoldeHT;
            var totalHTBrut = acompteHTBrut + soldeHTBrut;

            // Répartir la remise proportionnellement sur acompte et solde
            var ratio = totalHTBrut > 0 ? (totalHTBrut - remiseHT) / totalHTBrut : 1;
            var totalAcompteHT = acompteHTBrut * ratio;
            var totalSoldeHT = soldeHTBrut * ratio;
            var totalHT = totalHTBrut - remiseHT;
            if (totalHT < 0) totalHT = 0;

            var acompteTTC = totalAcompteHT * this.TVA_RATE;
            var soldeTTC = totalSoldeHT * this.TVA_RATE;

            var totalTTC = totalHT * this.TVA_RATE;

            jQuery('#unified_acompte_ttc').text(acompteTTC.toFixed(2) + ' €');
            jQuery('#unified_solde_ttc').text(soldeTTC.toFixed(2) + ' €');
            jQuery('#unified_montant_total_ht').text(totalHT.toFixed(2) + ' €');
            jQuery('#unified_montant_total_ttc').val(totalTTC.toFixed(2));
        },

        updateFromTotalTTC: function() {
            var totalTTC = parseFloat(jQuery('#unified_montant_total_ttc').val()) || 0;
            var supplementHT = parseFloat(jQuery('#unified_cf_1129').val()) || 0;
            var totalHT = totalTTC / this.TVA_RATE;

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
                    produitsAcompteHT += lineTotal * pctAcompte / 100;
                    produitsSoldeHT += lineTotal * (100 - pctAcompte) / 100;
                }
            });

            var assuranceValue = parseFloat(jQuery('#unified_cf_1139').val()) || 0;
            var assuranceHT = assuranceValue > 0 ? ((assuranceValue - 4000) / 1000) * 14 : 0;

            // Calculate remise to add back when finding forfaitHT
            var remiseType = jQuery('input[name="unified_remise_type"]:checked').val() || 'none';
            var maxRemisePercent = 15;
            var forfaitHT = 0;
            var remiseHT = 0;

            if (remiseType === 'percent') {
                var remisePercent = Math.min(parseFloat(jQuery('#unified_remise_percent').val()) || 0, maxRemisePercent);
                // totalHT = totalHTBeforeDiscount * (1 - percent/100)
                var totalHTBeforeDiscount = totalHT / (1 - remisePercent / 100);
                forfaitHT = totalHTBeforeDiscount - supplementHT - produitsHT - assuranceHT;
                remiseHT = totalHTBeforeDiscount * remisePercent / 100;
            } else if (remiseType === 'amount') {
                remiseHT = parseFloat(jQuery('#unified_remise_amount').val()) || 0;
                // totalHT = totalHTBeforeDiscount - remiseHT, so add remise back
                forfaitHT = totalHT + remiseHT - supplementHT - produitsHT - assuranceHT;
                // Cap remise at 15% of totalHTBeforeDiscount
                var totalHTBeforeDiscount = forfaitHT + supplementHT + produitsHT + assuranceHT;
                var maxRemise = totalHTBeforeDiscount * maxRemisePercent / 100;
                if (remiseHT > maxRemise) {
                    remiseHT = maxRemise;
                    jQuery('#unified_remise_amount').val(maxRemise.toFixed(2));
                    forfaitHT = totalHT + remiseHT - supplementHT - produitsHT - assuranceHT;
                }
            } else {
                forfaitHT = totalHT - supplementHT - produitsHT - assuranceHT;
            }

            if (forfaitHT < 0) forfaitHT = 0;
            var forfaitTTC = forfaitHT * this.TVA_RATE;

            jQuery('#unified_cf_1127').val(forfaitHT.toFixed(2));
            jQuery('#unified_cf_1127_ttc').val(forfaitTTC.toFixed(2));

            var totalForfaitTTC = (forfaitHT + supplementHT) * this.TVA_RATE;
            jQuery('#unified_forfait_total_ttc').val(totalForfaitTTC.toFixed(2));

            jQuery('#unified_montant_total_ht').text(totalHT.toFixed(2) + ' €');
            jQuery('#unified_remise_display').text(remiseHT.toFixed(2) + ' €');

            // Recalculate acompte/solde avec remise proportionnelle
            var PCT_ACOMPTE_FORFAIT = 43;
            var PCT_SOLDE_FORFAIT = 57;

            var forfaitAcompteHT = (forfaitHT * PCT_ACOMPTE_FORFAIT / 100) + supplementHT;
            var acompteHTBrut2 = forfaitAcompteHT + produitsAcompteHT + assuranceHT;
            var forfaitSoldeHT = forfaitHT * PCT_SOLDE_FORFAIT / 100;
            var soldeHTBrut2 = forfaitSoldeHT + produitsSoldeHT;
            var totalHTBrut2 = acompteHTBrut2 + soldeHTBrut2;
            var ratio2 = totalHTBrut2 > 0 ? (totalHTBrut2 - remiseHT) / totalHTBrut2 : 1;
            var totalAcompteHT = acompteHTBrut2 * ratio2;
            var totalSoldeHT = soldeHTBrut2 * ratio2;

            jQuery('#unified_acompte_ttc').text((totalAcompteHT * this.TVA_RATE).toFixed(2) + ' €');
            jQuery('#unified_solde_ttc').text((totalSoldeHT * this.TVA_RATE).toFixed(2) + ' €');

            this.triggerDebouncedAutoSave();
        },

        loadQuote: function(quoteId) {
            var self = this;

            console.log('[UnifiedDevis] loadQuote called with quoteId:', quoteId);

            // Set loading flag to prevent auto-save during loading
            this.isLoading = true;
            console.log('[UnifiedDevis] isLoading set to true');

            // Update selection (support both old quote-card and new quote-chip)
            jQuery('.quote-card, .quote-chip').removeClass('selected');
            jQuery('.quote-card[data-quoteid="' + quoteId + '"], .quote-chip[data-quoteid="' + quoteId + '"]').addClass('selected');
            jQuery('#unified_selectedQuoteId').val(quoteId);
            console.log('[UnifiedDevis] unified_selectedQuoteId set to:', jQuery('#unified_selectedQuoteId').val());
            jQuery('#unified_btnPaiement').show();
            jQuery('#unified_btnViewPdf').show();
            jQuery('#unified_btnDeleteQuote').show();
            this.updatePdfSendStatus();

            jQuery.get('get_quote_data.php?quoteid=' + quoteId, function(data) {
                if (!data.success) {
                    self.isLoading = false;
                    console.log('[UnifiedDevis] isLoading set to false (data error)');
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
                jQuery('#unified_prestataire').val(quote.prestataire || '');

                // Load validation status
                var isValidated = quote.cf_1162 === '1' || quote.cf_1162 === 1;
                jQuery('#unified_cf_1162').val(isValidated ? '1' : '0');
                var toggle = jQuery('#unified_cf_1162_toggle');
                var chip = jQuery('.quote-chip[data-quoteid="' + quoteId + '"]');
                if (isValidated) {
                    toggle.addClass('validated');
                    toggle.find('i').removeClass('fa-circle-o').addClass('fa-check-circle');
                    toggle.find('span').text('Validé');
                    chip.addClass('validated');
                } else {
                    toggle.removeClass('validated');
                    toggle.find('i').removeClass('fa-check-circle').addClass('fa-circle-o');
                    toggle.find('span').text('Non validé');
                    chip.removeClass('validated');
                }

                // Load discount (remise) values
                var discountPercent = parseFloat(quote.discount_percent) || 0;
                var discountAmount = parseFloat(quote.discount_amount) || 0;
                if (discountPercent > 0) {
                    jQuery('input[name="unified_remise_type"][value="percent"]').prop('checked', true);
                    jQuery('#unified_remise_percent').val(discountPercent).prop('disabled', false);
                    jQuery('#unified_remise_amount').val(0).prop('disabled', true);
                } else if (discountAmount > 0) {
                    jQuery('input[name="unified_remise_type"][value="amount"]').prop('checked', true);
                    jQuery('#unified_remise_amount').val(discountAmount).prop('disabled', false);
                    jQuery('#unified_remise_percent').val(0).prop('disabled', true);
                } else {
                    jQuery('input[name="unified_remise_type"][value="none"]').prop('checked', true);
                    jQuery('#unified_remise_percent, #unified_remise_amount').val(0).prop('disabled', true);
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

                // Recalcul final après chargement de tous les produits (avec remise)
                self.updateMontantTotal();

                // Loading complete - re-enable auto-save
                self.isLoading = false;
                console.log('[UnifiedDevis] isLoading set to false - loading complete');

            }, 'json').fail(function() {
                self.isLoading = false;
                console.log('[UnifiedDevis] isLoading set to false (after error)');
                app.helper.showErrorNotification({message: 'Erreur lors du chargement du devis'});
            });
        },

        toggleValidation: function() {
            var toggle = jQuery('#unified_cf_1162_toggle');
            var hidden = jQuery('#unified_cf_1162');
            var isValidated = hidden.val() === '1';
            var quoteId = jQuery('#unified_selectedQuoteId').val();
            var chip = jQuery('.quote-chip[data-quoteid="' + quoteId + '"]');

            if (isValidated) {
                // Unvalidate
                hidden.val('0');
                toggle.removeClass('validated');
                toggle.find('i').removeClass('fa-check-circle').addClass('fa-circle-o');
                toggle.find('span').text('Non validé');
                chip.removeClass('validated');
            } else {
                // Validate
                hidden.val('1');
                toggle.addClass('validated');
                toggle.find('i').removeClass('fa-circle-o').addClass('fa-check-circle');
                toggle.find('span').text('Validé');
                chip.addClass('validated');
            }

            // Trigger auto-save
            this.triggerDebouncedAutoSave();
        },

        deleteQuote: function() {
            var self = this;
            var quoteId = jQuery('#unified_selectedQuoteId').val();

            if (!quoteId) {
                app.helper.showErrorNotification({message: 'Veuillez sélectionner un devis'});
                return;
            }

            // Confirmation
            if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible.')) {
                return;
            }

            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                data: {
                    module: 'Quotes',
                    action: 'Delete',
                    record: quoteId
                },
                success: function(response) {
                    app.helper.showSuccessNotification({message: 'Devis supprimé avec succès'});

                    // Remove the quote chip from the list
                    jQuery('.quote-chip[data-quoteid="' + quoteId + '"]').fadeOut(300, function() {
                        jQuery(this).remove();
                    });

                    // Clear the form
                    jQuery('#unified_selectedQuoteId').val('');
                    jQuery('#unified_btnPaiement, #unified_btnViewPdf, #unified_btnDeleteQuote').hide();
                    jQuery('#unified_productsList').empty();
                    jQuery('#unified_subject, #unified_cf_1005, #unified_cf_1127, #unified_cf_1129, #unified_cf_1139').val('');

                    // Save current tab before reload to stay in the same tab
                    var currentTab = jQuery('#unifiedTabNav li.active a').data('tab') || 'devis';
                    var potentialId = jQuery('#devisTabContainer').data('potential-id');
                    sessionStorage.setItem('activeTab_' + potentialId, currentTab);

                    // Reload the page to refresh the quotes list
                    setTimeout(function() {
                        location.reload();
                    }, 1000);
                },
                error: function(xhr, status, error) {
                    app.helper.showErrorNotification({message: 'Erreur lors de la suppression du devis'});
                    console.error('Delete error:', error);
                }
            });
        },

        togglePdfTemplate: function(element, templateId) {
            var checkbox = jQuery(element).find('input[type="checkbox"]');
            checkbox.prop('checked', !checkbox.prop('checked'));
            jQuery(element).toggleClass('checked');
            this.updatePdfSendStatus();
        },

        openPDFPreviewModal: function() {
            var quoteId = jQuery('#unified_selectedQuoteId').val();
            if (!quoteId) {
                app.helper.showErrorNotification({message: 'Veuillez d\'abord selectionner un devis'});
                return;
            }

            var templates = window.unifiedPdfTemplates || [];
            if (templates.length === 0) {
                app.helper.showErrorNotification({message: 'Aucun modele PDF disponible'});
                return;
            }

            var modalId = 'pdfPreviewModal';
            var modal = jQuery('#' + modalId);

            // Build template list HTML
            var listHtml = '';
            templates.forEach(function(tpl, index) {
                var activeClass = (index === 0) ? ' active' : '';
                listHtml += '<div class="pdf-tpl-item' + activeClass + '" data-templateid="' + tpl.id + '">' +
                            '<i class="fa fa-file-pdf-o"></i> ' +
                            '<span>' + tpl.name + '</span>' +
                            '</div>';
            });

            // Preview URL for the first template
            var firstPreviewUrl = 'index.php?module=PDFMaker&action=IndexAjax&mode=getPreviewContent' +
                                  '&source_module=Quotes&pdftemplateid=' + templates[0].id +
                                  '&record=' + quoteId + '&generate_type=inline';

            if (modal.length === 0) {
                // Create modal
                modal = jQuery(
                    '<div class="modal fade" id="' + modalId + '" tabindex="-1" role="dialog">' +
                        '<div class="modal-dialog" role="document" style="width: 90%; max-width: 1200px;">' +
                            '<div class="modal-content">' +
                                '<div class="modal-header" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: white;">' +
                                    '<button type="button" class="close" data-dismiss="modal" style="color: rgba(255,255,255,0.7); opacity: 1;">&times;</button>' +
                                    '<h4 class="modal-title"><i class="fa fa-file-pdf-o"></i> Apercu PDF</h4>' +
                                '</div>' +
                                '<div class="modal-body" style="padding: 0; display: flex; height: 78vh;">' +
                                    '<div class="pdf-tpl-sidebar" id="pdfTplSidebar" style="width: 230px; min-width: 230px; overflow-y: auto; padding: 14px 0;">' +
                                        '<div class="pdf-tpl-sidebar-title">Modeles</div>' +
                                        listHtml +
                                    '</div>' +
                                    '<div style="flex: 1; position: relative; border-radius: 0 0 16px 0; overflow: hidden;">' +
                                        '<div id="pdfPreviewLoading" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10;">' +
                                            '<i class="fa fa-spinner fa-spin fa-3x"></i>' +
                                            '<p style="margin-top: 12px;">Chargement...</p>' +
                                        '</div>' +
                                        '<iframe id="pdfPreviewIframe" src="' + firstPreviewUrl + '" style="width: 100%; height: 100%; border: none; display: block;"></iframe>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="modal-footer">' +
                                    '<button type="button" class="btn btn-info" id="pdfPreviewDownload"><i class="fa fa-download"></i> Telecharger</button>' +
                                    '<button type="button" class="btn btn-default" id="pdfPreviewPrint"><i class="fa fa-print"></i> Imprimer</button>' +
                                    '<button type="button" class="btn btn-default" data-dismiss="modal">Fermer</button>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                );
                jQuery('body').append(modal);

                // Click on template item
                modal.on('click', '.pdf-tpl-item', function() {
                    var tplId = jQuery(this).data('templateid');
                    var currentQuoteId = jQuery('#unified_selectedQuoteId').val();

                    modal.find('.pdf-tpl-item').removeClass('active');
                    jQuery(this).addClass('active');

                    jQuery('#pdfPreviewLoading').css('display', 'flex');

                    var previewUrl = 'index.php?module=PDFMaker&action=IndexAjax&mode=getPreviewContent' +
                                     '&source_module=Quotes&pdftemplateid=' + tplId +
                                     '&record=' + currentQuoteId + '&generate_type=inline';
                    jQuery('#pdfPreviewIframe').attr('src', previewUrl);
                });

                // Hide spinner when iframe loads
                modal.find('#pdfPreviewIframe').on('load', function() {
                    jQuery('#pdfPreviewLoading').hide();
                });

                // Download
                modal.on('click', '#pdfPreviewDownload', function() {
                    var tplId = modal.find('.pdf-tpl-item.active').data('templateid');
                    var currentQuoteId = jQuery('#unified_selectedQuoteId').val();
                    var downloadUrl = 'index.php?module=PDFMaker&action=CreatePDFFromTemplate&mode=CreatePDF' +
                                      '&source_module=Quotes&formodule=Quotes' +
                                      '&record=' + currentQuoteId +
                                      '&pdftemplateid=' + tplId;
                    window.open(downloadUrl, '_blank');
                });

                // Print
                modal.on('click', '#pdfPreviewPrint', function() {
                    var iframe = document.getElementById('pdfPreviewIframe');
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                    }
                });
            } else {
                // Modal exists - update for current quote
                modal.find('#pdfTplSidebar').html(
                    '<div class="pdf-tpl-sidebar-title">Modeles</div>' +
                    listHtml
                );
                jQuery('#pdfPreviewIframe').attr('src', firstPreviewUrl);
            }

            modal.modal('show');
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
         * Open ODM (Ordre de Mission) Modal
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
                                '<h4 class="modal-title"><i class="fa fa-file-text-o"></i> Ordres de Mission</h4>' +
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

            // Load ODM data
            this.loadBDCData(quoteId);
        },

        /**
         * Load BDC data for a quote
         */
        loadBDCData: function(quoteId) {
            var self = this;
            console.log('[UnifiedDevis] loadBDCData called with quoteId:', quoteId);
            jQuery('#bdcModalBody').html('<div class="text-center"><i class="fa fa-spinner fa-spin fa-3x"></i><p>Chargement des ordres de mission...</p></div>');

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
                    console.log('[UnifiedDevis] BDC response:', response);
                    if (response.success) {
                        self.renderBDCList(quoteId, response.data);
                    } else {
                        jQuery('#bdcModalBody').html('<div class="alert alert-danger"><i class="fa fa-exclamation-circle"></i> ' + (response.message || 'Erreur lors du chargement') + '</div>');
                    }
                },
                error: function(xhr, status, error) {
                    console.error('[UnifiedDevis] BDC load error:', error);
                    console.error('[UnifiedDevis] BDC xhr:', xhr.responseText);
                    jQuery('#bdcModalBody').html('<div class="alert alert-danger"><i class="fa fa-exclamation-circle"></i> Erreur de connexion<br><small>' + error + '</small></div>');
                }
            });
        },

        /**
         * Render BDC list in modal
         */
        renderBDCList: function(quoteId, data) {
            var self = this;
            var html = '';

            // ODM List
            html += '<div class="panel panel-default">';
            html += '<div class="panel-heading"><h5 class="panel-title"><i class="fa fa-list"></i> Liste des Ordres de Mission</h5></div>';
            html += '<div class="panel-body" style="padding: 0;">';

            if (data.salesorders && data.salesorders.length > 0) {
                html += '<table class="table table-striped table-hover" style="margin: 0;">';
                html += '<thead><tr style="background: #f5f5f5;"><th>N° ODM</th><th>Sujet</th><th>Date</th><th class="text-right">Total</th><th>Statut</th><th>Actions</th></tr></thead><tbody>';

                data.salesorders.forEach(function(so) {
                    var statusClass = 'label-default';
                    if (so.sostatus === 'Approved') statusClass = 'label-success';
                    else if (so.sostatus === 'Created') statusClass = 'label-info';
                    else if (so.sostatus === 'Delivered') statusClass = 'label-primary';
                    else if (so.sostatus === 'Cancelled') statusClass = 'label-danger';

                    // Note: fetchByAssoc converts all keys to lowercase
                    html += '<tr>';
                    html += '<td><strong>' + (so.salesorder_no || '-') + '</strong></td>';
                    html += '<td>' + (so.subject || '-') + '</td>';
                    html += '<td>' + (so.createdtime || '-') + '</td>';
                    html += '<td class="text-right"><strong>' + self.formatMoney(so.hdngrandtotal) + ' €</strong></td>';
                    html += '<td><span class="label ' + statusClass + '">' + (so.sostatus || '-') + '</span></td>';
                    html += '<td>';
                    html += '<a href="index.php?module=SalesOrder&view=Detail&record=' + so.salesorderid + '" target="_blank" class="btn btn-xs btn-info" title="Voir"><i class="fa fa-eye"></i></a> ';
                    html += '<a href="index.php?module=PDFMaker&action=CreatePDFFromTemplate&mode=CreatePDF&source_module=SalesOrder&formodule=SalesOrder&record=' + so.salesorderid + '" target="_blank" class="btn btn-xs btn-success" title="PDF"><i class="fa fa-file-pdf-o"></i></a>';
                    html += '</td>';
                    html += '</tr>';
                });

                html += '</tbody></table>';
            } else {
                html += '<p class="text-center text-muted" style="padding: 20px;"><i class="fa fa-info-circle"></i> Aucun ordre de mission pour ce devis</p>';
            }

            html += '</div></div>';

            // Create new ODM section
            html += '<div class="panel panel-success">';
            html += '<div class="panel-heading"><h5 class="panel-title"><i class="fa fa-plus-circle"></i> Creer un Ordre de Mission</h5></div>';
            html += '<div class="panel-body">';
            html += '<p class="text-muted">Creer un nouvel ordre de mission a partir de ce devis. Vous serez redirige vers le formulaire VTiger avec les donnees pre-remplies.</p>';
            html += '<a href="index.php?module=SalesOrder&view=Edit&quote_id=' + quoteId + '" target="_blank" class="btn btn-success">';
            html += '<i class="fa fa-plus"></i> Creer un ODM depuis ce devis';
            html += '</a>';
            html += '</div></div>';

            jQuery('#bdcModalBody').html(html);
        },

        /**
         * Create ODM from Quote
         */
        createBDCFromQuote: function(quoteId) {
            var self = this;

            if (!confirm('Voulez-vous creer un ordre de mission a partir de ce devis?')) {
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
                        app.helper.showSuccessNotification({message: 'Ordre de mission cree avec succes!'});
                        // Reload ODM list
                        self.loadBDCData(quoteId);
                    } else {
                        app.helper.showErrorNotification({message: response.message || 'Erreur lors de la creation'});
                        jQuery('#bdcModalBody .btn-success').prop('disabled', false).html('<i class="fa fa-plus"></i> Creer un ODM depuis ce devis');
                    }
                },
                error: function(xhr, status, error) {
                    console.error('[UnifiedDevis] ODM create error:', error);
                    app.helper.showErrorNotification({message: 'Erreur de connexion'});
                    jQuery('#bdcModalBody .btn-success').prop('disabled', false).html('<i class="fa fa-plus"></i> Creer un ODM depuis ce devis');
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
                jQuery(this).closest('.pdf-template-item').toggleClass('checked', !allChecked);
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
            var quoteId = jQuery('#unified_selectedQuoteId').val();
            var btnSendMail = jQuery('#unified_btnSendMail');

            // Show/hide email button based on PDF selection and quote selection
            if (selected.length > 0 && quoteId) {
                btnSendMail.show();
            } else {
                btnSendMail.hide();
            }
        },

        sendMail: function() {
            var self = this;
            var quoteId = jQuery('#unified_selectedQuoteId').val();
            var selectedPdfs = this.getSelectedPdfTemplates();
            var recipientEmail = jQuery('#unified_pdfRecipientEmail').val();

            if (!quoteId) {
                app.helper.showErrorNotification({message: 'Veuillez d\'abord selectionner un devis'});
                return;
            }

            if (selectedPdfs.length === 0) {
                app.helper.showErrorNotification({message: 'Veuillez selectionner au moins un document PDF'});
                return;
            }

            if (!recipientEmail) {
                app.helper.showErrorNotification({message: 'Veuillez saisir une adresse email'});
                return;
            }

            app.helper.showProgress();

            this.sendPdfEmails(quoteId).then(function(result) {
                app.helper.hideProgress();
                if (result.success) {
                    app.helper.showSuccessNotification({message: 'Email envoye avec succes!'});
                    // Uncheck all PDFs after sending
                    jQuery('.unified-pdf-template-checkbox').prop('checked', false);
                    jQuery('.pdf-template-item').removeClass('checked');
                    self.updatePdfSendStatus();
                } else {
                    app.helper.showErrorNotification({message: 'Erreur lors de l\'envoi: ' + (result.error || 'Erreur inconnue')});
                }
            }).catch(function(error) {
                app.helper.hideProgress();
                app.helper.showErrorNotification({message: 'Erreur: ' + error.message});
            });
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
            jQuery('#unified_hidden_prestataire').val(jQuery('#unified_prestataire').val());
            jQuery('#unified_hidden_cf_1162').val(jQuery('#unified_cf_1162').val());

            // Copy discount (remise) values
            var remiseType = jQuery('input[name="unified_remise_type"]:checked').val() || 'none';
            if (remiseType === 'percent') {
                jQuery('#unified_hdnDiscountPercent').val(jQuery('#unified_remise_percent').val() || '0');
                jQuery('#unified_hdnDiscountAmount').val('0');
            } else if (remiseType === 'amount') {
                jQuery('#unified_hdnDiscountPercent').val('0');
                jQuery('#unified_hdnDiscountAmount').val(jQuery('#unified_remise_amount').val() || '0');
            } else {
                jQuery('#unified_hdnDiscountPercent').val('0');
                jQuery('#unified_hdnDiscountAmount').val('0');
            }

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

            // Calculate totals for VTiger (must match server-side Quotes_Save_Action logic)
            var productsTotal = 0;
            jQuery('#unified_productsList tr').each(function() {
                var qty = parseFloat(jQuery(this).find('input[name^="qty"]').val()) || 0;
                var price = parseFloat(jQuery(this).find('input[name^="listPrice"]').val()) || 0;
                productsTotal += qty * price;
            });

            var forfaitHT = parseFloat(jQuery('#unified_cf_1127').val()) || 0;
            var supplementHT = parseFloat(jQuery('#unified_cf_1129').val()) || 0;
            var assuranceValue = parseFloat(jQuery('#unified_cf_1139').val()) || 0;
            var assuranceHT = assuranceValue > 0 ? ((assuranceValue - 4000) / 1000) * 14 : 0;
            if (assuranceHT < 0) assuranceHT = 0;

            var subTotal = productsTotal + forfaitHT + supplementHT + assuranceHT;

            var remiseType = jQuery('input[name="unified_remise_type"]:checked').val() || 'none';
            var discountHT = 0;
            if (remiseType === 'percent') {
                discountHT = subTotal * (parseFloat(jQuery('#unified_remise_percent').val()) || 0) / 100;
            } else if (remiseType === 'amount') {
                discountHT = parseFloat(jQuery('#unified_remise_amount').val()) || 0;
            }
            var preTaxTotal = subTotal - discountHT;
            if (preTaxTotal < 0) preTaxTotal = 0;
            var grandTotal = preTaxTotal * 1.20; // TVA 20%

            jQuery('#unified_hdnSubTotal').val(subTotal.toFixed(2));
            jQuery('#unified_hdnGrandTotal').val(grandTotal.toFixed(2));
            jQuery('#unified_pre_tax_total').val(preTaxTotal.toFixed(2));

            // Show loading
            app.helper.showProgress();

            var form = jQuery('#unifiedQuoteForm');
            var formData = new FormData(form[0]);

            fetch('/index.php', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            })
            .then(function(response) {
                app.helper.hideProgress();
                app.helper.showSuccessNotification({message: recordId ? 'Devis sauvegarde!' : 'Devis cree avec succes!'});

                // Save current tab before reload to stay in the same tab
                var currentTab = jQuery('#unifiedTabNav li.active a').data('tab') || 'devis';
                var potentialId = jQuery('#devisTabContainer').data('potential-id');
                sessionStorage.setItem('activeTab_' + potentialId, currentTab);

                // Reload the page to show updated quotes
                setTimeout(function() {
                    window.location.reload();
                }, 1000);
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
        autoSaveTimeout: null,
        isSaving: false,

        triggerDebouncedAutoSave: function() {
            var self = this;
            if (!this.recordId) return;

            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(function() {
                self.autoSave();
            }, 1000); // 1 second delay
        },

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

                // Bind change event on Volume final field for auto-save
                jQuery('#unified-volumeFinal').off('change blur').on('change blur', function() {
                    console.log('[UnifiedInventaire] Volume final changed:', jQuery(this).val());
                    self.triggerDebouncedAutoSave();
                });

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
            this.renderAvailableItems();
            this.renderSelectedItems();
        },

        renderAvailableItems: function() {
            var self = this;
            var container = jQuery('#unified-available-items');
            var html = '';

            Object.keys(this.itemsDb).forEach(function(categoryId) {
                var items = self.itemsDb[categoryId];
                items.forEach(function(item) {
                    var safeName = item.name.replace(/'/g, "\\'");
                    var qty = self.inventory[categoryId] ? (self.inventory[categoryId][item.name] || 0) : 0;
                    html += '<div class="avail-item' + (qty > 0 ? ' already-added' : '') + '" onclick="UnifiedInventaire.addItemToSelection(\'' + categoryId + '\', \'' + safeName + '\')">';
                    html += '<span class="avail-name">' + item.name + '</span>';
                    html += '<span class="avail-vol">' + item.volume + ' m\u00b3</span>';
                    if (qty > 0) {
                        html += '<span class="avail-qty">' + qty + '</span>';
                    }
                    html += '<i class="fa fa-plus avail-add"></i>';
                    html += '</div>';
                });
            });

            container.html(html);
            this.applySearchFilter();
        },

        applySearchFilter: function() {
            var searchTerm = jQuery('#unified-inventory-search').val();
            if (!searchTerm) return;
            searchTerm = searchTerm.toLowerCase().trim();
            if (searchTerm === '') return;

            var visibleCount = 0;
            jQuery('#unified-available-items .avail-item').each(function() {
                var itemName = jQuery(this).find('.avail-name').text().toLowerCase();
                if (itemName.indexOf(searchTerm) !== -1) {
                    jQuery(this).show();
                    visibleCount++;
                } else {
                    jQuery(this).hide();
                }
            });

            var resultsDiv = jQuery('#unified-inventory-search-results');
            if (visibleCount === 0) {
                resultsDiv.text('Aucun article trouve').css('color', '#e74c3c');
            } else {
                resultsDiv.text(visibleCount + ' article(s) trouve(s)').css('color', '#27ae60');
            }
        },

        renderSelectedItems: function() {
            var self = this;
            var container = jQuery('#unified-selected-items');
            var html = '';
            var hasItems = false;

            Object.keys(this.inventory).forEach(function(categoryId) {
                if (!self.itemsDb[categoryId]) return;
                self.itemsDb[categoryId].forEach(function(item) {
                    var qty = self.inventory[categoryId][item.name] || 0;
                    if (qty > 0) {
                        hasItems = true;
                        var safeName = item.name.replace(/'/g, "\\'");
                        var safeId = 'unified_sel_' + categoryId + '_' + item.name.replace(/[^a-z0-9]/gi, '_');
                        html += '<div class="selected-item">';
                        html += '<span class="sel-name">' + item.name + '</span>';
                        html += '<span class="sel-vol">' + item.volume + ' m\u00b3</span>';
                        html += '<div class="sel-qty-controls">';
                        html += '<button class="btn-qty" onclick="UnifiedInventaire.changeQty(\'' + categoryId + '\', \'' + safeName + '\', -1)">\u2212</button>';
                        html += '<input type="number" class="qty-input" id="' + safeId + '" value="' + qty + '" min="0" onchange="UnifiedInventaire.setQty(\'' + categoryId + '\', \'' + safeName + '\', this.value)">';
                        html += '<button class="btn-qty" onclick="UnifiedInventaire.changeQty(\'' + categoryId + '\', \'' + safeName + '\', 1)">+</button>';
                        html += '</div>';
                        html += '<button class="btn-remove" onclick="UnifiedInventaire.removeItemFromSelection(\'' + categoryId + '\', \'' + safeName + '\')"><i class="fa fa-times"></i></button>';
                        html += '</div>';
                    }
                });
            });

            if (!hasItems) {
                html = '<div class="empty-selection"><i class="fa fa-arrow-left"></i><p>Cliquez sur un article pour l\'ajouter</p></div>';
            }

            container.html(html);
        },

        addItemToSelection: function(category, itemName) {
            if (!this.inventory[category]) this.inventory[category] = {};
            if (!this.inventory[category][itemName]) {
                this.inventory[category][itemName] = 1;
            } else {
                this.inventory[category][itemName]++;
            }
            this.renderAvailableItems();
            this.renderSelectedItems();
            this.updateTotalVolume();
            this.triggerDebouncedAutoSave();
        },

        removeItemFromSelection: function(category, itemName) {
            if (this.inventory[category]) {
                this.inventory[category][itemName] = 0;
            }
            this.renderAvailableItems();
            this.renderSelectedItems();
            this.updateTotalVolume();
            this.triggerDebouncedAutoSave();
        },

        changeQty: function(category, itemName, delta) {
            if (!this.inventory[category]) this.inventory[category] = {};
            var newQty = Math.max(0, (this.inventory[category][itemName] || 0) + delta);
            this.inventory[category][itemName] = newQty;

            if (newQty === 0) {
                // Item removed - re-render both panels
                this.renderAvailableItems();
                this.renderSelectedItems();
            } else {
                // Just update the input value + left panel badge
                var safeId = 'unified_sel_' + category + '_' + itemName.replace(/[^a-z0-9]/gi, '_');
                jQuery('#' + safeId).val(newQty);
                this.renderAvailableItems();
            }

            this.updateTotalVolume();
            this.triggerDebouncedAutoSave();
        },

        setQty: function(category, itemName, value) {
            if (!this.inventory[category]) this.inventory[category] = {};
            var newQty = Math.max(0, parseInt(value) || 0);
            this.inventory[category][itemName] = newQty;

            if (newQty === 0) {
                this.renderAvailableItems();
                this.renderSelectedItems();
            } else {
                this.renderAvailableItems();
            }

            this.updateTotalVolume();
            this.triggerDebouncedAutoSave();
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
            jQuery('#unified-inventory-search').on('input', function() {
                var searchTerm = jQuery(this).val().toLowerCase().trim();
                var allItems = jQuery('#unified-available-items .avail-item');

                if (searchTerm === '') {
                    allItems.show();
                    jQuery('#unified-inventory-search-results').text('');
                    return;
                }

                var visibleCount = 0;
                allItems.each(function() {
                    var itemName = jQuery(this).find('.avail-name').text().toLowerCase();
                    if (itemName.indexOf(searchTerm) !== -1) {
                        jQuery(this).show();
                        visibleCount++;
                    } else {
                        jQuery(this).hide();
                    }
                });

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

                    // Reload items and re-render both panels
                    self.loadItemsFromDatabase().then(function() {
                        if (!self.inventory['divers']) {
                            self.inventory['divers'] = {};
                        }
                        self.inventory['divers'][name] = quantity;
                        self.renderAvailableItems();
                        self.renderSelectedItems();
                        self.updateTotalVolume();
                    });
                } else {
                    app.helper.showErrorNotification({message: 'Erreur: ' + (result.error || 'Erreur inconnue')});
                }
            }, 'json').fail(function() {
                app.helper.showErrorNotification({message: 'Erreur lors de la creation'});
            });
        },

        generateClientLink: function(recordId) {
            var self = this;
            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                dataType: 'json',
                data: {
                    module: 'Potentials',
                    action: 'GenerateInventoryToken',
                    record: recordId
                },
                success: function(response) {
                    var result = response && response.result ? response.result : response;
                    if (result && result.success) {
                        var url = result.url;
                        var modal = jQuery('<div>').css({
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        });
                        var box = jQuery('<div>').css({
                            background: '#fff', borderRadius: '12px', padding: '28px 24px',
                            maxWidth: '540px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                        });
                        box.html(
                            '<h3 style="margin:0 0 12px;color:#1F314D;font-size:16px;"><i class="fa fa-link" style="margin-right:8px;color:#667eea;"></i>Lien inventaire client</h3>' +
                            '<p style="font-size:13px;color:#666;margin:0 0 12px;">Envoyez ce lien au client pour qu\'il remplisse son inventaire. Valable 30 jours.</p>' +
                            '<div style="display:flex;gap:8px;">' +
                            '<input type="text" id="clientInventoryUrl" value="' + url + '" readonly style="flex:1;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:12px;background:#f8f9fa;">' +
                            '<button id="btnCopyInventoryUrl" style="padding:8px 14px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;white-space:nowrap;">Copier</button>' +
                            '</div>' +
                            '<div style="text-align:right;margin-top:16px;">' +
                            '<button id="btnCloseInventoryModal" style="padding:7px 16px;background:#f0f0f0;border:none;border-radius:6px;cursor:pointer;font-size:13px;">Fermer</button>' +
                            '</div>'
                        );
                        modal.append(box);
                        jQuery('body').append(modal);

                        jQuery('#btnCopyInventoryUrl').on('click', function() {
                            var input = document.getElementById('clientInventoryUrl');
                            input.select();
                            try {
                                navigator.clipboard.writeText(url).then(function() {
                                    jQuery('#btnCopyInventoryUrl').text('Copié !');
                                    setTimeout(function() { jQuery('#btnCopyInventoryUrl').text('Copier'); }, 2000);
                                });
                            } catch(e) {
                                document.execCommand('copy');
                                jQuery('#btnCopyInventoryUrl').text('Copié !');
                                setTimeout(function() { jQuery('#btnCopyInventoryUrl').text('Copier'); }, 2000);
                            }
                        });

                        jQuery('#btnCloseInventoryModal').on('click', function() { modal.remove(); });
                        modal.on('click', function(e) { if (e.target === modal[0]) modal.remove(); });
                    } else {
                        app.helper.showErrorNotification({message: 'Erreur : ' + (result ? result.message : 'Réponse invalide')});
                    }
                },
                error: function() {
                    app.helper.showErrorNotification({message: 'Erreur lors de la génération du lien'});
                }
            });
        },

        autoSave: function() {
            var self = this;

            // Prevent concurrent saves
            if (this.isSaving) {
                console.log('[UnifiedInventaire] Already saving, skipping auto-save');
                return;
            }

            this.isSaving = true;
            console.log('[UnifiedInventaire] Auto-saving inventory...');

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

            // Show subtle saving indicator
            jQuery('#inventaireTabContainer').addClass('saving');

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
                    self.isSaving = false;
                    var result = typeof response === 'string' ? JSON.parse(response) : response;

                    jQuery('#inventaireTabContainer').removeClass('saving').addClass('saved');
                    setTimeout(function() {
                        jQuery('#inventaireTabContainer').removeClass('saved');
                    }, 1500);

                    if (result.success) {
                        console.log('[UnifiedInventaire] Auto-save successful');
                        // Invalidate Details tab so it reloads with new volume
                        if (window.UnifiedTabbedView) {
                            UnifiedTabbedView.invalidateTab('details');
                        }
                    } else {
                        console.error('[UnifiedInventaire] Auto-save error:', result.error);
                        jQuery('#inventaireTabContainer').removeClass('saved').addClass('save-error');
                        setTimeout(function() {
                            jQuery('#inventaireTabContainer').removeClass('save-error');
                        }, 3000);
                    }
                },
                error: function(xhr, status, error) {
                    self.isSaving = false;
                    console.error('[UnifiedInventaire] Auto-save error:', error);
                    jQuery('#inventaireTabContainer').removeClass('saving').addClass('save-error');
                    setTimeout(function() {
                        jQuery('#inventaireTabContainer').removeClass('save-error');
                    }, 3000);
                }
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

    /**
     * UnifiedODM - Handles ODM (Ordre de Mission / Bon de Commande) tab functionality
     * Uses same embedded form design as UnifiedDevis
     */
    window.UnifiedODM = {
        potentialId: null,
        contactId: null,
        csrfToken: null,
        selectedProducts: {},
        productCounter: 0,
        TVA_RATE: 1.20,
        currentSOId: null,
        sourceQuoteId: null,
        quoteData: null,  // Store quote data for copying fields to BDC

        /**
         * Initialize the ODM tab
         */
        init: function(recordId) {
            var self = this;
            this.potentialId = recordId;
            this.contactId = typeof odmContactId !== 'undefined' ? odmContactId : 0;
            this.csrfToken = typeof odmCsrfToken !== 'undefined' ? odmCsrfToken : '';
            console.log('[UnifiedODM] Initialized for record:', recordId);

            // Initialize product search
            this.initProductSearch();

            // Initialize field change listeners for calculations
            this.initFieldListeners();
        },

        /**
         * Initialize product search functionality
         */
        initProductSearch: function() {
            var self = this;
            var searchInput = jQuery('#odm_productSearch');
            var resultsDiv = jQuery('#odm_productResults');

            if (searchInput.length === 0) return;

            searchInput.on('input', function() {
                var query = jQuery(this).val().toLowerCase();
                if (query.length < 2) {
                    resultsDiv.hide();
                    return;
                }

                var products = typeof odmAllProducts !== 'undefined' ? odmAllProducts : [];
                var matches = products.filter(function(p) {
                    return p.productname.toLowerCase().indexOf(query) !== -1;
                }).slice(0, 10);

                if (matches.length === 0) {
                    resultsDiv.hide();
                    return;
                }

                var html = '';
                matches.forEach(function(p) {
                    html += '<div class="product-result" style="padding:10px;cursor:pointer;border-bottom:1px solid #eee;" data-id="' + p.id + '" data-name="' + p.productname + '" data-price="' + p.unit_price + '">';
                    html += '<strong>' + p.productname + '</strong><br>';
                    html += '<small style="color:#888;">' + parseFloat(p.unit_price).toFixed(2) + ' €</small>';
                    html += '</div>';
                });
                resultsDiv.html(html).show();

                resultsDiv.find('.product-result').on('click', function() {
                    var id = jQuery(this).data('id');
                    var name = jQuery(this).data('name');
                    var price = jQuery(this).data('price');
                    self.addProduct(id, name, price, 1);
                    searchInput.val('');
                    resultsDiv.hide();
                });
            });

            // Hide results on click outside
            jQuery(document).on('click', function(e) {
                if (!jQuery(e.target).closest('#odm_productSearch, #odm_productResults').length) {
                    resultsDiv.hide();
                }
            });
        },

        /**
         * Initialize field listeners for calculations
         */
        initFieldListeners: function() {
            var self = this;

            // Forfait fields
            jQuery('#odm_cf_1180, #odm_cf_1182').on('input change', function() {
                self.calculateTotals();
            });

            // Assurance field
            jQuery('#odm_cf_1170').on('change', function() {
                self.calculateTotals();
            });
        },

        /**
         * Add a product to the list
         * @param id - product ID
         * @param name - product name
         * @param price - unit price
         * @param qty - quantity
         * @param pctAcompte - percentage for acompte (default 43)
         * @param pctSolde - percentage for solde (default 57)
         */
        addProduct: function(id, name, price, qty, pctAcompte, pctSolde) {
            var self = this;
            this.productCounter++;
            var idx = this.productCounter;

            pctAcompte = parseFloat(pctAcompte) || 43;
            pctSolde = parseFloat(pctSolde) || 57;

            this.selectedProducts[idx] = {
                id: id,
                name: name,
                price: parseFloat(price),
                qty: parseInt(qty) || 1,
                pctAcompte: pctAcompte,
                pctSolde: pctSolde
            };

            var row = '<tr data-idx="' + idx + '" data-pct-acompte="' + pctAcompte + '" data-pct-solde="' + pctSolde + '">';
            row += '<td>' + name + '</td>';
            row += '<td><input type="number" class="product-qty" value="' + qty + '" min="1" style="width:60px;"></td>';
            row += '<td><input type="number" class="product-price" value="' + parseFloat(price).toFixed(2) + '" step="0.01" style="width:80px;"></td>';
            row += '<td class="product-total">' + (parseFloat(price) * qty).toFixed(2) + ' €</td>';
            row += '<td><button type="button" class="btn-remove" onclick="UnifiedODM.removeProduct(' + idx + ')"><i class="fa fa-times"></i></button></td>';
            row += '</tr>';

            jQuery('#odm_productsList').append(row);
            jQuery('#odm_productsTable').show();

            // Add event listeners for qty/price changes
            jQuery('#odm_productsList tr[data-idx="' + idx + '"]').find('.product-qty, .product-price').on('input change', function() {
                var tr = jQuery(this).closest('tr');
                var newQty = parseFloat(tr.find('.product-qty').val()) || 1;
                var newPrice = parseFloat(tr.find('.product-price').val()) || 0;
                self.selectedProducts[idx].qty = newQty;
                self.selectedProducts[idx].price = newPrice;
                tr.find('.product-total').text((newQty * newPrice).toFixed(2) + ' €');
                self.calculateTotals();
            });

            this.calculateTotals();
        },

        /**
         * Remove a product from the list
         */
        removeProduct: function(idx) {
            delete this.selectedProducts[idx];
            jQuery('#odm_productsList tr[data-idx="' + idx + '"]').remove();

            if (Object.keys(this.selectedProducts).length === 0) {
                jQuery('#odm_productsTable').hide();
            }

            this.calculateTotals();
        },

        /**
         * Calculate all totals
         */
        calculateTotals: function() {
            // Read percentages from hidden fields (copied from quote)
            var PCT_ACOMPTE_FORFAIT = parseFloat(jQuery('#odm_hidden_cf_1176').val()) || 43;
            var PCT_SOLDE_FORFAIT = parseFloat(jQuery('#odm_hidden_cf_1178').val()) || 57;

            var forfaitHT = parseFloat(jQuery('#odm_cf_1180').val()) || 0;
            var supplementHT = parseFloat(jQuery('#odm_cf_1182').val()) || 0;

            // Products totals with individual percentages
            var produitsHT = 0;
            var produitsAcompteHT = 0;
            var produitsSoldeHT = 0;

            jQuery('#odm_productsList tr').each(function() {
                var row = jQuery(this);
                var totalCell = row.find('.product-total');
                if (totalCell.length) {
                    var lineTotal = parseFloat(totalCell.text()) || 0;
                    produitsHT += lineTotal;

                    // Get product-specific percentages
                    var pctAcompte = parseFloat(row.attr('data-pct-acompte')) || 43;
                    var pctSolde = 100 - pctAcompte;

                    produitsAcompteHT += lineTotal * pctAcompte / 100;
                    produitsSoldeHT += lineTotal * pctSolde / 100;
                }
            });

            // Assurance calculation: ((montant / 1000) - 4) * tarif_pour_1000
            // Same formula as Save.php: (($montantAssurance / 1000) - 4) * $tarifPour1000
            var assuranceValue = parseFloat(jQuery('#odm_cf_1170').val()) || 0;
            var tarifPour1000 = parseFloat(jQuery('#odm_hidden_cf_1172').val()) || 14;
            var assuranceHT = 0;
            if (assuranceValue > 0 && tarifPour1000 > 0) {
                assuranceHT = ((assuranceValue / 1000) - 4) * tarifPour1000;
            }

            // Calculate TOTAL HT BEFORE discount
            var totalHTBeforeDiscount = forfaitHT + supplementHT + produitsHT + assuranceHT;

            // Calculate discount (remise) - apply on TOTAL HT
            var remiseType = jQuery('input[name="odm_remise_type"]:checked').val() || 'none';
            var remiseHT = 0;
            var maxRemisePercent = 15;
            var maxRemiseAmount = totalHTBeforeDiscount * maxRemisePercent / 100;

            if (remiseType === 'percent') {
                var remisePercent = parseFloat(jQuery('#odm_remise_percent').val()) || 0;
                // Limit to 15%
                if (remisePercent > maxRemisePercent) {
                    remisePercent = maxRemisePercent;
                    jQuery('#odm_remise_percent').val(maxRemisePercent);
                }
                remiseHT = totalHTBeforeDiscount * remisePercent / 100;
            } else if (remiseType === 'amount') {
                remiseHT = parseFloat(jQuery('#odm_remise_amount').val()) || 0;
                // Limit to 15% of total HT
                if (remiseHT > maxRemiseAmount) {
                    remiseHT = maxRemiseAmount;
                    jQuery('#odm_remise_amount').val(maxRemiseAmount.toFixed(2));
                }
            }

            // Update discount display
            jQuery('#odm_remise_display').text(remiseHT.toFixed(2) + ' €');

            // Calculate acompte and solde BEFORE discount
            var forfaitAcompteHT = (forfaitHT * PCT_ACOMPTE_FORFAIT / 100) + supplementHT;
            var acompteHTBrut = forfaitAcompteHT + produitsAcompteHT + assuranceHT;
            var forfaitSoldeHT = forfaitHT * PCT_SOLDE_FORFAIT / 100;
            var soldeHTBrut = forfaitSoldeHT + produitsSoldeHT;
            var totalHTBrut = acompteHTBrut + soldeHTBrut;

            // Répartir la remise proportionnellement sur acompte et solde
            var ratio = totalHTBrut > 0 ? (totalHTBrut - remiseHT) / totalHTBrut : 1;
            var totalAcompteHT = acompteHTBrut * ratio;
            var totalSoldeHT = soldeHTBrut * ratio;
            var totalHT = totalHTBrut - remiseHT;
            if (totalHT < 0) totalHT = 0;

            // TTC
            var acompteTTC = totalAcompteHT * this.TVA_RATE;
            var soldeTTC = totalSoldeHT * this.TVA_RATE;

            // Grand totals
            var totalTTC = totalHT * this.TVA_RATE;

            // Total forfait TTC
            var forfaitTotalTTC = (forfaitHT + supplementHT) * this.TVA_RATE;

            // Update display
            jQuery('#odm_cf_1184').val(forfaitTotalTTC.toFixed(2));
            jQuery('#odm_montant_total_ht').text(totalHT.toFixed(2) + ' €');
            jQuery('#odm_montant_total_ttc').text(totalTTC.toFixed(2) + ' €');
            jQuery('#odm_acompte_ttc').text(acompteTTC.toFixed(2) + ' €');
            jQuery('#odm_solde_ttc').text(soldeTTC.toFixed(2) + ' €');

            // Update hidden fields for saving
            jQuery('#odm_hidden_cf_1174').val(assuranceHT.toFixed(2)); // Tarif assurance calculé
            jQuery('#odm_hidden_cf_1166').val(acompteTTC.toFixed(2)); // Total acompte TTC
            jQuery('#odm_hidden_cf_1168').val(soldeTTC.toFixed(2)); // Total solde TTC
        },

        /**
         * Create BDC from a validated quote - load quote data and show form
         */
        createFromQuote: function(quoteId) {
            var self = this;
            console.log('[UnifiedODM] Creating BDC from quote:', quoteId);

            this.currentSOId = null;
            this.sourceQuoteId = quoteId;
            this.selectedProducts = {};
            this.productCounter = 0;

            // Clear form
            jQuery('#odm_productsList').empty();
            jQuery('#odm_productsTable').hide();
            jQuery('#odm_selectedSOId').val('');
            jQuery('#odm_sourceQuoteId').val(quoteId);

            // Mark selected quote chip
            jQuery('.quote-chip').removeClass('selected');
            jQuery('.quote-chip[data-quoteid="' + quoteId + '"]').addClass('selected');
            jQuery('.odm-chip').removeClass('selected');

            // Show form and actions
            jQuery('#odmFormContainer').show();
            jQuery('#odmActionsBar').show();
            jQuery('#odm_btnSaveText').text('Créer ODM');
            jQuery('#odm_btnSave').removeClass('btn-primary').addClass('btn-success');

            // Load quote data via AJAX
            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                data: {
                    module: 'Potentials',
                    view: 'UnifiedTabAjax',
                    mode: 'getQuoteData',
                    quoteId: quoteId
                },
                dataType: 'json',
                success: function(response) {
                    if (response.success && response.data) {
                        self.populateFormFromQuote(response.data);
                    } else {
                        app.helper.showErrorNotification({message: response.message || 'Erreur de chargement du devis'});
                    }
                },
                error: function(xhr, status, error) {
                    console.error('[UnifiedODM] Error loading quote:', error);
                    app.helper.showErrorNotification({message: 'Erreur: ' + error});
                }
            });
        },

        /**
         * Populate form from quote data
         */
        populateFormFromQuote: function(data) {
            var self = this;

            // Store quote data for later use when saving
            this.quoteData = data;

            // Subject: Ord-{potential name}
            var subject = 'Ord-' + (data.subject || '').replace(/^Dev-/, '');
            jQuery('#odm_subject').val(subject);

            // Due date from quote validity date
            jQuery('#odm_duedate').val(data.cf_1005 || '');

            // Forfait fields (map from quote)
            jQuery('#odm_cf_1186').val(data.cf_1125 || '');  // Type formule
            jQuery('#odm_cf_1180').val(data.cf_1127 || 0);   // Forfait HT
            jQuery('#odm_cf_1182').val(data.cf_1129 || 0);   // Supplement

            // Assurance - cf_1139=montant, cf_1141=tarif pour 1000
            jQuery('#odm_cf_1170').val(data.cf_1139 || '');
            jQuery('#odm_hidden_cf_1172').val(data.cf_1141 || 14); // Tarif pour 1000 (default 14)

            // Pourcentages acompte/solde du forfait
            jQuery('#odm_hidden_cf_1176').val(data.cf_1133 || 43); // % acompte
            jQuery('#odm_hidden_cf_1178').val(data.cf_1135 || 57); // % solde

            // Description forfait
            jQuery('#odm_hidden_cf_1188').val(data.cf_1131 || '');

            // Prestataire
            if (data.prestataire) {
                jQuery('#odm_prestataire').val(data.prestataire);
            }

            // Type de déménagement (cf_1269 in Quote -> cf_1352 in SalesOrder)
            jQuery('#odm_cf_1352').val(data.cf_1269 || '');

            // Copy discount (remise) values from quote
            var discountPercent = parseFloat(data.discount_percent) || 0;
            var discountAmount = parseFloat(data.discount_amount) || 0;
            if (discountPercent > 0) {
                jQuery('input[name="odm_remise_type"][value="percent"]').prop('checked', true);
                jQuery('#odm_remise_percent').val(discountPercent).prop('disabled', false);
                jQuery('#odm_remise_amount').val(0).prop('disabled', true);
            } else if (discountAmount > 0) {
                jQuery('input[name="odm_remise_type"][value="amount"]').prop('checked', true);
                jQuery('#odm_remise_amount').val(discountAmount).prop('disabled', false);
                jQuery('#odm_remise_percent').val(0).prop('disabled', true);
            } else {
                jQuery('input[name="odm_remise_type"][value="none"]').prop('checked', true);
                jQuery('#odm_remise_percent, #odm_remise_amount').val(0).prop('disabled', true);
            }

            // Products (with percentages from quote)
            if (data.products && data.products.length > 0) {
                data.products.forEach(function(p) {
                    self.addProduct(p.productid, p.productname, p.listprice, p.quantity, p.pct_acompte || 43, p.pct_solde || 57);
                });
            }

            // Calculate totals
            this.calculateTotals();
        },

        /**
         * Load existing SalesOrder into form
         */
        loadSalesOrder: function(salesOrderId) {
            var self = this;
            console.log('[UnifiedODM] Loading SalesOrder:', salesOrderId);

            this.currentSOId = salesOrderId;
            this.sourceQuoteId = null;
            this.selectedProducts = {};
            this.productCounter = 0;

            // Clear form
            jQuery('#odm_productsList').empty();
            jQuery('#odm_productsTable').hide();
            jQuery('#odm_selectedSOId').val(salesOrderId);
            jQuery('#odm_sourceQuoteId').val('');

            // Mark selected chip
            jQuery('.odm-chip').removeClass('selected');
            jQuery('.odm-chip[data-salesorderid="' + salesOrderId + '"]').addClass('selected');
            jQuery('.quote-chip').removeClass('selected');

            // Show form and actions
            jQuery('#odmFormContainer').show();
            jQuery('#odmActionsBar').show();
            jQuery('#odm_btnViewPdf').show();
            jQuery('#odm_btnSendEmailBdc').show();
            jQuery('#odm_btnSaveText').text('Enregistrer ODM');
            jQuery('#odm_btnSave').removeClass('btn-success').addClass('btn-primary');

            // Load SalesOrder data via AJAX
            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                data: {
                    module: 'Potentials',
                    view: 'UnifiedTabAjax',
                    mode: 'getSalesOrderData',
                    salesorder_id: salesOrderId
                },
                dataType: 'json',
                success: function(response) {
                    if (response.success && response.data) {
                        self.populateFormFromSalesOrder(response.data);
                    } else {
                        app.helper.showErrorNotification({message: response.message || 'Erreur de chargement du BDC'});
                    }
                },
                error: function(xhr, status, error) {
                    console.error('[UnifiedODM] Error loading SalesOrder:', error);
                    app.helper.showErrorNotification({message: 'Erreur: ' + error});
                }
            });
        },

        /**
         * Populate form from SalesOrder data
         */
        populateFormFromSalesOrder: function(data) {
            var self = this;

            jQuery('#odm_subject').val(data.subject || '');
            jQuery('#odm_duedate').val(data.duedate || '');
            jQuery('#odm_sostatus').val(data.sostatus || 'Created');

            // Forfait fields
            jQuery('#odm_cf_1186').val(data.cf_1186 || '');
            jQuery('#odm_cf_1180').val(data.cf_1180 || 0);
            jQuery('#odm_cf_1182').val(data.cf_1182 || 0);
            // Assurance: convert to integer to match select options (10000.00 -> 10000)
            var assuranceVal = data.cf_1170 ? parseInt(parseFloat(data.cf_1170)) : '';
            jQuery('#odm_cf_1170').val(assuranceVal);

            // Assurance rate fields (for calculation)
            jQuery('#odm_hidden_cf_1172').val(data.cf_1172 || 14); // Tarif pour 1000
            jQuery('#odm_hidden_cf_1174').val(data.cf_1174 || ''); // Tarif assurance calculé

            // Preserve quote_id and other fields from existing ODM
            jQuery('#odm_hidden_quote_id').val(data.quote_id || '');
            jQuery('#odm_hidden_cf_1176').val(data.cf_1176 || 43); // % Acompte
            jQuery('#odm_hidden_cf_1178').val(data.cf_1178 || 57); // % Solde
            jQuery('#odm_hidden_cf_1188').val(data.cf_1188 || ''); // Description forfait
            jQuery('#odm_hidden_cf_1190').val(data.cf_1190 || ''); // Description assurance

            // Load discount (remise) values
            var discountPercent = parseFloat(data.discount_percent) || 0;
            var discountAmount = parseFloat(data.discount_amount) || 0;
            if (discountPercent > 0) {
                jQuery('input[name="odm_remise_type"][value="percent"]').prop('checked', true);
                jQuery('#odm_remise_percent').val(discountPercent).prop('disabled', false);
                jQuery('#odm_remise_amount').val(0).prop('disabled', true);
            } else if (discountAmount > 0) {
                jQuery('input[name="odm_remise_type"][value="amount"]').prop('checked', true);
                jQuery('#odm_remise_amount').val(discountAmount).prop('disabled', false);
                jQuery('#odm_remise_percent').val(0).prop('disabled', true);
            } else {
                jQuery('input[name="odm_remise_type"][value="none"]').prop('checked', true);
                jQuery('#odm_remise_percent, #odm_remise_amount').val(0).prop('disabled', true);
            }

            // Prestataire
            if (data.prestataire) {
                jQuery('#odm_prestataire').val(data.prestataire);
            }

            // Type de déménagement
            jQuery('#odm_cf_1352').val(data.cf_1352 || '');

            // Dates (visible fields)
            jQuery('#odm_cf_1309').val(data.cf_1309 || '');
            jQuery('#odm_cf_1324').val(data.cf_1324 || '');

            // Volumes/Distance (metric inputs)
            jQuery('#odm_cf_1350_input').val(data.cf_1350 || '');
            jQuery('#odm_cf_1351_input').val(data.cf_1351 || '');
            jQuery('#odm_cf_1349_input').val(data.cf_1349 || '');

            // CHARGEMENT fields
            jQuery('#odm_cf_1312').val(data.cf_1312 || '');
            jQuery('#odm_cf_1313').val(data.cf_1313 || '');
            jQuery('#odm_cf_1314').val(data.cf_1314 || '');
            jQuery('#odm_cf_1315').val(data.cf_1315 || '');
            jQuery('#odm_cf_1316').val(data.cf_1316 || '');
            jQuery('#odm_cf_1317').val(data.cf_1317 || '');
            jQuery('#odm_cf_1318').val(data.cf_1318 || '0');
            jQuery('#odm_cf_1319').val(data.cf_1319 || '0');
            jQuery('#odm_cf_1320').val(data.cf_1320 || '');
            jQuery('#odm_cf_1321').val(data.cf_1321 || '0');
            jQuery('#odm_cf_1322').val(data.cf_1322 || '0');
            jQuery('#odm_cf_1323').val(data.cf_1323 || '');

            // LIVRAISON fields
            jQuery('#odm_cf_1325').val(data.cf_1325 || '');
            jQuery('#odm_cf_1326').val(data.cf_1326 || '');
            jQuery('#odm_cf_1327').val(data.cf_1327 || '');
            jQuery('#odm_cf_1328').val(data.cf_1328 || '');
            jQuery('#odm_cf_1329').val(data.cf_1329 || '');
            jQuery('#odm_cf_1330').val(data.cf_1330 || '');
            jQuery('#odm_cf_1331').val(data.cf_1331 || '0');
            jQuery('#odm_cf_1332').val(data.cf_1332 || '0');
            jQuery('#odm_cf_1333').val(data.cf_1333 || '');
            jQuery('#odm_cf_1334').val(data.cf_1334 || '0');
            jQuery('#odm_cf_1335').val(data.cf_1335 || '0');
            jQuery('#odm_cf_1336').val(data.cf_1336 || '');

            // Also sync to hidden fields for save
            jQuery('.editable-field').each(function() {
                var hiddenId = jQuery(this).data('hidden');
                if (hiddenId) {
                    jQuery('#' + hiddenId).val(jQuery(this).val());
                }
            });

            // Products - avec pourcentages acompte/solde
            if (data.products && data.products.length > 0) {
                data.products.forEach(function(p) {
                    self.addProduct(p.productid, p.productname, p.listprice, p.quantity, p.pct_acompte || 43, p.pct_solde || 57);
                });
            }

            this.calculateTotals();
        },

        /**
         * Cancel editing and hide form
         */
        cancelEdit: function() {
            jQuery('#odmFormContainer').hide();
            jQuery('#odmActionsBar').hide();
            jQuery('#odm_btnViewPdf').hide();
            jQuery('#odm_btnSendEmailBdc').hide();
            jQuery('.odm-chip, .quote-chip').removeClass('selected');

            // Clear form
            jQuery('#odm_subject').val('');
            jQuery('#odm_duedate').val('');
            jQuery('#odm_cf_1186').val('');
            jQuery('#odm_cf_1180').val('');
            jQuery('#odm_cf_1182').val('');
            jQuery('#odm_cf_1184').val('0');
            jQuery('#odm_cf_1170').val('');
            jQuery('#odm_productsList').empty();
            jQuery('#odm_productsTable').hide();

            this.selectedProducts = {};
            this.productCounter = 0;
            this.currentSOId = null;
            this.sourceQuoteId = null;
            this.quoteData = null;

            // Reset totals
            jQuery('#odm_montant_total_ht').text('0.00 €');
            jQuery('#odm_montant_total_ttc').text('0.00 €');
            jQuery('#odm_acompte_ttc').text('0.00 €');
            jQuery('#odm_solde_ttc').text('0.00 €');
        },

        /**
         * Save the BDC
         */
        saveBDC: function() {
            var self = this;

            // Validate subject
            var subject = jQuery('#odm_subject').val();
            if (!subject) {
                app.helper.showErrorNotification({message: 'Le sujet est obligatoire'});
                return;
            }

            // Check if prestataire is selected - fetch billing address before saving
            var prestataireId = jQuery('#odm_prestataire').val();
            if (prestataireId) {
                // Fetch vendor address and set billing fields before saving
                jQuery.ajax({
                    url: 'index.php',
                    type: 'POST',
                    data: {
                        module: 'Potentials',
                        view: 'UnifiedTabAjax',
                        mode: 'getVendorAddress',
                        vendor_id: prestataireId
                    },
                    dataType: 'json',
                    success: function(response) {
                        if (response.success && response.data) {
                            // Set billing address fields from vendor
                            jQuery('#odm_hidden_bill_street').val(response.data.street || '');
                            jQuery('#odm_hidden_bill_city').val(response.data.city || '');
                            jQuery('#odm_hidden_bill_state').val(response.data.state || '');
                            jQuery('#odm_hidden_bill_code').val(response.data.postalcode || '');
                            jQuery('#odm_hidden_bill_country').val(response.data.country || '');
                        }
                        // Continue with save
                        self.doSaveBDC();
                    },
                    error: function() {
                        // Continue saving even if vendor address fetch fails
                        console.warn('[UnifiedODM] Could not fetch vendor address, saving without it');
                        self.doSaveBDC();
                    }
                });
            } else {
                // No prestataire, clear billing address and save directly
                jQuery('#odm_hidden_bill_street').val('');
                jQuery('#odm_hidden_bill_city').val('');
                jQuery('#odm_hidden_bill_state').val('');
                jQuery('#odm_hidden_bill_code').val('');
                jQuery('#odm_hidden_bill_country').val('');
                this.doSaveBDC();
            }
        },

        /**
         * Actual save logic (called after vendor address is fetched if needed)
         */
        doSaveBDC: function() {
            var self = this;
            var subject = jQuery('#odm_subject').val();

            // Build hidden form - basic fields
            jQuery('#odm_hidden_subject').val(subject);
            jQuery('#odm_hidden_duedate').val(jQuery('#odm_duedate').val());
            jQuery('#odm_hidden_sostatus').val(jQuery('#odm_sostatus').val());
            jQuery('#odm_hidden_prestataire').val(jQuery('#odm_prestataire').val());
            jQuery('#odm_hidden_cf_1352').val(jQuery('#odm_cf_1352').val()); // Type de déménagement
            // Only set quote_id if we're creating from a quote, otherwise preserve existing value
            if (this.sourceQuoteId) {
                jQuery('#odm_hidden_quote_id').val(this.sourceQuoteId);
            }
            // Note: if editing existing ODM, quote_id is already set by populateFormFromSalesOrder
            jQuery('#odm_recordId').val(this.currentSOId || '');

            // Forfait fields
            jQuery('#odm_hidden_cf_1186').val(jQuery('#odm_cf_1186').val());
            jQuery('#odm_hidden_cf_1180').val(jQuery('#odm_cf_1180').val() || 0);
            jQuery('#odm_hidden_cf_1182').val(jQuery('#odm_cf_1182').val() || 0);
            jQuery('#odm_hidden_cf_1184').val(jQuery('#odm_cf_1184').val() || 0);
            jQuery('#odm_hidden_cf_1170').val(jQuery('#odm_cf_1170').val());

            // IMPORTANT: Sync ALL editable fields to hidden form
            // This ensures CHARGEMENT, LIVRAISON, dates, volumes are saved
            jQuery('.editable-field').each(function() {
                var hiddenId = jQuery(this).data('hidden');
                if (hiddenId) {
                    jQuery('#' + hiddenId).val(jQuery(this).val());
                }
            });

            // Copy additional fields from quote ONLY when creating from a quote
            // When editing existing ODM, these fields are already loaded by populateFormFromSalesOrder
            if (this.quoteData) {
                jQuery('#odm_hidden_cf_1172').val(this.quoteData.cf_1141 || '');  // Tarif pour 1000
                jQuery('#odm_hidden_cf_1174').val(this.quoteData.cf_1143 || '');  // Tarif assurance
                jQuery('#odm_hidden_cf_1176').val(this.quoteData.cf_1133 || 43);  // % Acompte
                jQuery('#odm_hidden_cf_1178').val(this.quoteData.cf_1135 || 57);  // % Solde
                jQuery('#odm_hidden_cf_1188').val(this.quoteData.cf_1131 || '');  // Description forfait
                jQuery('#odm_hidden_cf_1190').val(this.quoteData.cf_1145 || '');  // Description assurance
            }

            // Copy discount (remise) values
            var remiseType = jQuery('input[name="odm_remise_type"]:checked').val() || 'none';
            if (remiseType === 'percent') {
                jQuery('#odm_hdnDiscountPercent').val(jQuery('#odm_remise_percent').val() || '0');
                jQuery('#odm_hdnDiscountAmount').val('0');
            } else if (remiseType === 'amount') {
                jQuery('#odm_hdnDiscountPercent').val('0');
                jQuery('#odm_hdnDiscountAmount').val(jQuery('#odm_remise_amount').val() || '0');
            } else {
                jQuery('#odm_hdnDiscountPercent').val('0');
                jQuery('#odm_hdnDiscountAmount').val('0');
            }

            // Calculate totals for hidden fields (same logic as calculateTotals)
            var forfaitHT = parseFloat(jQuery('#odm_cf_1180').val()) || 0;
            var supplement = parseFloat(jQuery('#odm_cf_1182').val()) || 0;
            var productsHT = 0;
            for (var idx in this.selectedProducts) {
                var p = this.selectedProducts[idx];
                productsHT += p.price * p.qty;
            }

            // Assurance calculation: ((montant / 1000) - 4) * tarif_pour_1000
            var assuranceValue = parseFloat(jQuery('#odm_cf_1170').val()) || 0;
            var tarifPour1000 = parseFloat(jQuery('#odm_hidden_cf_1172').val()) || 14;
            var assuranceHT = 0;
            if (assuranceValue > 0 && tarifPour1000 > 0) {
                assuranceHT = ((assuranceValue / 1000) - 4) * tarifPour1000;
            }

            // Update assurance tarif field
            jQuery('#odm_hidden_cf_1174').val(assuranceHT.toFixed(2));

            // Acompte/Solde - use percentages from hidden fields
            var PCT_ACOMPTE_FORFAIT = parseFloat(jQuery('#odm_hidden_cf_1176').val()) || 43;
            var PCT_SOLDE_FORFAIT = parseFloat(jQuery('#odm_hidden_cf_1178').val()) || 57;

            // Calculate products with individual percentages
            var produitsAcompteHT = 0;
            var produitsSoldeHT = 0;
            jQuery('#odm_productsList tr').each(function() {
                var row = jQuery(this);
                var totalCell = row.find('.product-total');
                if (totalCell.length) {
                    var lineTotal = parseFloat(totalCell.text()) || 0;
                    var pctAcompte = parseFloat(row.attr('data-pct-acompte')) || 43;
                    var pctSolde = 100 - pctAcompte;
                    produitsAcompteHT += lineTotal * pctAcompte / 100;
                    produitsSoldeHT += lineTotal * pctSolde / 100;
                }
            });

            // Calculate acompte and solde BEFORE discount
            var forfaitAcompteHT = (forfaitHT * PCT_ACOMPTE_FORFAIT / 100) + supplement;
            var acompteHTBrut = forfaitAcompteHT + produitsAcompteHT + assuranceHT;
            var forfaitSoldeHT = forfaitHT * PCT_SOLDE_FORFAIT / 100;
            var soldeHTBrut = forfaitSoldeHT + produitsSoldeHT;
            var totalHTBrut = acompteHTBrut + soldeHTBrut;

            // Get discount (remise) - applied to total HT
            var remiseHT = 0;
            if (remiseType === 'percent') {
                var remisePercent = parseFloat(jQuery('#odm_remise_percent').val()) || 0;
                remiseHT = totalHTBrut * remisePercent / 100;
            } else if (remiseType === 'amount') {
                remiseHT = parseFloat(jQuery('#odm_remise_amount').val()) || 0;
            }

            // Répartir la remise proportionnellement sur acompte et solde
            var ratio = totalHTBrut > 0 ? (totalHTBrut - remiseHT) / totalHTBrut : 1;
            var totalAcompteHT = acompteHTBrut * ratio;
            var totalSoldeHT = soldeHTBrut * ratio;
            var totalHT = totalHTBrut - remiseHT;
            if (totalHT < 0) totalHT = 0;
            var totalTTC = totalHT * this.TVA_RATE;

            // TTC
            var acompteTTC = totalAcompteHT * this.TVA_RATE;
            var soldeTTC = totalSoldeHT * this.TVA_RATE;

            jQuery('#odm_hdnSubTotal').val(totalHT.toFixed(2));
            jQuery('#odm_hdnGrandTotal').val(totalTTC.toFixed(2));
            jQuery('#odm_pre_tax_total').val(totalHT.toFixed(2));
            jQuery('#odm_hidden_cf_1166').val(acompteTTC.toFixed(2));
            jQuery('#odm_hidden_cf_1168').val(soldeTTC.toFixed(2));

            // Build products
            var container = jQuery('#odmHiddenProductsContainer');
            container.empty();

            var productKeys = Object.keys(this.selectedProducts);
            jQuery('#odm_hidden_totalProductCount').val(productKeys.length);

            productKeys.forEach(function(idx, i) {
                var p = self.selectedProducts[idx];
                var lineNum = i + 1;
                var lineTotal = (p.price * p.qty).toFixed(2);

                container.append('<input type="hidden" name="hdnProductId' + lineNum + '" value="' + p.id + '">');
                container.append('<input type="hidden" name="productName' + lineNum + '" value="' + p.name + '">');
                container.append('<input type="hidden" name="productDescription' + lineNum + '" value="' + p.name + '">');
                container.append('<input type="hidden" name="qty' + lineNum + '" value="' + p.qty + '">');
                container.append('<input type="hidden" name="listPrice' + lineNum + '" value="' + p.price.toFixed(2) + '">');
                container.append('<input type="hidden" name="lineItemType' + lineNum + '" value="Products">');
                container.append('<input type="hidden" name="discount' + lineNum + '" value="0">');
                container.append('<input type="hidden" name="discount_type' + lineNum + '" value="zero">');
                container.append('<input type="hidden" name="productTotal' + lineNum + '" value="' + lineTotal + '">');
                container.append('<input type="hidden" name="netPrice' + lineNum + '" value="' + lineTotal + '">');
            });

            // Submit form
            app.helper.showProgress('Enregistrement du BDC...');

            var formData = new FormData(jQuery('#unifiedODMForm')[0]);

            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    app.helper.hideProgress();
                    console.log('[UnifiedODM] Save response received, length:', response ? response.length : 0);

                    // VTiger Save action returns HTML (detail view or redirect)
                    // Check for common error patterns
                    var hasError = false;
                    if (typeof response === 'string') {
                        hasError = response.indexOf('error') !== -1 &&
                                   response.indexOf('Fatal error') !== -1 ||
                                   response.indexOf('Exception') !== -1 ||
                                   response.indexOf('failed') !== -1;
                    }

                    if (!hasError) {
                        app.helper.showSuccessNotification({message: 'BDC enregistré avec succès!'});
                        self.cancelEdit();

                        // Reset state to allow creating new BDC
                        self.currentSOId = null;
                        self.sourceQuoteId = null;
                        self.quoteData = null;

                        // Force reload tab after short delay to ensure DB commit
                        setTimeout(function() {
                            console.log('[UnifiedODM] Forcing tab reload after save');
                            if (window.UnifiedTabbedView) {
                                UnifiedTabbedView.invalidateTab('odm');
                                UnifiedTabbedView.loadTabContent('odm', true); // Force reload
                            }
                        }, 300);
                    } else {
                        console.error('[UnifiedODM] Error detected in response');
                        app.helper.showErrorNotification({message: 'Erreur lors de la sauvegarde'});
                    }
                },
                error: function(xhr, status, error) {
                    app.helper.hideProgress();
                    console.error('[UnifiedODM] Save error:', error, 'Status:', status);
                    app.helper.showErrorNotification({message: 'Erreur: ' + error});
                }
            });
        },

        /**
         * View PDF
         */
        openPDFPreviewModal: function() {
            var soId = this.currentSOId;
            if (!soId) {
                app.helper.showErrorNotification({message: 'Veuillez d\'abord selectionner un BDC'});
                return;
            }

            var templates = window.odmPdfTemplates || [];
            if (templates.length === 0) {
                app.helper.showErrorNotification({message: 'Aucun modele PDF disponible'});
                return;
            }

            var modalId = 'odmPdfPreviewModal';
            var modal = jQuery('#' + modalId);

            var listHtml = '';
            templates.forEach(function(tpl, index) {
                var activeClass = (index === 0) ? ' active' : '';
                listHtml += '<div class="pdf-tpl-item' + activeClass + '" data-templateid="' + tpl.id + '">' +
                            '<i class="fa fa-file-pdf-o"></i> ' +
                            '<span>' + tpl.name + '</span>' +
                            '</div>';
            });

            var firstPreviewUrl = 'index.php?module=PDFMaker&action=IndexAjax&mode=getPreviewContent' +
                                  '&source_module=SalesOrder&pdftemplateid=' + templates[0].id +
                                  '&record=' + soId + '&generate_type=inline';

            if (modal.length === 0) {
                modal = jQuery(
                    '<div class="modal fade" id="' + modalId + '" tabindex="-1" role="dialog">' +
                        '<div class="modal-dialog" role="document" style="width: 90%; max-width: 1200px;">' +
                            '<div class="modal-content">' +
                                '<div class="modal-header" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: white;">' +
                                    '<button type="button" class="close" data-dismiss="modal" style="color: rgba(255,255,255,0.7); opacity: 1;">&times;</button>' +
                                    '<h4 class="modal-title"><i class="fa fa-file-pdf-o"></i> Apercu PDF - BDC</h4>' +
                                '</div>' +
                                '<div class="modal-body" style="padding: 0; display: flex; height: 78vh;">' +
                                    '<div class="pdf-tpl-sidebar" id="odmPdfTplSidebar" style="width: 230px; min-width: 230px; overflow-y: auto; padding: 14px 0;">' +
                                        '<div class="pdf-tpl-sidebar-title">Modeles</div>' +
                                        listHtml +
                                    '</div>' +
                                    '<div style="flex: 1; position: relative; border-radius: 0 0 16px 0; overflow: hidden;">' +
                                        '<div id="odmPdfPreviewLoading" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10;">' +
                                            '<i class="fa fa-spinner fa-spin fa-3x"></i>' +
                                            '<p style="margin-top: 12px;">Chargement...</p>' +
                                        '</div>' +
                                        '<iframe id="odmPdfPreviewIframe" src="' + firstPreviewUrl + '" style="width: 100%; height: 100%; border: none; display: block;"></iframe>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="modal-footer">' +
                                    '<button type="button" class="btn btn-info" id="odmPdfPreviewDownload"><i class="fa fa-download"></i> Telecharger</button>' +
                                    '<button type="button" class="btn btn-default" id="odmPdfPreviewPrint"><i class="fa fa-print"></i> Imprimer</button>' +
                                    '<button type="button" class="btn btn-default" data-dismiss="modal">Fermer</button>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                );
                jQuery('body').append(modal);

                modal.on('click', '.pdf-tpl-item', function() {
                    var tplId = jQuery(this).data('templateid');
                    var currentSOId = UnifiedODM.currentSOId;

                    modal.find('.pdf-tpl-item').removeClass('active');
                    jQuery(this).addClass('active');

                    jQuery('#odmPdfPreviewLoading').css('display', 'flex');

                    var previewUrl = 'index.php?module=PDFMaker&action=IndexAjax&mode=getPreviewContent' +
                                     '&source_module=SalesOrder&pdftemplateid=' + tplId +
                                     '&record=' + currentSOId + '&generate_type=inline';
                    jQuery('#odmPdfPreviewIframe').attr('src', previewUrl);
                });

                modal.find('#odmPdfPreviewIframe').on('load', function() {
                    jQuery('#odmPdfPreviewLoading').hide();
                });

                modal.on('click', '#odmPdfPreviewDownload', function() {
                    var tplId = modal.find('.pdf-tpl-item.active').data('templateid');
                    var currentSOId = UnifiedODM.currentSOId;
                    var downloadUrl = 'index.php?module=PDFMaker&action=CreatePDFFromTemplate&mode=CreatePDF' +
                                      '&source_module=SalesOrder&formodule=SalesOrder' +
                                      '&record=' + currentSOId +
                                      '&pdftemplateid=' + tplId;
                    window.open(downloadUrl, '_blank');
                });

                modal.on('click', '#odmPdfPreviewPrint', function() {
                    var iframe = document.getElementById('odmPdfPreviewIframe');
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                    }
                });
            } else {
                modal.find('#odmPdfTplSidebar').html(
                    '<div class="pdf-tpl-sidebar-title">Modeles</div>' +
                    listHtml
                );
                jQuery('#odmPdfPreviewIframe').attr('src', firstPreviewUrl);
            }

            modal.modal('show');
        },

        /**
         * Open Send Email modal for the selected BDC
         */
        openSendEmailModal: function() {
            var soId = this.currentSOId;
            if (!soId) {
                app.helper.showErrorNotification({message: 'Veuillez d\'abord sélectionner un BDC'});
                return;
            }

            var potentialId = jQuery('#odmTabContainer').data('potential-id');

            // Load email data (templates, PDFs, contact email)
            app.helper.showProgress('Chargement...');
            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                dataType: 'json',
                data: {
                    module: 'Potentials',
                    action: 'GetEmailData',
                    record: potentialId,
                    salesorder_id: soId
                },
                success: function(response) {
                    app.helper.hideProgress();
                    var data = response.result || response;
                    if (!data.success) {
                        app.helper.showErrorNotification({message: data.error || 'Erreur de chargement'});
                        return;
                    }

                    // Populate email templates dropdown
                    var $tplSelect = jQuery('#odmEmailTemplate');
                    $tplSelect.empty().append('<option value="">-- Choisir un template --</option>');
                    if (data.email_templates && data.email_templates.length > 0) {
                        data.email_templates.forEach(function(tpl) {
                            $tplSelect.append('<option value="' + tpl.id + '">' + tpl.name + '</option>');
                        });
                    }

                    // Populate PDF templates checkboxes
                    var $pdfList = jQuery('#odmEmailPdfList');
                    $pdfList.empty();
                    if (data.pdf_templates && data.pdf_templates.length > 0) {
                        data.pdf_templates.forEach(function(tpl) {
                            $pdfList.append(
                                '<label><input type="checkbox" value="' + tpl.id + '" data-name="' + tpl.name + '"> ' +
                                '<i class="fa fa-file-pdf-o" style="color:#e74c3c;"></i> ' + tpl.name + '</label>'
                            );
                        });
                    } else {
                        $pdfList.html('<p class="text-muted" style="margin:6px;font-size:12px;">Aucun template PDF</p>');
                    }

                    // Set prestataire email (fallback to contact email)
                    jQuery('#odmEmailTo').val(data.vendor_email || data.contact_email || '');

                    // Show modal
                    jQuery('#odmSendEmailModal').modal('show');
                },
                error: function() {
                    app.helper.hideProgress();
                    app.helper.showErrorNotification({message: 'Erreur de chargement des données email'});
                }
            });
        }
    };

    // =====================================================
    // UNIFIED FACTURE CONTROLLER
    // =====================================================

    window.UnifiedFacture = {
        potentialId: null,
        contactId: null,
        selectedQuoteId: null,
        selectedSOId: null,

        init: function() {
            var container = jQuery('#factureTabContainer');
            if (!container.length) return;

            this.potentialId = container.data('potential-id');
            this.contactId = container.data('contact-id');
            console.log('[UnifiedFacture] Initialized for potential', this.potentialId);
        },

        /**
         * Find invoices linked to a quote or sales order
         */
        _getLinkedInvoices: function(recordId, type) {
            var invoices = window.factureInvoices || [];
            var linked = [];
            for (var i = 0; i < invoices.length; i++) {
                if (type === 'quote' && invoices[i].quote_id == recordId) {
                    linked.push(invoices[i]);
                } else if (type === 'salesorder' && invoices[i].salesorderid == recordId) {
                    linked.push(invoices[i]);
                }
            }
            return linked;
        },

        /**
         * Select a quote chip - show appropriate actions
         */
        selectQuote: function(quoteId) {
            this.selectedQuoteId = quoteId;

            // Update chip active state
            jQuery('#factureTabContainer .facture-section').first().find('.facture-chip').removeClass('active');
            var chip = jQuery('#factureTabContainer .facture-chip[data-id="' + quoteId + '"][data-type="quote"]');
            chip.addClass('active');

            var quoteNo = chip.find('.chip-no').text();
            jQuery('#factureQuoteLabel').text('Devis : ' + quoteNo);

            // Build action buttons based on whether invoice exists
            var hasInvoice = chip.data('has-invoice') == '1';
            var linkedInvoices = this._getLinkedInvoices(quoteId, 'quote');
            var btns = '';

            if (hasInvoice && linkedInvoices.length > 0) {
                // Already has invoice - show view button
                var invId = linkedInvoices[0].invoiceid;
                btns += '<button class="btn-facture btn-view-invoice" onclick="UnifiedFacture.openInvoicePDFPreview(' + invId + ')"><i class="fa fa-eye"></i> Voir la facture</button> ';
                btns += '<button class="btn-facture btn-stripe" onclick="UnifiedFacture.openStripePayments()"><i class="fa fa-credit-card"></i> Paiements Stripe</button>';
            } else {
                // No invoice yet - show proforma preview + generate
                btns += '<button class="btn-facture btn-proforma" onclick="UnifiedFacture.openProformaPreview(\'Quotes\')"><i class="fa fa-eye"></i> Aper\u00e7u Proforma</button> ';
                btns += '<button class="btn-facture btn-generate" onclick="UnifiedFacture.generateInvoice(\'quote\')"><i class="fa fa-plus-circle"></i> G\u00e9n\u00e9rer la facture</button> ';
                btns += '<button class="btn-facture btn-stripe" onclick="UnifiedFacture.openStripePayments()"><i class="fa fa-credit-card"></i> Paiements Stripe</button>';
            }

            jQuery('#factureQuoteButtons').html(btns);
            jQuery('#factureQuoteActions').slideDown(200);
        },

        /**
         * Select a sales order chip - show appropriate actions
         */
        selectSalesOrder: function(soId) {
            this.selectedSOId = soId;

            // Update chip active state
            jQuery('#factureTabContainer .facture-section').eq(1).find('.facture-chip').removeClass('active');
            var chip = jQuery('#factureTabContainer .facture-chip[data-id="' + soId + '"][data-type="salesorder"]');
            chip.addClass('active');

            var soNo = chip.find('.chip-no').text();
            jQuery('#factureSOLabel').text('ODM : ' + soNo);

            // Build action buttons based on whether invoice exists
            var hasInvoice = chip.data('has-invoice') == '1';
            var linkedInvoices = this._getLinkedInvoices(soId, 'salesorder');
            var btns = '';

            if (hasInvoice && linkedInvoices.length > 0) {
                var invId = linkedInvoices[0].invoiceid;
                btns += '<button class="btn-facture btn-view-invoice" onclick="UnifiedFacture.openInvoicePDFPreview(' + invId + ')"><i class="fa fa-eye"></i> Voir la facture</button>';
            } else {
                btns += '<button class="btn-facture btn-proforma" onclick="UnifiedFacture.openProformaPreview(\'SalesOrder\')"><i class="fa fa-eye"></i> Aper\u00e7u Proforma</button> ';
                btns += '<button class="btn-facture btn-generate" onclick="UnifiedFacture.generateInvoice(\'salesorder\')"><i class="fa fa-plus-circle"></i> G\u00e9n\u00e9rer la facture</button>';
            }

            jQuery('#factureSOButtons').html(btns);
            jQuery('#factureSOActions').slideDown(200);
        },

        /**
         * Open proforma PDF preview (without creating an invoice)
         */
        openProformaPreview: function(sourceModule) {
            var recordId = (sourceModule === 'Quotes') ? this.selectedQuoteId : this.selectedSOId;
            if (!recordId) return;

            var templates = window.factureInvoicePdfTemplates || [];
            if (templates.length === 0) {
                alert('Aucun template PDF Invoice disponible');
                return;
            }

            var self = this;
            var type = (sourceModule === 'Quotes') ? 'quote' : 'salesorder';

            // First create the invoice, then preview it with source_module=Invoice
            var btn = jQuery('#facture' + (type === 'quote' ? 'Quote' : 'SO') + 'Buttons .btn-proforma');
            var origHtml = btn.html();
            btn.html('<i class="fa fa-spinner fa-spin"></i> Chargement...').prop('disabled', true);

            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                data: {
                    module: 'Potentials',
                    view: 'UnifiedTabAjax',
                    mode: 'createInvoiceFromSource',
                    source_id: recordId,
                    source_module: sourceModule,
                    potential_id: self.potentialId
                },
                dataType: 'json',
                success: function(response) {
                    if (response.success && response.invoice) {
                        // Add the new invoice to the JS data
                        window.factureInvoices.push(response.invoice);

                        // Gray out the chip
                        var chip = jQuery('#factureTabContainer .facture-chip[data-id="' + recordId + '"][data-type="' + type + '"]');
                        chip.addClass('has-invoice').attr('data-has-invoice', '1');

                        // Update action buttons to show "Voir la facture"
                        var invId = response.invoice.invoiceid;
                        var newBtns = '<button class="btn-facture btn-view-invoice" onclick="UnifiedFacture.openInvoicePDFPreview(' + invId + ')"><i class="fa fa-eye"></i> Voir la facture</button>';
                        if (type === 'quote') {
                            newBtns += ' <button class="btn-facture btn-stripe" onclick="UnifiedFacture.openStripePayments()"><i class="fa fa-credit-card"></i> Paiements Stripe</button>';
                        }
                        jQuery('#facture' + (type === 'quote' ? 'Quote' : 'SO') + 'Buttons').html(newBtns);

                        // Add row to the invoices table
                        self._addInvoiceRow(response.invoice);
                        jQuery('#factureInvoiceCount').text(window.factureInvoices.length);

                        // Now open PDF preview with the INVOICE record
                        self._showPDFModal(invId, templates, 'Invoice');
                    } else {
                        alert('Erreur: ' + (response.error || 'Impossible de cr\u00e9er la facture'));
                        btn.html(origHtml).prop('disabled', false);
                    }
                },
                error: function() {
                    alert('Erreur de connexion');
                    btn.html(origHtml).prop('disabled', false);
                }
            });
        },

        /**
         * Generate invoice from a quote or sales order via AJAX
         */
        generateInvoice: function(type) {
            var recordId = (type === 'quote') ? this.selectedQuoteId : this.selectedSOId;
            if (!recordId) return;

            var self = this;
            var sourceModule = (type === 'quote') ? 'Quotes' : 'SalesOrder';

            if (!confirm('G\u00e9n\u00e9rer une facture \u00e0 partir de ce ' + (type === 'quote' ? 'devis' : 'ODM') + ' ?')) {
                return;
            }

            // Show loading on the button
            var btn = jQuery('#facture' + (type === 'quote' ? 'Quote' : 'SO') + 'Buttons .btn-generate');
            var origHtml = btn.html();
            btn.html('<i class="fa fa-spinner fa-spin"></i> G\u00e9n\u00e9ration...').prop('disabled', true);

            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                data: {
                    module: 'Potentials',
                    view: 'UnifiedTabAjax',
                    mode: 'createInvoiceFromSource',
                    source_id: recordId,
                    source_module: sourceModule,
                    potential_id: self.potentialId
                },
                dataType: 'json',
                success: function(response) {
                    if (response.success && response.invoice) {
                        // Add the new invoice to the JS data
                        window.factureInvoices.push(response.invoice);

                        // Gray out the chip
                        var chip = jQuery('#factureTabContainer .facture-chip[data-id="' + recordId + '"][data-type="' + type + '"]');
                        chip.addClass('has-invoice').attr('data-has-invoice', '1');

                        // Update action buttons to show "Voir la facture"
                        var invId = response.invoice.invoiceid;
                        var newBtns = '<button class="btn-facture btn-view-invoice" onclick="UnifiedFacture.openInvoicePDFPreview(' + invId + ')"><i class="fa fa-eye"></i> Voir la facture</button>';
                        if (type === 'quote') {
                            newBtns += ' <button class="btn-facture btn-stripe" onclick="UnifiedFacture.openStripePayments()"><i class="fa fa-credit-card"></i> Paiements Stripe</button>';
                        }
                        jQuery('#facture' + (type === 'quote' ? 'Quote' : 'SO') + 'Buttons').html(newBtns);

                        // Add row to the invoices table
                        self._addInvoiceRow(response.invoice);

                        // Update invoice count
                        jQuery('#factureInvoiceCount').text(window.factureInvoices.length);
                    } else {
                        alert('Erreur: ' + (response.error || 'Impossible de g\u00e9n\u00e9rer la facture'));
                        btn.html(origHtml).prop('disabled', false);
                    }
                },
                error: function() {
                    alert('Erreur de connexion');
                    btn.html(origHtml).prop('disabled', false);
                }
            });
        },

        /**
         * Add a new invoice row to the table dynamically
         */
        _addInvoiceRow: function(inv) {
            var templates = window.factureInvoicePdfTemplates || [];
            var tbody = jQuery('#factureInvoicesTable tbody');

            // If table doesn't exist yet (was "Aucune facture"), create it
            if (!jQuery('#factureInvoicesTable').length) {
                var tableHtml = '<table class="facture-table" id="factureInvoicesTable">' +
                    '<thead><tr><th>N\u00b0</th><th>Sujet</th><th>Date</th><th>Total</th><th>Statut</th><th>Source</th><th>Actions</th></tr></thead>' +
                    '<tbody></tbody></table>';
                jQuery('#factureInvoicesBody').html(tableHtml);
                tbody = jQuery('#factureInvoicesTable tbody');
            }

            var statusClass = 'status-created';
            var statusLabel = 'Cr\u00e9\u00e9';
            if (inv.invoicestatus === 'Paid') { statusClass = 'status-paid'; statusLabel = 'Pay\u00e9'; }
            else if (inv.invoicestatus === 'Approved') { statusClass = 'status-approved'; statusLabel = 'Approuv\u00e9'; }

            var pdfBtns = '';
            for (var k = 0; k < templates.length; k++) {
                pdfBtns += '<a href="index.php?module=PDFMaker&action=CreatePDFFromTemplate&mode=CreatePDF&source_module=Invoice&formodule=Invoice&record=' + inv.invoiceid + '&pdftemplateid=' + templates[k].id + '" target="_blank" class="btn-pdf-small" title="' + templates[k].name + '"><i class="fa fa-file-pdf-o"></i></a> ';
            }
            pdfBtns += '<button class="btn-pdf-small btn-preview" onclick="UnifiedFacture.openInvoicePDFPreview(' + inv.invoiceid + ')" title="Aper\u00e7u"><i class="fa fa-eye"></i></button>';

            var source = '';
            if (inv.quote_id) source = 'Devis';
            if (inv.salesorderid) source = 'ODM';

            var row = '<tr data-invoice-id="' + inv.invoiceid + '" style="background: #e8f5e9;">' +
                '<td><strong>' + (inv.invoice_no || '--') + '</strong></td>' +
                '<td>' + (inv.subject || '--') + '</td>' +
                '<td>' + (inv.created_date || '--') + '</td>' +
                '<td class="text-right"><strong>' + parseFloat(inv.total || 0).toFixed(2) + ' EUR</strong></td>' +
                '<td><span class="status-badge ' + statusClass + '">' + statusLabel + '</span></td>' +
                '<td>' + source + '</td>' +
                '<td><div class="facture-pdf-btns">' + pdfBtns + '</div></td>' +
                '</tr>';

            tbody.prepend(row);

            // Flash effect
            setTimeout(function() {
                jQuery('#factureInvoicesTable tr[data-invoice-id="' + inv.invoiceid + '"]').css('background', '');
            }, 3000);
        },

        /**
         * Open PDF preview modal for an existing invoice
         */
        openInvoicePDFPreview: function(invoiceId) {
            var templates = window.factureInvoicePdfTemplates || [];
            if (templates.length === 0) {
                alert('Aucun template PDF disponible');
                return;
            }
            this._showPDFModal(invoiceId, templates, 'Invoice');
        },

        _currentInvoiceId: null,

        _invoiceEmailTemplateId: 30,

        openInvoiceEmailModal: function(invoiceId, invoiceNo) {
            var self = this;
            this._currentInvoiceId = invoiceId;

            jQuery('#invEmailModalTitle').text(invoiceNo || '');
            jQuery('#invEmailTo').val('');
            jQuery('#invEmailCc').val('');
            jQuery('#invEmailSubject').val('');
            jQuery('#invEmailBody').html('<div style="padding:20px;text-align:center;color:#999;"><i class="fa fa-spinner fa-spin"></i> Chargement...</div>');

            // Checkboxes PDF
            var pdfs = window.factureInvoicePdfTemplates || [];
            var pdfHtml = '';
            for (var i = 0; i < pdfs.length; i++) {
                pdfHtml += '<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;background:#f8f9fa;border:1px solid #e0e0e0;border-radius:6px;padding:5px 10px;">' +
                    '<input type="checkbox" name="inv_pdf_tpl[]" value="' + pdfs[i].id + '" checked> ' +
                    '<i class="fa fa-file-pdf-o" style="color:#e74c3c;"></i> ' + pdfs[i].name + '</label>';
            }
            jQuery('#invEmailPdfList').html(pdfHtml || '<span style="font-size:12px;color:#999;">Aucun template PDF</span>');

            // Charger email contact + template en parallèle
            jQuery.ajax({
                url: 'index.php', type: 'POST', dataType: 'json',
                data: { module: 'Potentials', action: 'GetEmailData', record: self.potentialId, invoice_id: invoiceId },
                success: function(resp) {
                    var d = resp.result || resp;
                    if (d.contact_email) jQuery('#invEmailTo').val(d.contact_email);
                }
            });

            jQuery.ajax({
                url: 'index.php', type: 'GET', dataType: 'json',
                data: {
                    module: 'Potentials',
                    action: 'PreviewEmailTemplate',
                    record: self.potentialId,
                    invoice_id: invoiceId,
                    email_template: self._invoiceEmailTemplateId
                },
                success: function(resp) {
                    var d = resp.result || resp;
                    if (d.success) {
                        if (d.subject) jQuery('#invEmailSubject').val(d.subject);
                        jQuery('#invEmailBody').html(d.body || '');
                    } else {
                        jQuery('#invEmailBody').html('<p style="color:#e74c3c;font-size:12px;">Erreur chargement template</p>');
                    }
                },
                error: function() {
                    jQuery('#invEmailBody').html('<p style="color:#e74c3c;font-size:12px;">Erreur chargement template</p>');
                }
            });

            var modal = jQuery('#invoiceEmailModal');
            modal.css('display', 'flex');
            modal.off('click').on('click', function(e) {
                if (e.target === modal[0]) self.closeInvoiceEmailModal();
            });
        },

        closeInvoiceEmailModal: function() {
            jQuery('#invoiceEmailModal').css('display', 'none');
            this._currentInvoiceId = null;
        },

        sendInvoiceEmail: function() {
            var self = this;
            var to = jQuery('#invEmailTo').val().trim();
            var cc = jQuery('#invEmailCc').val().trim();
            var subject = jQuery('#invEmailSubject').val().trim();
            var body = jQuery('#invEmailBody').html();

            if (!to) { alert('Veuillez saisir un destinataire'); return; }

            var pdfTpls = [];
            jQuery('input[name="inv_pdf_tpl[]"]:checked').each(function() {
                pdfTpls.push(jQuery(this).val());
            });

            var btn = jQuery('#invEmailSendBtn');
            btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Envoi...');

            var formData = new FormData();
            formData.append('module', 'Potentials');
            formData.append('action', 'SendEmail');
            formData.append('record', self.potentialId);
            formData.append('invoice_id', self._currentInvoiceId);
            formData.append('email', to);
            formData.append('cc', cc);
            formData.append('email_template', '0');
            formData.append('custom_subject', subject);
            formData.append('custom_body', body);
            for (var i = 0; i < pdfTpls.length; i++) {
                formData.append('pdf_templates[]', pdfTpls[i]);
            }

            jQuery.ajax({
                url: 'index.php', type: 'POST', data: formData,
                processData: false, contentType: false,
                success: function(resp) {
                    btn.prop('disabled', false).html('<i class="fa fa-paper-plane"></i> Envoyer');
                    var d = typeof resp === 'string' ? JSON.parse(resp) : resp;
                    var result = d.result || d;
                    if (result.success) {
                        self.closeInvoiceEmailModal();
                        app.helper.showSuccessNotification({ message: 'Email envoy\u00e9 avec succ\u00e8s !' });
                    } else {
                        alert('Erreur : ' + (result.error || result.message || 'Erreur inconnue'));
                    }
                },
                error: function() {
                    btn.prop('disabled', false).html('<i class="fa fa-paper-plane"></i> Envoyer');
                    alert('Erreur lors de l\'envoi');
                }
            });
        },

        /**
         * Show PDF preview modal with template sidebar
         */
        _showPDFModal: function(recordId, templates, sourceModule) {
            var modalId = 'factureProformaModal';

            // Sort templates: PROFORMA first
            var sorted = templates.slice().sort(function(a, b) {
                var aProf = (a.name && a.name.indexOf('PROFORMA') !== -1) ? 0 : 1;
                var bProf = (b.name && b.name.indexOf('PROFORMA') !== -1) ? 0 : 1;
                return aProf - bProf;
            });

            var firstTpl = sorted[0];
            var previewUrl = 'index.php?module=PDFMaker&action=IndexAjax&mode=getPreviewContent&source_module=' + sourceModule + '&pdftemplateid=' + firstTpl.id + '&record=' + recordId + '&generate_type=inline';

            // Build sidebar
            var sidebarHtml = '';
            for (var i = 0; i < sorted.length; i++) {
                var activeClass = (i === 0) ? ' active' : '';
                sidebarHtml += '<div class="proforma-tpl-item' + activeClass + '" data-tplid="' + sorted[i].id + '">';
                sidebarHtml += '<i class="fa fa-file-pdf-o"></i> ' + sorted[i].name;
                sidebarHtml += '</div>';
            }

            jQuery('#' + modalId).remove();

            var modalHtml = '<div class="modal fade" id="' + modalId + '" tabindex="-1">' +
                '<div class="modal-dialog" style="width: 90%; max-width: 1200px; margin: 30px auto;">' +
                '<div class="modal-content" style="border-radius: 12px; overflow: hidden;">' +
                '<div class="modal-header" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: #fff; padding: 12px 20px;">' +
                '<button type="button" class="close" data-dismiss="modal" style="color: #fff; opacity: 0.8;"><span>&times;</span></button>' +
                '<h4 class="modal-title"><i class="fa fa-file-pdf-o"></i> Aper\u00e7u ' + (sourceModule === 'Invoice' ? 'Facture' : 'Proforma') + '</h4>' +
                '</div>' +
                '<div class="modal-body" style="padding: 0; display: flex; height: 75vh;">' +
                '<div class="proforma-sidebar" style="width: 230px; min-width: 230px; background: #f8f9fa; border-right: 1px solid #dee2e6; overflow-y: auto; padding: 10px 0;">' +
                sidebarHtml +
                '</div>' +
                '<div style="flex: 1; position: relative;">' +
                '<div class="proforma-loading" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.8); z-index: 10;">' +
                '<div style="text-align: center;"><div class="spinner" style="width: 40px; height: 40px; border: 3px solid #eee; border-top-color: #e74c3c; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto;"></div><p style="margin-top: 10px; color: #666;">Chargement...</p></div>' +
                '</div>' +
                '<iframe id="proformaPreviewIframe" src="' + previewUrl + '" style="width: 100%; height: 100%; border: none;" onload="jQuery(\'.proforma-loading\').hide()"></iframe>' +
                '</div>' +
                '</div>' +
                '<div class="modal-footer" style="padding: 10px 20px;">' +
                '<button type="button" class="btn btn-success" id="proformaDownloadBtn"><i class="fa fa-download"></i> T\u00e9l\u00e9charger</button> ' +
                '<button type="button" class="btn btn-info" id="proformaPrintBtn"><i class="fa fa-print"></i> Imprimer</button> ' +
                '<button type="button" class="btn btn-default" data-dismiss="modal">Fermer</button>' +
                '</div>' +
                '</div></div></div>';

            jQuery('body').append(modalHtml);

            var currentTplId = firstTpl.id;

            // Sidebar click
            jQuery('#' + modalId + ' .proforma-tpl-item').on('click', function() {
                jQuery('#' + modalId + ' .proforma-tpl-item').removeClass('active');
                jQuery(this).addClass('active');
                currentTplId = jQuery(this).data('tplid');
                jQuery('.proforma-loading').show();
                jQuery('#proformaPreviewIframe').attr('src',
                    'index.php?module=PDFMaker&action=IndexAjax&mode=getPreviewContent&source_module=' + sourceModule + '&pdftemplateid=' + currentTplId + '&record=' + recordId + '&generate_type=inline');
            });

            // Download
            jQuery('#proformaDownloadBtn').on('click', function() {
                window.open('index.php?module=PDFMaker&action=CreatePDFFromTemplate&mode=CreatePDF&source_module=' + sourceModule + '&formodule=' + sourceModule + '&record=' + recordId + '&pdftemplateid=' + currentTplId, '_blank');
            });

            // Print
            jQuery('#proformaPrintBtn').on('click', function() {
                var iframe = document.getElementById('proformaPreviewIframe');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.print();
                }
            });

            jQuery('#' + modalId).modal('show');

            // Add CSS for sidebar items
            if (!jQuery('#proforma-modal-css').length) {
                jQuery('head').append(
                    '<style id="proforma-modal-css">' +
                    '.proforma-tpl-item { padding: 10px 15px; cursor: pointer; border-left: 3px solid transparent; font-size: 13px; transition: all 0.15s; }' +
                    '.proforma-tpl-item:hover { background: #e9ecef; }' +
                    '.proforma-tpl-item.active { background: #fde8e8; border-left-color: #e74c3c; color: #c0392b; font-weight: 600; }' +
                    '.proforma-tpl-item .fa { margin-right: 8px; color: #e74c3c; }' +
                    '@keyframes spin { to { transform: rotate(360deg); } }' +
                    '</style>'
                );
            }
        },

        /**
         * Open Stripe payments modal
         */
        openStripePayments: function() {
            if (!this.selectedQuoteId) return;
            var quoteId = this.selectedQuoteId;

            if (typeof openStripePaymentsModal === 'function') {
                openStripePaymentsModal(quoteId);
            } else {
                jQuery.getScript('layouts/v7/modules/Quotes/resources/StripePaymentLinks.js', function() {
                    if (typeof openStripePaymentsModal === 'function') {
                        openStripePaymentsModal(quoteId);
                    }
                });
            }
        }
    };

})();
