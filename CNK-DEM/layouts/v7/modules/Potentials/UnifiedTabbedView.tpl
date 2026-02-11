{*+**********************************************************************************
* Unified Tabbed View - Combines Details, Devis, Google Map, and Inventaire
* Modern design matching popup styles
************************************************************************************}
{strip}
<div class="unified-view-wrapper">
    <div class="unified-container">
        {* Tab Navigation with Title on left, Tabs centered *}
        <div class="unified-tabs-header">
            <div class="unified-header-left">
                <div class="header-info">
                    <h1><i class="fa fa-user-circle"></i> {$CONTACT_NAME}</h1>
                    {if !empty($CONTACT_PHONE)}
                        <p class="contact-detail"><i class="fa fa-phone"></i> {$CONTACT_PHONE}</p>
                    {/if}
                    {if !empty($CONTACT_EMAIL)}
                        <p class="contact-detail"><i class="fa fa-envelope"></i> {$CONTACT_EMAIL}</p>
                    {/if}
                </div>
            </div>
            <ul class="unified-tabs" role="tablist" id="unifiedTabNav">
                <li role="presentation" class="{if $ACTIVE_TAB eq 'details' || empty($ACTIVE_TAB)}active{/if}">
                    <a href="#unified-tab-details" data-tab="details" data-toggle="tab" role="tab" class="tab-link tab-blue">
                        <i class="fa fa-info-circle"></i>
                        <span>Details</span>
                    </a>
                </li>
                <li role="presentation" class="{if $ACTIVE_TAB eq 'devis'}active{/if}">
                    <a href="#unified-tab-devis" data-tab="devis" data-toggle="tab" role="tab" class="tab-link tab-purple">
                        <i class="fa fa-file-text-o"></i>
                        <span>Devis</span>
                    </a>
                </li>
                <li role="presentation" class="{if $ACTIVE_TAB eq 'map'}active{/if}">
                    <a href="#unified-tab-map" data-tab="map" data-toggle="tab" role="tab" class="tab-link tab-green">
                        <i class="fa fa-map-marker"></i>
                        <span>Google Map</span>
                    </a>
                </li>
                <li role="presentation" class="{if $ACTIVE_TAB eq 'inventaire'}active{/if}">
                    <a href="#unified-tab-inventaire" data-tab="inventaire" data-toggle="tab" role="tab" class="tab-link tab-orange">
                        <i class="fa fa-archive"></i>
                        <span>Inventaire</span>
                    </a>
                </li>
                {if $IS_ADMIN}
                <li role="presentation" class="{if $ACTIVE_TAB eq 'odm'}active{/if}">
                    <a href="#unified-tab-odm" data-tab="odm" data-toggle="tab" role="tab" class="tab-link tab-teal">
                        <i class="fa fa-clipboard"></i>
                        <span>ODM</span>
                    </a>
                </li>
                {/if}
                <li role="presentation" class="{if $ACTIVE_TAB eq 'mail'}active{/if}">
                    <a href="#unified-tab-mail" data-tab="mail" data-toggle="tab" role="tab" class="tab-link tab-pink">
                        <i class="fa fa-envelope"></i>
                        <span>Mail</span>
                    </a>
                </li>
            </ul>
            <div class="unified-header-right">
                <a href="index.php?module=Potentials&view=Detail&record={$RECORD_ID}" class="back-link">
                    <i class="fa fa-arrow-left"></i> <span>Retour</span>
                </a>
            </div>
        </div>

        {* Tab Content Panes *}
        <div class="tab-content unified-tab-content" id="unifiedTabbedView" data-record-id="{$RECORD_ID}">
            <div role="tabpanel" class="tab-pane {if $ACTIVE_TAB eq 'details' || empty($ACTIVE_TAB)}active{/if}" id="unified-tab-details">
                <div class="tab-loader" data-loaded="false">
                    <div class="loading-indicator">
                        <div class="spinner"></div>
                        <p>Chargement des details...</p>
                    </div>
                </div>
            </div>
            <div role="tabpanel" class="tab-pane {if $ACTIVE_TAB eq 'devis'}active{/if}" id="unified-tab-devis">
                <div class="tab-loader" data-loaded="false">
                    <div class="loading-indicator">
                        <div class="spinner"></div>
                        <p>Chargement des devis...</p>
                    </div>
                </div>
            </div>
            <div role="tabpanel" class="tab-pane {if $ACTIVE_TAB eq 'map'}active{/if}" id="unified-tab-map">
                <div class="tab-loader" data-loaded="false">
                    <div class="loading-indicator">
                        <div class="spinner"></div>
                        <p>Chargement de la carte...</p>
                    </div>
                </div>
            </div>
            <div role="tabpanel" class="tab-pane {if $ACTIVE_TAB eq 'inventaire'}active{/if}" id="unified-tab-inventaire">
                <div class="tab-loader" data-loaded="false">
                    <div class="loading-indicator">
                        <div class="spinner"></div>
                        <p>Chargement de l'inventaire...</p>
                    </div>
                </div>
            </div>
            {if $IS_ADMIN}
            <div role="tabpanel" class="tab-pane {if $ACTIVE_TAB eq 'odm'}active{/if}" id="unified-tab-odm">
                <div class="tab-loader" data-loaded="false">
                    <div class="loading-indicator">
                        <div class="spinner"></div>
                        <p>Chargement des ODM...</p>
                    </div>
                </div>
            </div>
            {/if}
            <div role="tabpanel" class="tab-pane {if $ACTIVE_TAB eq 'mail'}active{/if}" id="unified-tab-mail">
                <div class="tab-loader" data-loaded="false">
                    <div class="loading-indicator">
                        <div class="spinner"></div>
                        <p>Chargement de l'historique mail...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
{/strip}

