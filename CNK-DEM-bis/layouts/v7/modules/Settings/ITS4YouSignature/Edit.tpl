{*<!--
/*********************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
********************************************************************************/
-->*}
{strip}
    <div class="col-lg-12">
        <h4>{vtranslate('LBL_SETTINGS', $QUALIFIED_MODULE)} {vtranslate($MODULE, $QUALIFIED_MODULE)}</h4>
        <hr>
        <form action="index.php" method="post" id="EditView">
            <input type="hidden" name="module" value="{$MODULE}">
            <input type="hidden" name="action" value="Save">
            <input type="hidden" name="parent" value="Settings">
            <div class="fieldBlockContainer">
                <table class="table no-border">
                    {foreach item=FIELD_NAME from=$RECORD_MODEL->getFieldNames()}
                        <tr>
                            <td class="fieldLabel" style="width: 200px;">
                                {if $RECORD_MODEL->isRequired($FIELD_NAME)}<span class="redColor">*</span>&nbsp;{/if}
                                <label for="{$FIELD_NAME}">{vtranslate($FIELD_NAME, $QUALIFIED_MODULE)}</label>
                            </td>
                            <td class="fieldValue">
                                <input style="min-width: 400px;" class="inputElement" {if $RECORD_MODEL->isRequired($FIELD_NAME)}required{/if} id="{$FIELD_NAME}" type="text" value="{$RECORD_MODEL->get($FIELD_NAME)}" name="{$FIELD_NAME}">
                            </td>
                        </tr>
                    {/foreach}
                </table>
            </div>
            <div class='modal-overlay-footer clearfix'>
                <div class="row clearfix">
                    <div class='textAlignCenter col-lg-12 col-md-12 col-sm-12 '>
                        <button type='submit' class='btn btn-success saveButton' >{vtranslate('LBL_SAVE', $MODULE)}</button>&nbsp;&nbsp;
                        <a class='cancelLink' type="reset" href="javascript:window.history.back();">{vtranslate('LBL_CANCEL', $MODULE)}</a>
                    </div>
                </div>
            </div>
        </form>
        <style>
            label.error {
                color: #f00;
                padding: 5px 10px;
                margin-left: 5px;
                background-color: #fee;
            }
            input.error {
                border: 1px solid #f00;
                background-color: #fee;
            }
        </style>
    </div>
{/strip}