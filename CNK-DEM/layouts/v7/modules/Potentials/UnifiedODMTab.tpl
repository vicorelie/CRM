{*+**********************************************************************************
* Unified ODM Tab - Bon de Commande / Ordre de Mission management
* Same design as UnifiedDevisTab.tpl
************************************************************************************}
{strip}
<div class="odm-tab-container" id="odmTabContainer"
     data-potential-id="{$POTENTIAL_ID}"
     data-contact-id="{$CONTACT_ID}"
     data-csrf-token="{$CSRF_TOKEN}"
     data-current-user-id="{$CURRENT_USER_ID}">

    {* Devis validés et BDC sur 2 colonnes *}
    <div class="quotes-bdc-row">
        {* Colonne Devis validés *}
        <div class="quotes-column">
            {if $VALIDATED_QUOTES|@count > 0}
            <div class="quotes-bar">
                <span class="quotes-label"><i class="fa fa-check-circle" style="color: #27ae60;"></i> Devis validés ({$VALIDATED_QUOTES|@count}):</span>
                <div class="quotes-chips">
                    {foreach from=$VALIDATED_QUOTES item=QUOTE}
                    <div class="quote-chip validated" data-quoteid="{$QUOTE.quoteid}" onclick="UnifiedODM.createFromQuote({$QUOTE.quoteid})" title="Créer BDC depuis {$QUOTE.quote_no|escape}">
                        <div class="chip-line1">
                            <span class="chip-no">{$QUOTE.quote_no|escape}</span>
                            <span class="chip-sep">/</span>
                            <span class="chip-date">{$QUOTE.created_date}</span>
                        </div>
                        <div class="chip-line2">
                            <span class="chip-formule">{$QUOTE.cf_1125|default:'-'|escape}</span>
                            <span class="chip-sep">/</span>
                            <span class="chip-total">{$QUOTE.total|number_format:0:',':' '}€</span>
                        </div>
                    </div>
                    {/foreach}
                </div>
            </div>
            {else}
            <div class="no-quotes-bar">
                <i class="fa fa-info-circle"></i>
                <span>Aucun devis validé</span>
            </div>
            {/if}
        </div>

        {* Colonne BDC *}
        <div class="bdc-column">
            {if $SALESORDERS|@count > 0}
            <div class="odm-bar">
                <span class="odm-label"><i class="fa fa-clipboard"></i> BDC ({$SALESORDERS|@count}):</span>
                <div class="odm-chips">
                    {foreach from=$SALESORDERS item=SO}
                    <div class="odm-chip{if $SO.sostatus eq 'Approved'} approved{/if}" data-salesorderid="{$SO.salesorderid}" onclick="UnifiedODM.loadSalesOrder({$SO.salesorderid})" title="{$SO.subject|escape}">
                        <div class="chip-line1">
                            <span class="chip-no">{$SO.salesorder_no|escape}</span>
                            <span class="chip-sep">/</span>
                            <span class="chip-date">{$SO.created_date}</span>
                        </div>
                        <div class="chip-line2">
                            <span class="chip-formule">{$SO.cf_1186|default:'-'|escape}</span>
                            <span class="chip-sep">/</span>
                            <span class="chip-total">{$SO.total|number_format:0:',':' '}€</span>
                        </div>
                    </div>
                    {/foreach}
                </div>
                <button type="button" class="btn btn-sm" id="odm_btnViewPdf" style="display:none; background: linear-gradient(135deg, #17a2b8 0%, #3498db 100%); color: white; border: none;" onclick="UnifiedODM.viewPDF()">
                    <i class="fa fa-file-pdf-o"></i> PDF
                </button>
            </div>
            {else}
            <div class="no-bdc-bar">
                <i class="fa fa-info-circle"></i>
                <span>Aucun BDC</span>
            </div>
            {/if}
        </div>
    </div>

    {* Hidden form for VTiger submission *}
    <form id="unifiedODMForm" method="POST" action="index.php" style="display:none;">
        <input type="hidden" name="__vtrftk" value="{$CSRF_TOKEN}">
        <input type="hidden" name="module" value="SalesOrder">
        <input type="hidden" name="action" value="Save">
        <input type="hidden" name="record" id="odm_recordId" value="">
        <input type="hidden" name="potential_id" value="{$POTENTIAL_ID}">
        <input type="hidden" name="contact_id" value="{$CONTACT_ID}">
        <input type="hidden" name="sourceRecord" value="{$POTENTIAL_ID}">
        <input type="hidden" name="sourceModule" value="Potentials">
        <input type="hidden" name="relationOperation" value="true">
        <input type="hidden" name="currency_id" value="1">
        <input type="hidden" name="assigned_user_id" value="{$CURRENT_USER_ID}">
        <input type="hidden" name="quote_id" id="odm_hidden_quote_id" value="">
        <input type="hidden" name="subject" id="odm_hidden_subject" value="">
        <input type="hidden" name="duedate" id="odm_hidden_duedate" value="">
        <input type="hidden" name="sostatus" id="odm_hidden_sostatus" value="Created">
        <input type="hidden" name="prestataire" id="odm_hidden_prestataire" value="">
        <input type="hidden" name="cf_1186" id="odm_hidden_cf_1186" value="">
        <input type="hidden" name="cf_1180" id="odm_hidden_cf_1180" value="0">
        <input type="hidden" name="cf_1182" id="odm_hidden_cf_1182" value="0">
        <input type="hidden" name="cf_1184" id="odm_hidden_cf_1184" value="0">
        <input type="hidden" name="cf_1170" id="odm_hidden_cf_1170" value="">
        <input type="hidden" name="cf_1166" id="odm_hidden_cf_1166" value="0">
        <input type="hidden" name="cf_1168" id="odm_hidden_cf_1168" value="0">
        {* Champs supplémentaires copiés du devis *}
        <input type="hidden" name="cf_1172" id="odm_hidden_cf_1172" value="">
        <input type="hidden" name="cf_1174" id="odm_hidden_cf_1174" value="">
        <input type="hidden" name="cf_1176" id="odm_hidden_cf_1176" value="43">
        <input type="hidden" name="cf_1178" id="odm_hidden_cf_1178" value="57">
        <input type="hidden" name="cf_1188" id="odm_hidden_cf_1188" value="">
        <input type="hidden" name="cf_1190" id="odm_hidden_cf_1190" value="">
        <input type="hidden" name="totalProductCount" id="odm_hidden_totalProductCount" value="0">

        {* VTiger Inventory calculation fields *}
        <input type="hidden" name="taxtype" value="individual">
        <input type="hidden" name="hdnSubTotal" id="odm_hdnSubTotal" value="0">
        <input type="hidden" name="hdnGrandTotal" id="odm_hdnGrandTotal" value="0">
        <input type="hidden" name="hdnDiscountPercent" value="0">
        <input type="hidden" name="hdnDiscountAmount" value="0">
        <input type="hidden" name="hdnS_H_Percent" value="0">
        <input type="hidden" name="hdnS_H_Amount" value="0">
        <input type="hidden" name="hdnAdjustment" value="0">
        <input type="hidden" name="pre_tax_total" id="odm_pre_tax_total" value="0">

        {* Champs CHARGEMENT *}
        <input type="hidden" name="cf_1309" id="odm_hidden_cf_1309" value="">
        <input type="hidden" name="cf_1310" id="odm_hidden_cf_1310" value="">
        <input type="hidden" name="cf_1311" id="odm_hidden_cf_1311" value="">
        <input type="hidden" name="cf_1312" id="odm_hidden_cf_1312" value="">
        <input type="hidden" name="cf_1313" id="odm_hidden_cf_1313" value="">
        <input type="hidden" name="cf_1314" id="odm_hidden_cf_1314" value="">
        <input type="hidden" name="cf_1315" id="odm_hidden_cf_1315" value="">
        <input type="hidden" name="cf_1316" id="odm_hidden_cf_1316" value="">
        <input type="hidden" name="cf_1317" id="odm_hidden_cf_1317" value="">
        <input type="hidden" name="cf_1318" id="odm_hidden_cf_1318" value="0">
        <input type="hidden" name="cf_1319" id="odm_hidden_cf_1319" value="0">
        <input type="hidden" name="cf_1320" id="odm_hidden_cf_1320" value="">
        <input type="hidden" name="cf_1321" id="odm_hidden_cf_1321" value="0">
        <input type="hidden" name="cf_1322" id="odm_hidden_cf_1322" value="0">
        <input type="hidden" name="cf_1323" id="odm_hidden_cf_1323" value="">

        {* Champs DESTINATION *}
        <input type="hidden" name="cf_1324" id="odm_hidden_cf_1324" value="">
        <input type="hidden" name="cf_1325" id="odm_hidden_cf_1325" value="">
        <input type="hidden" name="cf_1326" id="odm_hidden_cf_1326" value="">
        <input type="hidden" name="cf_1327" id="odm_hidden_cf_1327" value="">
        <input type="hidden" name="cf_1328" id="odm_hidden_cf_1328" value="">
        <input type="hidden" name="cf_1329" id="odm_hidden_cf_1329" value="">
        <input type="hidden" name="cf_1330" id="odm_hidden_cf_1330" value="">
        <input type="hidden" name="cf_1331" id="odm_hidden_cf_1331" value="0">
        <input type="hidden" name="cf_1332" id="odm_hidden_cf_1332" value="0">
        <input type="hidden" name="cf_1333" id="odm_hidden_cf_1333" value="">
        <input type="hidden" name="cf_1334" id="odm_hidden_cf_1334" value="0">
        <input type="hidden" name="cf_1335" id="odm_hidden_cf_1335" value="0">
        <input type="hidden" name="cf_1336" id="odm_hidden_cf_1336" value="">

        {* Volume et Distance *}
        <input type="hidden" name="cf_1349" id="odm_hidden_cf_1349" value="">
        <input type="hidden" name="cf_1350" id="odm_hidden_cf_1350" value="">
        <input type="hidden" name="cf_1351" id="odm_hidden_cf_1351" value="">

        {* Billing Address (from Prestataire/Vendor) *}
        <input type="hidden" name="bill_street" id="odm_hidden_bill_street" value="">
        <input type="hidden" name="bill_city" id="odm_hidden_bill_city" value="">
        <input type="hidden" name="bill_state" id="odm_hidden_bill_state" value="">
        <input type="hidden" name="bill_code" id="odm_hidden_bill_code" value="">
        <input type="hidden" name="bill_country" id="odm_hidden_bill_country" value="">

        {* Type de déménagement *}
        <input type="hidden" name="cf_1352" id="odm_hidden_cf_1352" value="">

        <div id="odmHiddenProductsContainer"></div>
    </form>

    {* ODM Form *}
    <div class="odm-form-container" id="odmFormContainer" style="display:none;">
        <input type="hidden" id="odm_selectedSOId" value="">
        <input type="hidden" id="odm_sourceQuoteId" value="">

        {* Section Info + Dates + Volumes - Tout sur une ligne *}
        <div class="form-section section-info-dates-volumes">
            <div class="info-dates-volumes-bar">
                {* Sujet *}
                <div class="inline-field">
                    <label><span class="required">*</span> Sujet</label>
                    <input type="text" id="odm_subject" value="" required style="width: 150px;">
                </div>
                {* Prestataire (admin only) *}
                {if $IS_ADMIN}
                <div class="inline-field">
                    <label>Prestataire</label>
                    <select id="odm_prestataire" style="width: 120px;">
                        <option value="">--</option>
                        {foreach from=$VENDORS item=VENDOR}
                        <option value="{$VENDOR.id}">{$VENDOR.name|escape}</option>
                        {/foreach}
                    </select>
                </div>
                {/if}
                {* Statut *}
                <div class="inline-field">
                    <label>Statut</label>
                    <select id="odm_sostatus" style="width: 100px;">
                        <option value="Created">Créé</option>
                        <option value="Approved">Approuvé</option>
                        <option value="Delivered">Livré</option>
                        <option value="Cancelled">Annulé</option>
                    </select>
                </div>
                {* Type de déménagement *}
                <div class="inline-field">
                    <label>Type dém.</label>
                    <select id="odm_cf_1352" style="width: 100px;">
                        <option value="">--</option>
                        <option value="Groupage">Groupage</option>
                        <option value="Spécial">Spécial</option>
                    </select>
                </div>
                {* Séparateur *}
                <div class="inline-separator"></div>
                {* Dates *}
                <div class="inline-field">
                    <label><i class="fa fa-truck"></i> Charg.</label>
                    <input type="date" id="odm_cf_1309" class="date-input editable-field" data-hidden="odm_hidden_cf_1309" style="width: 130px;">
                </div>
                <div class="inline-field">
                    <label><i class="fa fa-home"></i> Livr.</label>
                    <input type="date" id="odm_cf_1324" class="date-input editable-field" data-hidden="odm_hidden_cf_1324" style="width: 130px;">
                </div>
                {* Séparateur *}
                <div class="inline-separator"></div>
                {* Métriques *}
                <div class="inline-metric">
                    <i class="fa fa-road"></i>
                    <input type="text" id="odm_cf_1350_input" class="metric-input editable-field" data-hidden="odm_hidden_cf_1350" placeholder="-" title="Distance">
                    <span class="metric-unit">km</span>
                </div>
                <div class="inline-metric">
                    <i class="fa fa-archive"></i>
                    <input type="text" id="odm_cf_1351_input" class="metric-input editable-field" data-hidden="odm_hidden_cf_1351" placeholder="-" title="Vol. inventaire">
                    <span class="metric-unit">m³</span>
                </div>
                <div class="inline-metric">
                    <i class="fa fa-cubes"></i>
                    <input type="text" id="odm_cf_1349_input" class="metric-input editable-field" data-hidden="odm_hidden_cf_1349" placeholder="-" title="Vol. final">
                    <span class="metric-unit">m³</span>
                </div>
            </div>
        </div>

        {* Section CHARGEMENT et LIVRAISON côte à côte *}
        <div class="chargement-livraison-row">
            {* Bloc CHARGEMENT *}
            <div class="form-section section-chargement">
                <div class="block-header header-chargement">
                    <i class="fa fa-truck"></i> CHARGEMENT
                </div>
                <div class="block-content">
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>Adresse chargement</label>
                            <input type="text" id="odm_cf_1312" class="editable-field" data-hidden="odm_hidden_cf_1312">
                        </div>
                        <div class="form-group">
                            <label>Ville chargement</label>
                            <input type="text" id="odm_cf_1313" class="editable-field" data-hidden="odm_hidden_cf_1313">
                        </div>
                        <div class="form-group">
                            <label>Code postal</label>
                            <input type="text" id="odm_cf_1314" class="editable-field" data-hidden="odm_hidden_cf_1314">
                        </div>
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>Type de logement</label>
                            <select id="odm_cf_1315" class="editable-field" data-hidden="odm_hidden_cf_1315">
                                <option value="">--</option>
                                <option value="Maison">Maison</option>
                                <option value="Appartement">Appartement</option>
                                <option value="Box">Box</option>
                                <option value="Bureau">Bureau</option>
                                <option value="Entrepot">Entrepot</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Etage</label>
                            <input type="text" id="odm_cf_1316" class="editable-field" data-hidden="odm_hidden_cf_1316">
                        </div>
                        <div class="form-group">
                            <label>Ascenseur</label>
                            <select id="odm_cf_1317" class="editable-field" data-hidden="odm_hidden_cf_1317">
                                <option value="">--</option>
                                <option value="OUI">OUI</option>
                                <option value="NON">NON</option>
                                <option value="PETIT">PETIT</option>
                                <option value="GRAND">GRAND</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>Escaliers</label>
                            <select id="odm_cf_1318" class="editable-field" data-hidden="odm_hidden_cf_1318">
                                <option value="0">Non</option>
                                <option value="1">Oui</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Transbordement</label>
                            <select id="odm_cf_1319" class="editable-field" data-hidden="odm_hidden_cf_1319">
                                <option value="0">Non</option>
                                <option value="1">Oui</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Distance portage</label>
                            <input type="text" id="odm_cf_1320" class="editable-field" data-hidden="odm_hidden_cf_1320">
                        </div>
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>Demande stationnement</label>
                            <select id="odm_cf_1321" class="editable-field" data-hidden="odm_hidden_cf_1321">
                                <option value="0">Non</option>
                                <option value="1">Oui</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Passage fenêtre</label>
                            <select id="odm_cf_1322" class="editable-field" data-hidden="odm_hidden_cf_1322">
                                <option value="0">Non</option>
                                <option value="1">Oui</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Monte meuble</label>
                            <select id="odm_cf_1323" class="editable-field" data-hidden="odm_hidden_cf_1323">
                                <option value="">--</option>
                                <option value="Oui">Oui</option>
                                <option value="Non">Non</option>
                                <option value="À confirmer">À confirmer</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {* Bloc LIVRAISON *}
            <div class="form-section section-livraison">
                <div class="block-header header-livraison">
                    <i class="fa fa-home"></i> LIVRAISON
                </div>
                <div class="block-content">
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>Adresse livraison</label>
                            <input type="text" id="odm_cf_1325" class="editable-field" data-hidden="odm_hidden_cf_1325">
                        </div>
                        <div class="form-group">
                            <label>Ville livraison</label>
                            <input type="text" id="odm_cf_1326" class="editable-field" data-hidden="odm_hidden_cf_1326">
                        </div>
                        <div class="form-group">
                            <label>Code postal</label>
                            <input type="text" id="odm_cf_1327" class="editable-field" data-hidden="odm_hidden_cf_1327">
                        </div>
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>Type de logement</label>
                            <select id="odm_cf_1328" class="editable-field" data-hidden="odm_hidden_cf_1328">
                                <option value="">--</option>
                                <option value="Maison">Maison</option>
                                <option value="Appartement">Appartement</option>
                                <option value="Box">Box</option>
                                <option value="Bureau">Bureau</option>
                                <option value="Entrepot">Entrepot</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Etage</label>
                            <input type="text" id="odm_cf_1329" class="editable-field" data-hidden="odm_hidden_cf_1329">
                        </div>
                        <div class="form-group">
                            <label>Ascenseur</label>
                            <select id="odm_cf_1330" class="editable-field" data-hidden="odm_hidden_cf_1330">
                                <option value="">--</option>
                                <option value="OUI">OUI</option>
                                <option value="NON">NON</option>
                                <option value="PETIT">PETIT</option>
                                <option value="GRAND">GRAND</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>Escaliers</label>
                            <select id="odm_cf_1331" class="editable-field" data-hidden="odm_hidden_cf_1331">
                                <option value="0">Non</option>
                                <option value="1">Oui</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Transbordement</label>
                            <select id="odm_cf_1332" class="editable-field" data-hidden="odm_hidden_cf_1332">
                                <option value="0">Non</option>
                                <option value="1">Oui</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Distance portage</label>
                            <input type="text" id="odm_cf_1333" class="editable-field" data-hidden="odm_hidden_cf_1333">
                        </div>
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>Demande stationnement</label>
                            <select id="odm_cf_1334" class="editable-field" data-hidden="odm_hidden_cf_1334">
                                <option value="0">Non</option>
                                <option value="1">Oui</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Passage fenêtre</label>
                            <select id="odm_cf_1335" class="editable-field" data-hidden="odm_hidden_cf_1335">
                                <option value="0">Non</option>
                                <option value="1">Oui</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Monte meuble</label>
                            <select id="odm_cf_1336" class="editable-field" data-hidden="odm_hidden_cf_1336">
                                <option value="">--</option>
                                <option value="Oui">Oui</option>
                                <option value="Non">Non</option>
                                <option value="À confirmer">À confirmer</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {* Section Tarification - Totaux après CHARGEMENT/LIVRAISON *}
        <div class="form-section section-tarification">
            <div class="totals-row">
                <div class="total-box total-ht">
                    <div class="total-label">Total HT</div>
                    <div class="total-value" id="odm_montant_total_ht">0.00 €</div>
                </div>
                <div class="total-box total-ttc">
                    <div class="total-label">Total TTC</div>
                    <div class="total-value" id="odm_montant_total_ttc">0.00 €</div>
                </div>
                <div class="total-box total-acompte">
                    <div class="total-label">Acompte</div>
                    <div class="total-value" id="odm_acompte_ttc">0.00 €</div>
                </div>
                <div class="total-box total-solde">
                    <div class="total-label">Solde</div>
                    <div class="total-value" id="odm_solde_ttc">0.00 €</div>
                </div>
            </div>
        </div>

        {* Section Forfait + Produits - En bas *}
        <div class="forfait-products-row">
            {* Left: Forfait *}
            <div class="form-section section-forfait">
                <div class="form-section-title title-purple">
                    <i class="fa fa-truck"></i>
                    Forfait
                </div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label>Type formule</label>
                        <select id="odm_cf_1186">
                            <option value="">-- Select --</option>
                            <option value="ECO">ECO</option>
                            <option value="ECO PLUS">ECO PLUS</option>
                            <option value="CONFORT">CONFORT</option>
                            <option value="LUXE">LUXE</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Forfait HT</label>
                        <input type="number" id="odm_cf_1180" value="" placeholder="0.00" step="0.01" min="0">
                    </div>
                </div>
                <div class="form-row-2" style="margin-top: 10px;">
                    <div class="form-group">
                        <label>Supplement</label>
                        <input type="number" id="odm_cf_1182" value="" placeholder="0.00" step="0.01" min="0">
                    </div>
                    <div class="form-group">
                        <label>Total Forfait TTC</label>
                        <input type="number" id="odm_cf_1184" value="0" step="0.01" readonly style="background: #f0f0f0;">
                    </div>
                </div>
            </div>

            {* Right: Products *}
            <div class="form-section section-products">
                <div class="form-section-title title-green">
                    <i class="fa fa-cubes"></i>
                    Produits et services
                </div>
                <div class="form-row-2">
                    <div class="form-group" style="position: relative;">
                        <label>Rechercher</label>
                        <input type="text" id="odm_productSearch" placeholder="Ajouter un produit...">
                        <div id="odm_productResults" style="position:absolute;background:white;border:2px solid #e0e0e0;border-radius:8px;margin-top:5px;max-height:250px;overflow-y:auto;display:none;z-index:100;box-shadow:0 4px 15px rgba(0,0,0,0.1);left:0;right:0;"></div>
                    </div>
                    <div class="form-group">
                        <label>Assurance</label>
                        <select id="odm_cf_1170">
                            <option value="">-- Select --</option>
                            {for $i=4000 to 26000 step 2000}
                            <option value="{$i}" {if $i == 4000}selected{/if}>{$i|number_format:0:',':' '} €</option>
                            {/for}
                        </select>
                    </div>
                </div>
                <table id="odm_productsTable" class="data-table" style="display:none">
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th style="width:80px">Qte</th>
                            <th style="width:100px">PU</th>
                            <th style="width:90px">Total</th>
                            <th style="width:50px"></th>
                        </tr>
                    </thead>
                    <tbody id="odm_productsList"></tbody>
                </table>
            </div>
        </div>
    </div>

    {* Actions *}
    <div class="actions-bar" id="odmActionsBar" style="display: none; gap: 10px; justify-content: center;">
        <button type="button" class="btn btn-default" onclick="UnifiedODM.cancelEdit()">
            <i class="fa fa-times"></i> Annuler
        </button>
        <button type="button" id="odm_btnSave" class="btn btn-success" onclick="UnifiedODM.saveBDC()">
            <i class="fa fa-save"></i> <span id="odm_btnSaveText">Enregistrer ODM</span>
        </button>
    </div>
