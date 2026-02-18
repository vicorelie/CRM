{*+**********************************************************************************
* Unified Details Tab - Editable Potential details with modern styling
* Uses common design system from UnifiedTabbedView.tpl
************************************************************************************}
{strip}
<div class="details-tab-container" id="detailsTabContainer" data-record-id="{$RECORD->getId()}" data-module="{$MODULE_NAME}" data-contact-id="{$RECORD->get('contact_id')}">

    {* Define the side-by-side address blocks *}
    {assign var=SIDE_BY_SIDE_BLOCKS value=['CHARGEMENT', 'DESTINATION']}

    {* =====================================================
       DATE SELECTOR - Compact unified date/period picker
       ===================================================== *}
    {* Get current values for date fields and key metrics *}
    {assign var=DATE_UNIQUE_CHARGEMENT value=''}
    {assign var=DATE_UNIQUE_LIVRAISON value=''}
    {assign var=PERIODE_DEBUT value=''}
    {assign var=PERIODE_FIN value=''}
    {assign var=DISTANCE_VALUE value=''}
    {assign var=VOLUME_ESTIME_VALUE value=''}
    {assign var=VOLUME_FINAL_VALUE value=''}
    {foreach key=BLK item=FIELDS from=$RECORD_STRUCTURE}
        {foreach key=FN item=FM from=$FIELDS}
            {if $FN eq 'cf_1043'}{assign var=DATE_UNIQUE_CHARGEMENT value=$FM->get('fieldvalue')}{/if}
            {if $FN eq 'cf_1049'}{assign var=DATE_UNIQUE_LIVRAISON value=$FM->get('fieldvalue')}{/if}
            {if $FN eq 'cf_1045'}{assign var=PERIODE_DEBUT value=$FM->get('fieldvalue')}{/if}
            {if $FN eq 'cf_1047'}{assign var=PERIODE_FIN value=$FM->get('fieldvalue')}{/if}
            {if $FN eq 'cf_961'}{assign var=DISTANCE_VALUE value=$FM->get('fieldvalue')}{/if}
            {if $FN eq 'cf_939'}{assign var=VOLUME_ESTIME_VALUE value=$FM->get('fieldvalue')}{/if}
            {if $FN eq 'cf_1259'}{assign var=VOLUME_FINAL_VALUE value=$FM->get('fieldvalue')}{/if}
            {if $FN eq 'cf_981'}{assign var=FM_MOBILE value=$FM}{/if}
            {if $FN eq 'cf_1123'}{assign var=FM_MAIL value=$FM}{/if}
            {if $FN eq 'cf_1259'}{assign var=FM_VOL_FINAL value=$FM}{/if}
            {if $FN eq 'cf_971'}{assign var=FM_STATUT value=$FM}{/if}
            {if $FN eq 'cf_1164'}{assign var=FM_VALIDATION value=$FM}{/if}
            {if $FN eq 'createdtime'}{assign var=FM_CREATEDTIME value=$FM}{/if}
            {if $FN eq 'potential_no'}{assign var=FM_POTENTIAL_NO value=$FM}{/if}
            {if $FN eq 'potentialname'}{assign var=FM_POTENTIALNAME value=$FM}{/if}
            {if $FN eq 'assigned_user_id'}{assign var=FM_ASSIGNED value=$FM}{/if}
        {/foreach}
    {/foreach}

    <div class="date-selector-compact">
        <div class="date-selector-label">
            <i class="fa fa-calendar"></i> Dates :
        </div>
        <div class="date-mode-toggle-compact">
            <label class="date-mode-btn {if $PERIODE_DEBUT eq '' && $PERIODE_FIN eq ''}active{/if}" data-mode="unique">
                <input type="radio" name="date_mode" value="unique" {if $PERIODE_DEBUT eq '' && $PERIODE_FIN eq ''}checked{/if}>
                Date fixe
            </label>
            <label class="date-mode-btn {if $PERIODE_DEBUT neq '' || $PERIODE_FIN neq ''}active{/if}" data-mode="period">
                <input type="radio" name="date_mode" value="period" {if $PERIODE_DEBUT neq '' || $PERIODE_FIN neq ''}checked{/if}>
                Période
            </label>
        </div>
        <div class="date-fields-compact date-unique-container" style="{if $PERIODE_DEBUT neq '' || $PERIODE_FIN neq ''}display:none;{/if}">
            <div class="date-field-item">
                <span class="date-field-label"><i class="fa fa-upload" style="color:#27ae60"></i> Charg.</span>
                <input type="date" class="date-input-compact" id="date_unique_chargement" value="{if $DATE_UNIQUE_CHARGEMENT}{$DATE_UNIQUE_CHARGEMENT|date_format:'%Y-%m-%d'}{/if}">
            </div>
            <div class="date-field-item">
                <span class="date-field-label"><i class="fa fa-download" style="color:#e74c3c"></i> Livr.</span>
                <input type="date" class="date-input-compact" id="date_unique_livraison" value="{if $DATE_UNIQUE_LIVRAISON}{$DATE_UNIQUE_LIVRAISON|date_format:'%Y-%m-%d'}{/if}">
            </div>
        </div>
        <div class="date-fields-compact date-period-container" style="{if $PERIODE_DEBUT eq '' && $PERIODE_FIN eq ''}display:none;{/if}">
            <div class="date-field-item">
                <span class="date-field-label"><i class="fa fa-calendar-plus-o" style="color:#3498db"></i> Du</span>
                <input type="date" class="date-input-compact" id="date_periode_debut" value="{if $PERIODE_DEBUT}{$PERIODE_DEBUT|date_format:'%Y-%m-%d'}{/if}">
            </div>
            <div class="date-field-item">
                <span class="date-field-label"><i class="fa fa-calendar-times-o" style="color:#9b59b6"></i> Au</span>
                <input type="date" class="date-input-compact" id="date_periode_fin" value="{if $PERIODE_FIN}{$PERIODE_FIN|date_format:'%Y-%m-%d'}{/if}">
            </div>
        </div>
        {* Key Metrics - Distance, Volume estimé, Volume final *}
        <div class="metrics-separator"></div>
        <div class="key-metrics-compact">
            <div class="metric-item">
                <span class="metric-label"><i class="fa fa-road" style="color:#3498db"></i> Dist</span>
                <span class="metric-value" id="metric_distance">{if $DISTANCE_VALUE}{$DISTANCE_VALUE}{else}--{/if}</span>
                <span class="metric-unit">km</span>
            </div>
            <div class="metric-item">
                <span class="metric-label"><i class="fa fa-cube" style="color:#9b59b6"></i> Vol inv</span>
                <span class="metric-value" id="metric_volume_estime">{if $VOLUME_ESTIME_VALUE}{$VOLUME_ESTIME_VALUE}{else}--{/if}</span>
                <span class="metric-unit">m³</span>
            </div>
            <div class="metric-item">
                <span class="metric-label"><i class="fa fa-cubes" style="color:#e67e22"></i> Vol fin</span>
                <span class="metric-value" id="metric_volume_final">{if $VOLUME_FINAL_VALUE}{$VOLUME_FINAL_VALUE}{else}--{/if}</span>
                <span class="metric-unit">m³</span>
            </div>
        </div>
        {* Hidden fields *}
        <input type="hidden" class="unified-field-input" name="cf_1043" id="hidden_cf_1043" data-fieldname="cf_1043" data-fieldtype="date" value="{if $DATE_UNIQUE_CHARGEMENT}{$DATE_UNIQUE_CHARGEMENT|date_format:'%Y-%m-%d'}{/if}">
        <input type="hidden" class="unified-field-input" name="cf_1049" id="hidden_cf_1049" data-fieldname="cf_1049" data-fieldtype="date" value="{if $DATE_UNIQUE_LIVRAISON}{$DATE_UNIQUE_LIVRAISON|date_format:'%Y-%m-%d'}{/if}">
        <input type="hidden" class="unified-field-input" name="cf_1045" id="hidden_cf_1045" data-fieldname="cf_1045" data-fieldtype="date" value="{if $PERIODE_DEBUT}{$PERIODE_DEBUT|date_format:'%Y-%m-%d'}{/if}">
        <input type="hidden" class="unified-field-input" name="cf_1047" id="hidden_cf_1047" data-fieldname="cf_1047" data-fieldtype="date" value="{if $PERIODE_FIN}{$PERIODE_FIN|date_format:'%Y-%m-%d'}{/if}">
    </div>

    {* =====================================================
       ADDRESSES SECTION - CHARGEMENT & DESTINATION blocks side by side
       ===================================================== *}
    <div class="address-row">
        {* Loop through CHARGEMENT and DESTINATION blocks *}
        {foreach item=SIDE_BLOCK_KEY from=$SIDE_BY_SIDE_BLOCKS}
            {if isset($RECORD_STRUCTURE[$SIDE_BLOCK_KEY])}
                {assign var=BLOCK_FIELDS value=$RECORD_STRUCTURE[$SIDE_BLOCK_KEY]}

                {* Determine section styling based on block *}
                {if $SIDE_BLOCK_KEY eq 'CHARGEMENT'}
                    {assign var=HEADER_CLASS value='header-green'}
                    {assign var=ICON_CLASS value='fa-upload'}
                {else}
                    {assign var=HEADER_CLASS value='header-red'}
                    {assign var=ICON_CLASS value='fa-download'}
                {/if}

                <div class="card" style="padding: 0; overflow: hidden;" data-block="{$SIDE_BLOCK_KEY}">
                    <div class="card-header {$HEADER_CLASS}" style="margin: 0; border-radius: 12px 12px 0 0;">
                        <i class="fa {$ICON_CLASS}"></i> {if $SIDE_BLOCK_KEY eq 'DESTINATION'}LIVRAISON{else}{vtranslate($SIDE_BLOCK_KEY, $MODULE_NAME)}{/if}
                    </div>

                    <div class="form-fields-grid form-fields-address" style="padding: 15px;">
                        {foreach item=FIELD_MODEL key=FIELD_NAME from=$BLOCK_FIELDS}
                            {if !$FIELD_MODEL->isViewableInDetailView()}
                                {continue}
                            {/if}

                            {* Skip date fields handled by unified date selector *}
                            {if $FIELD_NAME eq 'cf_1043' || $FIELD_NAME eq 'cf_1049' || $FIELD_NAME eq 'cf_1045' || $FIELD_NAME eq 'cf_1047'}
                                {continue}
                            {/if}

                            {assign var=fieldDataType value=$FIELD_MODEL->getFieldDataType()}
                            {assign var=FIELD_VALUE value=$FIELD_MODEL->get('fieldvalue')}
                            {assign var=IS_EDITABLE value=$FIELD_MODEL->isEditable()}

                            {* Text area fields - full width *}
                            {if $FIELD_MODEL->get('uitype') eq '19' || $FIELD_MODEL->get('uitype') eq '20'}
                                <div class="form-group form-group-full">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    {if $IS_EDITABLE}
                                        <textarea class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" rows="2">{$FIELD_VALUE}</textarea>
                                    {else}
                                        <div class="field-value field-value-text field-readonly">
                                            {include file=vtemplate_path($FIELD_MODEL->getUITypeModel()->getDetailViewTemplateName(), $MODULE_NAME) FIELD_MODEL=$FIELD_MODEL USER_MODEL=$USER_MODEL MODULE=$MODULE_NAME RECORD=$RECORD}
                                        </div>
                                    {/if}
                                </div>
                            {* Picklist fields *}
                            {elseif $fieldDataType eq 'picklist'}
                                <div class="form-group">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    {if $IS_EDITABLE}
                                        <select class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}">
                                            <option value="">--</option>
                                            {foreach item=PICKLIST_VALUE from=$FIELD_MODEL->getPicklistValues()}
                                                <option value="{$PICKLIST_VALUE}" {if $FIELD_VALUE eq $PICKLIST_VALUE}selected{/if}>{vtranslate($PICKLIST_VALUE, $MODULE_NAME)}</option>
                                            {/foreach}
                                        </select>
                                    {else}
                                        <div class="field-value field-readonly">{vtranslate($FIELD_VALUE, $MODULE_NAME)}</div>
                                    {/if}
                                </div>
                            {* Boolean/Checkbox fields *}
                            {elseif $fieldDataType eq 'boolean'}
                                <div class="form-group">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    {if $IS_EDITABLE}
                                        <select class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}">
                                            <option value="1" {if $FIELD_VALUE eq '1' || $FIELD_VALUE eq 'on'}selected{/if}>Oui</option>
                                            <option value="0" {if $FIELD_VALUE eq '0' || $FIELD_VALUE eq '' || $FIELD_VALUE eq 'off'}selected{/if}>Non</option>
                                        </select>
                                    {else}
                                        <div class="field-value field-readonly">{if $FIELD_VALUE eq '1' || $FIELD_VALUE eq 'on'}Oui{else}Non{/if}</div>
                                    {/if}
                                </div>
                            {* Date fields *}
                            {elseif $fieldDataType eq 'date'}
                                <div class="form-group">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    {if $IS_EDITABLE}
                                        {assign var=DATE_VALUE value=''}
                                        {if $FIELD_VALUE}
                                            {assign var=DATE_VALUE value=$FIELD_VALUE|date_format:'%Y-%m-%d'}
                                        {/if}
                                        <input type="date" class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" value="{$DATE_VALUE}">
                                    {else}
                                        <div class="field-value field-readonly">{$FIELD_MODEL->getDisplayValue($FIELD_VALUE)}</div>
                                    {/if}
                                </div>
                            {* Owner field - editable with user dropdown *}
                            {elseif $fieldDataType eq 'owner'}
                                <div class="form-group">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    {if $IS_EDITABLE}
                                        {assign var="OWNER_FIELD_INFO" value=$FIELD_MODEL->getFieldInfo()}
                                        {assign var="ALL_USERS" value=$OWNER_FIELD_INFO['picklistvalues'][vtranslate('LBL_USERS')]}
                                        {assign var="ALL_GROUPS" value=$OWNER_FIELD_INFO['picklistvalues'][vtranslate('LBL_GROUPS')]}
                                        <select class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}">
                                            <optgroup label="{vtranslate('LBL_USERS')}">
                                                {foreach key=OWNER_ID item=OWNER_NAME from=$ALL_USERS}
                                                    <option value="{$OWNER_ID}" {if $FIELD_VALUE eq $OWNER_ID}selected{/if}>{$OWNER_NAME}</option>
                                                {/foreach}
                                            </optgroup>
                                            {if $ALL_GROUPS|@count > 0}
                                            <optgroup label="{vtranslate('LBL_GROUPS')}">
                                                {foreach key=OWNER_ID item=OWNER_NAME from=$ALL_GROUPS}
                                                    <option value="{$OWNER_ID}" {if $FIELD_VALUE eq $OWNER_ID}selected{/if}>{$OWNER_NAME}</option>
                                                {/foreach}
                                            </optgroup>
                                            {/if}
                                        </select>
                                    {else}
                                        <div class="field-value field-readonly" data-field-type="{$fieldDataType}">
                                            {include file=vtemplate_path($FIELD_MODEL->getUITypeModel()->getDetailViewTemplateName(), $MODULE_NAME) FIELD_MODEL=$FIELD_MODEL USER_MODEL=$USER_MODEL MODULE=$MODULE_NAME RECORD=$RECORD}
                                        </div>
                                    {/if}
                                </div>
                            {* Reference fields - read only *}
                            {elseif $fieldDataType eq 'reference' || $fieldDataType eq 'multireference'}
                                <div class="form-group">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    <div class="field-value field-readonly" data-field-type="{$fieldDataType}">
                                        {include file=vtemplate_path($FIELD_MODEL->getUITypeModel()->getDetailViewTemplateName(), $MODULE_NAME) FIELD_MODEL=$FIELD_MODEL USER_MODEL=$USER_MODEL MODULE=$MODULE_NAME RECORD=$RECORD}
                                    </div>
                                </div>
                            {* Regular text and number fields *}
                            {else}
                                <div class="form-group">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    {if $IS_EDITABLE}
                                        <input type="text" class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" value="{decode_html($FIELD_VALUE)|escape:'html'}">
                                    {else}
                                        <div class="field-value field-readonly" data-field-type="{$fieldDataType}">
                                            {include file=vtemplate_path($FIELD_MODEL->getUITypeModel()->getDetailViewTemplateName(), $MODULE_NAME) FIELD_MODEL=$FIELD_MODEL USER_MODEL=$USER_MODEL MODULE=$MODULE_NAME RECORD=$RECORD}
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        {/foreach}
                    </div>
                </div>
            {/if}
        {/foreach}
    </div>

    {* =====================================================
       DETAIL/INFO BLOCK - Rendered first after main addresses
       ===================================================== *}
    {foreach key=BLOCK_LABEL_KEY item=FIELD_MODEL_LIST from=$RECORD_STRUCTURE}
        {* Only render the Info/Potentials block here *}
        {if $BLOCK_LABEL_KEY eq 'LBL_OPPORTUNITY_INFORMATION' || $BLOCK_LABEL_KEY eq 'LBL_POTENTIALS_INFORMATION'}
            {if isset($BLOCK_LIST[$BLOCK_LABEL_KEY])}
                {assign var=BLOCK value=$BLOCK_LIST[$BLOCK_LABEL_KEY]}
            {else}
                {assign var=BLOCK value=''}
            {/if}

            {if $BLOCK neq null and $FIELD_MODEL_LIST|@count gt 0}
                <div class="form-section section-info" data-block="{$BLOCK_LABEL_KEY}">
                    <div class="form-section-title title-purple">
                        <i class="fa fa-briefcase"></i>
                        {vtranslate($BLOCK_LABEL_KEY, $MODULE_NAME)}
                    </div>

                    <div class="form-fields-grid">
                        {* Row 1: Salutation, Nom, Prénom, Mobile, Mobile sup *}
                        <div class="form-group">
                            <label>Salutation</label>
                            <select class="unified-field-input contact-sync-field" data-fieldname="contact_salutationtype" data-contact-field="salutationtype">
                                <option value=""></option>
                                {foreach item=SALUT from=$SALUTATION_VALUES}
                                    <option value="{$SALUT}" {if $SALUT eq $CONTACT_SALUTATION}selected{/if}>{$SALUT}</option>
                                {/foreach}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Nom</label>
                            <input type="text" class="unified-field-input contact-sync-field" data-fieldname="contact_lastname" data-contact-field="lastname" value="{$CONTACT_LASTNAME|escape:'html'}">
                        </div>
                        <div class="form-group">
                            <label>Prénom</label>
                            <input type="text" class="unified-field-input contact-sync-field" data-fieldname="contact_firstname" data-contact-field="firstname" value="{$CONTACT_FIRSTNAME|escape:'html'}">
                        </div>
                        {if isset($FM_MOBILE)}
                        <div class="form-group">
                            <label>{vtranslate($FM_MOBILE->get('label'), $MODULE_NAME)}</label>
                            <input type="text" class="unified-field-input" name="cf_981" data-fieldname="cf_981" data-fieldtype="phone" value="{$FM_MOBILE->get('fieldvalue')}">
                        </div>
                        {/if}
                        <div class="form-group">
                            <label>Mobile sup</label>
                            <input type="text" class="unified-field-input contact-sync-field" data-fieldname="contact_otherphone" data-contact-field="otherphone" value="{$CONTACT_OTHERPHONE|escape:'html'}">
                        </div>

                        {* Row 2: Mail, Volume final, Statut, Validation *}
                        {if isset($FM_MAIL)}
                        <div class="form-group">
                            <label>{vtranslate($FM_MAIL->get('label'), $MODULE_NAME)}</label>
                            <input type="text" class="unified-field-input" name="cf_1123" data-fieldname="cf_1123" data-fieldtype="email" value="{$FM_MAIL->get('fieldvalue')}">
                        </div>
                        {/if}
                        {if isset($FM_VOL_FINAL)}
                        <div class="form-group">
                            <label>{vtranslate($FM_VOL_FINAL->get('label'), $MODULE_NAME)}</label>
                            <input type="text" class="unified-field-input" name="cf_1259" data-fieldname="cf_1259" data-fieldtype="string" value="{$FM_VOL_FINAL->get('fieldvalue')}">
                        </div>
                        {/if}
                        {if isset($FM_STATUT)}
                        <div class="form-group">
                            <label>{vtranslate($FM_STATUT->get('label'), $MODULE_NAME)}</label>
                            <select class="unified-field-input" name="cf_971" data-fieldname="cf_971" data-fieldtype="picklist">
                                <option value="">--</option>
                                {foreach item=PV from=$FM_STATUT->getPicklistValues()}
                                    <option value="{$PV}" {if $FM_STATUT->get('fieldvalue') eq $PV}selected{/if}>{vtranslate($PV, $MODULE_NAME)}</option>
                                {/foreach}
                            </select>
                        </div>
                        {/if}
                        {if isset($FM_VALIDATION)}
                        <div class="form-group">
                            <label>{vtranslate($FM_VALIDATION->get('label'), $MODULE_NAME)}</label>
                            <select class="unified-field-input" name="cf_1164" data-fieldname="cf_1164" data-fieldtype="boolean">
                                <option value="1" {if $FM_VALIDATION->get('fieldvalue') eq '1' || $FM_VALIDATION->get('fieldvalue') eq 'on'}selected{/if}>Oui</option>
                                <option value="0" {if $FM_VALIDATION->get('fieldvalue') eq '0' || $FM_VALIDATION->get('fieldvalue') eq '' || $FM_VALIDATION->get('fieldvalue') eq 'off'}selected{/if}>Non</option>
                            </select>
                        </div>
                        {/if}

                        {* Row 3: Date de création, Affaire N°, Nom de l'affaire, Assigné à *}
                        {if isset($FM_CREATEDTIME)}
                        <div class="form-group">
                            <label>{vtranslate($FM_CREATEDTIME->get('label'), $MODULE_NAME)}</label>
                            <div class="field-value field-readonly">{$FM_CREATEDTIME->get('fieldvalue')}</div>
                        </div>
                        {/if}
                        {if isset($FM_POTENTIAL_NO)}
                        <div class="form-group">
                            <label>Affaire N°</label>
                            <div class="field-value field-readonly">{$FM_POTENTIAL_NO->get('fieldvalue')}</div>
                        </div>
                        {/if}
                        {if isset($FM_POTENTIALNAME)}
                        <div class="form-group">
                            <label>Nom de l'affaire</label>
                            <input type="text" class="unified-field-input" name="potentialname" data-fieldname="potentialname" data-fieldtype="string" value="{$FM_POTENTIALNAME->get('fieldvalue')}">
                        </div>
                        {/if}
                        {if isset($FM_ASSIGNED)}
                        <div class="form-group">
                            <label>Assigné à</label>
                            {assign var="ASSIGNED_INFO" value=$FM_ASSIGNED->getFieldInfo()}
                            {assign var="ASSIGNED_USERS" value=$ASSIGNED_INFO['picklistvalues'][vtranslate('LBL_USERS')]}
                            {assign var="ASSIGNED_GROUPS" value=$ASSIGNED_INFO['picklistvalues'][vtranslate('LBL_GROUPS')]}
                            <select class="unified-field-input" name="assigned_user_id" data-fieldname="assigned_user_id" data-fieldtype="owner">
                                <optgroup label="{vtranslate('LBL_USERS')}">
                                    {foreach key=OID item=ONAME from=$ASSIGNED_USERS}
                                        <option value="{$OID}" {if $FM_ASSIGNED->get('fieldvalue') eq $OID}selected{/if}>{$ONAME}</option>
                                    {/foreach}
                                </optgroup>
                                {if $ASSIGNED_GROUPS|@count > 0}
                                <optgroup label="{vtranslate('LBL_GROUPS')}">
                                    {foreach key=OID item=ONAME from=$ASSIGNED_GROUPS}
                                        <option value="{$OID}" {if $FM_ASSIGNED->get('fieldvalue') eq $OID}selected{/if}>{$ONAME}</option>
                                    {/foreach}
                                </optgroup>
                                {/if}
                            </select>
                        </div>
                        {/if}

                        {* Remaining fields from the block *}
                        {foreach item=FIELD_MODEL key=FIELD_NAME from=$FIELD_MODEL_LIST}
                            {if !$FIELD_MODEL->isViewableInDetailView()}
                                {continue}
                            {/if}

                            {* Skip date fields handled by unified date selector *}
                            {* Skip fields shown in top metrics bar *}
                            {* Skip fields hardcoded above in specific order *}
                            {if $FIELD_NAME eq 'cf_1043' || $FIELD_NAME eq 'cf_1049' || $FIELD_NAME eq 'cf_1045' || $FIELD_NAME eq 'cf_1047' || $FIELD_NAME eq 'cf_939' || $FIELD_NAME eq 'cf_961'
                                || $FIELD_NAME eq 'cf_981' || $FIELD_NAME eq 'cf_1123' || $FIELD_NAME eq 'cf_1259' || $FIELD_NAME eq 'cf_971' || $FIELD_NAME eq 'cf_1164'
                                || $FIELD_NAME eq 'createdtime' || $FIELD_NAME eq 'potential_no' || $FIELD_NAME eq 'potentialname' || $FIELD_NAME eq 'assigned_user_id'}
                                {continue}
                            {/if}

                            {assign var=fieldDataType value=$FIELD_MODEL->getFieldDataType()}
                            {assign var=FIELD_VALUE value=$FIELD_MODEL->get('fieldvalue')}
                            {assign var=IS_EDITABLE value=$FIELD_MODEL->isEditable()}

                            {* Full width for text areas and description *}
                            {if $FIELD_MODEL->get('uitype') eq '19' || $FIELD_MODEL->get('uitype') eq '20' || $FIELD_NAME eq 'description'}
                                <div class="form-group form-group-full">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    {if $IS_EDITABLE}
                                        <textarea class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" rows="3">{$FIELD_VALUE}</textarea>
                                    {else}
                                        <div class="field-value field-value-text field-readonly">
                                            {include file=vtemplate_path($FIELD_MODEL->getUITypeModel()->getDetailViewTemplateName(), $MODULE_NAME) FIELD_MODEL=$FIELD_MODEL USER_MODEL=$USER_MODEL MODULE=$MODULE_NAME RECORD=$RECORD}
                                        </div>
                                    {/if}
                                </div>
                            {* Picklist fields *}
                            {elseif $fieldDataType eq 'picklist'}
                                <div class="form-group">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    {if $IS_EDITABLE}
                                        <select class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}">
                                            <option value="">--</option>
                                            {foreach item=PICKLIST_VALUE from=$FIELD_MODEL->getPicklistValues()}
                                                <option value="{$PICKLIST_VALUE}" {if $FIELD_VALUE eq $PICKLIST_VALUE}selected{/if}>{vtranslate($PICKLIST_VALUE, $MODULE_NAME)}</option>
                                            {/foreach}
                                        </select>
                                    {else}
                                        <div class="field-value field-readonly">{vtranslate($FIELD_VALUE, $MODULE_NAME)}</div>
                                    {/if}
                                </div>
                            {* Boolean/Checkbox fields *}
                            {elseif $fieldDataType eq 'boolean'}
                                <div class="form-group">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    {if $IS_EDITABLE}
                                        <select class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}">
                                            <option value="1" {if $FIELD_VALUE eq '1' || $FIELD_VALUE eq 'on'}selected{/if}>Oui</option>
                                            <option value="0" {if $FIELD_VALUE eq '0' || $FIELD_VALUE eq '' || $FIELD_VALUE eq 'off'}selected{/if}>Non</option>
                                        </select>
                                    {else}
                                        <div class="field-value field-readonly">{if $FIELD_VALUE eq '1' || $FIELD_VALUE eq 'on'}Oui{else}Non{/if}</div>
                                    {/if}
                                </div>
                            {* Date fields *}
                            {elseif $fieldDataType eq 'date'}
                                <div class="form-group">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    {if $IS_EDITABLE}
                                        {assign var=DATE_VALUE value=''}
                                        {if $FIELD_VALUE}
                                            {assign var=DATE_VALUE value=$FIELD_VALUE|date_format:'%Y-%m-%d'}
                                        {/if}
                                        <input type="date" class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" value="{$DATE_VALUE}">
                                    {else}
                                        <div class="field-value field-readonly">{$FIELD_MODEL->getDisplayValue($FIELD_VALUE)}</div>
                                    {/if}
                                </div>
                            {* Currency/Number fields *}
                            {elseif $fieldDataType eq 'currency' || $fieldDataType eq 'double' || $fieldDataType eq 'integer'}
                                <div class="form-group">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    {if $IS_EDITABLE}
                                        <input type="number" class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" value="{$FIELD_VALUE}" step="0.01">
                                    {else}
                                        <div class="field-value field-readonly">{$FIELD_MODEL->getDisplayValue($FIELD_VALUE)}</div>
                                    {/if}
                                </div>
                            {* Owner field - editable with user dropdown *}
                            {elseif $fieldDataType eq 'owner'}
                                <div class="form-group">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    {if $IS_EDITABLE}
                                        {assign var="OWNER_FIELD_INFO" value=$FIELD_MODEL->getFieldInfo()}
                                        {assign var="ALL_USERS" value=$OWNER_FIELD_INFO['picklistvalues'][vtranslate('LBL_USERS')]}
                                        {assign var="ALL_GROUPS" value=$OWNER_FIELD_INFO['picklistvalues'][vtranslate('LBL_GROUPS')]}
                                        <select class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}">
                                            <optgroup label="{vtranslate('LBL_USERS')}">
                                                {foreach key=OWNER_ID item=OWNER_NAME from=$ALL_USERS}
                                                    <option value="{$OWNER_ID}" {if $FIELD_VALUE eq $OWNER_ID}selected{/if}>{$OWNER_NAME}</option>
                                                {/foreach}
                                            </optgroup>
                                            {if $ALL_GROUPS|@count > 0}
                                            <optgroup label="{vtranslate('LBL_GROUPS')}">
                                                {foreach key=OWNER_ID item=OWNER_NAME from=$ALL_GROUPS}
                                                    <option value="{$OWNER_ID}" {if $FIELD_VALUE eq $OWNER_ID}selected{/if}>{$OWNER_NAME}</option>
                                                {/foreach}
                                            </optgroup>
                                            {/if}
                                        </select>
                                    {else}
                                        <div class="field-value field-readonly" data-field-type="{$fieldDataType}">
                                            {include file=vtemplate_path($FIELD_MODEL->getUITypeModel()->getDetailViewTemplateName(), $MODULE_NAME) FIELD_MODEL=$FIELD_MODEL USER_MODEL=$USER_MODEL MODULE=$MODULE_NAME RECORD=$RECORD}
                                        </div>
                                    {/if}
                                </div>
                            {* Reference fields - read only *}
                            {elseif $fieldDataType eq 'reference' || $fieldDataType eq 'multireference'}
                                <div class="form-group">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    <div class="field-value field-readonly" data-field-type="{$fieldDataType}">
                                        {include file=vtemplate_path($FIELD_MODEL->getUITypeModel()->getDetailViewTemplateName(), $MODULE_NAME) FIELD_MODEL=$FIELD_MODEL USER_MODEL=$USER_MODEL MODULE=$MODULE_NAME RECORD=$RECORD}
                                    </div>
                                </div>
                            {* Regular text fields *}
                            {else}
                                <div class="form-group">
                                    <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                    {if $IS_EDITABLE}
                                        <input type="text" class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" value="{decode_html($FIELD_VALUE)|escape:'html'}">
                                    {else}
                                        <div class="field-value field-readonly" data-field-type="{$fieldDataType}">
                                            {include file=vtemplate_path($FIELD_MODEL->getUITypeModel()->getDetailViewTemplateName(), $MODULE_NAME) FIELD_MODEL=$FIELD_MODEL USER_MODEL=$USER_MODEL MODULE=$MODULE_NAME RECORD=$RECORD}
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        {/foreach}
                    </div>
                </div>
            {/if}
        {/if}
    {/foreach}

    {* =====================================================
       INSTRUCTIONS BLOCK - Rendered after Detail block as accordion
       ===================================================== *}
    {foreach key=INSTR_BLOCK_KEY item=INSTR_FIELD_LIST from=$RECORD_STRUCTURE}
        {if $INSTR_BLOCK_KEY eq 'INSTRUCTIONS' || strpos(strtolower($INSTR_BLOCK_KEY), 'instruction') !== false}
            {if isset($BLOCK_LIST[$INSTR_BLOCK_KEY])}
                {assign var=INSTR_BLOCK value=$BLOCK_LIST[$INSTR_BLOCK_KEY]}
            {else}
                {assign var=INSTR_BLOCK value=''}
            {/if}

            {if $INSTR_BLOCK neq null and $INSTR_FIELD_LIST|@count gt 0}
            <div class="card accordion-card section-instructions" style="padding: 0; overflow: hidden;" data-block="{$INSTR_BLOCK_KEY}">
                <div class="card-header header-orange accordion-header" style="margin: 0; border-radius: 12px;" onclick="UnifiedDetails.toggleAccordion(this)">
                    <i class="fa fa-list-ul"></i> {vtranslate($INSTR_BLOCK_KEY, $MODULE_NAME)}
                    <i class="fa fa-chevron-down accordion-arrow"></i>
                </div>

                <div class="accordion-content" style="display: none;">
                    <div class="form-fields-grid form-fields-instructions" style="padding: 15px;">
                        {foreach item=FIELD_MODEL key=FIELD_NAME from=$INSTR_FIELD_LIST}
                            {if !$FIELD_MODEL->isViewableInDetailView()}
                                {continue}
                            {/if}

                            {assign var=fieldDataType value=$FIELD_MODEL->getFieldDataType()}
                            {assign var=FIELD_VALUE value=$FIELD_MODEL->get('fieldvalue')}
                            {assign var=IS_EDITABLE value=$FIELD_MODEL->isEditable()}
                            {assign var=FIELD_LABEL value=vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)|strtolower}

                            {* Render instruction fields as text areas *}
                            <div class="form-group">
                                <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                {if $IS_EDITABLE}
                                    <textarea class="unified-field-input instruction-textarea" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" rows="4">{$FIELD_VALUE}</textarea>
                                {else}
                                    <div class="field-value field-value-text field-readonly">
                                        {if $FIELD_VALUE}{$FIELD_VALUE}{else}--{/if}
                                    </div>
                                {/if}
                            </div>
                        {/foreach}
                    </div>
                </div>
            </div>
            {/if}
        {/if}
    {/foreach}

    {* =====================================================
       SUPPLEMENTARY ADDRESSES - Single accordion with both blocks side by side
       ===================================================== *}
    {* First, collect supplementary address blocks *}
    {assign var=SUPPL_CHARGEMENT_FIELDS value=null}
    {assign var=SUPPL_CHARGEMENT_KEY value=''}
    {assign var=SUPPL_LIVRAISON_FIELDS value=null}
    {assign var=SUPPL_LIVRAISON_KEY value=''}
    {foreach key=SUPPL_BLOCK_KEY item=SUPPL_BLOCK_FIELDS from=$RECORD_STRUCTURE}
        {if strpos(strtolower($SUPPL_BLOCK_KEY), 'suppl') !== false}
            {if strpos(strtolower($SUPPL_BLOCK_KEY), 'chargement') !== false}
                {assign var=SUPPL_CHARGEMENT_FIELDS value=$SUPPL_BLOCK_FIELDS}
                {assign var=SUPPL_CHARGEMENT_KEY value=$SUPPL_BLOCK_KEY}
            {else}
                {assign var=SUPPL_LIVRAISON_FIELDS value=$SUPPL_BLOCK_FIELDS}
                {assign var=SUPPL_LIVRAISON_KEY value=$SUPPL_BLOCK_KEY}
            {/if}
        {/if}
    {/foreach}

    {* Render single accordion if we have any supplementary addresses *}
    {if $SUPPL_CHARGEMENT_FIELDS neq null || $SUPPL_LIVRAISON_FIELDS neq null}
    <div class="card accordion-card suppl-address-accordion" style="padding: 0; overflow: hidden;">
        <div class="card-header header-gray accordion-header" style="margin: 0; border-radius: 12px;" onclick="UnifiedDetails.toggleAccordion(this)">
            <i class="fa fa-plus-circle"></i> ADRESSE SUPPLÉMENTAIRE
            <i class="fa fa-chevron-down accordion-arrow"></i>
        </div>

        <div class="accordion-content" style="display: none;">
            <div class="suppl-address-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 15px;">
                {* CHARGEMENT supplementary block *}
                {if $SUPPL_CHARGEMENT_FIELDS neq null}
                <div class="suppl-block suppl-chargement" data-block="{$SUPPL_CHARGEMENT_KEY}">
                    <div class="suppl-block-header header-green-light" style="padding: 10px 15px; border-radius: 8px 8px 0 0; color: white; font-weight: 600;">
                        <i class="fa fa-upload"></i> Chargement
                    </div>
                    <div class="form-fields-grid form-fields-address" style="padding: 15px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
                    {foreach item=FIELD_MODEL key=FIELD_NAME from=$SUPPL_CHARGEMENT_FIELDS}
                        {if !$FIELD_MODEL->isViewableInDetailView()}
                            {continue}
                        {/if}
                        {if $FIELD_NAME eq 'cf_1043' || $FIELD_NAME eq 'cf_1049' || $FIELD_NAME eq 'cf_1045' || $FIELD_NAME eq 'cf_1047'}
                            {continue}
                        {/if}
                        {assign var=fieldDataType value=$FIELD_MODEL->getFieldDataType()}
                        {assign var=FIELD_VALUE value=$FIELD_MODEL->get('fieldvalue')}
                        {assign var=IS_EDITABLE value=$FIELD_MODEL->isEditable()}
                        {if $FIELD_MODEL->get('uitype') eq '19' || $FIELD_MODEL->get('uitype') eq '20'}
                            <div class="form-group form-group-full">
                                <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                {if $IS_EDITABLE}
                                    <textarea class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" rows="2">{$FIELD_VALUE}</textarea>
                                {else}
                                    <div class="field-value field-value-text field-readonly">{if $FIELD_VALUE}{$FIELD_VALUE}{else}--{/if}</div>
                                {/if}
                            </div>
                        {elseif $fieldDataType eq 'picklist'}
                            <div class="form-group">
                                <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                {if $IS_EDITABLE}
                                    <select class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}">
                                        <option value="">--</option>
                                        {foreach item=PICKLIST_VALUE from=$FIELD_MODEL->getPicklistValues()}
                                            <option value="{$PICKLIST_VALUE}" {if $FIELD_VALUE eq $PICKLIST_VALUE}selected{/if}>{vtranslate($PICKLIST_VALUE, $MODULE_NAME)}</option>
                                        {/foreach}
                                    </select>
                                {else}
                                    <div class="field-value field-readonly">{vtranslate($FIELD_VALUE, $MODULE_NAME)}</div>
                                {/if}
                            </div>
                        {elseif $fieldDataType eq 'boolean'}
                            <div class="form-group">
                                <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                {if $IS_EDITABLE}
                                    <select class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}">
                                        <option value="1" {if $FIELD_VALUE eq '1' || $FIELD_VALUE eq 'on'}selected{/if}>Oui</option>
                                        <option value="0" {if $FIELD_VALUE eq '0' || $FIELD_VALUE eq '' || $FIELD_VALUE eq 'off'}selected{/if}>Non</option>
                                    </select>
                                {else}
                                    <div class="field-value field-readonly">{if $FIELD_VALUE eq '1' || $FIELD_VALUE eq 'on'}Oui{else}Non{/if}</div>
                                {/if}
                            </div>
                        {elseif $fieldDataType eq 'date'}
                            <div class="form-group">
                                <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                {if $IS_EDITABLE}
                                    {assign var=DATE_VALUE value=''}
                                    {if $FIELD_VALUE}{assign var=DATE_VALUE value=$FIELD_VALUE|date_format:'%Y-%m-%d'}{/if}
                                    <input type="date" class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" value="{$DATE_VALUE}">
                                {else}
                                    <div class="field-value field-readonly">{$FIELD_MODEL->getDisplayValue($FIELD_VALUE)}</div>
                                {/if}
                            </div>
                        {else}
                            <div class="form-group">
                                <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                {if $IS_EDITABLE}
                                    <input type="text" class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" value="{decode_html($FIELD_VALUE)|escape:'html'}">
                                {else}
                                    <div class="field-value field-readonly">{if $FIELD_VALUE}{$FIELD_VALUE}{else}--{/if}</div>
                                {/if}
                            </div>
                        {/if}
                    {/foreach}
                    </div>
                </div>
                {/if}

                {* LIVRAISON supplementary block *}
                {if $SUPPL_LIVRAISON_FIELDS neq null}
                <div class="suppl-block suppl-livraison" data-block="{$SUPPL_LIVRAISON_KEY}">
                    <div class="suppl-block-header header-red-light" style="padding: 10px 15px; border-radius: 8px 8px 0 0; color: white; font-weight: 600;">
                        <i class="fa fa-download"></i> Livraison
                    </div>
                    <div class="form-fields-grid form-fields-address" style="padding: 15px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
                    {foreach item=FIELD_MODEL key=FIELD_NAME from=$SUPPL_LIVRAISON_FIELDS}
                        {if !$FIELD_MODEL->isViewableInDetailView()}
                            {continue}
                        {/if}
                        {if $FIELD_NAME eq 'cf_1043' || $FIELD_NAME eq 'cf_1049' || $FIELD_NAME eq 'cf_1045' || $FIELD_NAME eq 'cf_1047'}
                            {continue}
                        {/if}
                        {assign var=fieldDataType value=$FIELD_MODEL->getFieldDataType()}
                        {assign var=FIELD_VALUE value=$FIELD_MODEL->get('fieldvalue')}
                        {assign var=IS_EDITABLE value=$FIELD_MODEL->isEditable()}
                        {if $FIELD_MODEL->get('uitype') eq '19' || $FIELD_MODEL->get('uitype') eq '20'}
                            <div class="form-group form-group-full">
                                <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                {if $IS_EDITABLE}
                                    <textarea class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" rows="2">{$FIELD_VALUE}</textarea>
                                {else}
                                    <div class="field-value field-value-text field-readonly">{if $FIELD_VALUE}{$FIELD_VALUE}{else}--{/if}</div>
                                {/if}
                            </div>
                        {elseif $fieldDataType eq 'picklist'}
                            <div class="form-group">
                                <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                {if $IS_EDITABLE}
                                    <select class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}">
                                        <option value="">--</option>
                                        {foreach item=PICKLIST_VALUE from=$FIELD_MODEL->getPicklistValues()}
                                            <option value="{$PICKLIST_VALUE}" {if $FIELD_VALUE eq $PICKLIST_VALUE}selected{/if}>{vtranslate($PICKLIST_VALUE, $MODULE_NAME)}</option>
                                        {/foreach}
                                    </select>
                                {else}
                                    <div class="field-value field-readonly">{vtranslate($FIELD_VALUE, $MODULE_NAME)}</div>
                                {/if}
                            </div>
                        {elseif $fieldDataType eq 'boolean'}
                            <div class="form-group">
                                <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                {if $IS_EDITABLE}
                                    <select class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}">
                                        <option value="1" {if $FIELD_VALUE eq '1' || $FIELD_VALUE eq 'on'}selected{/if}>Oui</option>
                                        <option value="0" {if $FIELD_VALUE eq '0' || $FIELD_VALUE eq '' || $FIELD_VALUE eq 'off'}selected{/if}>Non</option>
                                    </select>
                                {else}
                                    <div class="field-value field-readonly">{if $FIELD_VALUE eq '1' || $FIELD_VALUE eq 'on'}Oui{else}Non{/if}</div>
                                {/if}
                            </div>
                        {elseif $fieldDataType eq 'date'}
                            <div class="form-group">
                                <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                {if $IS_EDITABLE}
                                    {assign var=DATE_VALUE value=''}
                                    {if $FIELD_VALUE}{assign var=DATE_VALUE value=$FIELD_VALUE|date_format:'%Y-%m-%d'}{/if}
                                    <input type="date" class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" value="{$DATE_VALUE}">
                                {else}
                                    <div class="field-value field-readonly">{$FIELD_MODEL->getDisplayValue($FIELD_VALUE)}</div>
                                {/if}
                            </div>
                        {else}
                            <div class="form-group">
                                <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                                {if $IS_EDITABLE}
                                    <input type="text" class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" value="{decode_html($FIELD_VALUE)|escape:'html'}">
                                {else}
                                    <div class="field-value field-readonly">{if $FIELD_VALUE}{$FIELD_VALUE}{else}--{/if}</div>
                                {/if}
                            </div>
                        {/if}
                    {/foreach}
                    </div>
                </div>
                {/if}
            </div>
        </div>
    </div>
    {/if}

    {* =====================================================
       OTHER BLOCKS - Dynamic from RECORD_STRUCTURE (skip already rendered blocks)
       ===================================================== *}
    {foreach key=BLOCK_LABEL_KEY item=FIELD_MODEL_LIST from=$RECORD_STRUCTURE}
        {* Skip side-by-side blocks already rendered above *}
        {if in_array($BLOCK_LABEL_KEY, $SIDE_BY_SIDE_BLOCKS)}
            {continue}
        {/if}
        {* Skip supplementary address blocks (rendered above) *}
        {if strpos(strtolower($BLOCK_LABEL_KEY), 'suppl') !== false}
            {continue}
        {/if}
        {* Skip Info/Detail block (rendered before supplementary addresses) *}
        {if $BLOCK_LABEL_KEY eq 'LBL_OPPORTUNITY_INFORMATION' || $BLOCK_LABEL_KEY eq 'LBL_POTENTIALS_INFORMATION'}
            {continue}
        {/if}
        {* Skip Instructions block (rendered after Detail block) *}
        {if $BLOCK_LABEL_KEY eq 'INSTRUCTIONS' || strpos(strtolower($BLOCK_LABEL_KEY), 'instruction') !== false}
            {continue}
        {/if}

        {if isset($BLOCK_LIST[$BLOCK_LABEL_KEY])}
            {assign var=BLOCK value=$BLOCK_LIST[$BLOCK_LABEL_KEY]}
        {else}
            {assign var=BLOCK value=''}
        {/if}

        {if $BLOCK eq null or $FIELD_MODEL_LIST|@count lte 0}{continue}{/if}

        {* Determine section color based on block name *}
        {assign var=SECTION_CLASS value='section-default'}
        {assign var=TITLE_CLASS value='title-blue'}
        {assign var=ICON_CLASS value='fa-info-circle'}

        {if $BLOCK_LABEL_KEY eq 'LBL_CUSTOM_INFORMATION' || strpos(strtolower($BLOCK_LABEL_KEY), 'personnalis') !== false}
            {assign var=SECTION_CLASS value='section-custom'}
            {assign var=TITLE_CLASS value='title-blue'}
            {assign var=ICON_CLASS value='fa-cog'}
            {assign var=IS_CUSTOM_ACCORDION value=true}
        {elseif $BLOCK_LABEL_KEY eq 'LBL_DESCRIPTION_INFORMATION'}
            {assign var=SECTION_CLASS value='section-description'}
            {assign var=TITLE_CLASS value='title-orange'}
            {assign var=ICON_CLASS value='fa-align-left'}
        {elseif $BLOCK_LABEL_KEY eq 'INSTRUCTIONS'}
            {assign var=SECTION_CLASS value='section-instructions'}
            {assign var=TITLE_CLASS value='title-blue'}
            {assign var=ICON_CLASS value='fa-list-ul'}
        {elseif strpos(strtoupper($BLOCK_LABEL_KEY), 'SOCI') !== false}
            {assign var=SECTION_CLASS value='section-societe'}
            {assign var=TITLE_CLASS value='title-purple'}
            {assign var=ICON_CLASS value='fa-building'}
            {assign var=IS_ACCORDION value=true}
            {assign var=HEADER_CLASS value='header-purple'}
        {elseif strpos($BLOCK_LABEL_KEY, 'suppl') !== false}
            {assign var=SECTION_CLASS value='section-supplementaire'}
            {assign var=TITLE_CLASS value='title-gray'}
            {assign var=ICON_CLASS value='fa-plus-circle'}
        {/if}

        {* Render SOCIÉTÉ block as accordion card *}
        {if strpos(strtoupper($BLOCK_LABEL_KEY), 'SOCI') !== false}
        <div class="card accordion-card section-societe" style="padding: 0; overflow: hidden;" data-block="{$BLOCK_LABEL_KEY}">
            <div class="card-header header-purple accordion-header" style="margin: 0; border-radius: 12px;" onclick="UnifiedDetails.toggleAccordion(this)">
                <i class="fa fa-building"></i> {vtranslate($BLOCK_LABEL_KEY, $MODULE_NAME)}
                <i class="fa fa-chevron-down accordion-arrow"></i>
            </div>

            <div class="accordion-content" style="display: none;">
                <div class="form-fields-grid form-fields-societe" style="padding: 15px;">
        {* Render Information personnalisée block as accordion card *}
        {elseif $BLOCK_LABEL_KEY eq 'LBL_CUSTOM_INFORMATION' || strpos(strtolower($BLOCK_LABEL_KEY), 'personnalis') !== false}
        <div class="card accordion-card section-custom" style="padding: 0; overflow: hidden;" data-block="{$BLOCK_LABEL_KEY}">
            <div class="card-header header-blue accordion-header" style="margin: 0; border-radius: 12px;" onclick="UnifiedDetails.toggleAccordion(this)">
                <i class="fa fa-cog"></i> {vtranslate($BLOCK_LABEL_KEY, $MODULE_NAME)}
                <i class="fa fa-chevron-down accordion-arrow"></i>
            </div>

            <div class="accordion-content" style="display: none;">
                <div class="form-fields-grid form-fields-custom" style="padding: 15px;">
        {else}
        <div class="form-section {$SECTION_CLASS}" data-block="{$BLOCK_LABEL_KEY}">
            <div class="form-section-title {$TITLE_CLASS}">
                <i class="fa {$ICON_CLASS}"></i>
                {vtranslate($BLOCK_LABEL_KEY, $MODULE_NAME)}
            </div>

            <div class="form-fields-grid">
        {/if}
                {foreach item=FIELD_MODEL key=FIELD_NAME from=$FIELD_MODEL_LIST}
                    {if !$FIELD_MODEL->isViewableInDetailView()}
                        {continue}
                    {/if}

                    {* Skip date fields handled by unified date selector *}
                    {* Skip fields shown in top metrics bar *}
                    {if $FIELD_NAME eq 'cf_1043' || $FIELD_NAME eq 'cf_1049' || $FIELD_NAME eq 'cf_1045' || $FIELD_NAME eq 'cf_1047' || $FIELD_NAME eq 'cf_939' || $FIELD_NAME eq 'cf_961'}
                        {continue}
                    {/if}

                    {assign var=fieldDataType value=$FIELD_MODEL->getFieldDataType()}
                    {assign var=FIELD_VALUE value=$FIELD_MODEL->get('fieldvalue')}
                    {assign var=IS_EDITABLE value=$FIELD_MODEL->isEditable()}

                    {* Full width for text areas and description *}
                    {if $FIELD_MODEL->get('uitype') eq '19' || $FIELD_MODEL->get('uitype') eq '20' || $FIELD_NAME eq 'description'}
                        <div class="form-group form-group-full">
                            <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                            {if $IS_EDITABLE}
                                <textarea class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" rows="3">{$FIELD_VALUE}</textarea>
                            {else}
                                <div class="field-value field-value-text field-readonly">
                                    {include file=vtemplate_path($FIELD_MODEL->getUITypeModel()->getDetailViewTemplateName(), $MODULE_NAME) FIELD_MODEL=$FIELD_MODEL USER_MODEL=$USER_MODEL MODULE=$MODULE_NAME RECORD=$RECORD}
                                </div>
                            {/if}
                        </div>
                    {* Image fields - read only *}
                    {elseif $FIELD_MODEL->get('uitype') eq '69' || $FIELD_MODEL->get('uitype') eq '105'}
                        <div class="form-group form-group-full">
                            <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                            <div class="field-value field-readonly">
                                {if isset($IMAGE_DETAILS)}
                                    {foreach key=ITER item=IMAGE_INFO from=$IMAGE_DETAILS}
                                        {if !empty($IMAGE_INFO.url)}
                                            <img src="{$IMAGE_INFO.url}" title="{$IMAGE_INFO.orgname}" style="max-width: 200px; max-height: 150px; border-radius: 8px;">
                                        {/if}
                                    {/foreach}
                                {/if}
                            </div>
                        </div>
                    {* Picklist fields *}
                    {elseif $fieldDataType eq 'picklist'}
                        <div class="form-group">
                            <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                            {if $IS_EDITABLE}
                                <select class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}">
                                    <option value="">--</option>
                                    {foreach item=PICKLIST_VALUE from=$FIELD_MODEL->getPicklistValues()}
                                        <option value="{$PICKLIST_VALUE}" {if $FIELD_VALUE eq $PICKLIST_VALUE}selected{/if}>{vtranslate($PICKLIST_VALUE, $MODULE_NAME)}</option>
                                    {/foreach}
                                </select>
                            {else}
                                <div class="field-value field-readonly">{vtranslate($FIELD_VALUE, $MODULE_NAME)}</div>
                            {/if}
                        </div>
                    {* Boolean/Checkbox fields *}
                    {elseif $fieldDataType eq 'boolean'}
                        <div class="form-group">
                            <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                            {if $IS_EDITABLE}
                                <select class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}">
                                    <option value="1" {if $FIELD_VALUE eq '1' || $FIELD_VALUE eq 'on'}selected{/if}>Oui</option>
                                    <option value="0" {if $FIELD_VALUE eq '0' || $FIELD_VALUE eq '' || $FIELD_VALUE eq 'off'}selected{/if}>Non</option>
                                </select>
                            {else}
                                <div class="field-value field-readonly">{if $FIELD_VALUE eq '1' || $FIELD_VALUE eq 'on'}Oui{else}Non{/if}</div>
                            {/if}
                        </div>
                    {* Date fields *}
                    {elseif $fieldDataType eq 'date'}
                        <div class="form-group">
                            <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                            {if $IS_EDITABLE}
                                {assign var=DATE_VALUE value=''}
                                {if $FIELD_VALUE}
                                    {assign var=DATE_VALUE value=$FIELD_VALUE|date_format:'%Y-%m-%d'}
                                {/if}
                                <input type="date" class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" value="{$DATE_VALUE}">
                            {else}
                                <div class="field-value field-readonly">{$FIELD_MODEL->getDisplayValue($FIELD_VALUE)}</div>
                            {/if}
                        </div>
                    {* Currency/Number fields *}
                    {elseif $fieldDataType eq 'currency' || $fieldDataType eq 'double' || $fieldDataType eq 'integer'}
                        <div class="form-group">
                            <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                            {if $IS_EDITABLE}
                                <input type="number" class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" value="{$FIELD_VALUE}" step="0.01">
                            {else}
                                <div class="field-value field-readonly">{$FIELD_MODEL->getDisplayValue($FIELD_VALUE)}</div>
                            {/if}
                        </div>
                    {* Owner field - editable with user dropdown *}
                    {elseif $fieldDataType eq 'owner'}
                        <div class="form-group">
                            <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                            {if $IS_EDITABLE}
                                {assign var="OWNER_FIELD_INFO" value=$FIELD_MODEL->getFieldInfo()}
                                {assign var="ALL_USERS" value=$OWNER_FIELD_INFO['picklistvalues'][vtranslate('LBL_USERS')]}
                                {assign var="ALL_GROUPS" value=$OWNER_FIELD_INFO['picklistvalues'][vtranslate('LBL_GROUPS')]}
                                <select class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}">
                                    <optgroup label="{vtranslate('LBL_USERS')}">
                                        {foreach key=OWNER_ID item=OWNER_NAME from=$ALL_USERS}
                                            <option value="{$OWNER_ID}" {if $FIELD_VALUE eq $OWNER_ID}selected{/if}>{$OWNER_NAME}</option>
                                        {/foreach}
                                    </optgroup>
                                    {if $ALL_GROUPS|@count > 0}
                                    <optgroup label="{vtranslate('LBL_GROUPS')}">
                                        {foreach key=OWNER_ID item=OWNER_NAME from=$ALL_GROUPS}
                                            <option value="{$OWNER_ID}" {if $FIELD_VALUE eq $OWNER_ID}selected{/if}>{$OWNER_NAME}</option>
                                        {/foreach}
                                    </optgroup>
                                    {/if}
                                </select>
                            {else}
                                <div class="field-value field-readonly" data-field-type="{$fieldDataType}">
                                    {include file=vtemplate_path($FIELD_MODEL->getUITypeModel()->getDetailViewTemplateName(), $MODULE_NAME) FIELD_MODEL=$FIELD_MODEL USER_MODEL=$USER_MODEL MODULE=$MODULE_NAME RECORD=$RECORD}
                                </div>
                            {/if}
                        </div>
                    {* Reference fields - read only *}
                    {elseif $fieldDataType eq 'reference' || $fieldDataType eq 'multireference'}
                        <div class="form-group">
                            <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                            <div class="field-value field-readonly" data-field-type="{$fieldDataType}">
                                {include file=vtemplate_path($FIELD_MODEL->getUITypeModel()->getDetailViewTemplateName(), $MODULE_NAME) FIELD_MODEL=$FIELD_MODEL USER_MODEL=$USER_MODEL MODULE=$MODULE_NAME RECORD=$RECORD}
                            </div>
                        </div>
                    {* Regular text fields *}
                    {else}
                        <div class="form-group">
                            <label>{vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</label>
                            {if $IS_EDITABLE}
                                <input type="text" class="unified-field-input" name="{$FIELD_NAME}" data-fieldname="{$FIELD_NAME}" data-fieldtype="{$fieldDataType}" value="{decode_html($FIELD_VALUE)|escape:'html'}">
                            {else}
                                <div class="field-value field-readonly" data-field-type="{$fieldDataType}">
                                    {include file=vtemplate_path($FIELD_MODEL->getUITypeModel()->getDetailViewTemplateName(), $MODULE_NAME) FIELD_MODEL=$FIELD_MODEL USER_MODEL=$USER_MODEL MODULE=$MODULE_NAME RECORD=$RECORD}
                                </div>
                            {/if}
                        </div>
                    {/if}
                {/foreach}
            </div>
        {if strpos(strtoupper($BLOCK_LABEL_KEY), 'SOCI') !== false || $BLOCK_LABEL_KEY eq 'LBL_CUSTOM_INFORMATION' || strpos(strtolower($BLOCK_LABEL_KEY), 'personnalis') !== false}
            </div>
        {/if}
        </div>
    {/foreach}
</div>
{/strip}

<style>
/* Details Tab - EXACT SAME STYLES AS Devis Tab */

/* Address Row - CHARGEMENT & DESTINATION side by side (same as forfait-products-row) */
.details-tab-container .address-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 15px;
}