{* Modale pour envoyer un email *}
<div class="modal fade" id="sendEmailModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content" style="border-radius: 12px; overflow: hidden;">
            <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <button type="button" class="close" data-dismiss="modal" style="color: white; opacity: 0.8;">&times;</button>
                <h4 class="modal-title"><i class="fa fa-envelope"></i> Envoyer un Email au Client</h4>
            </div>
            <div class="modal-body" style="padding: 25px;">
                <form id="sendEmailForm">
                    {* Email du contact *}
                    <div class="form-group">
                        <label><strong>Email destinataire</strong> <span class="required">*</span></label>
                        <input type="email" class="form-control" id="recipientEmail" name="email" required placeholder="client@example.com">
                        <small class="help-block">L'email du contact sera pré-rempli automatiquement</small>
                    </div>

                    {* Template Email *}
                    <div class="form-group" style="margin-top: 20px;">
                        <label><strong>Template Email</strong> <span class="required">*</span></label>
                        <select class="form-control select2" id="emailTemplate" name="email_template" required style="width: 100%;">
                            <option value="">-- Sélectionner un template --</option>
                        </select>
                    </div>

                    {* PDFs à joindre *}
                    <div class="form-group" style="margin-top: 20px;">
                        <label><strong>PDFs à joindre</strong></label>
                        <div id="pdfTemplatesList" style="margin-top: 10px;">
                            <p class="text-muted">Chargement des templates PDF...</p>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer" style="padding: 15px 25px; background: #f8f9fa;">
                <button type="button" class="btn btn-default" data-dismiss="modal">Annuler</button>
                <button type="button" class="btn btn-success" id="confirmSendEmail">
                    <i class="fa fa-send"></i> Envoyer
                </button>
            </div>
        </div>
    </div>
</div>

<style>
/* ============================================
   UNIFIED VIEW - COMMON DESIGN SYSTEM
   Matches popup styles for consistency
   ============================================ */

/* Base wrapper */
.unified-view-wrapper {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: #f4f6f9;
    min-height: calc(100vh - 50px);

 
}

.unified-view-wrapper * {
    box-sizing: border-box;
}

.unified-container {
    width: 100%;
    background: #ffffff;
    border-radius: 0;
    box-shadow: none;
}

