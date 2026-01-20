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
            {include file="HiddenValues.tpl"|vtemplate_path:$MODULE MODE='CreateSignature'}
            <h4>{vtranslate('LBL_MESSAGE_TO_RECIPIENT', $MODULE)}</h4>
            <br>
            <table class="table table-borderless">
                <tbody>
                <tr>
                    <td class="fieldLabel alignMiddle" style="width: 150px;">{vtranslate('Email Subject', $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue" style="width: 150px;">
                        <input type="text" class="inputElement readonly disabled" readonly="readonly" disabled="disabled" name="emailPrefix" value="{$SETTINGS_RECORD_MODEL->get('email_subject')} - ">
                    </td>
                    <td class="fieldValue">
                        <input type="text" class="inputElement nameField" name="emailSubject" value="{$SOURCE_RECORD_MODEL->getName()}" data-rule-required="true">
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel alignMiddle" style="width: 150px;">{vtranslate('Email Message', $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue" colspan="2">
                        <textarea type="text" class="inputElement" name="emailMessage" data-rule-required="true" style="resize: vertical; height: 100px;">{$SETTINGS_RECORD_MODEL->get('email_message')}</textarea>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
        <div class='modal-footer'>
            <button type="button" class="btn btn-default backLink">{vtranslate('LBL_BACK', $MODULE)}</button>
            <button type="submit" class="btn btn-success">{vtranslate('LBL_SEND_EMAIL', $MODULE)}</button>
            <a href="#" class="cancelLink" type="reset" data-dismiss="modal">{vtranslate('LBL_CANCEL', $MODULE)}</a>
        </div>
    </form>
{/strip}