.details-tab-container .address-row .form-section {
    margin-bottom: 0;
}

/* Form Section - SAME AS DEVIS */
.details-tab-container .form-section {
    padding: 12px;
    margin-bottom: 10px;
}

/* Form Section Title - SAME AS DEVIS */
.details-tab-container .form-section-title {
    font-size: 13px;
    margin-bottom: 10px;
}

/* Form Group - SAME AS DEVIS */
.details-tab-container .form-group {
    margin-bottom: 8px;
}

/* Form Group Label - SAME AS DEVIS */
.details-tab-container .form-group label {
    font-size: 11px;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

/* Form Inputs - SAME AS DEVIS */
.details-tab-container .form-group input,
.details-tab-container .form-group select,
.details-tab-container .unified-field-input {
    padding: 8px 10px;
    font-size: 13px;
    transition: border-color 0.3s, box-shadow 0.3s;
}

/* Auto-save visual feedback */
.details-tab-container .unified-field-input.field-saving {
    border-color: #f39c12 !important;
    box-shadow: 0 0 0 2px rgba(243, 156, 18, 0.2);
}

.details-tab-container .unified-field-input.field-saved {
    border-color: #27ae60 !important;
    box-shadow: 0 0 0 2px rgba(39, 174, 96, 0.2);
}

.details-tab-container .unified-field-input.field-error {
    border-color: #e74c3c !important;
    box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
}

/* 2 columns grid - SAME AS DEVIS */
.details-tab-container .form-row-2,
.details-tab-container .form-fields-address {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

/* 3 columns grid for other blocks */
.details-tab-container .form-fields-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}

/* 4 columns grid for Détail/Info block */
.details-tab-container .section-info .form-fields-grid {
    grid-template-columns: repeat(4, 1fr);
}

.details-tab-container .form-group-full {
    grid-column: 1 / -1;
}

/* Card header light variants for supplementary addresses */
.details-tab-container .card-header.header-green-light {
    background: linear-gradient(135deg, #48c774 0%, #3abb67 100%);
}

.details-tab-container .card-header.header-red-light {
    background: linear-gradient(135deg, #f27c7c 0%, #e05555 100%);
}

/* Card header purple for SOCIÉTÉ */
.details-tab-container .card-header.header-purple {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Card header blue for Information personnalisée */
.details-tab-container .card-header.header-blue {
    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
}

/* Card header orange for Instructions */
.details-tab-container .card-header.header-orange {
    background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
}

/* Card header gray for Adresse Supplémentaire */
.details-tab-container .card-header.header-gray {
    background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
}

/* Supplementary address blocks side by side */
.details-tab-container .suppl-address-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.details-tab-container .suppl-block-header {
    padding: 10px 15px;
    border-radius: 8px 8px 0 0;
    color: white;
    font-weight: 600;
}

.details-tab-container .suppl-block-header.header-green-light {
    background: linear-gradient(135deg, #48c774 0%, #3abb67 100%);
}

.details-tab-container .suppl-block-header.header-red-light {
    background: linear-gradient(135deg, #f27c7c 0%, #e05555 100%);
}

@media (max-width: 992px) {
    .details-tab-container .suppl-address-row {
        grid-template-columns: 1fr;
    }
}

/* 4 columns grid for SOCIÉTÉ block */
.details-tab-container .form-fields-societe {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}

/* 4 columns grid for Information personnalisée block */
.details-tab-container .form-fields-custom {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}

/* 2 columns grid for Instructions block */
.details-tab-container .form-fields-instructions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
}

.details-tab-container .instruction-textarea {
    min-height: 100px;
    resize: vertical;
}

/* No border for instructions accordion */
.details-tab-container .accordion-card.section-instructions {
    border-left: none !important;
}

/* Cards in address-row need no margin */
.details-tab-container .address-row .card {
    margin-bottom: 0;
}

/* Accordion styles for supplementary addresses and SOCIÉTÉ */
.details-tab-container .accordion-card {
    border-radius: 12px;
    margin-bottom: 15px;
    border-left: none !important;
}

.details-tab-container .accordion-card.section-societe {
    border-left: none !important;
}

.details-tab-container .accordion-header {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.3s ease;
    user-select: none;
}

.details-tab-container .accordion-header:hover {
    filter: brightness(1.05);
}

.details-tab-container .accordion-arrow {
    margin-left: auto;
    transition: transform 0.3s ease;
    font-size: 14px;
}

.details-tab-container .accordion-header.open .accordion-arrow {
    transform: rotate(180deg);
}

.details-tab-container .accordion-header.open {
    border-radius: 12px 12px 0 0 !important;
}

.details-tab-container .accordion-content {
    overflow: hidden;
    transition: max-height 0.3s ease-out;
    background: #fff;
}

/* Title colors for form-sections */

.details-tab-container .form-section-title.title-purple {
    color: #667eea;
}

.details-tab-container .form-section-title.title-purple i {
    color: #667eea;
}

.details-tab-container .form-section-title.title-orange {
    color: #e67e22;
}

.details-tab-container .form-section-title.title-orange i {
    color: #e67e22;
}

.details-tab-container .form-section-title.title-blue {
    color: #3498db;
}

.details-tab-container .form-section-title.title-blue i {
    color: #3498db;
}

.details-tab-container .form-section-title.title-gray {
    color: #6c757d;
}

.details-tab-container .form-section-title.title-gray i {
    color: #6c757d;
}

/* Info section - blue border */
.details-tab-container .section-info {
    border-left: 3px solid #3498db;
}

/* Custom section - no border when accordion */
.details-tab-container .accordion-card.section-custom {
    border-left: none !important;
}

/* Description section - orange border (same as Devis tarification) */
.details-tab-container .section-description {
    border-top: 3px solid #e67e22;
    border-left: none;
}

/* Read-only field values - compact like Devis */
.details-tab-container .form-group .field-value {
    font-size: 13px;
    color: #333;
    padding: 8px 10px;
    background: #f8f9fa;
    border-radius: 8px;
    min-height: 36px;
    display: flex;
    align-items: center;
    word-break: break-word;
}

.details-tab-container .form-group .field-value.field-readonly {
    background: #f0f0f0;
    color: #666;
}

.details-tab-container .form-group .field-value:empty::before {
    content: '--';
    color: #ccc;
}

.details-tab-container .form-group .field-value-text {
    min-height: 60px;
    align-items: flex-start;
    white-space: pre-wrap;
}

/* Style for links inside field values */
.details-tab-container .form-group .field-value a {
    color: #667eea;
    text-decoration: none;
}

.details-tab-container .form-group .field-value a:hover {
    text-decoration: underline;
}

/* Responsive */
@media (max-width: 1200px) {
    .details-tab-container .section-info .form-fields-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 1200px) {
    .details-tab-container .form-fields-societe,
    .details-tab-container .form-fields-custom {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 992px) {
    .details-tab-container .address-row {
        grid-template-columns: 1fr;
    }

    .details-tab-container .form-fields-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .details-tab-container .section-info .form-fields-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .details-tab-container .form-fields-societe,
    .details-tab-container .form-fields-custom {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 576px) {
    .details-tab-container .form-fields-grid,
    .details-tab-container .form-fields-address,
    .details-tab-container .form-row-2,
    .details-tab-container .section-info .form-fields-grid,
    .details-tab-container .form-fields-societe,
    .details-tab-container .form-fields-custom,
    .details-tab-container .form-fields-instructions {
        grid-template-columns: 1fr;
    }

    .details-tab-container .date-selector-compact {
        flex-direction: row;
        align-items: center;
        gap: 5px !important;
        padding: 5px !important;
        flex-wrap: wrap;
        margin-bottom: 8px !important;
    }

    .details-tab-container .date-selector-label {
        justify-content: flex-start;
        font-size: 13px;
        flex-shrink: 0;
    }

    .details-tab-container .date-mode-toggle-compact {
        flex: 1;
        justify-content: flex-end;
        min-width: 200px;
    }

    .details-tab-container .date-mode-btn {
        flex: 1;
        text-align: center;
        padding: 6px 12px !important;
        font-size: 11px !important;
    }

    .details-tab-container .date-unique-container,
    .details-tab-container .date-period-container {
        width: 100% !important;
        flex-direction: row !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
    }

    .details-tab-container .date-field-item {
        width: calc(50% - 3px) !important;
        justify-content: space-between;
        flex-shrink: 0 !important;
    }

    .details-tab-container .date-field-label {
        font-size: 12px;
    }

    .details-tab-container .date-input-compact {
        flex: 1;
        width: auto;
        min-width: 0;
        font-size: 13px;
        padding: 6px 8px;
    }

    .details-tab-container .key-metrics-compact {
        width: 100% !important;
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
    }

    .details-tab-container .metrics-separator {
        display: none !important;
    }

    .details-tab-container .metric-item {
        width: calc(33.33% - 4px) !important;
        justify-content: space-between;
        padding: 3px 6px !important;
        flex-shrink: 0 !important;
    }

    .details-tab-container .metric-label {
        font-size: 10px;
    }

    .details-tab-container .metric-value {
        font-size: 14px;
        min-width: 50px;
    }

    .details-tab-container .metric-unit {
        font-size: 12px;
    }

    .details-tab-container .metrics-separator {
        display: none;
    }
}

/* Compact Date Selector Component */
.details-tab-container .date-selector-compact {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
    padding: 5px 5px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 12px;
    margin-bottom: 15px;
    flex-wrap: wrap;
}

.details-tab-container .date-selector-label {
    font-weight: 600;
    color: #00b4db;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.details-tab-container .date-selector-label i {
    font-size: 14px;
}

.details-tab-container .date-mode-toggle-compact {
    display: flex;
    gap: 5px;
    background: #fff;
    padding: 3px;
    border-radius: 20px;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
}

.details-tab-container .date-mode-btn {
    padding: 6px 14px;
    border-radius: 18px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #666;
    background: transparent;
    margin-bottom:0px;
}

.details-tab-container .date-mode-btn:hover {
    background: #f0f0f0;
}

.details-tab-container .date-mode-btn.active {
    background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%);
    color: #fff;
}

.details-tab-container .date-mode-btn input[type="radio"] {
    display: none;
}

.details-tab-container .date-fields-compact {
    display: flex;
    align-items: center;
    gap: 12px;
}

.details-tab-container .date-field-item {
    display: flex;
    align-items: center;
    gap: 6px;
}

.details-tab-container .date-field-label {
    font-size: 11px;
    font-weight: 600;
    color: #555;
    white-space: nowrap;
}

.details-tab-container .date-field-label i {
    font-size: 12px;
}

.details-tab-container .date-input-compact {
    padding: 6px 10px;
    font-size: 13px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fff;
    transition: all 0.2s ease;
    width: 140px;
}

.details-tab-container .date-input-compact:focus {
    border-color: #00b4db;
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 180, 219, 0.15);
}

/* Key Metrics Separator & Container */
.details-tab-container .metrics-separator {
    width: 1px;
    height: 30px;
    background: linear-gradient(to bottom, transparent, #ccc, transparent);
    margin: 0 5px;
}

.details-tab-container .key-metrics-compact {
    display: flex;
    align-items: center;
    gap: 15px;
}

.details-tab-container .metric-item {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #fff;
    padding: 5px 10px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.details-tab-container .metric-label {
    font-size: 11px;
    font-weight: 600;
    color: #555;
    white-space: nowrap;
}

.details-tab-container .metric-label i {
    margin-right: 3px;
}

.details-tab-container .metric-value {
    font-size: 13px;
    font-weight: 700;
    color: #333;
    min-width: 35px;
    text-align: right;
}

.details-tab-container .metric-unit {
    font-size: 10px;
    color: #888;
    font-weight: 500;
}

@media (max-width: 992px) {
    .details-tab-container .key-metrics-compact {
        width: 100%;
        justify-content: center;
        margin-top: 10px;
    }

    .details-tab-container .metrics-separator {
        display: none;
    }
}

/* Address Autocomplete Dropdown */
.address-autocomplete-dropdown {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    max-height: 300px;
    overflow-y: auto;
}

.address-autocomplete-dropdown .autocomplete-item {
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
    transition: background-color 0.15s ease;
}

.address-autocomplete-dropdown .autocomplete-item:last-child {
    border-bottom: none;
}

.address-autocomplete-dropdown .autocomplete-item:hover {
    background-color: #f5f5f5;
}

.address-autocomplete-dropdown .autocomplete-item strong {
    color: #333;
}
</style>

<script>
{literal}
// UnifiedDetails controller
var UnifiedDetails = {
    recordId: null,
    moduleName: null,
    contactId: null,

    // Configuration for postal code / city pairs
    postalCityPairs: [
        { postal: 'cf_935', city: 'cf_933' },     // CHARGEMENT
        { postal: 'cf_951', city: 'cf_949' },     // DESTINATION (LIVRAISON)
        { postal: 'cf_1099', city: 'cf_1103' },   // Suppl chargement
        { postal: 'cf_1101', city: 'cf_1105' },   // Suppl chargement 2
        { postal: 'cf_1111', city: 'cf_1115' },   // Suppl livraison
        { postal: 'cf_1113', city: 'cf_1117' },   // Suppl livraison 2
        { postal: 'cf_1263', city: 'cf_1265' }    // Société
    ],

    // Configuration for address groups (address + postal + city)
    addressGroups: [
        { address: 'cf_955', postal: 'cf_935', city: 'cf_933', label: 'CHARGEMENT' },
        { address: 'cf_957', postal: 'cf_951', city: 'cf_949', label: 'LIVRAISON' },
        { address: 'cf_1107', postal: 'cf_1099', city: 'cf_1103', label: 'Suppl-Charg' },
        { address: 'cf_1109', postal: 'cf_1101', city: 'cf_1105', label: 'Suppl-Charg-2' },
        { address: 'cf_1119', postal: 'cf_1111', city: 'cf_1115', label: 'Suppl-Livr' },
        { address: 'cf_1121', postal: 'cf_1113', city: 'cf_1117', label: 'Suppl-Livr-2' },
        { address: 'cf_1267', postal: 'cf_1263', city: 'cf_1265', label: 'Société' }
    ],

    init: function() {
        var container = jQuery('#detailsTabContainer');
        this.recordId = container.data('record-id');
        this.moduleName = container.data('module');
        this.contactId = container.data('contact-id');
        console.log('[UnifiedDetails] Initialized for record', this.recordId, 'contact', this.contactId);

        // Initialize date selector
        this.initDateSelector();

        // Initialize address autocomplete
        this.registerPostalCityAutoComplete();
        this.registerAddressAutoComplete();

        // Initialize auto-save for all fields
        this.initAutoSave();
    },

    initAutoSave: function() {
        var self = this;
        var saveTimeout = {};

        // Auto-save on change for select, checkbox, date inputs (exclude contact-sync fields)
        jQuery('#detailsTabContainer').on('change', '.unified-field-input:not(.contact-sync-field)', function() {
            var field = jQuery(this);
            var fieldName = field.data('fieldname') || field.attr('name');
            self.saveField(fieldName, field.val());
        });

        // Auto-save on input for text inputs and textareas (debounced 500ms, exclude contact-sync fields)
        jQuery('#detailsTabContainer').on('input', 'input.unified-field-input[type="text"]:not(.contact-sync-field), textarea.unified-field-input', function() {
            var field = jQuery(this);
            var fieldName = field.data('fieldname') || field.attr('name');
            if (saveTimeout[fieldName]) clearTimeout(saveTimeout[fieldName]);
            saveTimeout[fieldName] = setTimeout(function() {
                self.saveField(fieldName, field.val());
            }, 500);
        });

        // Auto-save contact sync fields (Nom/Prénom) on input (debounced 500ms)
        jQuery('#detailsTabContainer').on('input', '.contact-sync-field', function() {
            var field = jQuery(this);
            var key = 'contact_' + field.data('contact-field');
            if (saveTimeout[key]) clearTimeout(saveTimeout[key]);
            saveTimeout[key] = setTimeout(function() {
                field.trigger('_contactSave');
            }, 500);
        });

        // Auto-save contact sync fields (selects like Salutation) on change
        jQuery('#detailsTabContainer').on('change', 'select.contact-sync-field', function() {
            jQuery(this).trigger('_contactSave');
        });

        // Contact sync save handler
        jQuery('#detailsTabContainer').on('_contactSave', '.contact-sync-field', function() {
            var field = jQuery(this);
            var contactField = field.data('contact-field');
            var fieldValue = field.val();
            if (!self.contactId || !contactField) return;

            field.addClass('field-saving');
            jQuery.ajax({
                url: 'index.php',
                type: 'POST',
                data: {
                    module: 'Contacts',
                    action: 'SaveAjax',
                    record: self.contactId,
                    field: contactField,
                    value: fieldValue
                },
                success: function() {
                    field.removeClass('field-saving').addClass('field-saved');
                    setTimeout(function() { field.removeClass('field-saved'); }, 1500);
                    // Update header name and potentialname
                    var firstname = jQuery('.contact-sync-field[data-contact-field="firstname"]').val() || '';
                    var lastname = jQuery('.contact-sync-field[data-contact-field="lastname"]').val() || '';
                    var fullName = (firstname + ' ' + lastname).trim();
                    jQuery('.unified-header-left h1').html('<i class="fa fa-user-circle"></i> ' + fullName);
                    // Sync potentialname with contact name
                    if (fullName) {
                        self.saveField('potentialname', fullName);
                    }
                },
                error: function() {
                    field.removeClass('field-saving').addClass('field-error');
                    setTimeout(function() { field.removeClass('field-error'); }, 3000);
                }
            });
        });

        console.log('[UnifiedDetails] Auto-save initialized');
    },

    saveField: function(fieldName, fieldValue) {
        var self = this;

        if (!fieldName || !this.recordId) {
            console.warn('[UnifiedDetails] Cannot save: missing fieldName or recordId');
            return;
        }

        console.log('[UnifiedDetails] Saving field:', fieldName, '=', fieldValue);

        // Show saving indicator
        var field = jQuery('[data-fieldname="' + fieldName + '"], [name="' + fieldName + '"]').first();
        field.addClass('field-saving');

        // Prepare data for VTiger save
        var params = {
            module: this.moduleName,
            action: 'SaveAjax',
            record: this.recordId,
            field: fieldName,
            value: fieldValue
        };

        jQuery.ajax({
            url: 'index.php',
            type: 'POST',
            data: params,
            success: function(response) {
                field.removeClass('field-saving').addClass('field-saved');
                setTimeout(function() {
                    field.removeClass('field-saved');
                }, 1500);
                console.log('[UnifiedDetails] Field saved successfully:', fieldName);

                // Update global metrics bar + local metrics display
                if (typeof window.updateGlobalMetrics === 'function') {
                    window.updateGlobalMetrics(fieldName, fieldValue);
                }
                var localMetricMap = { 'cf_961': '#metric_distance', 'cf_939': '#metric_volume_estime', 'cf_1259': '#metric_volume_final' };
                if (localMetricMap[fieldName]) {
                    jQuery(localMetricMap[fieldName]).text(fieldValue || '--');
                }

                // Open rappel popup when status changes to "A Rappeler"
                if (fieldName === 'cf_971' && fieldValue === 'A Rappeler') {
                    setTimeout(function() {
                        var recordName = jQuery('.unified-header-left h1').text().trim() || 'Cette affaire';
                        var userId = 1;
                        try { if (typeof app !== 'undefined' && app.getUserId) userId = app.getUserId(); } catch(e) { }
                        var popupUrl = window.location.protocol + '//' + window.location.host + '/rappel_popup.php?module=Potentials&record_id=' + self.recordId + '&record_name=' + encodeURIComponent(recordName) + '&user_id=' + userId;
                        var newTab = window.open(popupUrl, '_blank');
                        if (newTab) newTab.focus();
                    }, 500);
                }

                // Sync email/mobile to Contact record and update header
                var contactFieldMap = { 'cf_1123': 'email', 'cf_981': 'mobile' };
                if (contactFieldMap[fieldName]) {
                    // Update header display
                    if (fieldName === 'cf_1123') {
                        var headerEmail = jQuery('#header-contact-email');
                        headerEmail.find('span').text(fieldValue);
                        headerEmail.toggle(!!fieldValue);
                    } else if (fieldName === 'cf_981') {
                        var headerPhone = jQuery('#header-contact-phone');
                        headerPhone.find('span').text(fieldValue);
                        headerPhone.toggle(!!fieldValue);
                    }
                    // Sync to Contact
                    if (self.contactId) {
                        jQuery.ajax({
                            url: 'index.php',
                            type: 'POST',
                            data: {
                                module: 'Contacts',
                                action: 'SaveAjax',
                                record: self.contactId,
                                field: contactFieldMap[fieldName],
                                value: fieldValue
                            },
                            success: function() {
                                console.log('[UnifiedDetails] Contact field synced:', contactFieldMap[fieldName]);
                            },
                            error: function() {
                                console.error('[UnifiedDetails] Error syncing contact field:', contactFieldMap[fieldName]);
                            }
                        });
                    }
                }
            },
            error: function(xhr, status, error) {
                field.removeClass('field-saving').addClass('field-error');
                setTimeout(function() {
                    field.removeClass('field-error');
                }, 3000);
                console.error('[UnifiedDetails] Error saving field:', fieldName, error);
                app.helper.showErrorNotification({message: 'Erreur lors de la sauvegarde de ' + fieldName});
            }
        });
    },

    initDateSelector: function() {
        var self = this;

        // Mode toggle click handlers (support both old and new selectors)
        jQuery('.date-mode-btn, .date-mode-option').on('click', function() {
            var mode = jQuery(this).data('mode');
            self.setDateMode(mode);
        });

        // Date unique inputs - update hidden fields and auto-save
        jQuery('#date_unique_chargement').on('change', function() {
            var val = jQuery(this).val();
            jQuery('#hidden_cf_1043').val(val);
            self.saveField('cf_1043', val);
        });

        jQuery('#date_unique_livraison').on('change', function() {
            var val = jQuery(this).val();
            jQuery('#hidden_cf_1049').val(val);
            self.saveField('cf_1049', val);
        });

        // Period inputs - update hidden fields and auto-save
        jQuery('#date_periode_debut').on('change', function() {
            var val = jQuery(this).val();
            jQuery('#hidden_cf_1045').val(val);
            self.saveField('cf_1045', val);
        });

        jQuery('#date_periode_fin').on('change', function() {
            var val = jQuery(this).val();
            jQuery('#hidden_cf_1047').val(val);
            self.saveField('cf_1047', val);
        });
    },

    setDateMode: function(mode) {
        var self = this;

        // Update toggle visual state (support both old and new selectors)
        jQuery('.date-mode-btn, .date-mode-option').removeClass('active');
        jQuery('.date-mode-btn[data-mode="' + mode + '"], .date-mode-option[data-mode="' + mode + '"]').addClass('active');
        jQuery('.date-mode-btn[data-mode="' + mode + '"] input, .date-mode-option[data-mode="' + mode + '"] input').prop('checked', true);

        if (mode === 'unique') {
            // Show unique date, hide period
            jQuery('.date-unique-container').show();
            jQuery('.date-period-container').hide();

            // Clear period hidden fields and save
            jQuery('#hidden_cf_1045').val('');
            jQuery('#hidden_cf_1047').val('');
            jQuery('#date_periode_debut').val('');
            jQuery('#date_periode_fin').val('');

            // Auto-save: clear period dates
            self.saveField('cf_1045', '');
            self.saveField('cf_1047', '');
        } else {
            // Show period, hide unique date
            jQuery('.date-unique-container').hide();
            jQuery('.date-period-container').show();

            // Clear unique date hidden fields and save
            jQuery('#hidden_cf_1043').val('');
            jQuery('#hidden_cf_1049').val('');
            jQuery('#date_unique_chargement').val('');
            jQuery('#date_unique_livraison').val('');

            // Auto-save: clear unique dates
            self.saveField('cf_1043', '');
            self.saveField('cf_1049', '');
        }
    },

    save: function() {
        var self = this;
        var container = jQuery('#detailsTabContainer');
        var data = {
            module: this.moduleName,
            action: 'SaveAjax',
            record: this.recordId
        };

        // Collect all editable field values
        container.find('.unified-field-input').each(function() {
            var fieldName = jQuery(this).data('fieldname');
            var fieldValue = jQuery(this).val();
            if (fieldName) {
                data[fieldName] = fieldValue;
            }
        });

        console.log('[UnifiedDetails] Saving data:', data);

        // Show loading
        var btn = jQuery('#unified_btnSaveDetails');
        var originalHtml = btn.html();
        btn.html('<i class="fa fa-spinner fa-spin"></i> Enregistrement...').prop('disabled', true);

        jQuery.ajax({
            url: 'index.php',
            type: 'POST',
            data: data,
            dataType: 'json',
            success: function(response) {
                console.log('[UnifiedDetails] Save response:', response);
                if (response.success) {
                    app.helper.showSuccessNotification({message: 'Enregistrement reussi'});
                } else {
                    app.helper.showErrorNotification({message: response.error ? response.error.message : 'Erreur lors de l\'enregistrement'});
                }
            },
            error: function(xhr, status, error) {
                console.error('[UnifiedDetails] Save error:', error);
                app.helper.showErrorNotification({message: 'Erreur de connexion'});
            },
            complete: function() {
                btn.html(originalHtml).prop('disabled', false);
            }
        });
    },

    cancel: function() {
        // Reload the tab to discard changes
        if (typeof UnifiedTabbedView !== 'undefined') {
            UnifiedTabbedView.loadedTabs['details'] = false;
            UnifiedTabbedView.loadTabContent('details');
        }
    },

    toggleAccordion: function(header) {
        var $header = jQuery(header);
        var $content = $header.next('.accordion-content');
        var isOpen = $header.hasClass('open');

        if (isOpen) {
            // Close accordion
            $content.slideUp(300, function() {
                $header.removeClass('open');
            });
        } else {
            // Open accordion
            $header.addClass('open');
            $content.slideDown(300);
        }
    },

    toggleSupplAddresses: function(header) {
        var $clickedHeader = jQuery(header);
        var isOpen = $clickedHeader.hasClass('open');

        // Find all supplementary address accordions
        var $allSupplAccordions = jQuery('.suppl-address-accordion');

        $allSupplAccordions.each(function() {
            var $accordion = jQuery(this);
            var $header = $accordion.find('.accordion-header');
            var $content = $accordion.find('.accordion-content');

            if (isOpen) {
                // Close all
                $content.slideUp(300, function() {
                    $header.removeClass('open');
                });
            } else {
                // Open all
                $header.addClass('open');
                $content.slideDown(300);
            }
        });
    },

    // =====================================================
    // ADDRESS AUTOCOMPLETE FUNCTIONS
    // =====================================================

    registerPostalCityAutoComplete: function() {
        var self = this;
        var container = jQuery('#detailsTabContainer');

        this.postalCityPairs.forEach(function(pair) {
            var postalInput = container.find('input[name="' + pair.postal + '"], input[data-fieldname="' + pair.postal + '"]');
            var cityInput = container.find('input[name="' + pair.city + '"], input[data-fieldname="' + pair.city + '"]');

            if (postalInput.length && cityInput.length) {
                // Postal code -> fetch city (on input for instant feedback + blur as fallback)
                var cityLookupTimeout;
                postalInput.on('input change blur', function() {
                    var postalCode = jQuery(this).val().trim();
                    if (postalCode.length === 5) {
                        clearTimeout(cityLookupTimeout);
                        cityLookupTimeout = setTimeout(function() {
                            self.fetchCityFromPostalCode(postalCode, cityInput, postalInput);
                        }, 300);
                    }
                });

                // City autocomplete
                self.initCityAutocomplete(cityInput, postalInput);
            }
        });

        console.log('[UnifiedDetails] Postal/City autocomplete registered');
    },

    fetchCityFromPostalCode: function(postalCode, cityInput, postalInput) {
        var self = this;
        postalInput.css('background-color', '#fffde7');

        jQuery.ajax({
            url: 'https://api-adresse.data.gouv.fr/search/',
            data: {
                q: postalCode,
                type: 'municipality',
                postcode: postalCode,
                limit: 1
            },
            success: function(data) {
                if (data.features && data.features.length > 0) {
                    var city = data.features[0].properties.city;
                    cityInput.val(city);
                    // Save city field directly
                    var cityFieldName = cityInput.data('fieldname') || cityInput.attr('name');
                    if (cityFieldName) {
                        self.saveField(cityFieldName, city);
                    }
                    postalInput.css('background-color', '#e8f5e9');
                    setTimeout(function() {
                        postalInput.css('background-color', '');
                    }, 1000);
                } else {
                    postalInput.css('background-color', '#ffebee');
                    setTimeout(function() {
                        postalInput.css('background-color', '');
                    }, 1000);
                }
            },
            error: function() {
                postalInput.css('background-color', '');
            }
        });
    },

    initCityAutocomplete: function(cityInput, postalInput) {
        var self = this;
        var autocompleteTimeout;
        var dropdownId = 'city-dropdown-' + cityInput.attr('name');

        cityInput.attr('autocomplete', 'off');
        cityInput.on('input', function() {
            clearTimeout(autocompleteTimeout);
            var query = jQuery(this).val().trim();

            if (query.length < 2) {
                jQuery('#' + dropdownId).remove();
                return;
            }

            autocompleteTimeout = setTimeout(function() {
                self.showCityAutocomplete(query, cityInput, postalInput, dropdownId);
            }, 300);
        });

        // Close dropdown on blur
        cityInput.on('blur', function() {
            setTimeout(function() {
                jQuery('#' + dropdownId).remove();
            }, 200);
        });
    },

    showCityAutocomplete: function(query, cityInput, postalInput, dropdownId) {
        jQuery.ajax({
            url: 'https://api-adresse.data.gouv.fr/search/',
            data: {
                q: query,
                type: 'municipality',
                limit: 8
            },
            success: function(data) {
                jQuery('#' + dropdownId).remove();

                if (!data.features || data.features.length === 0) return;

                var dropdown = jQuery('<div id="' + dropdownId + '" class="address-autocomplete-dropdown"></div>');

                data.features.forEach(function(feature) {
                    var city = feature.properties.city;
                    var postcode = feature.properties.postcode;
                    var item = jQuery('<div class="autocomplete-item"></div>')
                        .html('<strong>' + city + '</strong> <span style="color:#666">(' + postcode + ')</span>')
                        .on('mousedown', function(e) {
                            e.preventDefault();
                            cityInput.val(city);
                            postalInput.val(postcode);
                            jQuery('#' + dropdownId).remove();
                            // Save both fields directly
                            var cityName = cityInput.data('fieldname') || cityInput.attr('name');
                            var postalName = postalInput.data('fieldname') || postalInput.attr('name');
                            if (cityName) UnifiedDetails.saveField(cityName, city);
                            if (postalName) UnifiedDetails.saveField(postalName, postcode);
                        });
                    dropdown.append(item);
                });

                var offset = cityInput.offset();
                dropdown.css({
                    position: 'absolute',
                    top: offset.top + cityInput.outerHeight(),
                    left: offset.left,
                    width: cityInput.outerWidth(),
                    zIndex: 9999
                });

                jQuery('body').append(dropdown);
            }
        });
    },

    registerAddressAutoComplete: function() {
        var self = this;
        var container = jQuery('#detailsTabContainer');

        this.addressGroups.forEach(function(group) {
            var addressInput = container.find('input[name="' + group.address + '"], input[data-fieldname="' + group.address + '"]');
            var postalInput = container.find('input[name="' + group.postal + '"], input[data-fieldname="' + group.postal + '"]');
            var cityInput = container.find('input[name="' + group.city + '"], input[data-fieldname="' + group.city + '"]');

            if (addressInput.length) {
                self.initAddressAutocomplete(addressInput, postalInput, cityInput, group.label);
            }
        });

        console.log('[UnifiedDetails] Address autocomplete registered');
    },

    initAddressAutocomplete: function(addressInput, postalInput, cityInput, label) {
        var self = this;
        var autocompleteTimeout;
        var dropdownId = 'address-dropdown-' + addressInput.attr('name');

        addressInput.attr('autocomplete', 'off');
        addressInput.on('input', function() {
            clearTimeout(autocompleteTimeout);
            var query = jQuery(this).val().trim();

            if (query.length < 3) {
                jQuery('#' + dropdownId).remove();
                return;
            }

            autocompleteTimeout = setTimeout(function() {
                self.showAddressAutocomplete(query, addressInput, postalInput, cityInput, dropdownId);
            }, 300);
        });

        // Close dropdown on blur
        addressInput.on('blur', function() {
            setTimeout(function() {
                jQuery('#' + dropdownId).remove();
            }, 200);
        });
    },

    showAddressAutocomplete: function(query, addressInput, postalInput, cityInput, dropdownId) {
        var existingPostal = postalInput.length ? postalInput.val().trim() : '';
        var requestData = {
            q: query,
            type: 'housenumber',
            limit: 8
        };

        if (existingPostal.length === 5) {
            requestData.postcode = existingPostal;
        }

        jQuery.ajax({
            url: 'https://api-adresse.data.gouv.fr/search/',
            data: requestData,
            success: function(data) {
                jQuery('#' + dropdownId).remove();

                if (!data.features || data.features.length === 0) return;

                var dropdown = jQuery('<div id="' + dropdownId + '" class="address-autocomplete-dropdown"></div>');

                data.features.forEach(function(feature) {
                    var props = feature.properties;
                    var streetAddress = props.name;
                    var postcode = props.postcode;
                    var city = props.city;

                    var item = jQuery('<div class="autocomplete-item"></div>')
                        .html('<strong>' + streetAddress + '</strong><br><span style="color:#666;font-size:11px">' + postcode + ' ' + city + '</span>')
                        .on('mousedown', function(e) {
                            e.preventDefault();
                            addressInput.val(streetAddress);
                            if (postalInput.length) postalInput.val(postcode);
                            if (cityInput.length) cityInput.val(city);
                            jQuery('#' + dropdownId).remove();
                            // Save all three fields directly
                            var addrName = addressInput.data('fieldname') || addressInput.attr('name');
                            if (addrName) UnifiedDetails.saveField(addrName, streetAddress);
                            if (postalInput.length) {
                                var postalName = postalInput.data('fieldname') || postalInput.attr('name');
                                if (postalName) UnifiedDetails.saveField(postalName, postcode);
                            }
                            if (cityInput.length) {
                                var cityName = cityInput.data('fieldname') || cityInput.attr('name');
                                if (cityName) UnifiedDetails.saveField(cityName, city);
                            }
                        });
                    dropdown.append(item);
                });

                var offset = addressInput.offset();
                dropdown.css({
                    position: 'absolute',
                    top: offset.top + addressInput.outerHeight(),
                    left: offset.left,
                    width: Math.max(addressInput.outerWidth(), 300),
                    zIndex: 9999
                });

                jQuery('body').append(dropdown);
            }
        });
    }
};

// Initialize when DOM is ready
jQuery(document).ready(function() {
    UnifiedDetails.init();
});
{/literal}
</script>
