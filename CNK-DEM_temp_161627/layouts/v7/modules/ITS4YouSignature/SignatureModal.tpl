{*/* * *******************************************************************************
* The content of this file is subject to the ITS4YouSignature license.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
* ****************************************************************************** */*}
{strip}
<div class="modal-dialog" role="document">
    <div class="modal-content">
        {include file="ModalHeader.tpl"|vtemplate_path:$MODULE TITLE=$RECORD_MODEL->getName()}
        <form method="post" action="ITS4YouSignature.php" class="sigPad" id="signatureForm">
            <input type="hidden" name="u" value="{$REQUEST->get('u')}">
            <input type="hidden" name="s" value="{$REQUEST->get('s')}">
            <input type="hidden" name="module" value="ITS4YouSignature">
            <input type="hidden" name="view" value="Sign">
            <input type="hidden" name="mode" value="showSigned">
            <input type="hidden" name="image" value="">
            <div class="modal-body overflow-hidden">
                <div class="fieldLabel">
                    <p>{vtranslate('LBL_DRAW_YOUR_SIGNATURE', 'ITS4YouSignature')}</p>
                </div>
                <div>
                    <ul class="sigNav">
                        <li class="drawIt"><a href="#draw-it">{vtranslate('LBL_DRAW_IT', 'ITS4YouSignature')}</a></li>
                        <li class="clearButton"><a href="#clear">{vtranslate('LBL_CLEAR', 'ITS4YouSignature')}</a></li>
                    </ul>
                    <div class="sig sigWrapper">
                        <div class="typed"></div>
                        <canvas id="signCanvas" class="pad" width="568" height="200"></canvas>
                        <div class="underline"></div>
                        <input type="hidden" name="output" class="output">
                    </div>
                </div>
            </div>
            {include file="ModalFooter.tpl"|vtemplate_path:$MODULE}
        </form>
    </div>
</div>
{/strip}