</div>
{/strip}

<style>
/* ODM Tab - Same styles as Devis Tab */
.odm-tab-container {
    padding: 0;
}

.odm-tab-container .form-section {
    padding: 12px;
    margin-bottom: 10px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
}

.odm-tab-container .form-section-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.odm-tab-container .form-section-title.title-purple { color: #667eea; }
.odm-tab-container .form-section-title.title-purple i { color: #667eea; }
.odm-tab-container .form-section-title.title-green { color: #28a745; }
.odm-tab-container .form-section-title.title-green i { color: #28a745; }

.odm-tab-container .form-group {
    margin-bottom: 8px;
}

.odm-tab-container .form-group label {
    display: block;
    font-size: 11px;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #666;
    font-weight: 600;
}

.odm-tab-container .form-group label .required {
    color: #e74c3c;
}

.odm-tab-container .form-group input,
.odm-tab-container .form-group select {
    width: 100%;
    padding: 8px 10px;
    font-size: 13px;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    transition: border-color 0.3s, box-shadow 0.3s;
}

.odm-tab-container .form-group input:focus,
.odm-tab-container .form-group select:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    outline: none;
}

/* Grid layouts */
.odm-tab-container .form-row-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

.odm-tab-container .form-row-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}

.odm-tab-container .form-row-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}

/* Forfait + Products side by side */
.odm-tab-container .forfait-products-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 15px;
}

