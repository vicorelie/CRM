{*/* * *******************************************************************************
* The content of this file is subject to the ITS4YouSignature license.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
* ****************************************************************************** */*}
{strip}
    <form class="SendToSignature_{$REQUEST->get('mode')}" action="index.php" method="post">
        <div class='modal-body'>
            {include file="HiddenValues.tpl"|vtemplate_path:$MODULE MODE='SelectEmail'}
            <table class="table table-borderless">
                <tbody>
                <tr>
                    <td class="fieldLabel alignMiddle" style="width: 150px;">{vtranslate('Recipient Name', $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue">
                        {if $CONTACT_GROUPS}
                            <select name="recipientId" id="recipientId" class="inputElement select2" data-rule-required="true">
                                {foreach from=$CONTACT_GROUPS  key=CONTACT_GROUP_NAME item=CONTACT_GROUP}
                                    <optgroup label="{$CONTACT_GROUP_NAME}">
                                        {foreach from=$CONTACT_GROUP item=CONTACT key=CONTACT_ID}
                                            <option value="{$CONTACT_ID}">{$CONTACT->getName()}</option>
                                        {/foreach}
                                    </optgroup>
                                {/foreach}
                            </select>
                        {else}
                            <input type="text" name="recipientName" class="inputElement nameField" value="" data-rule-required="true" aria-required="true" aria-invalid="false">
                        {/if}
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel alignMiddle">{vtranslate('Recipient Email', $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue">
                        <div class="hide recipientEmails">{$CONTACT_EMAILS}</div>
                        <input name="recipientEmail" id="recipientEmail" class="inputElement" data-rule-required="true" aria-required="true" aria-invalid="false">
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
        <div class='modal-footer'>
            <button type="button" class="btn btn-default backLink">{vtranslate('LBL_BACK', $MODULE)}</button>
            <button type="submit" class="btn btn-success">{vtranslate('LBL_CONTINUE_EMAIL', $MODULE)}</button>
            <a href="#" class="cancelLink" type="reset" data-dismiss="modal">{vtranslate('LBL_CANCEL', $MODULE)}</a>
        </div>
    </form>
{/strip}