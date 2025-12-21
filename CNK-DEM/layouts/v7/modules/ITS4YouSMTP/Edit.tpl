{*/*********************************************************************************
* The content of this file is subject to the ITS4YouEmails license.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
********************************************************************************/*}
<div class="padding20 detailViewContainer">
    <h3 style="margin-top: 0;">{vtranslate($MODULE, $MODULE)}</h3>
    <form method="post" id="EditView">
        <input type="hidden" name="action" value="Save">
        <input type="hidden" name="module" value="{$MODULE}">
        <input type="hidden" name="record" value="{$RECORD}">
        <div class="block">
            <table class="table editview-table no-border">
                <tr>
                    <td colspan="2">
                        <h4>{vtranslate('LBL_BASIC_INFORMATION', $MODULE)}</h4>
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel" style="width: 20%">{vtranslate('server', $QUALIFIED_MODULE)} <span class="redColor">*</span></td>
                    <td class="fieldValue">
                        <input required class="inputElement" type="text" name="server" value="{$RECORD_DATA['server']}">
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel" style="width: 20%">{vtranslate('server_port', $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue">
                        <input class="inputElement" type="text" name="server_port" value="{$RECORD_DATA['server_port']}">
                    </td>
                </tr>
                <tr class="protocolContainer">
                    <td class="fieldLabel" style="width: 20%">{vtranslate('server_protocol', $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue" style="line-height: 1.5;">
                        <label>
                            <input type="radio" name="server_protocol" {if $RECORD_DATA['server_protocol'] eq ''}checked{/if} value="">
                            <span>{vtranslate('LBL_PROTOCOL_NO', $QUALIFIED_MODULE)}</span>
                        </label>
                        <label>
                            <input type="radio" name="server_protocol" {if $RECORD_DATA['server_protocol'] eq 'tls'}checked{/if} value="tls">
                            <span>{vtranslate('LBL_PROTOCOL_TLS', $QUALIFIED_MODULE)}</span>
                        </label>
                        <label>
                            <input type="radio" name="server_protocol" {if $RECORD_DATA['server_protocol'] eq 'ssl'}checked{/if} value="ssl">
                            <span>{vtranslate('LBL_PROTOCOL_SSL', $QUALIFIED_MODULE)}</span>
                        </label>
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel">{vtranslate('server_username', $QUALIFIED_MODULE)} <span class="redColor">*</span></td>
                    <td class="fieldValue">
                        <input class="inputElement" required type="text" name="server_username" value="{$RECORD_DATA['server_username']}">
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel">{vtranslate('server_password', $QUALIFIED_MODULE)} <span class="redColor">*</span></td>
                    <td class="fieldValue">
                        <input class="inputElement" required type="password" name="server_password" value="{$RECORD_DATA['server_password']}">
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel">{vtranslate('smtp_auth', $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue">
                        <input class="inputElement" type="checkbox" name="smtp_auth" {if $RECORD_DATA['smtp_auth']}checked{/if} value="1">
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel">{vtranslate('from_email_field', $QUALIFIED_MODULE)} <span class="redColor">*</span></td>
                    <td class="fieldValue">
                        <input class="inputElement" required type="email" data-rule-email="true" name="from_email_field" value="{$RECORD_DATA['from_email_field']}">
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel">{vtranslate('from_name_field', $QUALIFIED_MODULE)} <span class="redColor">*</span></td>
                    <td class="fieldValue">
                        <input class="inputElement" required type="text" name="from_name_field" value="{$RECORD_DATA['from_name_field']}">
                    </td>
                </tr>
                {if $IS_ADMIN || $IS_COMPANY_ADMIN}
                    {if $IS_COMPANY_ACTIVE}
                        <tr>
                            <td class="fieldLabel">{vtranslate('company_id', $QUALIFIED_MODULE)}</td>
                            <td class="fieldValue">
                                <select name="company_id" id="company_id" class="inputElement select2">
                                    <option value="">{vtranslate('LBL_NONE', $QUALIFIED_MODULE)}</option>
                                    {foreach from=$COMPANY_VALUES key=COMPANY_KEY item=COMPANY_VALUE}
                                        <option value="{$COMPANY_KEY}" {if $COMPANY_KEY eq $RECORD_DATA['company_id']}selected{/if}>{$COMPANY_VALUE}</option>
                                    {/foreach}
                                </select>
                            </td>
                        </tr>
                    {/if}
                    <tr>
                        <td class="fieldLabel">{vtranslate('user_id', $QUALIFIED_MODULE)}</td>
                        <td class="fieldValue">
                            <select name="user_id" id="user_id" class="inputElement select2">
                                <option value="">{vtranslate('LBL_PUBLIC', $QUALIFIED_MODULE)}</option>
                                {foreach from=$USER_VALUES key=USER_KEY item=USER_VALUE}
                                    <option value="{$USER_KEY}" {if $USER_KEY eq $RECORD_DATA['user_id']}selected{/if}>{$USER_VALUE}</option>
                                {/foreach}
                            </select>
                        </td>
                    </tr>
                {else}
                    <tr>
                        <td class="fieldLabel">{vtranslate('user_id', $QUALIFIED_MODULE)}</td>
                        <td class="fieldValue">
                            <input type="hidden" name="user_id" id="user_id" value="{$CURRENT_USER->getId()}">
                            <input type="text" name="user_id_display" id="user_id_display" readonly disabled class="inputElement" value="{$CURRENT_USER->getName()}">
                        </td>
                    </tr>
                {/if}
                <tr>
                    <td colspan="2">
                        <h4>{vtranslate('LBL_ADVANCED_SETTINGS', $QUALIFIED_MODULE)}</h4>
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel">{vtranslate('mailer_type', $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue">
                        <select name="mailer_type" id="mailer_type" class="select2 inputElement">
                            <option value="">{vtranslate('LBL_NONE', $QUALIFIED_MODULE)}</option>
                            <option value="smtp" {if 'smtp' eq $RECORD_DATA['mailer_type']}selected{/if}>smtp</option>
                            <option value="sendmail" {if 'sendmail' eq $RECORD_DATA['mailer_type']}selected{/if}>sendmail</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel">{vtranslate('encoded_password', $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue">
                        <input class="inputElement" type="checkbox" name="encoded_password" {if !empty($RECORD_DATA['encoded_password'])}checked{/if} value="1">
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel">{vtranslate('provider', $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue">
                        <select name="provider" class="inputElement select2">
                            <option value="">{vtranslate('LBL_NONE', $QUALIFIED_MODULE)}</option>
                            <option value="Google" {if $RECORD_DATA['provider'] eq 'Google'}selected="selected"{/if}>{vtranslate('Google', $QUALIFIED_MODULE)}</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel">{vtranslate('client_id', $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue">
                        <input class="inputElement" type="password" name="client_id" value="{$RECORD_DATA['client_id']}">
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel">{vtranslate('client_secret', $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue">
                        <input class="inputElement" type="password" name="client_secret" value="{$RECORD_DATA['client_secret']}">
                    </td>
                </tr>
                <tr>
                    <td class="fieldLabel">{vtranslate('client_token', $QUALIFIED_MODULE)}</td>
                    <td class="fieldValue">
                        <input class="inputElement" type="password" name="client_token" value="{$RECORD_DATA['client_token']}">
                        <button class="btn btn-default refreshToken" type="button">
                            <i class="fa fa-download"></i>
                        </button>
                        <button class="btn btn-default retrieveToken" type="button">
                            <i class="fa fa-search"></i>
                        </button>
                    </td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-success saveButton" type="submit">{vtranslate('LBL_SAVE', $QUALIFIED_MODULE)}</button>
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    </form>
</div>