{*/* * *******************************************************************************
* The content of this file is subject to the ITS4YouSignature license.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
* ****************************************************************************** */*}
{strip}
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{vtranslate($MODULE, $MODULE)}</title>
        {foreach key=index item=cssModel from=$STYLES}
            <link rel="{$cssModel->getRel()}" href="{vresource_url($cssModel->getHref())}" type="{$cssModel->getType()}" media="{$cssModel->getMedia()}"/>
        {/foreach}
        <script type="text/javascript">
            let _META = { 'module': "{$MODULE}", view: "{$VIEW}", 'parent': "{$PARENT_MODULE}", 'notifier':"{$NOTIFIER_URL}", 'app':"{$SELECTED_MENU_CATEGORY}" };
            {if $EXTENSION_MODULE}
            let _EXTENSIONMETA = { 'module': "{$EXTENSION_MODULE}", view: "{$EXTENSION_VIEW}"};
            {/if}
            let _USERMETA;
            {if $CURRENT_USER_MODEL}
            _USERMETA =  { 'id' : "{$CURRENT_USER_MODEL->get('id')}", 'menustatus' : "{$CURRENT_USER_MODEL->get('leftpanelhide')}",
                'currency' : "{$USER_CURRENCY_SYMBOL}", 'currencySymbolPlacement' : "{$CURRENT_USER_MODEL->get('currency_symbol_placement')}",
                'currencyGroupingPattern' : "{$CURRENT_USER_MODEL->get('currency_grouping_pattern')}", 'truncateTrailingZeros' : "{$CURRENT_USER_MODEL->get('truncate_trailing_zeros')}"};
            {/if}
        </script>
        {foreach key=index item=jsModel from=$SCRIPTS}
            <script type="{$jsModel->getType()}" src="{$jsModel->getSrc()}"></script>
        {/foreach}
    </head>
    <body data-skinpath="{Vtiger_Theme::getBaseThemePath()}">
    <div>
        <div class="container-fluid">
            <div class="row">
                <div class="col-lg-12 signHeader">
                    <div class="summaryView">
                        <div class="text-end">
                            {if $RECORD_MODEL->isCompleted()}
                                {vtranslate('LBL_SIGNED_SAVED_SENT', $MODULE)} {$USER->getName()}{if $RELATED_CONTACT_NAME}, {$RELATED_CONTACT_NAME}{/if}
                            {elseif $RECORD_MODEL->isWaitingForAcceptance()}
                                {if $RECORD_MODEL->isAcceptanceUser($REQUEST)}
                                    <button type="button" class="btn btn-success acceptSignature" data-request='{Zend_Json::encode($REQUEST->getAll())}'>{vtranslate('LBL_ACCEPT_SIGN', $MODULE)}</button>
                                {else}
                                    {assign var=ACCEPT_USER value=$RECORD_MODEL->getAcceptanceUser()}
                                    {vtranslate('LBL_SIGNED_WAIT_FOR_ACCEPTANCE', $MODULE)} {$ACCEPT_USER->getName()}
                                {/if}
                            {elseif $RECORD_MODEL->isWaitingForConfirmation()}
                                <button type="button" class="btn btn-success saveSignature" data-request='{Zend_Json::encode($REQUEST->getAll())}'>{vtranslate('LBL_CONFIRM_SIGN', $MODULE)}</button>
                                &nbsp;
                                <button type="button" class="btn btn-danger deleteSignature" data-request='{Zend_Json::encode($REQUEST->getAll())}'>{vtranslate('LBL_CLEAR_SIGN', $MODULE)}</button>
                            {else}
                                <button type="button" class="btn btn-primary showModal" data-request='{Zend_Json::encode($REQUEST->getAll())}'>
                                    <div class="fa fa-pencil"></div>&nbsp;&nbsp;{vtranslate('LBL_SIGN_PDF', $MODULE)}
                                </button>
                            {/if}
                        </div>
                    </div>
                </div>
                <div class="col-lg-9 signPreview">
                    <div class="summaryView">
                        <h4 class="m-0 pb-15px">{vtranslate('LBL_PDF_PREVIEW', $MODULE)}</h4>
                        <div class="previewPDF">
                            {if $RECORD_MODEL->isCompleted()}
                                <iframe class="prevHeight" src="{$SITE_URL}ITS4YouSignature.php?u={$REQUEST->get('u')}&s={$REQUEST->get('s')}&mode=showSignedPDF"></iframe>
                            {else}
                                <iframe class="prevHeight" src="{$RECORD_MODEL->getPDFPreviewURL()}"></iframe>
                            {/if}
                        </div>
                    </div>
                </div>
                <div class="col-lg-3 signRightMenu">
                    <div class="summaryView">
                        <h4 class="m-0 pb-15px">{vtranslate('LBL_KEY_FIELDS', $MODULE)}</h4>
                        <table class="table no-border">
                            {foreach item=FIELD_MODEL key=FIELD_NAME from=$SUMMARY_RECORD_STRUCTURE['SUMMARY_FIELDS']}
                                <tr>
                                    <td class="fieldLabel">{vtranslate($FIELD_MODEL->get('label'), $MODULE)}</td>
                                    <td class="fieldValue">{$RECORD_MODEL->getDisplayValue($FIELD_NAME)}</td>
                                </tr>
                            {/foreach}
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="modal myModal"></div>
    <div id="messageBar" class="hide"></div>
    <div id="js_strings" class="hide noprint">{Zend_Json::encode($LANGUAGE_STRINGS)}</div>
    </body>
    </html>
{/strip}