.odm-tab-container .forfait-products-row .form-section {
    margin-bottom: 0;
}

.odm-tab-container .section-forfait {
    border-left: 3px solid #667eea;
}

.odm-tab-container .section-products {
    border-left: 3px solid #28a745;
}

.odm-tab-container .section-tarification {
    border-top: 3px solid #e67e22;
}

/* Totals row */
.odm-tab-container .totals-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 8px;
    margin-top: 8px;
}

.odm-tab-container .total-box {
    flex: 1;
    min-width: 100px;
    padding: 8px 10px;
    border-radius: 6px;
    text-align: center;
}

.odm-tab-container .total-box .total-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
    opacity: 0.9;
}

.odm-tab-container .total-box .total-value {
    font-size: 1.2em;
    font-weight: 700;
}

.odm-tab-container .total-box.total-ht {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.odm-tab-container .total-box.total-ttc {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    color: white;
}

.odm-tab-container .total-box.total-acompte {
    background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    color: white;
}

.odm-tab-container .total-box.total-solde {
    background: linear-gradient(135deg, #e67e22 0%, #f39c12 100%);
    color: white;
}

/* Devis et BDC sur 2 colonnes */
.odm-tab-container .quotes-bdc-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
}

.odm-tab-container .quotes-column,
.odm-tab-container .bdc-column {
    min-width: 0;
}

.odm-tab-container .quotes-column .quotes-bar,
.odm-tab-container .bdc-column .odm-bar {
    margin-bottom: 0;
    height: 100%;
}

.odm-tab-container .no-bdc-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #e3f2fd;
    padding: 15px;
    border-radius: 8px;
    color: #1976d2;
    border: 1px solid #90caf9;
    height: 100%;
}

