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
    <div class="detailview-content">
        <div class="details">
            <form id="detailView" method="post" action="index.php" name="etemplatedetailview"
                  onsubmit="VtigerJS_DialogBox.block();">
                <input type="hidden" name="action" value="">
                <input type="hidden" name="view" value="">
                <input type="hidden" name="module" value="ITS4YouProcessFlow">
                <input type="hidden" name="retur_module" value="ITS4YouProcessFlow">
                <input type="hidden" name="return_action" value="ITS4YouProcessFlow">
                <input type="hidden" name="return_view" value="Detail">
                <input type="hidden" name="record" value="{$RECORD_MODEL->getId()}">
                <input type="hidden" name="source_module" id="source_module" value="{$MODULE_MODEL->getName()}">
                <input type="hidden" name="parenttab" value="{$PARENTTAB}">
                <input type="hidden" name="isDuplicate" value="false">
                <input type="hidden" name="subjectChanged" value="">
                <input id="recordId" value="{$RECORD_MODEL->getId()}" type="hidden">
                <div>
                    <div class="col-sm-12 col-xs-12">
                        <h3 class="module-title pull-left">{vtranslate($MODULE, $MODULE)} - {if $RECORD_MODEL->get('name')}{$RECORD_MODEL->get('name')}{else}{vtranslate($MODULE_MODEL->getName(), $MODULE_MODEL->getName())}{/if}</h3>
                        <br>
                    </div>
                </div>
                <div>
                    <div class="left-block col-lg-4">
                        <div class="summaryView">
                            <div class="summaryViewHeader">
                                <h4 class="display-inline-block">{vtranslate('LBL_BASIC_INFORMATION', $QUALIFIED_MODULE)}</h4>
                                <div class="pull-right">
                                    {if $RECORD_MODEL->getId() eq "0"}
                                        <button type="button" class="btn btn-default debugProcessFlow">
                                            &nbsp;{vtranslate('LBL_DEBUG',$MODULE)}
                                        </button>
                                    {else}
                                        <button type="button" class="btn btn-default editProcessFlow" data-url="index.php?module=ITS4YouProcessFlow&parent=Settings&view=Edit&record={$RECORD_MODEL->getId()}">
                                            &nbsp;{vtranslate('LBL_EDIT',$MODULE)}
                                        </button>
                                    {/if}
                                </div>
                            </div>
                            <div class="summaryViewFields">
                                <div class="recordDetails">
                                    <table class="summary-table no-border">
                                        <tbody>
                                        {if $RECORD_MODEL->getId() neq "0"}
                                            <tr class="summaryViewEntries">
                                                <td class="fieldLabel">
                                                    <label class="muted textOverflowEllipsis">{vtranslate('LBL_PROCESSFLOW_NAME', $QUALIFIED_MODULE)}</label>
                                                </td>
                                                <td class="fieldValue">{$RECORD_MODEL->get('name')}</td>
                                            </tr>
                                            <tr class="summaryViewEntries">
                                                <td class="fieldLabel">
                                                    <label class="muted textOverflowEllipsis">{vtranslate('LBL_DESCRIPTION',$QUALIFIED_MODULE)}</label>
                                                </td>
                                                <td class="fieldValue" valign=top>{$RECORD_MODEL->get('description')}</td>
                                            </tr>
                                        {/if}
                                        <tr class="summaryViewEntries">
                                            <td class="fieldLabel"><label
                                                        class="muted textOverflowEllipsis">{vtranslate('LBL_TARGET_MODULE', $QUALIFIED_MODULE)}</label>
                                            </td>
                                            <td class="fieldValue"
                                                valign=top>{vtranslate($MODULE_MODEL->getName(), $MODULE_MODEL->getName())}</td>
                                        </tr>
                                        {if $RECORD_MODEL->getId() neq "0"}
                                            <tr class="summaryViewEntries">
                                                <td class="fieldLabel">
                                                    <label class="muted textOverflowEllipsis">{vtranslate('Status')}</label>
                                                </td>
                                                <td class="fieldValue" valign=top> {if $RECORD_MODEL->get('status') eq '1'}{vtranslate('Active', $QUALIFIED_MODULE)}{else}{vtranslate('InActive', $QUALIFIED_MODULE)}{/if}</td>
                                            </tr>
                                        {/if}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        {if $RECORD_MODEL->getId() neq "0"}
                            <div class="summaryView">
                                <div class="summaryViewHeader">
                                    <h4 class="display-inline-block">{vtranslate('LBL_PROCESSFLOW_CONDITION',$QUALIFIED_MODULE)}</h4>
                                </div>
                                <div class="summaryViewFields">
                                    <div class="recordDetails">
                                        {include file='DetailDisplayConditions.tpl'|@vtemplate_path:$QUALIFIED_MODULE}
                                    </div>
                                </div>
                            </div>
                            <br>
                        {/if}
                        <div class="summaryView">
                            <div class="contents tabbable clearfix">
                                <div class="summaryViewHeader">
                                    <h4 class="display-inline-block">{vtranslate('LBL_ACTIONS_OF_PROCESS_FLOW', $QUALIFIED_MODULE)}</h4>
                                </div>
                                <div class="row marginBottom10px">
                                    <div class="col-sm-7 col-xs-7">
                                        {if $RECORD_MODEL->getId()}
                                            <ul class="nav nav-tabs layoutTabs massEditTabs" style="border-bottom: 0;">
                                                <li class="tab-item yesActionTab active" title="{vtranslate('LBL_IF_YES_PF', $QUALIFIED_MODULE)}">
                                                    <a data-toggle="tab" href="#yesActionTab"><strong>{vtranslate('LBL_IF_YES', $QUALIFIED_MODULE)}</strong></a>
                                                </li>
                                                <li class="tab-item noActionTab" title="{vtranslate('LBL_IF_NO_PF', $QUALIFIED_MODULE)}">
                                                    <a data-toggle="tab" href="#noActionTab"><strong>{vtranslate('LBL_IF_NO', $QUALIFIED_MODULE)}</strong></a>
                                                </li>
                                            </ul>
                                        {/if}
                                    </div>
                                    <div class="col-sm-5 col-xs-5">
                                        <div class="pull-right btn-group">
                                            <button href="javascript:void(0);" data-toggle="dropdown" class="btn btn-default" style="margin-left: 4px;">
                                                {vtranslate('LBL_ACTIONS', $QUALIFIED_MODULE_NAME)}&nbsp;<i class="caret"></i>
                                            </button>
                                            <ul class="dropdown-menu pull-right">
                                                {foreach item=LINK from=$ACTION_LINKS}
                                                    <li>
                                                        <a href='javascript:void(0);' data-url="{$LINK->getUrl()}"
                                                           onclick='{if strpos($LINK->getUrl(), 'javascript:')===0}{$LINK->getUrl()|substr:strlen("javascript:")};{else}Settings_ITS4YouProcessFlow_Detail_Js.createRelation(this){/if}'>
                                                            {$LINK->getLabel()}
                                                        </a>
                                                    </li>
                                                {/foreach}
                                            </ul>
                                        </div>
                                    </div>
                                    <br>
                                </div>
                                <div class="noContent tab-content">
                                    {foreach item=LIST_TYPE  from=$LIST_TYPES}
                                        <div class="tab-pane {if $SELECTED_ACTION_TAB eq 'yesActionTab' && $LIST_TYPE eq 'yes'}active{elseif $SELECTED_ACTION_TAB eq 'noActionTab' && $LIST_TYPE eq 'no'}active{/if}"
                                             id="{$LIST_TYPE}ActionTab">
                                            {if $ACTIONS_LIST[$LIST_TYPE]}
                                                <div id="table-content" class="table-container tab-content" style="padding-top:0px !important; margin-top:0px;">
                                                    <table id="relatedActionsList" class="table listview-table">
                                                        <thead>
                                                        <tr class="listViewContentHeader">
                                                            <th style="width:55px;"></th>
                                                            <th nowrap>{vtranslate('Name',$QUALIFIED_MODULE)}</th>
                                                            <th nowrap>{vtranslate('LBL_TYPE',$QUALIFIED_MODULE)}</th>
                                                        </tr>
                                                        </thead>
                                                        <tbody class="overflow-y">
                                                        {foreach item=action_data  from=$ACTIONS_LIST[$LIST_TYPE]}
                                                            <tr class="listViewEntries" data-id="{$action_data.id}" data-recordUrl="{$action_data.detail_link}&pfid={$RECORD_MODEL->getId()}">
                                                                <td style="white-space: nowrap;">
                                                                    <span class="actions">
                                                                        <span class="actionImages">
                                                                            {if $action_data.edit_link}
                                                                                <a href="{$action_data.edit_link}" style="padding: 0 5px;">
                                                                                    <i title="{vtranslate('LBL_EDIT', $MODULE)}" class="fa fa-pencil alignMiddle"></i>
                                                                                </a>
                                                                            {/if}
                                                                            <a href="javascript:void(0);" class="deleteRelatedAction" style="padding: 0 5px;" data-deleteurl="{$action_data.delete_link}">
                                                                                <i title="{vtranslate('LBL_DELETE', $MODULE)}" class="fa fa-trash alignMiddle"></i>
                                                                            </a>
                                                                        </span>
                                                                    </span>
                                                                    <input style="opacity: 0;" type="checkbox" data-on-color="success" class="processFlowActionStatus" data-statusurl="{$action_data.statuschange_link}" {if $action_data.status eq "0"} checked="" value="on" {else} value="off" {/if} />
                                                                </td>
                                                                <td class="listViewEntryValue textOverflowEllipsis " width="%" nowrap>
                                                                    <a href="javascript:void(0);">{$action_data.name}</a>
                                                                </td>
                                                                <td class="listViewEntryValue textOverflowEllipsis " width="%" nowrap>{$action_data.type}</td>
                                                            </tr>
                                                        {/foreach}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            {else}
                                                <div class="border1px">
                                                    <br>
                                                    <div class="textAlignCenter">{vtranslate('LBL_NO_RELATED',$MODULE)} {vtranslate('LBL_ACTIONS',$QUALIFIED_MODULE)}</div>
                                                    <br>
                                                </div>
                                            {/if}
                                        </div>
                                    {/foreach}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="middle-block col-lg-8">
                        <div id="listContainer" class="summaryView">
                            <div class="contents tabbable clearfix">
                                <div class="summaryViewHeader">
                                    <h4 class="display-inline-block">{vtranslate('LBL_RELATED_PROCESS_FLOW', $QUALIFIED_MODULE)}</h4>
                                </div>
                                <div class="row marginBottom10px">
                                    {if $RECORD_MODEL->getId() eq "0"}
                                        <div class="col-lg-12">
                                            <div class="pull-right">
                                                <button type="button" class="btn btn-default addProcessFlow"
                                                        data-url="index.php?module=ITS4YouProcessFlow&parent=Settings&view=Edit&source_module={$MODULE_MODEL->getName()}">
                                                    &nbsp;{vtranslate('LBL_ADD_RECORD',$QUALIFIED_MODULE)}
                                                </button>
                                            </div>
                                        </div>
                                    {else}
                                        <div class="col-sm-7 col-xs-7">
                                            <ul class="nav nav-tabs layoutTabs massEditTabs"
                                                style="border-bottom: 0px;">
                                                <li class="tab-item yesPFTab active"><a data-toggle="tab"
                                                                                        href="#yesPFTab"><strong>{vtranslate('LBL_IF_YES_PF', $QUALIFIED_MODULE)}</strong></a>
                                                </li>
                                                <li class="tab-item noPFTab"><a data-toggle="tab"
                                                                                href="#noPFTab"><strong>{vtranslate('LBL_IF_NO_PF', $QUALIFIED_MODULE)}</strong></a>
                                                </li>
                                            </ul>
                                        </div>
                                        <div class="col-sm-5 col-xs-5">
                                            <div class="pull-right btn-group">
                                                <button type="button" class="btn btn-default addProcessFlow"
                                                        data-url="index.php?module=ITS4YouProcessFlow&parent=Settings&view=Edit&parentId={$RECORD_MODEL->getId()}">
                                                    &nbsp;{vtranslate('LBL_ADD_RELATED_PF',$QUALIFIED_MODULE)}
                                                </button>
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                                <div id="table-content" class="table-container tab-content"
                                     style="padding-top:0px !important; margin-top:0px;">
                                    {foreach item=LIST_TYPE  from=$LIST_TYPES}
                                        <div class="tab-pane {if $SELECTED_PF_TAB eq 'yesPFTab' && $LIST_TYPE eq 'yes'}active{elseif $SELECTED_PF_TAB eq 'noPFTab' && $LIST_TYPE eq 'no'}active{/if}"
                                             id="{$LIST_TYPE}PFTab">
                                            <table id="listview-table" class="workflow-table table listview-table">
                                                {assign var="NAME_FIELDS" value=$MODULE_MODEL->getNameFields()}
                                                {assign var=WIDTHTYPE value=$CURRENT_USER_MODEL->get('rowheight')}
                                                <thead>
                                                <tr class="listViewContentHeader">
                                                    <th style="width: 100px;"></th>
                                                    {foreach item=LISTVIEW_HEADER from=$LISTVIEW_HEADERS}
                                                        {assign var="HEADER_NAME" value="{$LISTVIEW_HEADER->get('name')}"}
                                                        {if $HEADER_NAME neq 'module_name'}
                                                            <th nowrap>
                                                                <a class="listViewHeaderValues">{vtranslate($LISTVIEW_HEADER->get('label'), $QUALIFIED_MODULE)}</a>&nbsp;
                                                            </th>
                                                        {/if}
                                                    {/foreach}
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {foreach item=LISTVIEW_ENTRY from=$LISTVIEW_ENTRIES[$LIST_TYPE]}
                                                    <tr class="listViewEntries" data-id="{$LISTVIEW_ENTRY->getId()}"
                                                        data-recordurl="{$LISTVIEW_ENTRY->getDetailViewUrl()}">
                                                        <td>
                                                            {include file="ListViewRecordActions.tpl"|vtemplate_path:$QUALIFIED_MODULE}
                                                        </td>
                                                        {foreach item=LISTVIEW_HEADER from=$LISTVIEW_HEADERS}
                                                            {assign var=LISTVIEW_HEADERNAME value=$LISTVIEW_HEADER->get('name')}
                                                            {if $LISTVIEW_HEADERNAME neq 'module_name'}
                                                                <td class="listViewEntryValue {$WIDTHTYPE}"
                                                                    width="{$WIDTH}%" nowrap>
                                                                    {if $LISTVIEW_HEADERNAME eq 'conditions'}
                                                                        {assign var=WORKFLOW_CONDITION value=$LISTVIEW_ENTRY->getConditonDisplayValue()}
                                                                        {assign var=ALL_CONDITIONS value=$WORKFLOW_CONDITION['All']}
                                                                        {assign var=ANY_CONDITIONS value=$WORKFLOW_CONDITION['Any']}
                                                                        <span><strong>{vtranslate('All')}&nbsp;:&nbsp;&nbsp;&nbsp;</strong></span>
                                                                        {if is_array($ALL_CONDITIONS) && !empty($ALL_CONDITIONS)}
                                                                            {foreach item=ALL_CONDITION from=$ALL_CONDITIONS name=allCounter}
                                                                                {if $smarty.foreach.allCounter.iteration neq 1}
                                                                                    <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span>
                                                                                {/if}
                                                                                <span>{$ALL_CONDITION}</span>
                                                                                <br>
                                                                            {/foreach}
                                                                        {else}
                                                                            {vtranslate('LBL_NA')}
                                                                        {/if}
                                                                        <br>
                                                                        <span><strong>{vtranslate('Any')}&nbsp;:&nbsp;</strong></span>
                                                                        {if is_array($ANY_CONDITIONS) && !empty($ANY_CONDITIONS)}
                                                                            {foreach item=ANY_CONDITION from=$ANY_CONDITIONS name=anyCounter}
                                                                                {if $smarty.foreach.anyCounter.iteration neq 1}
                                                                                    <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span>
                                                                                {/if}
                                                                                <span>{$ANY_CONDITION}</span>
                                                                                <br>
                                                                            {/foreach}
                                                                        {else}
                                                                            {vtranslate('LBL_NA')}
                                                                        {/if}
                                                                    {elseif $LISTVIEW_HEADERNAME eq 'execution_condition'}
                                                                        {$LISTVIEW_ENTRY->getDisplayValue('v7_execution_condition')}
                                                                    {elseif $LISTVIEW_HEADERNAME eq 'pfname'}
                                                                        {$LISTVIEW_ENTRY->getName()}
                                                                    {else}
                                                                        {$LISTVIEW_ENTRY->getDisplayValue($LISTVIEW_HEADERNAME)}
                                                                    {/if}
                                                                </td>
                                                            {/if}
                                                        {/foreach}
                                                    </tr>
                                                    {foreachelse}
                                                    <tr class="emptyRecordsDiv">
                                                        {assign var=COLSPAN_WIDTH value={count($LISTVIEW_HEADERS)+1}}
                                                        <td colspan="{$COLSPAN_WIDTH}"
                                                            style="vertical-align:inherit !important;">
                                                            <center>{vtranslate('LBL_NO_RELATED_PF_FOUND', $QUALIFIED_MODULE)}</center>
                                                        </td>
                                                    </tr>
                                                {/foreach}
                                                </tbody>
                                            </table>
                                        </div>
                                    {/foreach}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </div>
{/strip}