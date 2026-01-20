{*/* * *******************************************************************************
* The content of this file is subject to the ITS4YouSignature license.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
* ****************************************************************************** */*}
{strip}
    <input type="hidden" name="module" value="{$MODULE}">
    <input type="hidden" name="view" value="{$REQUEST->get('view')}">
    <input type="hidden" name="mode" value="{$MODE}">
    <input type="hidden" name="currentMode" class="currentMode" value="{$CURRENT_MODE}">
    <input type="hidden" name="sourceModule" value="{$REQUEST->get('sourceModule')}">
    <input type="hidden" name="sourceRecord" value="{$REQUEST->get('sourceRecord')}">
    <input type="hidden" name="templateId" id="templateId" value="{$REQUEST->get('templateId')}">
    <input type="hidden" name="templateLanguage" id="templateLanguage" value="{$REQUEST->get('templateLanguage')}">
    <input type="hidden" name="recipientId" value="{$REQUEST->get('recipientId')}">
    <input type="hidden" name="recipientEmail" value="{$REQUEST->get('recipientEmail')}">
    <input type="hidden" name="recipientName" value="{$REQUEST->get('recipientName')}">
    <input type="hidden" name="recipientModule" value="{$REQUEST->get('recipientModule')}">
    <textarea class="hide" name="templateBody">{$REQUEST->getRaw('templateBody')}</textarea>
    <input type="hidden" name="signatureMode" value="{$REQUEST->get('signatureMode')}">
{/strip}