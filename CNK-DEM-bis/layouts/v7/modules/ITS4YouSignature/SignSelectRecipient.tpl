{*/* * *******************************************************************************
* The content of this file is subject to the ITS4YouSignature license.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
* ****************************************************************************** */*}
{strip}
    <form class="SendToSignature_SignSelectRecipient" action="index.php" method="post">
        <div class='modal-body'>
            {include file="HiddenValues.tpl"|vtemplate_path:$MODULE MODE='SignSelectRecipient'}
            <input type="hidden" name="emailSubject" value="{$REQUEST->get('emailSubject')}">
            <input type="hidden" name="signatureMode" value="Sign Document">
            <table class="table table-borderless">
                <tbody>
                <tr>
                    <td class="fieldLabel alignMiddle" style="width: 150px;">{vtranslate('Recipient Module', $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue">
                        <select id="recipientModule" class="select2 inputElement">
                            <option value="Contacts" {if 'Contacts' eq $REQUEST->get('recipientModule')}selected="selected"{/if}>{vtranslate('Contacts', 'Contacts')}</option>
                            <option value="Accounts" {if 'Accounts' eq $REQUEST->get('recipientModule')}selected="selected"{/if}>{vtranslate('Accounts', 'Accounts')}</option>
                        </select>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
        <div class='modal-footer'>
            <button class="btn btn-success">{vtranslate('LBL_SIGN_DOCUMENT', $MODULE)}</button>
            <a href="#" class="cancelLink" type="reset" data-dismiss="modal">{vtranslate('LBL_CANCEL', $MODULE)}</a>
        </div>
    </form>
{/strip}