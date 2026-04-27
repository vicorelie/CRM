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
        {include file="dashboards/KeyMetricsHeader.tpl"|@vtemplate_path:$MODULE_NAME}
    </div>
{/if}
{strip}
<div class="" style="position: relative; overflow: hidden; width: auto; height: 90%;">
  <div class="dashboardWidgetContent" style="padding: 5px; overflow: hidden; width: auto; height: 100%; overflow: auto;">

      {if !empty($DATA)}
        {foreach item=keyMetricsRow key=dKey from=$DATA}
          {assign var=RHEIGHT value=$keyMetricsRow.rheight}
          <div style="padding:5px;height:{$RHEIGHT}em;"><span class="pull-right">{$keyMetricsRow.value}</span><a href="{$keyMetricsRow.result_url}">{$keyMetricsRow.name}</a></div>
        {/foreach}
      {else}
        {vtranslate('LBL_NO_DATA_AVAILABLE',$MODULE)}
      {/if}
  </div>
</div>
<div style="background: rgb(0, 0, 0) none repeat scroll 0% 0%; width: 7px; position: absolute; top: 0px; opacity: 0.4; display: none; border-radius: 7px; z-index: 99; right: 1px; height: 260px;" class="slimScrollBar ui-draggable">
</div>
<div style="width: 7px; height: 100%; position: absolute; top: 0px; display: none; border-radius: 7px; background: rgb(51, 51, 51) none repeat scroll 0% 0%; opacity: 0.2; z-index: 90; right: 1px;" class="slimScrollRail">
</div>

    <div class="widgeticons dashBoardWidgetFooter">
        <div class="footerIcons pull-right">
            {include file="dashboards/DashboardFooterIcons.tpl"|@vtemplate_path:$MODULE_NAME}
        </div>
    </div>

{/strip}
