{*/*<!--
/*********************************************************************************
 * The content of this file is subject to the Key Metrics 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/
-->*/*}

{strip}
    <div class="col-sm-12 col-xs-12 dependencyMapping " id="listViewPageDiv">
        {if $LEFTPANELHIDE neq '1'}
            {assign var=LEFTPANELHIDE value=$CURRENT_USER_MODEL->get('leftpanelhide')}
            <div class="essentials-toggle" title="{vtranslate('LBL_LEFT_PANEL_SHOW_HIDE', 'Vtiger')}">
                <span class="essentials-toggle-marker fa {if $LEFTPANELHIDE eq '1'}fa-chevron-right{else}fa-chevron-left{/if} cursorPointer"></span>
            </div>
        {/if}
        <div id="table-content" class="table-container">
            <form name='list' id='listedit' action='' onsubmit="return false;">
                <input type="hidden" value="{$ORDER_BY}" id="orderBy">
                <input type="hidden" value="{$SORT_ORDER}" id="sortOrder">
                <p class="listViewLoadingMsg hide">{vtranslate('LBL_LOADING_LISTVIEW_CONTENTS', $MODULE)}........</p>
                {assign var=WIDTHTYPE value=$CURRENT_USER_MODEL->get('rowheight')}

                <table id="listview-table"  class="table {if $LISTVIEW_ENTRIES_COUNT eq '0'}listview-table-norecords {/if} listview-table listViewEntriesTable">
                    <thead>
                    <tr class="listViewContentHeader">
                        <th style="width:5% !important;">
                            {if !$SEARCH_MODE_RESULTS}
                                <div class="table-actions">
                                </div>
                            {elseif $SEARCH_MODE_RESULTS}
                                {vtranslate('LBL_ACTIONS',$MODULE)}
                            {/if}
                        </th>

                        {foreach key=LISTVIEW_HEADER_KEY item=LISTVIEW_HEADER from=$LISTVIEW_HEADERS}
                            <th nowrap {if $LISTVIEW_HEADER@last} colspan="2" {/if} class="{$WIDTHTYPE}" style="width:25% !important;">
                                <a href="javascript:void(0);" class="listViewHeaderValues" data-nextsortorderval="{if $COLUMN_NAME eq $LISTVIEW_HEADER_KEY}{$NEXT_SORT_ORDER}{else}ASC{/if}" data-columnname="{$LISTVIEW_HEADER_KEY}">
                                    &nbsp;{vtranslate({$LISTVIEW_HEADER.name},$MODULE)}&nbsp;
                                </a>
                                {if $COLUMN_NAME eq $LISTVIEW_HEADER_KEY}
                                    <a href="#" class="removeSorting"><i class="fa fa-remove"></i></a>
                                {/if}
                            </th>
                        {/foreach}
                    </tr>

                    {if $MODULE_MODEL->isQuickSearchEnabled() && !$SEARCH_MODE_RESULTS}
                        <tr class="searchRow">
                            <th class="inline-search-btn">
                                <div class="table-actions">
                                    <button class="btn btn-success btn-sm" data-trigger="listSearch">{vtranslate("LBL_SEARCH",$MODULE)}</button>
                                </div>
                            </th>
                            {foreach item=LISTVIEW_HEADER key=LISTVIEW_HEADER_KEY from=$LISTVIEW_HEADERS}
                                <th>
                                    {assign var="DATA_TYPE" value=$LISTVIEW_HEADER['type']}
                                    {if $LISTVIEW_HEADER.column == "smcreatorid"}
                                        {assign var=PICKLIST_VALUES value=$USERS_OPTIONS}
                                        {assign var=SEARCH_VALUES value=explode(',',$SEARCH_DETAILS[$LISTVIEW_HEADER_KEY]['searchValue'])}
                                        <div class="row-fluid">
                                            <select class="listSearchContributor select2 report-type-select col-lg-10" name="{$LISTVIEW_HEADER_KEY}" multiple data-fieldinfo='{$FIELD_INFO|escape}'>
                                                {foreach item=PICKLIST_ARR from=$PICKLIST_VALUES}
                                                    {if $LISTVIEW_HEADER_KEY === 'reporttype'}
                                                        {assign var="PICKLIST_LABEL" value=vtranslate($PICKLIST_ARR['1'],$MODULE)}
                                                    {else}
                                                        {assign var="PICKLIST_LABEL" value=$PICKLIST_ARR['1']}
                                                    {/if}
                                                    {assign var="PICKLIST_KEY" value=$PICKLIST_ARR['0']}
                                                    <option value="{$PICKLIST_KEY}" {if in_array($PICKLIST_KEY,$SEARCH_VALUES) && ($PICKLIST_KEY neq "") } selected{/if} {if $LISTVIEW_HEADER_KEY eq 'reporttype'}class='{$ICON_CLASS}'{/if}>{$PICKLIST_LABEL}</option>
                                                {/foreach}
                                            </select>
                                        </div>
                                    {else}
                                        <div class="row-fluid">
                                            <input type="text" name="{$LISTVIEW_HEADER_KEY}" class="listSearchContributor inputElement" value="{$SEARCH_DETAILS[$LISTVIEW_HEADER_KEY]['searchValue']}" data-fieldinfo='{$FIELD_INFO|escape}'/>
                                        </div>
                                    {/if}

                                    <input type="hidden" class="operatorValue" value="{$SEARCH_DETAILS[$LISTVIEW_HEADER_KEY]['comparator']}">
                                </th>
                            {/foreach}
                        </tr>
                    {/if}
                    </thead>

                    <tbody class="overflow-y">
                    {foreach item=LISTVIEW_ENTRY from=$LISTVIEW_ENTRIES name=listview}
                        <tr class="listViewEntries" data-id='{$LISTVIEW_ENTRY.id}' data-recordUrl='' id="{$MODULE}_listView_row_{$smarty.foreach.listview.index+1}">
                            <td class = "listViewRecordActions textAlignCenter">
                            		{if $CURRENT_USER_MODEL->isAdminUser() || $LISTVIEW_ENTRY.smcreatorid==$CURRENT_USER_MODEL->getId()}
		                                <a href='javascript:void(0);' class="editRecordButton" data-id="{$LISTVIEW_ENTRY.id}">
		                                    <i class="fa fa-pencil"></i>
		                                </a>
		                                &nbsp;
		                                <a href='javascript:void(0);' class="deleteRecordButton" data-id="{$LISTVIEW_ENTRY.id}" >
		                                    <i class="fa fa-trash" title="{vtranslate('Delete')}"></i>
		                                </a>
                                {/if}
                            </td>
                            {foreach item=LISTVIEW_HEADER key=LISTVIEW_HEADER_KEY  from=$LISTVIEW_HEADERS}
                                {assign var=LISTVIEW_HEADERNAME value=$LISTVIEW_HEADER_KEY}
                                {assign var=COLUMNNAME value=$LISTVIEW_HEADER.column}
                                {assign var=COLUMNVALUE value=$LISTVIEW_ENTRY.$COLUMNNAME}
                                <td class="listViewEntryValue" data-name="{$LISTVIEW_HEADERNAME}" title="{$LISTVIEW_ENTRY_RAWVALUE}" data-rawvalue="{$LISTVIEW_ENTRY_RAWVALUE}" data-field-type="">
										<span class="fieldValue">
											<span class="value textOverflowEllipsis">
												{if $COLUMNNAME=="name"}
                                                    <a href="index.php?module=ITS4YouKeyMetrics&view=KeyMetricsRows&id={$LISTVIEW_ENTRY.id}">
                                                        {$COLUMNVALUE}
                                                    </a>
                                                {elseif $COLUMNNAME=="smcreatorid"}
                                                    {getUserFullName($COLUMNVALUE)}
                                                {else}
                                                    {$COLUMNVALUE}
                                                {/if}
											</span>
										</span>
                                    </span>
                                </td>
                            {/foreach}
                        </tr>
                    {/foreach}
                    {if $LISTVIEW_ENTRIES_COUNT eq '0'}
                        <tr class="emptyRecordsDiv">
                            {assign var=COLSPAN_WIDTH value={count($LISTVIEW_HEADERS)}+1}
                            <td colspan="{$COLSPAN_WIDTH}">
                                <div class="emptyRecordsDiv">
                                    <div class="emptyRecordsContent">
                                        {assign var=SINGLE_MODULE value="SINGLE_$MODULE"}
                                        {vtranslate('LBL_NO')} {vtranslate($MODULE, $MODULE)} {vtranslate('LBL_FOUND')}. <a href="javascript:void(0);" id="add_widget_href" style="color:blue">{vtranslate("LBL_ADD_WIDGET")}</a>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    {/if}
                    </tbody>
                </table>
            </form>
        </div>
        <div id="scroller_wrapper" class="bottom-fixed-scroll">
            <div id="scroller" class="scroller-div"></div>
        </div>
    </div>
    <br>
    <div align="center" class="small" style="color: rgb(153, 153, 153);">{vtranslate($MODULE,$MODULE)} {$VERSION} {vtranslate("COPYRIGHT",$MODULE)}</div>
{/strip}