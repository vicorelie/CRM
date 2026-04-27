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
    <div class="detailview-content container-fluid">
        <br>
        <h4>{vtranslate($MODULE,$MODULE)}</h4>
        <hr>
        <br>
        <div class="details">
            <form id="detailView" method="post" action="index.php" name="etemplatedetailview" onsubmit="VtigerJS_DialogBox.block();">
                <input type="hidden" name="action" value="">
                <input type="hidden" name="view" value="">
                <input type="hidden" name="module" value="ITS4YouListViewColors">
                <input type="hidden" name="retur_module" value="ITS4YouListViewColors">
                <input type="hidden" name="return_action" value="ITS4YouListViewColors">
                <input type="hidden" name="return_view" value="Detail">
                <input type="hidden" name="templateid" value="{$TEMPLATEID}">
                <input type="hidden" name="parenttab" value="{$PARENTTAB}">
                <input type="hidden" name="isDuplicate" value="false">
                <input type="hidden" name="subjectChanged" value="">
                <input id="recordId" value="{$TEMPLATEID}" type="hidden">
                <div>
                    <div class="left-block col-lg-4">
                        <div class="summaryView">
                            <div class="summaryViewHeader">
                                <h4 class="display-inline-block">{vtranslate('LBL_BASIC_INFORMATION', $QUALIFIED_MODULE)}</h4>
                                <div class="pull-right">
                                    <a type="button" class="btn btn-default editLVC" href="index.php?module=ITS4YouListViewColors&parent=Settings&view=Edit&record={$RECORD_MODEL->getId()}">
                                        &nbsp;{vtranslate('LBL_EDIT',$MODULE)}
                                    </a>
                                </div>
                            </div>
                            <div class="summaryViewFields">
                                <div class="recordDetails">
                                    <table class="summary-table no-border">
                                        <tbody>
                                        <tr class="summaryViewEntries">
                                            <td class="fieldLabel"><label class="muted textOverflowEllipsis">{vtranslate('LBL_LVC_NAME', $QUALIFIED_MODULE)}</label></td>
                                            <td class="fieldValue">{$RECORD_MODEL->get('name')}</td>
                                        </tr>
                                        <tr class="summaryViewEntries">
                                            <td class="fieldLabel"><label class="muted textOverflowEllipsis">{vtranslate('LBL_DESCRIPTION', $QUALIFIED_MODULE)}</label></td>
                                            <td class="fieldValue">{$RECORD_MODEL->get('description')}</td>
                                        </tr>
                                        <tr class="summaryViewEntries">
                                            <td class="fieldLabel">
                                                <label class="muted textOverflowEllipsis">{vtranslate('LBL_FIELD', $QUALIFIED_MODULE)}</label>
                                            </td>
                                            <td class="fieldValue">{$RECORD_MODEL->getFieldLabel()}</td>
                                        </tr>

                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <br>
                        {if 'List' === $RECORD_MODEL->getMode()}
                        <div class="summaryView">
                            <div class="summaryViewHeader">
                                <h4 class="display-inline-block">{vtranslate('LBL_LIST_SETTINGS', $MODULE)}</h4>
                            </div>
                            <div class="summaryViewFields">
                                <div class="recordDetails">
                                    <table class="summary-table no-border">
                                        <tbody>
                                        <tr class="summaryViewEntries">
                                            <td class="fieldLabel"><label class="muted textOverflowEllipsis">{vtranslate('LBL_TYPE', $QUALIFIED_MODULE)}</label></td>
                                            <td class="fieldValue">{$COLORING_TYPE}</td>
                                        </tr>
                                        <tr class="summaryViewEntries">
                                            <td class="fieldLabel"><label class="muted textOverflowEllipsis">{vtranslate('LBL_COLOR',$QUALIFIED_MODULE)}</label></td>
                                            <td class="fieldValue" valign=top>
                                                <span class="picklist-color" {if $RECORD_MODEL->get('coloring_type') eq "background"}
                                                    style="background-color: {$RECORD_MODEL->get('color')}; line-height:15px; color: {Settings_Picklist_Module_Model::getTextColor($RECORD_MODEL->get('color'))};"
                                                {else}
                                                    style="color: {$RECORD_MODEL->get('color')};"
                                                {/if}
                                                >
                                                   {$RECORD_MODEL->get('color')}
                                                </span>
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <br>
                        {else}
                        <div class="summaryView">
                            <div class="summaryViewHeader">
                                <h4 class="display-inline-block">{vtranslate('LBL_RECORD_SETTINGS', $MODULE)}</h4>
                            </div>
                            <div class="summaryViewFields">
                                <div class="recordDetails">
                                    <table class="summary-table no-border">
                                        <tbody>
                                        <tr class="summaryViewEntries">
                                            <td class="fieldLabel">
                                                <label class="muted textOverflowEllipsis">{vtranslate('LBL_LABEL_COLOR', $MODULE)}</label>
                                            </td>
                                            <td class="fieldValue">{$RECORD_MODEL->getRecordColors('label_color')}</td>
                                        </tr>
                                        <tr class="summaryViewEntries">
                                            <td class="fieldLabel">
                                                <label class="muted textOverflowEllipsis">{vtranslate('LBL_LABEL_BACKGROUND', $MODULE)}</label>
                                            </td>
                                            <td class="fieldValue">{$RECORD_MODEL->getRecordColors('label_background')}</td>
                                        </tr>
                                        <tr class="summaryViewEntries">
                                            <td class="fieldLabel">
                                                <label class="muted textOverflowEllipsis">{vtranslate('LBL_VALUE_COLOR', $MODULE)}</label>
                                            </td>
                                            <td class="fieldValue">{$RECORD_MODEL->getRecordColors('value_color')}</td>
                                        </tr>
                                        <tr class="summaryViewEntries">
                                            <td class="fieldLabel">
                                                <label class="muted textOverflowEllipsis">{vtranslate('LBL_VALUE_BACKGROUND', $MODULE)}</label>
                                            </td>
                                            <td class="fieldValue">{$RECORD_MODEL->getRecordColors('value_background')}</td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <br>
                        {/if}
                    </div>
                    <div class="middle-block col-lg-8">
                    </div>
                </div>
            </form>
        </div>
    </div>
{/strip}