{*<!--
/*********************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
********************************************************************************/
-->*}
{strip}
    <br>
    <div class="col-lg-12">
        <div class="clearfix">
            <div class="col-lg-6 col-md-6 col-sm-6 col-xs-6">
                <h4 style="margin-top: 0;">{vtranslate('LBL_SETTINGS', $QUALIFIED_MODULE)} {vtranslate($MODULE, $QUALIFIED_MODULE)}</h4>
            </div>
            <div class="col-lg-6 col-md-6 col-sm-6 col-xs-6">
                <div class="btn-group pull-right">
                    <a href="{$RECORD_MODEL->getEditURL()}" class="btn btn-default">{vtranslate('LBL_EDIT', $QUALIFIED_MODULE)}</a>
                </div>
            </div>
        </div>
        <hr>
        <div class="fieldBlockContainer">
            <table class="table no-border">
                {foreach item=FIELD_NAME from=$RECORD_MODEL->getFieldNames()}
                    <tr>
                        <td class="fieldLabel" style="width: 200px;">
                            <label for="{$FIELD_NAME}">{vtranslate($FIELD_NAME, $QUALIFIED_MODULE)}</label>
                        </td>
                        <td class="fieldValue">
                            <div id="{$FIELD_NAME}">
                                {$RECORD_MODEL->get($FIELD_NAME)}
                            </div>
                        </td>
                    </tr>
                {/foreach}
            </table>
        </div>
    </div>
{/strip}