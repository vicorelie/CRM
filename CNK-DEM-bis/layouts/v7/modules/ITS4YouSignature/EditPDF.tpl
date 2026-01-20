<form class="SendToSignature_EditPDF" action="index.php" method="post">
    <div class="modal-body">
        {include file="HiddenValues.tpl"|vtemplate_path:$MODULE MODE='SelectRecipient'}
        <input type="hidden" name="emailSubject" value="{$REQUEST->get('emailSubject')}">
        <input type="hidden" name="prevMode" id="prevMode" value="{$PREV_MODE}">
        <table class="table no-border">
            <tr>
                <td class="fieldLabel">
                    {vtranslate('Template Body', $QUALIFIED_MODULE)}
                </td>
            </tr>
            <tr>
                <td class="fieldValue">
                    <textarea id="templateBody">{$TEMPLATE_BODY}</textarea>
                </td>
            </tr>
        </table>
    </div>
    <div class='modal-footer'>
        {if 'SelectPDF' eq $PREV_MODE}
            <button class="btn btn-success signDocument">{vtranslate('LBL_CONTINUE_RECIPIENT', $MODULE)}</button>
        {else}
            {if $IS_REQUIRED_SELECT_RECIPIENT}
                <button class="btn btn-success selectRecipient" type="button">{vtranslate('LBL_SELECT_RECIPIENT', $MODULE)}</button>
            {else}
                <button class="btn btn-success">{vtranslate('LBL_SIGN_DOCUMENT', $MODULE)}</button>
            {/if}
        {/if}
        <a href="#" class="cancelLink" type="reset" data-dismiss="modal">{vtranslate('LBL_CANCEL', $MODULE)}</a>
    </div>
</form>