/* Tab Header - Fixed directly below VTiger menubars */
.unified-tabs-header {
    position: fixed;
    top: 85px;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 0 26px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 55px;
    z-index: 1001;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.unified-header-left {
    display: flex;
    align-items: center;
    color: white;
    min-width: 200px;
}

.unified-header-left .header-info h1 {
    font-size: 1.2em;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}

.unified-header-left .header-info h1 i {
    opacity: 0.9;
}

.unified-header-left .subtitle {
    margin: 2px 0 0 0;
    opacity: 0.85;
    font-size: 0.85em;
}

.unified-header-left .contact-detail {
    margin: 2px 0 0 0;
    opacity: 0.9;
    font-size: 0.95em;
    display: flex;
    align-items: center;
    gap: 6px;
}

.unified-header-left .contact-detail i {
    font-size: 0.9em;
    opacity: 0.8;
}

.unified-header-right {
    display: flex;
    align-items: center;
    color: white;
    min-width: 200px;
    justify-content: flex-end;
}

.unified-header-right .back-link {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    text-decoration: none;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
}

.unified-header-right .back-link:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateX(-3px);
}

.unified-header-right .btn-send-email:hover {
    background: rgba(255, 255, 255, 0.3) !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Tab Navigation - Centered */

.unified-tabs {
    display: flex;
    gap: 5px;
    margin: 0;
    padding: 0;
    list-style: none;
    border: none;
    align-items: flex-end;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
}

.unified-tabs > li { margin: 0; }

.unified-tabs .tab-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 22px;
    font-weight: 600;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    border-radius: 10px 10px 0 0;
    transition: all 0.3s ease;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    position: relative;
}

.unified-tabs .tab-link i { font-size: 15px; }
.unified-tabs .tab-link:hover {
    color: white;
    background: rgba(255, 255, 255, 0.2);
}

.unified-tabs > li.active .tab-link {
    background: #f4f6f9;
    color: #333;
    box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.1);
}

.unified-tabs > li.active .tab-link::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
}

