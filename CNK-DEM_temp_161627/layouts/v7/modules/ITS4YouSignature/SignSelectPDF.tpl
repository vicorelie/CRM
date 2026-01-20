{*/* * *******************************************************************************
* The content of this file is subject to the ITS4YouSignature license.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
* ****************************************************************************** */*}
{strip}
    <form class="SendToSignature_SignSelectPDF" action="index.php" method="post">
        <div class='modal-body'>
            {include file="HiddenValues.tpl"|vtemplate_path:$MODULE MODE='SignSelectRecipient'}
            <input type="hidden" name="emailSubject" value="{$REQUEST->get('emailSubject')}">
            <input type="hidden" name="signatureMode" value="Sign Document">
            <table class="table listview-table">
                <thead>
                <tr>
                    <th></th>
                    <th>{vtranslate('Template Name', $QUALIFIED_MODULE)}</th>
                    <th>{vtranslate('Language', $QUALIFIED_MODULE)}</th>
                    <th>{vtranslate('Description', $QUALIFIED_MODULE)}</th>
                </tr>
                </thead>
                <tbody style="font-size: 14px;">
                {foreach from=$TEMPLATES item=TEMPLATE}
                    {assign var=TEMPLATE_ID value=$TEMPLATE->getId()}
                    <tr class="selectSignatureTemplate" data-id="{$TEMPLATE_ID}" data-disable_export_edit="{$TEMPLATE->get('disable_export_edit')}" data-language="" {if $REQUEST->get('templateId') eq $TEMPLATE_ID}style="background: #eee;"{/if}>
                        <td style="width: 5%;text-align: center;">
                            <input type="radio" name="templateId" class="templateId" {if $REQUEST->get('templateId') eq $TEMPLATE_ID}checked{/if} value="{$TEMPLATE_ID}">
                        </td>
                        <td style="width: 50%;">
                            <span class="fieldValue">{$TEMPLATE->getName()}</span>
                        </td>
                        <td style="width: 20%;">
                            <span class="fieldValue">
                                <select class="templateLanguage inputElement select2">
                                    {foreach from=$LANGUAGES key=LANGUAGE_KEY item=LANGUAGE}
                                        <option value="{$LANGUAGE_KEY}" {if $SELECTED_LANGUAGE eq $LANGUAGE_KEY}selected{/if}>{$LANGUAGE}</option>
                                    {/foreach}
                                </select>
                            </span>
                        </td>
                        <td>
                            <span class="fieldValue">{$TEMPLATE->get('description')}</span>
                        </td>
                    </tr>
                {/foreach}
                </tbody>
            </table>
        </div>
        <div class='modal-footer'>
            <button class="btn btn-success editPDFTemplate" type="button" {if $DISABLE_EXPORT_EDIT}disabled="disabled"{/if}>{vtranslate('LBL_EDIT_TEMPLATE', $MODULE)}</button>
            {if $IS_REQUIRED_SELECT_RECIPIENT}
                <button class="btn btn-success selectRecipient">{vtranslate('LBL_SELECT_RECIPIENT', $MODULE)}</button>
            {else}
                <button class="btn btn-success">{vtranslate('LBL_SIGN_DOCUMENT', $MODULE)}</button>
            {/if}
            <a href="#" class="cancelLink" type="reset" data-dismiss="modal">{vtranslate('LBL_CANCEL', $MODULE)}</a>
        </div>
    </form>
{/strip}