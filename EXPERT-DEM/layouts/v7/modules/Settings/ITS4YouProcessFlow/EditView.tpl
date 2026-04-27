{*<!--
/*********************************************************************************
* The content of this file is subject to the Process Flow 4 You.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
********************************************************************************/
-->*}
{strip}
    <div class="editViewPageDiv">
        <div class="col-sm-12 col-xs-12" id="EditView">
            <form name="EditWorkflow" action="index.php" method="post" id="pf_edit" class="form-horizontal">
                <input type="hidden" name="record" value="{$RECORDID}" id="record"/>
                <input type="hidden" name="module" value="ITS4YouProcessFlow"/>
                <input type="hidden" name="action" value="Save"/>
                <input type="hidden" name="parent" value="Settings"/>
                <input type="hidden" name="returnsourcemodule" value="{$RETURN_SOURCE_MODULE}"/>
                <input type="hidden" name="returnpage" value="{$RETURN_PAGE}"/>
                <input type="hidden" name="returnsearch_value" value="{$RETURN_SEARCH_VALUE}"/>
                {if $PARENT_ID neq ""}<input type="hidden" name="parent_id" value="{$PARENT_ID}" />{/if}
                {if $PARENT_TYPE neq ""}<input type="hidden" name="parenttype" value="{$PARENT_TYPE}" />{/if}


                <div class="editViewHeader">
                    <div class='row'>
                        <div class="col-lg-12 col-md-12 col-lg-pull-0">
                            <h4>{vtranslate('LBL_BASIC_INFORMATION', $QUALIFIED_MODULE)}</h4>
                        </div>
                    </div>
                </div>
                <hr style="margin-top: 0px !important;">
                <div class="editViewBody">
                    <div class="editViewContents" style="text-align: center; ">
                        <div class="form-group">
                            <label for="name" class="col-sm-3 control-label">
                                {vtranslate('LBL_PROCESSFLOW_NAME', $QUALIFIED_MODULE)}
                                <span class="redColor">*</span>
                            </label>
                            <div class="col-sm-5 controls">
                                <input class="form-control" id="name" name="pfname" value="{$RECORD_MODEL->get('name')}" data-rule-required="true">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="name" class="col-sm-3 control-label">
                                {vtranslate('LBL_DESCRIPTION', $QUALIFIED_MODULE)}
                            </label>
                            <div class="col-sm-5 controls">
                                <textarea class="form-control" name="summary" id="summary">{$RECORD_MODEL->get('description')}</textarea>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="module_name" class="col-sm-3 control-label">
                                {vtranslate('LBL_TARGET_MODULE', $QUALIFIED_MODULE)}
                            </label>
                            <div class="col-sm-5 controls">
                                {if $MODE eq 'edit' OR $PARENT_ID neq ""}
                                    <div class="pull-left">
                                        <input type='text' disabled='disabled' class="inputElement" value="{vtranslate($MODULE_MODEL->getName(), $MODULE_MODEL->getName())}">
                                        <input type='hidden' id="module_name" name='module_name' value="{$MODULE_MODEL->get('name')}">
                                    </div>
                                {else}
                                    <select class="select2 col-sm-6 pull-left" id="module_name" name="module_name" required="true" data-placeholder="Select Module..." style="text-align: left">
                                        {foreach from=$ALL_MODULES key=TABID item=MODULE_MODEL}
                                            {assign var=TARGET_MODULE_NAME value=$MODULE_MODEL->getName()}
                                            {assign var=SINGLE_MODULE value="SINGLE_$TARGET_MODULE_NAME"}
                                            <option value="{$MODULE_MODEL->getName()}" {if $SELECTED_MODULE == $MODULE_MODEL->getName()} selected {/if}
                                                    data-create-label="{vtranslate($SINGLE_MODULE, $TARGET_MODULE_NAME)} {vtranslate('LBL_CREATION', $QUALIFIED_MODULE)}"
                                                    data-update-label="{vtranslate($SINGLE_MODULE, $TARGET_MODULE_NAME)} {vtranslate('LBL_UPDATED', $QUALIFIED_MODULE)}"
                                            >
                                                {if $MODULE_MODEL->getName() eq 'Calendar'}
                                                    {vtranslate('LBL_TASK', $MODULE_MODEL->getName())}
                                                {else}
                                                    {vtranslate($MODULE_MODEL->getName(), $MODULE_MODEL->getName())}
                                                {/if}
                                            </option>
                                        {/foreach}
                                    </select>
                                {/if}
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="status" class="col-sm-3 control-label">
                                {vtranslate('LBL_STATUS', $QUALIFIED_MODULE)}
                            </label>
                            <div class="col-sm-5 controls">
                                <div class="pull-left">
                            <span style="margin-right: 10px;">
                               <input name="status" type="radio" value="active" {if $RECORD_MODEL->get('status') eq '1'} checked="" {/if}>&nbsp;
                               <span>{vtranslate('Active', $QUALIFIED_MODULE)}</span>
                            </span>
                                    <span style="margin-right: 10px;">
                               <input name="status" type="radio" value="inActive" {if $RECORD_MODEL->get('status') eq '0'} checked="" {/if}>&nbsp;
                               <span>{vtranslate('InActive', $QUALIFIED_MODULE)}</span>
                            </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="pf_condition">
                </div>
                <div class="modal-overlay-footer clearfix">
                    <div class="row clearfix">
                        <div class='textAlignCenter col-lg-12 col-md-12 col-sm-12 '>
                            <button type='submit' class='btn btn-success saveButton'>{vtranslate('LBL_SAVE', $MODULE)}</button>&nbsp;&nbsp;
                            <a class='cancelLink' href="javascript:history.back()" type="reset">{vtranslate('LBL_CANCEL', $MODULE)}</a>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </div>
{/strip}