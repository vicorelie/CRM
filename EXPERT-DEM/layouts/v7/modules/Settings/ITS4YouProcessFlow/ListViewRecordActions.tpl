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
    <!--LIST VIEW RECORD ACTIONS-->
    <div style="width:120px ;">
    <span class="actionsRecordButton" style="opacity: 0; padding: 0 5px; padding: 0 5px;">
        <a class="deleteRecordButton" style="padding: 0 5px;">
            <i title="{vtranslate('LBL_DELETE', $MODULE)}" class="fa fa-trash alignMiddle"></i>
        </a>
        <a class="editRecordButton" data-id="{$LISTVIEW_ENTRY->getId()}" href="javascript:void(0);" data-url="{$LISTVIEW_ENTRY->getEditViewUrl()}" name="editlink">
            <i title="{vtranslate('LBL_EDIT', $MODULE)}" class="fa fa-pencil alignMiddle"></i>
        </a>
    </span>
        <input style="opacity: 0;" {if $LISTVIEW_ENTRY->get('status')} checked value="on" {else} value="off"{/if} data-on-color="success" data-id="{$LISTVIEW_ENTRY->getId()}" type="checkbox" name="processflowstatus" id="processflowstatus">
    </div>
{/strip}