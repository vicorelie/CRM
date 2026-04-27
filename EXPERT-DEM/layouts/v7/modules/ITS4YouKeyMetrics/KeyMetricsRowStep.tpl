{*/*<!--
/*********************************************************************************
 * The content of this file is subject to the Reports 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/
-->*/*}
<script type="text/javascript">
jQuery().ready(function() {
    var ITS4YouKeyMetrics_Js = new ITS4YouKeyMetrics_List_Js();
    ITS4YouKeyMetrics_Js.registerReportChangeEvent();
});
</script>

{strip}
    <div class="row-fluid">       
    <div class="listViewHeaders">
        <div class="row-fluid">
            <div class='fieldBlockContainer' data-block="LBL_KEY_METRICS_INFORMATION">
                <h4 class='fieldBlockHeader'>{vtranslate('LBL_KEY_METRICS_INFORMATION', $MODULE)}</h4>
                <hr>

                <div class="form-group">
                    <label for="description" class="col-sm-4 control-label">{vtranslate('label', $MODULE)}</label>
                    <div class="col-lg-6">
                        <input id="label" data-validation-engine='validate[required]' name="label" class="form-control" data-rule-required="true" type="text" value="{$label}"/>
                    </div>
                </div>

                <div class="form-group">
                    <label for="description" class="col-sm-4 control-label">{vtranslate('LBL_REPORT_NAME', $MODULE)}</label>
                    <div class="col-lg-6">
                        <select name="reportname" id="reportname" class="select2 col-lg-12"  style="margin:auto;"  data-rule-required="true" data-validation-engine="validate[required]">
                            <option value="" ></option>
                            {foreach key=foldername item=report from=$reportsList}
                                <optgroup label='{$foldername}'>
                                    {foreach key=valueid item=reportname from=$report}
                                        <option value="{$valueid}" {if $metrics_type=="report" && $valueid==$reportid}selected{/if} >{$reportname}</option>
                                    {/foreach}
                                </optgroup>
                            {/foreach}

                            {foreach key=viewtype item=customview from=$cvList}
                                {if !empty($customview)}
                                    <optgroup label='{$viewtype}'>
                                        {foreach key=valueid item=viewname from=$customview}
                                            {assign var=cv_id value="cv_$reportid"}
                                            <option value="{$valueid}" {if $metrics_type=="customview" && $valueid==$cv_id}selected{/if} >{$viewname}</option>
                                        {/foreach}
                                    </optgroup>
                                {/if}
                            {/foreach}

                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="description" class="col-sm-4 control-label">{vtranslate('column_str', $MODULE)}</label>
                    <div class="col-lg-6">
                        <select name="column_str" id="column_str" class="select2 col-lg-12"  style="margin:auto;" data-rule-required="true" data-validation-engine="validate[required]">
                            <option value="" >{vtranslate('LBL_NONE',$MODULE)}</option>
                            {if $col_options!=""}
                                {$col_options}
                            {else}
                                {foreach key=optgroupvalue item=optgrouparray from=$summaries_otions}
                                    {if $optgroupvalue!=""}
                                        <optgroup label='{vtranslate($optgroupvalue,$report_module)}'>
                                            {foreach item=summaries_column_arr from=$optgrouparray}
                                                {assign var=summaries_column_val value=$summaries_column_arr.value}
                                                {assign var=summaries_column_text value=$summaries_column_arr.text}
                                                <option value="{$summaries_column_val}" {if $column_str_value==$summaries_column_val}selected{/if} >{$summaries_column_text}</option>
                                            {/foreach}
                                        </optgroup>
                                    {/if}
                                {/foreach}
                            {/if}
                        </select>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>      
{/strip}