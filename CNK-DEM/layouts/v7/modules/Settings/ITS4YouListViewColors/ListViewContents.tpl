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
    <div class="col-sm-12 col-xs-12 ">

        {if $PROCESS_FLOW_ERROR eq "yes"}
            <div class="alert alert-info fade in alert-dismissible">
                <strong>{vtranslate('LBL_INFO', $QUALIFIED_MODULE)}!</strong> {vtranslate('LBL_PROCESS_FLOW_MODULE_REQUIRED', $QUALIFIED_MODULE)}.
            </div>
        {/if}

        <input type="hidden" id="pageStartRange" value="{$PAGING_MODEL->getRecordStartRange()}"/>
        <input type="hidden" id="pageEndRange" value="{$PAGING_MODEL->getRecordEndRange()}"/>
        <input type="hidden" id="previousPageExist" value="{$PAGING_MODEL->isPrevPageExists()}"/>
        <input type="hidden" id="nextPageExist" value="{$PAGING_MODEL->isNextPageExists()}"/>
        <input type="hidden" id="totalCount" value="{$LISTVIEW_COUNT}"/>
        <input type="hidden" value="{$ORDER_BY}" id="orderBy">
        <input type="hidden" value="{$SORT_ORDER}" id="sortOrder">
        <input type="hidden" id="totalCount" value="{$LISTVIEW_COUNT}"/>
        <input type='hidden' value="{$PAGE_NUMBER}" id='pageNumber'>
        <input type='hidden' value="{$PAGING_MODEL->getPageLimit()}" id='pageLimit'>
        <input type="hidden" value="{$LISTVIEW_ENTRIES_COUNT}" id="noOfEntries">
        <div class="row">
            <div class='col-md-5'>
                <div class="foldersContainer hidden-xs pull-left">
                </div>
            </div>
            <div class="col-md-4">
            </div>
            <div class="col-md-3">
                {assign var=RECORD_COUNT value=$LISTVIEW_ENTRIES_COUNT}
                {include file="Pagination.tpl"|vtemplate_path:$MODULE SHOWPAGEJUMP=true}
            </div>
        </div>
        <div class="list-content row">
            <div class="col-sm-12 col-xs-12 ">
                <div id="table-content" class="table-container" style="padding-top:0px !important;">
                    <table id="listview-table" class="table listview-table">
                        {assign var="NAME_FIELDS" value=$MODULE_MODEL->getNameFields()}
                        {assign var=WIDTHTYPE value=$CURRENT_USER_MODEL->get('rowheight')}
                        <thead>
                        <tr class="listViewContentHeader">
                            <th style="width: 100px;"></th>
                            {foreach item=LISTVIEW_HEADER from=$LISTVIEW_HEADERS}
                                {assign var=HEADER_NAME value=$LISTVIEW_HEADER->get('name')}
                                {if 'record_colors' eq $HEADER_NAME}{continue}{/if}
                                <th nowrap>
                                    <a {if !($LISTVIEW_HEADER->has('sort'))} class="listViewHeaderValues cursorPointer" data-nextsortorderval="{if $COLUMN_NAME eq $HEADER_NAME}{$NEXT_SORT_ORDER}{else}ASC{/if}" data-columnname="{$HEADER_NAME}" {/if}>{vtranslate($LISTVIEW_HEADER->get('label'), $QUALIFIED_MODULE)}
                                        &nbsp;{if $COLUMN_NAME eq $HEADER_NAME}<img class="{$SORT_IMAGE} icon-white">{/if}</a>&nbsp;
                                </th>
                            {/foreach}
                        </tr>
                        </thead>
                        <tbody>
                        {foreach item=LISTVIEW_ENTRY from=$LISTVIEW_ENTRIES}
                            {assign var=LISTVIEW_COLORING_MODE value=$LISTVIEW_ENTRY->getMode()}
                            <tr class="listViewEntries" data-id="{$LISTVIEW_ENTRY->getId()}" data-recordurl="{$LISTVIEW_ENTRY->getDetailViewUrl()}">
                                <td>
                                    {include file="ListViewRecordActions.tpl"|vtemplate_path:$QUALIFIED_MODULE}
                                </td>
                                {foreach item=LISTVIEW_HEADER from=$LISTVIEW_HEADERS}
                                    {assign var=LISTVIEW_HEADERNAME value=$LISTVIEW_HEADER->get('name')}
                                    {assign var=LAST_COLUMN value=$LISTVIEW_HEADER@last}
                                    {if 'record_colors' eq $LISTVIEW_HEADERNAME}{continue}{/if}
                                    <td class="listViewEntryValue {$WIDTHTYPE}" width="{$WIDTH}%" nowrap>
                                        {if 'record_status' eq $LISTVIEW_HEADERNAME}
                                            {$LISTVIEW_ENTRY->getMode()}
                                        {elseif 'field_name' eq $LISTVIEW_HEADERNAME}
                                            {$LISTVIEW_ENTRY->getFieldLabel()}
                                        {elseif 'color' eq $LISTVIEW_HEADERNAME}
                                            {if 'List' eq $LISTVIEW_COLORING_MODE}
                                                {assign var=SELECTED_COLOR value=$LISTVIEW_ENTRY->get($LISTVIEW_HEADERNAME)}
                                                <span class="picklist-color" style="background-color: {$SELECTED_COLOR}; line-height:15px; color: {Settings_Picklist_Module_Model::getTextColor($SELECTED_COLOR)};">{$SELECTED_COLOR}</span>
                                            {else}
                                                <span class="picklist-color" style="margin-right: 5px; background: {$LISTVIEW_ENTRY->getRecordColors('label_background')};color: {$LISTVIEW_ENTRY->getRecordColors('label_color')};">{vtranslate('Field label', $QUALIFIED_MODULE)}</span>
                                                <span class="picklist-color" style="background: {$LISTVIEW_ENTRY->getRecordColors('value_background')};color: {$LISTVIEW_ENTRY->getRecordColors('value_color')};">{vtranslate('Field value', $QUALIFIED_MODULE)}</span>
                                            {/if}
                                        {else}
                                            {$LISTVIEW_ENTRY->getDisplayValue($LISTVIEW_HEADERNAME)}
                                        {/if}
                                    </td>
                                {/foreach}
                            </tr>
                        {/foreach}
                        {if $LISTVIEW_ENTRIES_COUNT eq '0'}
                            <tr class="emptyRecordsDiv">
                                {assign var=COLSPAN_WIDTH value={count($LISTVIEW_HEADERS)+1}}
                                <td colspan="{$COLSPAN_WIDTH}" style="vertical-align:inherit !important;">
                                    <center>{vtranslate('LBL_NO')} {vtranslate($MODULE, $QUALIFIED_MODULE)} {vtranslate('LBL_FOUND')}</center>
                                </td>
                            </tr>
                        {/if}
                        </tbody>
                    </table>
                </div>
                <div id="scroller_wrapper" class="bottom-fixed-scroll">
                    <div id="scroller" class="scroller-div"></div>
                </div>
            </div>
        </div>
    </div>
{/strip}