.unified-tabs > li.active .tab-link.tab-blue { color: #3498db; }
.unified-tabs > li.active .tab-link.tab-blue::after { background: #3498db; }
.unified-tabs > li.active .tab-link.tab-purple { color: #667eea; }
.unified-tabs > li.active .tab-link.tab-purple::after { background: #667eea; }
.unified-tabs > li.active .tab-link.tab-green { color: #28a745; }
.unified-tabs > li.active .tab-link.tab-green::after { background: #28a745; }
.unified-tabs > li.active .tab-link.tab-orange { color: #e67e22; }
.unified-tabs > li.active .tab-link.tab-orange::after { background: #e67e22; }
.unified-tabs > li.active .tab-link.tab-teal { color: #17a2b8; }
.unified-tabs > li.active .tab-link.tab-teal::after { background: #17a2b8; }
.unified-tabs > li.active .tab-link.tab-pink { color: #e91e63; }
.unified-tabs > li.active .tab-link.tab-pink::after { background: #e91e63; }

/* Tab Content */
.unified-tab-content {
    background: #f4f6f9;
    min-height: 600px;
    padding-top: 55px;
}

.unified-tab-content > .tab-pane {
    padding: 18px;
}

/* Loading indicator */
.loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    color: #667eea;
}

.loading-indicator .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #e9ecef;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loading-indicator p {
    margin-top: 20px;
    font-size: 16px;
    font-weight: 500;
    color: #6c757d;
}

/* ============================================
   FORM COMPONENTS - Popup style
   ============================================ */

/* Form Sections */
.form-section {
    margin-bottom: 20px;
    background: #ffffff;
    border-radius: 12px;
    padding: 20px;
    border-left: 4px solid #667eea;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.form-section.section-info { border-left-color: #3498db; }
.form-section.section-forfait { border-left-color: #9b59b6; }
.form-section.section-products { border-left-color: #27ae60; }
.form-section.section-pdf { border-left-color: #e74c3c; }
.form-section.section-map { border-left-color: #28a745; }
.form-section.section-inventory { border-left-color: #e67e22; }

.form-section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
    font-size: 1.1em;
    font-weight: 600;
    color: #333;
}

.form-section-title i {
    font-size: 1.2em;
}

.form-section-title.title-blue i { color: #3498db; }
.form-section-title.title-purple i { color: #9b59b6; }
.form-section-title.title-green i { color: #27ae60; }
.form-section-title.title-red i { color: #e74c3c; }
.form-section-title.title-orange i { color: #e67e22; }

/* Form Groups */
.form-group {
    margin-bottom: 15px;
}

.form-group:last-child {
    margin-bottom: 0;
}

.form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;
    color: #333;
    font-size: 13px;
}

.form-group .required {
    color: #dc3545;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.3s ease;
    background: #fff;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input[readonly] {
    background: #f8f9fa;
    cursor: default;
}

/* Disable number spinners */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
input[type="number"] { -moz-appearance: textfield; }

/* Form Layouts */
.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.form-row-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
}

.form-row-4 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 20px;
}

/* ============================================
   BUTTONS
   ============================================ */

.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-primary,
.btn-purple {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.btn-success,
.btn-green {
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
}

.btn-danger,
.btn-red {
    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    color: white;
}

.btn-warning,
.btn-orange {
    background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
    color: white;
}

.btn-info,
.btn-blue {
    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    color: white;
}

.btn-default {
    background: #f8f9fa;
    color: #333;
    border: 2px solid #e0e0e0;
}

.btn-default:hover {
    background: #e9ecef;
}

.btn-sm {
    padding: 8px 16px;
    font-size: 13px;
}

.btn-lg {
    padding: 15px 35px;
    font-size: 16px;
}

/* ============================================
   CARDS
   ============================================ */

.card {
    background: #ffffff;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: all 0.3s ease;
}

.card:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.card-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 20px;
    margin: -20px -20px 20px -20px;
    border-radius: 12px 12px 0 0;
    font-weight: 600;
}

.card-header.header-green {
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
}

.card-header.header-red {
    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
}

.card-header.header-blue {
    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
}

.card-header.header-orange {
    background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
}

/* Quote Cards */
.quote-card {
    background: white;
    border-radius: 10px;
    padding: 15px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    border: 2px solid transparent;
}

.quote-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    border-color: #667eea;
}

.quote-card.selected {
    border-color: #28a745;
    background: linear-gradient(135deg, #f0fff4 0%, #e6ffed 100%);
}

.quote-card .quote-number {
    font-weight: 700;
    color: #667eea;
    font-size: 0.95em;
    margin-bottom: 5px;
}

.quote-card .quote-subject {
    font-size: 0.9em;
    color: #333;
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.quote-card .quote-total {
    font-weight: 700;
    color: #28a745;
    font-size: 1.15em;
}

.quote-card .quote-date {
    font-size: 0.8em;
    color: #888;
    margin-top: 5px;
}

/* Quotes Grid */
.quotes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 15px;
}

/* ============================================
   TABLES
   ============================================ */

.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
}

.data-table thead tr {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.data-table th {
    padding: 14px 15px;
    text-align: left;
    font-weight: 600;
}

.data-table td {
    padding: 12px 15px;
    border-bottom: 1px solid #f0f0f0;
}

.data-table tbody tr:hover {
    background: #f8f9fa;
}

/* ============================================
   PDF TEMPLATES
   ============================================ */

.pdf-templates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
}

.pdf-template-item {
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    padding: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.pdf-template-item:hover {
    border-color: #e74c3c;
    background: #fef5f5;
}

.pdf-template-item.selected {
    border-color: #e74c3c;
    background: linear-gradient(135deg, #fef5f5 0%, #fee2e2 100%);
}

.pdf-template-item label {
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.pdf-template-item input[type="checkbox"] {
    transform: scale(1.3);
    accent-color: #e74c3c;
}

/* ============================================
   ACTIONS BAR
   ============================================ */

.actions-bar {
    text-align: center;
    padding: 25px;
    background: #ffffff;
    border-radius: 12px;
    margin-top: 20px;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

/* ============================================
   VOLUME DISPLAY (Inventaire)
   ============================================ */

.volume-display {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    border-radius: 12px;
    text-align: center;
}

.volume-display .volume-value {
    font-size: 3em;
    font-weight: 700;
    margin: 15px 0;
}

.volume-display .volume-input {
    width: 120px;
    padding: 8px 12px;
    font-size: 1.1em;
    border: none;
    border-radius: 8px;
    text-align: center;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
}

/* ============================================
   ADDRESS PANELS (Map)
   ============================================ */

.address-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.address-box {
    padding: 20px;
    background: #ffffff;
    border-radius: 10px;
    border-left: 4px solid #28a745;
}

.address-box.destination {
    border-left-color: #dc3545;
}

.address-box .address-label {
    color: #888;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    font-weight: 600;
}

.address-box .address-value {
    color: #333;
    font-size: 15px;
}

/* Distance Box */
.distance-box {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 25px;
    border-radius: 12px;
    text-align: center;
}

.distance-box .distance-value {
    font-size: 2.5em;
    font-weight: 700;
}

/* ============================================
   CATEGORY SECTIONS (Inventaire)
   ============================================ */

.category-section {
    margin-bottom: 8px;
    background: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.item-row {
    display: flex;
    align-items: center;
    padding: 3px 10px;
    border-bottom: 1px solid #f5f5f5;
    transition: background 0.2s;
}

.item-row:hover {
    background: #f8f9fa;
}

.item-row:last-child {
    border-bottom: none;
}

.item-name {
    font-weight: 500;
    color: #333;
    min-width: 180px;
    font-size: 13px;
}

.item-volume {
    color: #999;
    font-size: 11px;
}

.btn-qty {
    width: 28px;
    height: 28px;
    border: none;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-size: 1.1em;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-qty:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.qty-input {
    width: 50px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    color: #667eea;
    border: 1px solid #667eea;
    border-radius: 5px;
    padding: 4px;
    background: #fff;
}

/* ============================================
   RESPONSIVE
   ============================================ */

@media (max-width: 992px) {
    .form-row,
    .address-panel {
        grid-template-columns: 1fr;
    }

    .form-row-3 {
        grid-template-columns: 1fr 1fr;
    }

    .form-row-4 {
        grid-template-columns: 1fr 1fr;
    }
}

@media (max-width: 992px) {
    .unified-tabs-header {
        flex-wrap: wrap;
        padding: 10px 15px;
        gap: 8px;
        min-height: auto;
    }

    .unified-tabs {
        position: static;
        transform: none;
        order: 2;
        justify-content: center;
        flex-wrap: nowrap;
    }

    .unified-header-left {
        order: 1;
        min-width: auto;
        flex: 1;
    }

    .unified-header-left .header-info h1 {
        font-size: 1em;
    }

    .unified-header-left .subtitle {
        font-size: 0.75em;
    }

    .unified-header-right {
        order: 3;
        min-width: auto;
    }

    .unified-header-right .back-link {
        padding: 8px 14px;
        font-size: 12px;
    }
}

@media (max-width: 768px) {
    .unified-view-wrapper {
        padding: 0;
    }

    .unified-tabs-header {
        padding: 8px 15px;
        gap: 10px;
        min-height: 50px;
    }

    /* Tout sur une seule ligne : Retour à gauche, Onglets au centre, rien à droite */
    .unified-header-left {
        display: none;
    }

    .unified-header-right {
        order: 1;
        position: absolute;
        left: 10px;
    }

    .unified-tabs {
        order: 2;
        position: static;
        transform: none;
        justify-content: center;
        gap: 5px;
        width: auto;
        margin: 0 auto;
    }

    .unified-tabs .tab-link {
        padding: 10px 16px;
        font-size: 12px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.15);
    }

    .unified-tabs .tab-link span {
        display: none;
    }

    .unified-tabs .tab-link i {
        font-size: 18px;
    }

    .unified-tabs > li.active .tab-link {
        background: #fff;
        box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    }

    .unified-header-right .back-link {
        padding: 8px 12px;
        font-size: 12px;
        border-radius: 20px;
        background: rgba(255,255,255,0.2);
    }

    .unified-header-right .back-link span {
        display: none;
    }

    .unified-header-right .back-link i {
        margin: 0;
        font-size: 14px;
    }

    .unified-tab-content > .tab-pane {
        padding: 10px;
    }

    .form-row-3,
    .form-row-4 {
        grid-template-columns: 1fr;
    }

    .quotes-grid {
        grid-template-columns: 1fr 1fr;
    }

    .pdf-templates-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 480px) {
    .quotes-grid {
        grid-template-columns: 1fr;
    }

    .unified-tabs .tab-link {
        padding: 8px 12px;
    }

    .unified-tabs .tab-link i {
        font-size: 16px;
    }
}
</style>

<script type="text/javascript" src="layouts/v7/modules/Potentials/resources/UnifiedView.js?v={$smarty.now}"></script>
<script type="text/javascript">
(function() {
    console.log('[UnifiedTabbedView] Initializing with Record ID:', {$RECORD_ID});
    jQuery(document).ready(function() {
        if (typeof UnifiedTabbedView === 'undefined') {
            console.error('[UnifiedTabbedView] UnifiedTabbedView is not defined!');
            return;
        }
        UnifiedTabbedView.init({$RECORD_ID});

        // Gestion du bouton Envoyer Email
        jQuery('#sendEmailBtn').on('click', function() {
            var recordId = {$RECORD_ID};

            // Ouvrir la modale
            jQuery('#sendEmailModal').modal('show');

            // Charger toutes les données en un seul appel
            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                dataType: 'json',
                data: {
                    module: 'Potentials',
                    action: 'GetEmailData',
                    record: recordId
                },
                success: function(response) {
                    var data = response.result || response;

                    // Email du contact
                    if (data.contact_email) {
                        jQuery('#recipientEmail').val(data.contact_email);
                    }

                    // Templates EMAILMaker
                    var select = jQuery('#emailTemplate');
                    select.empty().append('<option value="">-- Sélectionner un template --</option>');
                    if (data.email_templates && data.email_templates.length > 0) {
                        for (var i = 0; i < data.email_templates.length; i++) {
                            var tpl = data.email_templates[i];
                            select.append('<option value="' + tpl.id + '">' + tpl.name + '</option>');
                        }
                    }

                    // Templates PDFMaker
                    var container = jQuery('#pdfTemplatesList');
                    if (data.pdf_templates && data.pdf_templates.length > 0) {
                        var html = '<div class="pdf-templates-grid">';
                        for (var j = 0; j < data.pdf_templates.length; j++) {
                            var pdf = data.pdf_templates[j];
                            html += '<div class="pdf-template-item">';
                            html += '<label style="cursor: pointer;">';
                            html += '<input type="checkbox" name="pdf_templates[]" value="' + pdf.id + '"> ';
                            html += pdf.name;
                            html += '</label>';
                            html += '</div>';
                        }
                        html += '</div>';
                        container.html(html);
                    } else {
                        container.html('<p class="text-muted">Aucun template PDF disponible</p>');
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Erreur chargement données email:', error);
                    alert('Erreur lors du chargement des données. Veuillez réessayer.');
                }
            });
        });

        // Envoyer l'email
        jQuery('#confirmSendEmail').on('click', function() {
            var email = jQuery('#recipientEmail').val();
            var emailTemplateId = jQuery('#emailTemplate').val();
            var pdfTemplates = [];

            jQuery('input[name="pdf_templates[]"]:checked').each(function() {
                pdfTemplates.push(jQuery(this).val());
            });

            if (!email) {
                alert('Veuillez saisir une adresse email');
                return;
            }

            if (!emailTemplateId) {
                alert('Veuillez sélectionner un template email');
                return;
            }

            // Afficher un loader
            jQuery('#confirmSendEmail').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Envoi en cours...');

            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                dataType: 'json',
                data: {
                    module: 'Potentials',
                    action: 'SendEmail',
                    record: {$RECORD_ID},
                    email: email,
                    email_template: emailTemplateId,
                    pdf_templates: pdfTemplates
                },
                success: function(response) {
                    var data = response.result || response;
                    if (data.success) {
                        jQuery('#sendEmailModal').modal('hide');
                        alert('Email envoyé avec succès !');
                    } else {
                        alert('Erreur: ' + (data.error || 'Impossible d\'envoyer l\'email'));
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Erreur envoi email:', error, xhr.responseText);
                    alert('Erreur lors de l\'envoi de l\'email');
                },
                complete: function() {
                    jQuery('#confirmSendEmail').prop('disabled', false).html('<i class="fa fa-send"></i> Envoyer');
                }
            });
        });
    });
})();
</script>