.odm-tab-container .no-bdc-bar i {
    font-size: 1.2em;
}

/* Section Info + Dates + Volumes sur une ligne */
.odm-tab-container .section-info-dates-volumes {
    border-top: 3px solid #17a2b8;
    padding: 10px 12px;
}

.odm-tab-container .info-dates-volumes-bar {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    flex-wrap: wrap;
}

.odm-tab-container .inline-field {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.odm-tab-container .inline-field label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #666;
    font-weight: 600;
    white-space: nowrap;
}

.odm-tab-container .inline-field label i {
    color: #17a2b8;
    margin-right: 2px;
}

.odm-tab-container .inline-field input,
.odm-tab-container .inline-field select {
    padding: 6px 8px;
    font-size: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
}

.odm-tab-container .inline-field input:focus,
.odm-tab-container .inline-field select:focus {
    border-color: #17a2b8;
    outline: none;
}

.odm-tab-container .inline-separator {
    width: 1px;
    height: 35px;
    background: #e0e0e0;
    margin: 0 5px;
}

.odm-tab-container .inline-metric {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #f8f9fa;
    padding: 6px 10px;
    border-radius: 15px;
    border: 1px solid #e0e0e0;
}

.odm-tab-container .inline-metric i {
    color: #17a2b8;
    font-size: 12px;
}

