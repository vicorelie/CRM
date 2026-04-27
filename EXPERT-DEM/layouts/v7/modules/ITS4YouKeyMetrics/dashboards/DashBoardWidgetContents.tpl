{*/*<!--
/*********************************************************************************
 * The content of this file is subject to the Reports 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/
-->*/*}

{if $display_widget_header == 'true'}
    <div class="dashboardWidgetHeader">
        {include file="dashboards/WidgetHeader.tpl"|@vtemplate_path:$MODULE_NAME}
    </div>
{/if}
<div style="height:5px;"></div>
{strip}
    <input class="widgetData" type='hidden' value='{Vtiger_Util_Helper::toSafeHTML(ZEND_JSON::encode($DATA))}' />

    {$DATA}
{/strip}

