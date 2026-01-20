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
            {include file="HiddenValues.tpl"|vtemplate_path:$MODULE}
            <table class="table table-borderless">
                <thead>
                <tr>
                    <th>{vtranslate('LBL_SIGNATURE_NAME', $QUALIFIED_MODULE)}</th>
                    <th>{vtranslate('LBL_ACTIONS', $QUALIFIED_MODULE)}</th>
                </tr>
                </thead>
                <tbody>
                {foreach from=$ACCEPT_RECORDS item=ACCEPT_RECORD}
                    <tr>
                        <td>
                            <a href="{$ACCEPT_RECORD->getDetailViewUrl()}" target="_blank">{$ACCEPT_RECORD->getName()}</a>
                        </td>
                        <td>
                            <a href="{$ACCEPT_RECORD->getAcceptLink()}" target="_blank" class="btn btn-default">{vtranslate('LBL_REVIEW_ACCEPT', $QUALIFIED_MODULE)}</a>
                        </td>
                    </tr>
                {/foreach}
                </tbody>
            </table>
        </div>
    </form>
{/strip}