.odm-tab-container .inline-metric .metric-input {
    width: 45px;
    padding: 3px 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    background: white;
}

.odm-tab-container .inline-metric .metric-unit {
    font-size: 10px;
    color: #999;
}

/* ODM chips bar */
.odm-tab-container .odm-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fff;
    padding: 10px 15px;
    border-radius: 8px;
    margin-bottom: 12px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    border: 1px solid #e0e0e0;
    border-left: 4px solid #17a2b8;
    flex-wrap: wrap;
}

.odm-tab-container .odm-label {
    font-size: 12px;
    font-weight: 600;
    color: #17a2b8;
    white-space: nowrap;
}

.odm-tab-container .odm-chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    flex: 1;
}

.odm-tab-container .odm-chip {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 5px 7px;
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    border: 2px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 12px;
    text-align: center;
}

.odm-tab-container .odm-chip:hover {
    background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
    color: white;
}

.odm-tab-container .odm-chip.selected {
    background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
    color: white;
    border-color: #0d6b7a;
}

.odm-tab-container .odm-chip.approved {
    border: 3px solid #28a745;
    box-shadow: 0 0 8px rgba(40, 167, 69, 0.4);
}

/* Quotes chips for creating BDC */
.odm-tab-container .quotes-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fff;
    padding: 10px 15px;
    border-radius: 8px;
    margin-bottom: 12px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    border: 1px solid #e0e0e0;
    border-left: 4px solid #27ae60;
    flex-wrap: wrap;
}

