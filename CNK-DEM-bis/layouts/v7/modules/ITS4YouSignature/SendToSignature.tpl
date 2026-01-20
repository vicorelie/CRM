{*/* * *******************************************************************************
* The content of this file is subject to the ITS4YouSignature license.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
* ****************************************************************************** */*}
{strip}
    <div id="SendToSignature" class="modal-dialog modal-lg">
        <div class='modal-content'>
            {include file="ModalHeader.tpl"|vtemplate_path:$MODULE TITLE=$HEADER_TITLE}
            {include file=$MODE_TEMPLATE|vtemplate_path:$MODULE TITLE=$HEADER_TITLE}
        </div>
    </div>
{/strip}