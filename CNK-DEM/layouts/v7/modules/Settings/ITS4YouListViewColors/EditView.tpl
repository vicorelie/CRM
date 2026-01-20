{*<!--
/*********************************************************************************
* The content of this file is subject to the ListView Colors 4 You.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
********************************************************************************/
-->*}
{strip}
    <div class="editViewPageDiv container-fluid">
        <div class="editViewHeader">
            <div class="row">
                <div class="col-lg-12 col-md-12 col-lg-pull-0">
                    <h4>{vtranslate($MODULE, $MODULE)} {if $MODE}{vtranslate('LBL_FOR', $MODULE)} {vtranslate($MODE, $MODULE)}{/if}</h4>
                </div>
            </div>
        </div>
        <div class="editViewBody">
            <div id="EditView">
                <form name="EditLVC" action="index.php" method="post" id="lvc_edit" class="form-horizontal">
                    <input type="hidden" name="record" value="{$RECORDID}" id="record"/>
                    <input type="hidden" name="module" value="ITS4YouListViewColors"/>
                    <input type="hidden" name="action" value="Save"/>
                    <input type="hidden" name="parent" value="Settings"/>
                    <input type="hidden" name="parentid" value="{$PARENT_ID}"/>
                    <input type="hidden" name="parentmodule" value="{$PARENT_MODULE}"/>
                    <input type="hidden" name="parenttype" value="{$PARENT_TYPE}"/>
                    <input type="hidden" name="returnsourcemodule" value="{$RETURN_SOURCE_MODULE}"/>
                    <input type="hidden" name="returnpage" value="{$RETURN_PAGE}"/>
                    <input type="hidden" name="returnsearch_value" value="{$RETURN_SEARCH_VALUE}"/>
                    {if $MODE}
                        <br>
                        <div class='row'>
                            <div class="col-lg-12 col-md-12 col-lg-pull-0">
                                <h4 class="fieldBlockHeader">{vtranslate('LBL_BASIC_INFORMATION', $QUALIFIED_MODULE)}</h4>
                            </div>
                        </div>
                        <hr style="margin-top: 0 !important;">
                        <div class="editViewBody">
                            <div class="editViewContents">
                                <div class="form-group">
                                    <label for="name" class="col-sm-3 control-label">
                                        {vtranslate('LBL_LVC_NAME', $QUALIFIED_MODULE)}
                                        <span class="redColor">*</span>
                                    </label>
                                    <div class="col-sm-5 controls">
                                        <input class="form-control" id="name" name="lvcname" value="{$RECORD_MODEL->get('name')}" data-rule-required="true">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="name" class="col-sm-3 control-label">
                                        {vtranslate('LBL_DESCRIPTION', $QUALIFIED_MODULE)}
                                    </label>
                                    <div class="col-sm-5 controls">
                                        <textarea class="form-control" name="description" id="description">{$RECORD_MODEL->get('description')}</textarea>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="control-label col-lg-3">{vtranslate('LBL_FIELD', $MODULE)}</label>
                                    <div class="col-sm-5 controls">
                                        <select class="select2 inputElement" id="coloring_type" name="field_name">
                                            <option value="">{vtranslate('LBL_NONE', $MODULE)}</option>
                                            {foreach from=$MODULES_FIELDS key=MODULE_NAME item=MODULE_FIELDS}
                                                {assign var=MODULE_LABEL value=vtranslate($MODULE_NAME, $MODULE_NAME)}
                                                <optgroup label="{$MODULE_LABEL}">
                                                    {foreach from=$MODULE_FIELDS key=FIELD_NAME item=FIELD_MODEL}
                                                        <option value="{$RECORD_MODEL->getFieldName($FIELD_MODEL)}" {if $RECORD_MODEL->isSelectedField($FIELD_MODEL)}selected{/if}>({$MODULE_LABEL}) {vtranslate($FIELD_MODEL->get('label'), $MODULE_NAME)}</option>
                                                    {/foreach}
                                                </optgroup>
                                            {/foreach}
                                        </select>
                                    </div>
                                </div>
                                {if 'List' eq $MODE}
                                    {include file='EditViewList.tpl'|vtemplate_path:$QUALIFIED_MODULE}
                                {else}
                                    {include file='EditViewRecord.tpl'|vtemplate_path:$QUALIFIED_MODULE}
                                {/if}
                            </div>
                        </div>
                        <div class="modal-overlay-footer clearfix">
                            <div class="row clearfix">
                                <div class='textAlignCenter col-lg-12 col-md-12 col-sm-12 '>
                                    <button type='submit' class='btn btn-success saveButton'>{vtranslate('LBL_SAVE', $MODULE)}</button>&nbsp;&nbsp;
                                    <a class='cancelLink' href="javascript:history.back()" type="reset">{vtranslate('LBL_CANCEL', $MODULE)}</a>
                                </div>
                            </div>
                        </div>
                    {else}
                        <hr>
                        <div class="addLinks">
                            <a href="{$MODULE_MODEL->getEditUrlForList($REQUEST)}" class="addLink">
                                <i class="fa fa-list"></i>
                                <div>{vtranslate('LBL_ADD_LIST_COLOR', $MODULE)}</div>
                            </a>
                            <a href="{$MODULE_MODEL->getEditUrlForRecord($REQUEST)}" class="addLink">
                                <i class="fa fa-file"></i>
                                <div>{vtranslate('LBL_ADD_RECORD_COLORS', $MODULE)}</div>
                            </a>
                        </div>
                    {/if}
                </form>
            </div>
        </div>
    </div>
    <style>
        .addLink {
            text-align: center;
            margin: 0 1rem 1rem 0;
            border: 1px solid #ddd;
            background: #eee;
            display: inline-block;
            padding: 3rem;
            width: 200px;
        }
        .addLink i {
            margin-bottom: 1rem;
            font-size: 5rem;
        }
    </style>
{/strip}