.odm-tab-container .quotes-label {
    font-size: 12px;
    font-weight: 600;
    color: #27ae60;
    white-space: nowrap;
}

.odm-tab-container .quotes-chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    flex: 1;
}

.odm-tab-container .quote-chip {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 5px 7px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border: 2px solid #27ae60;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 12px;
    text-align: center;
}

.odm-tab-container .quote-chip:hover {
    background: linear-gradient(135deg, #27ae60 0%, #20c997 100%);
    color: white;
}

.odm-tab-container .quote-chip.validated {
    border: 3px solid #28a745;
    box-shadow: 0 0 8px rgba(40, 167, 69, 0.4);
}

.odm-tab-container .quote-chip .chip-line1,
.odm-tab-container .quote-chip .chip-line2,
.odm-tab-container .odm-chip .chip-line1,
.odm-tab-container .odm-chip .chip-line2 {
    display: flex;
    align-items: center;
    gap: 4px;
    justify-content: center;
}

.odm-tab-container .quote-chip .chip-line1,
.odm-tab-container .odm-chip .chip-line1 {
    font-weight: 600;
}

.odm-tab-container .quote-chip .chip-line2,
.odm-tab-container .odm-chip .chip-line2 {
    font-size: 11px;
    opacity: 0.9;
}

.odm-tab-container .chip-sep {
    opacity: 0.5;
}

.odm-tab-container .chip-formule {
    font-weight: 500;
}

.odm-tab-container .chip-total {
    font-weight: 600;
}

/* No quotes bar */
.odm-tab-container .no-quotes-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fff3cd;
    padding: 15px;
    border-radius: 8px;
    color: #856404;
    border: 1px solid #ffc107;
    height: 100%;
}

.odm-tab-container .no-quotes-bar i {
    font-size: 1.2em;
}

/* Actions bar */
.odm-tab-container .actions-bar {
    display: flex;
    padding: 15px;
    margin-top: 15px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
}

.odm-tab-container .actions-bar .btn {
    padding: 10px 20px;
    font-weight: 600;
    border-radius: 6px;
}

/* Products table */
.odm-tab-container .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
}

.odm-tab-container .data-table th,
.odm-tab-container .data-table td {
    padding: 8px 10px;
    font-size: 13px;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
}

.odm-tab-container .data-table th {
    background: #f8f9fa;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    font-size: 11px;
}

.odm-tab-container .data-table td input {
    width: 100%;
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.odm-tab-container .data-table .btn-remove {
    background: #e74c3c;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
}

.odm-tab-container .data-table .btn-remove:hover {
    background: #c0392b;
}

/* Section Dates et Volumes */
.odm-tab-container .section-dates-volumes {
    border-top: 3px solid #17a2b8;
    padding: 8px 12px;
}

.odm-tab-container .dates-volumes-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 15px;
}

.odm-tab-container .date-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.odm-tab-container .date-group i {
    color: #17a2b8;
}

.odm-tab-container .date-label {
    font-size: 12px;
    font-weight: 600;
    color: #666;
}

.odm-tab-container .date-type-badge {
    background: #17a2b8;
    color: white;
    padding: 4px 10px;
    border-radius: 15px;
    font-size: 11px;
    font-weight: 600;
}

.odm-tab-container .date-input {
    padding: 5px 8px;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 12px;
    background: #f8f9fa;
    width: 130px;
}

.odm-tab-container .metrics-group {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
}

.odm-tab-container .metric-item {
    display: flex;
    align-items: center;
    gap: 5px;
    background: #f8f9fa;
    padding: 6px 12px;
    border-radius: 20px;
    border: 1px solid #e0e0e0;
}

.odm-tab-container .metric-item i {
    color: #17a2b8;
}

.odm-tab-container .metric-label {
    font-size: 11px;
    color: #666;
}

.odm-tab-container .metric-value {
    font-size: 13px;
    font-weight: 700;
    color: #333;
}

.odm-tab-container .metric-unit {
    font-size: 11px;
    color: #999;
}

.odm-tab-container .metric-input {
    width: 50px;
    padding: 2px 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    background: white;
}

.odm-tab-container .metric-input:focus {
    border-color: #17a2b8;
    outline: none;
}

.odm-tab-container .editable-metric {
    background: white;
}

/* Chargement et Livraison côte à côte */
.odm-tab-container .chargement-livraison-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 15px;
}

.odm-tab-container .section-chargement,
.odm-tab-container .section-livraison {
    padding: 0;
    overflow: hidden;
}

.odm-tab-container .block-header {
    padding: 10px 15px;
    font-weight: 700;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: white;
}

.odm-tab-container .header-chargement {
    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
}

