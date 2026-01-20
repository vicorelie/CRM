{strip}
    <div class="padding20">
        <h3 style="margin-top: 0;">{vtranslate($MODULE, $MODULE)}</h3>
        <div class="clearfix">
            {if !vtlib_isModuleActive('ITS4YouEmails')}
                <br>
                <div class="displayInlineBlock alert alert-danger">{vtranslate('LBL_INSTALL_ITS4YOUEMAIL', $MODULE)}</div>
            {/if}
            {if !is_file('modules/ITS4YouLibrary/PHPMailer/src/PHPMailer.php')}
                <br>
                <div class="displayInlineBlock alert alert-danger">{vtranslate('LBL_INSTALL_PHPMAILER', $MODULE)}</div>
            {/if}
        </div>
        <table class="table border1px">
            <thead>
            <tr>
                {foreach from=$LIST_HEADERS item=LIST_HEADER}
                    <th>{vtranslate($LIST_HEADER, $QUALIFIED_MODULE)}</th>
                {/foreach}
                <th>
                    {vtranslate('LBL_ACTIONS', $QUALIFIED_MODULE)}
                </th>
            </tr>
            </thead>
            <tbody>
            {foreach from=$RECORD_MODELS item=RECORD_MODEL}
                <tr>
                    {foreach from=$LIST_HEADERS item=LIST_HEADER}
                        <td>{$RECORD_MODEL->getDisplayValue($LIST_HEADER)}</td>
                    {/foreach}
                    <td>
                        <a href="{$RECORD_MODEL->getDetailViewUrl()}" class="marginRight15">
                            <i class="fa fa-eye"></i>
                        </a>
                        <a href="{$RECORD_MODEL->getEditViewUrl()}" class="marginRight15">
                            <i class="fa fa-pencil"></i>
                        </a>
                        <a href="{$RECORD_MODEL->getDeleteActionUrl()}" class="marginRight15">
                            <i class="fa fa-trash"></i>
                        </a>
                    </td>
                </tr>
            {/foreach}
            </tbody>
        </table>
    </div>
{/strip}