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
            {include file="HiddenValues.tpl"|vtemplate_path:$MODULE MODE='SelectPDF'}
            <iframe src="{$PREVIEW_URL}" class="full-width"></iframe>
        </div>
        <div class='modal-footer'>
            <button class="btn btn-success">{vtranslate('LBL_BACK_PDF', $MODULE)}</button>
            <a href="#" class="cancelLink" type="reset" data-dismiss="modal">{vtranslate('LBL_CANCEL', $MODULE)}</a>
        </div>
    </form>
{/strip}