.odm-tab-container .header-livraison {
    background: linear-gradient(135deg, #27ae60 0%, #1e8449 100%);
}

.odm-tab-container .block-content {
    padding: 12px;
}

.odm-tab-container .section-chargement .form-group input,
.odm-tab-container .section-livraison .form-group input {
    background: #f8f9fa;
    font-size: 12px;
    padding: 6px 8px;
}

.odm-tab-container .section-chargement .form-group label,
.odm-tab-container .section-livraison .form-group label {
    font-size: 10px;
    margin-bottom: 3px;
}

/* Responsive */
@media (max-width: 1200px) {
    .odm-tab-container .info-dates-volumes-bar {
        gap: 8px;
    }
    .odm-tab-container .inline-field input,
    .odm-tab-container .inline-field select {
        font-size: 11px;
        padding: 5px 6px;
    }
}

@media (max-width: 992px) {
    .odm-tab-container .form-row-4 {
        grid-template-columns: repeat(2, 1fr);
    }
    .odm-tab-container .forfait-products-row {
        grid-template-columns: 1fr;
    }
    .odm-tab-container .section-products {
        border-left: none;
        border-top: 3px solid #28a745;
    }
    .odm-tab-container .chargement-livraison-row {
        grid-template-columns: 1fr;
    }
    .odm-tab-container .quotes-bdc-row {
        grid-template-columns: 1fr;
    }
    .odm-tab-container .info-dates-volumes-bar {
        flex-wrap: wrap;
    }
    .odm-tab-container .inline-separator {
        display: none;
    }
}

@media (max-width: 576px) {
    .odm-tab-container .form-row-4,
    .odm-tab-container .form-row-3,
    .odm-tab-container .form-row-2 {
        grid-template-columns: 1fr;
    }
    .odm-tab-container .totals-row {
        flex-direction: column;
    }
    .odm-tab-container .info-dates-volumes-bar {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>

<script>
var odmAllProducts = {$PRODUCTS_JSON|default:'[]'};
var odmPotentialId = {$POTENTIAL_ID};
var odmContactId = {$CONTACT_ID|default:0};
var odmCsrfToken = '{$CSRF_TOKEN}';

// Données du Potential pour CHARGEMENT/LIVRAISON
var odmPotentialData = {
    // Dates
    cf_1043: '{$POTENTIAL_DATA.cf_1043|escape:'javascript'}',
    cf_1045: '{$POTENTIAL_DATA.cf_1045|escape:'javascript'}',
    cf_1047: '{$POTENTIAL_DATA.cf_1047|escape:'javascript'}',
    cf_1049: '{$POTENTIAL_DATA.cf_1049|escape:'javascript'}',
    // Volume et Distance
    cf_961: '{$POTENTIAL_DATA.cf_961|escape:'javascript'}',
    cf_939: '{$POTENTIAL_DATA.cf_939|escape:'javascript'}',
    cf_1259: '{$POTENTIAL_DATA.cf_1259|escape:'javascript'}',
    // CHARGEMENT
    cf_955: '{$POTENTIAL_DATA.cf_955|escape:'javascript'}',
    cf_933: '{$POTENTIAL_DATA.cf_933|escape:'javascript'}',
    cf_935: '{$POTENTIAL_DATA.cf_935|escape:'javascript'}',
    cf_1097: '{$POTENTIAL_DATA.cf_1097|escape:'javascript'}',
    cf_1011: '{$POTENTIAL_DATA.cf_1011|escape:'javascript'}',
    cf_1075: '{$POTENTIAL_DATA.cf_1075|escape:'javascript'}',
    cf_1019: '{$POTENTIAL_DATA.cf_1019|escape:'javascript'}',
    cf_1067: '{$POTENTIAL_DATA.cf_1067|escape:'javascript'}',
    cf_1023: '{$POTENTIAL_DATA.cf_1023|escape:'javascript'}',
    cf_1091: '{$POTENTIAL_DATA.cf_1091|escape:'javascript'}',
    cf_1071: '{$POTENTIAL_DATA.cf_1071|escape:'javascript'}',
    cf_1035: '{$POTENTIAL_DATA.cf_1035|escape:'javascript'}',
    // LIVRAISON
    cf_957: '{$POTENTIAL_DATA.cf_957|escape:'javascript'}',
    cf_949: '{$POTENTIAL_DATA.cf_949|escape:'javascript'}',
    cf_951: '{$POTENTIAL_DATA.cf_951|escape:'javascript'}',
    cf_1009: '{$POTENTIAL_DATA.cf_1009|escape:'javascript'}',
    cf_1013: '{$POTENTIAL_DATA.cf_1013|escape:'javascript'}',
    cf_1077: '{$POTENTIAL_DATA.cf_1077|escape:'javascript'}',
    cf_1021: '{$POTENTIAL_DATA.cf_1021|escape:'javascript'}',
    cf_1069: '{$POTENTIAL_DATA.cf_1069|escape:'javascript'}',
    cf_1025: '{$POTENTIAL_DATA.cf_1025|escape:'javascript'}',
    cf_1089: '{$POTENTIAL_DATA.cf_1089|escape:'javascript'}',
    cf_1073: '{$POTENTIAL_DATA.cf_1073|escape:'javascript'}',
    cf_1037: '{$POTENTIAL_DATA.cf_1037|escape:'javascript'}'
};

// Initialiser les champs CHARGEMENT/LIVRAISON au chargement
jQuery(document).ready(function() {
    // Dates
    jQuery('#odm_cf_1309').val(odmPotentialData.cf_1043);
    jQuery('#odm_cf_1324').val(odmPotentialData.cf_1049);

    // Déterminer le type de date
    if (odmPotentialData.cf_1045 && odmPotentialData.cf_1047) {
        jQuery('#odm_date_type').text('Période').css('background', '#f39c12');
    } else {
        jQuery('#odm_date_type').text('Date fixe').css('background', '#17a2b8');
    }

    // Volumes et Distance (editable inputs)
    jQuery('#odm_cf_1350_input').val(odmPotentialData.cf_961 || '');
    jQuery('#odm_cf_1351_input').val(odmPotentialData.cf_939 || '');
    jQuery('#odm_cf_1349_input').val(odmPotentialData.cf_1259 || '');

    // CHARGEMENT - Text fields
    jQuery('#odm_cf_1312').val(odmPotentialData.cf_955);
    jQuery('#odm_cf_1313').val(odmPotentialData.cf_933);
    jQuery('#odm_cf_1314').val(odmPotentialData.cf_935);
    jQuery('#odm_cf_1316').val(odmPotentialData.cf_1011);
    jQuery('#odm_cf_1320').val(odmPotentialData.cf_1023);

    // CHARGEMENT - Selects
    jQuery('#odm_cf_1315').val(odmPotentialData.cf_1097);
    jQuery('#odm_cf_1317').val(odmPotentialData.cf_1075);
    jQuery('#odm_cf_1318').val(odmPotentialData.cf_1019 == '1' ? '1' : '0');
    jQuery('#odm_cf_1319').val(odmPotentialData.cf_1067 == '1' ? '1' : '0');
    jQuery('#odm_cf_1321').val(odmPotentialData.cf_1091 == '1' ? '1' : '0');
    jQuery('#odm_cf_1322').val(odmPotentialData.cf_1071 == '1' ? '1' : '0');
    jQuery('#odm_cf_1323').val(odmPotentialData.cf_1035);

    // LIVRAISON - Text fields
    jQuery('#odm_cf_1325').val(odmPotentialData.cf_957);
    jQuery('#odm_cf_1326').val(odmPotentialData.cf_949);
    jQuery('#odm_cf_1327').val(odmPotentialData.cf_951);
    jQuery('#odm_cf_1329').val(odmPotentialData.cf_1013);
    jQuery('#odm_cf_1333').val(odmPotentialData.cf_1025);

    // LIVRAISON - Selects
    jQuery('#odm_cf_1328').val(odmPotentialData.cf_1009);
    jQuery('#odm_cf_1330').val(odmPotentialData.cf_1077);
    jQuery('#odm_cf_1331').val(odmPotentialData.cf_1021 == '1' ? '1' : '0');
    jQuery('#odm_cf_1332').val(odmPotentialData.cf_1069 == '1' ? '1' : '0');
    jQuery('#odm_cf_1334').val(odmPotentialData.cf_1089 == '1' ? '1' : '0');
    jQuery('#odm_cf_1335').val(odmPotentialData.cf_1073 == '1' ? '1' : '0');
    jQuery('#odm_cf_1336').val(odmPotentialData.cf_1037);

    // Remplir les champs cachés avec les valeurs initiales
    jQuery('#odm_hidden_cf_1309').val(odmPotentialData.cf_1043);
    jQuery('#odm_hidden_cf_1310').val(odmPotentialData.cf_1045);
    jQuery('#odm_hidden_cf_1311').val(odmPotentialData.cf_1047);
    jQuery('#odm_hidden_cf_1312').val(odmPotentialData.cf_955);
    jQuery('#odm_hidden_cf_1313').val(odmPotentialData.cf_933);
    jQuery('#odm_hidden_cf_1314').val(odmPotentialData.cf_935);
    jQuery('#odm_hidden_cf_1315').val(odmPotentialData.cf_1097);
    jQuery('#odm_hidden_cf_1316').val(odmPotentialData.cf_1011);
    jQuery('#odm_hidden_cf_1317').val(odmPotentialData.cf_1075);
    jQuery('#odm_hidden_cf_1318').val(odmPotentialData.cf_1019 == '1' ? '1' : '0');
    jQuery('#odm_hidden_cf_1319').val(odmPotentialData.cf_1067 == '1' ? '1' : '0');
    jQuery('#odm_hidden_cf_1320').val(odmPotentialData.cf_1023);
    jQuery('#odm_hidden_cf_1321').val(odmPotentialData.cf_1091 == '1' ? '1' : '0');
    jQuery('#odm_hidden_cf_1322').val(odmPotentialData.cf_1071 == '1' ? '1' : '0');
    jQuery('#odm_hidden_cf_1323').val(odmPotentialData.cf_1035);
    jQuery('#odm_hidden_cf_1324').val(odmPotentialData.cf_1049);
    jQuery('#odm_hidden_cf_1325').val(odmPotentialData.cf_957);
    jQuery('#odm_hidden_cf_1326').val(odmPotentialData.cf_949);
    jQuery('#odm_hidden_cf_1327').val(odmPotentialData.cf_951);
    jQuery('#odm_hidden_cf_1328').val(odmPotentialData.cf_1009);
    jQuery('#odm_hidden_cf_1329').val(odmPotentialData.cf_1013);
    jQuery('#odm_hidden_cf_1330').val(odmPotentialData.cf_1077);
    jQuery('#odm_hidden_cf_1331').val(odmPotentialData.cf_1021 == '1' ? '1' : '0');
    jQuery('#odm_hidden_cf_1332').val(odmPotentialData.cf_1069 == '1' ? '1' : '0');
    jQuery('#odm_hidden_cf_1333').val(odmPotentialData.cf_1025);
    jQuery('#odm_hidden_cf_1334').val(odmPotentialData.cf_1089 == '1' ? '1' : '0');
    jQuery('#odm_hidden_cf_1335').val(odmPotentialData.cf_1073 == '1' ? '1' : '0');
    jQuery('#odm_hidden_cf_1336').val(odmPotentialData.cf_1037);
    jQuery('#odm_hidden_cf_1349').val(odmPotentialData.cf_1259);
    jQuery('#odm_hidden_cf_1350').val(odmPotentialData.cf_961);
    jQuery('#odm_hidden_cf_1351').val(odmPotentialData.cf_939);

    // Synchroniser les champs éditables avec les champs cachés lors des modifications
    jQuery('.editable-field').on('change input', function() {
        var hiddenId = jQuery(this).data('hidden');
        if (hiddenId) {
            jQuery('#' + hiddenId).val(jQuery(this).val());
        }
    });
});
</script>
