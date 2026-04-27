{*<!--
/*********************************************************************************
* The content of this file is subject to the Process Flow 4 You.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
********************************************************************************/
-->*}
<div class="listViewEntriesDiv" style='overflow-x:auto;'>
    <div class="col-sm-12 col-xs-12 ">
        <h4>{vtranslate($MODULE, $QUALIFIED_MODULE)} {vtranslate('LBL_MODULES', $QUALIFIED_MODULE)}</h4>
        <hr>
        <div>
            <div>
                <div class="{$MODULE}Search padding1per">
                    <table class="table table-bordered">
                        <tbody>
                            <tr>
                                {assign var=COUNTER value=0}
                                {foreach item=S_MODULE_MODEL key=TAB_ID from=$ALL_MODULES}
                                    {if $COUNTER eq 2}
                                        </tr><tr>
                                        {assign var=COUNTER value=0}
                                    {/if}
                                    <td width="50%" class="listViewEntries cursorPointer" data-recordurl="index.php?module=ITS4YouProcessFlow&view=Detail&parent=Settings&sourceModule={$S_MODULE_MODEL->getName()}">
                                        {vtranslate($S_MODULE_MODEL->getName(),$S_MODULE_MODEL->getName())}
                                    </td>
                                    {assign var=COUNTER value=$COUNTER+1}
                                {/foreach}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>