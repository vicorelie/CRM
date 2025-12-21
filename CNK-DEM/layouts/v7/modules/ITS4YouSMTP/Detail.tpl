{*/*********************************************************************************
* The content of this file is subject to the ITS4YouEmails license.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
********************************************************************************/*}
<div class="padding20 detailViewContainer">
    <div class="clearfix">
        <div class="pull-right">
            <a class="btn btn-default" href="{$RECORD_MODEL->getEditViewUrl()}">
                <i class="fa fa-pencil"></i>&nbsp;
                <span>{vtranslate('LBL_EDIT', $QUALIFIED_PAGE)}</span>
            </a>
            <a class="btn btn-default" href="{$RECORD_MODEL->getDeleteActionUrl()}">
                <i class="fa fa-trash"></i>&nbsp;
                <span>{vtranslate('LBL_DELETE', $QUALIFIED_PAGE)}</span>
            </a>
        </div>
        <h3 style="margin-top: 0;">{vtranslate($MODULE, $MODULE)}: {$RECORD_MODEL->get('server')}</h3>
    </div>
    <div class="block">
        <table class="table editview-table no-border">
            {foreach from=$RECORD_HEADERS item=RECORD_HEADER}
                {if 'server' eq $RECORD_HEADER}
                    <tr>
                        <td colspan="2">
                            <h4>{vtranslate('LBL_BASIC_INFORMATION', $MODULE)}</h4>
                        </td>
                    </tr>
                {/if}
                {if 'mailer_type' eq $RECORD_HEADER}
                    <tr>
                        <td colspan="2">
                            <h4>{vtranslate('LBL_ADVANCED_SETTINGS', $MODULE)}</h4>
                        </td>
                    </tr>
                {/if}
                <tr>
                    <td class="fieldLabel Label_{$RECORD_HEADER}" style="width: 20%">{vtranslate($RECORD_HEADER, $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue Value_{$RECORD_HEADER}">{$RECORD_MODEL->getDisplayValue($RECORD_HEADER)}</td>
                </tr>
            {/foreach}
        </table>
    </div>
</div>