{*/*<!--
/*********************************************************************************
 * The content of this file is subject to the Reports 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/
-->*/*}

{strip}
    <div id="addFolderContainer" class="modal-dialog" style='min-width:350px;'>
        <div class='modal-content'>
            {assign var=FOLDER_ID value=$METRICS_MODEL->getId()}
            {assign var=FOLDER_NAME value={Vtiger_Util_Helper::tosafeHTML(vtranslate($METRICS_MODEL->getName(), $MODULE))}}
            {assign var=HEADER_TITLE value={vtranslate('LBL_ADD_NEW_KEY_METRICS', $MODULE)}}
            {if $FOLDER_ID}
                {assign var=HEADER_TITLE value="{vtranslate('LBL_EDIT', $MODULE)}: {$FOLDER_NAME}"}
            {/if}
            {include file="ModalHeader.tpl"|vtemplate_path:$MODULE TITLE=$HEADER_TITLE}
            <form class="form-horizontal contentsBackground" id="addKeyMetricsWidget" method="post" action="index.php">
                <input type="hidden" name="module" value="{$MODULE}" />
                <input type="hidden" name="action" value="KeyMetrics" />
                <input type="hidden" name="mode" value="addwidget" />
                <input type="hidden" name="id" value="{$METRICS_MODEL->getId()}" />
                <div class="modal-body">
                    <div class="form-group">
                        <label for="name" class="col-sm-4 control-label">{vtranslate('LBL_WIDGET_NAME', $MODULE)}<span class="redColor">*</span></label>
                        <div class="col-sm-7">
                            <input id="name" data-validation-engine='validate[required]' name="name" class="form-control col-lg-12" data-rule-required="true" type="text" value="{$FOLDER_NAME}"/>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="description" class="col-sm-4 control-label">{vtranslate('LBL_WIDGET_DESCRIPTION', $MODULE)}</label>
                        <div class="col-sm-7">
                            <textarea name="description" class="form-control col-sm-12" rows="3" placeholder="{vtranslate('LBL_WRITE_YOUR_DESCRIPTION_HERE', $MODULE)}">{vtranslate($METRICS_MODEL->get('description'), $MODULE)}</textarea>
                        </div>
                    </div>
                </div>
                {include file='ModalFooter.tpl'|@vtemplate_path:$MODULE}
            </form>
        </div>
    </div>
{/strip}