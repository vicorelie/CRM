{*<!--
/* * *******************************************************************************
 * The content of this file is subject to the PDF Maker license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */
-->*}
{strip}
    <script type="text/javascript" charset="utf-8">
        let moduleName = '{$entityName}',
            taskStatus = '{$TASK_OBJECT->status}',
            taskPriority = '{$TASK_OBJECT->priority}';
    </script>
    {$TASK_OBJECT->setSourceModule($SOURCE_MODULE)}
    <style>
        textarea.inputElement {
            resize: vertical;
            padding: 3px 8px;
            min-height: 60px;
        }
    </style>
    {assign var=QUALIFIED_MODULE value='ITS4YouSignature'}
    {assign var=CONTACT_RELATIONS value=$TASK_OBJECT->getRecipientRelations()}
    {if !empty($CONTACT_RELATIONS)}
        <div class="row">
            <div class="col-sm-6 col-xs-6">
                <div>
                    <br>
                    <h4>{vtranslate('LBL_PDF_TEMPLATE',$QUALIFIED_MODULE)}</h4>
                    <hr>
                    <div class="row form-group">
                        <div class="col-sm-3 col-xs-3">
                            <span>{vtranslate('LBL_PDF_TEMPLATE',$QUALIFIED_MODULE)}</span>
                            <span class="redColor">*</span></div>
                        <div class="col-sm-9 col-xs-9">
                            <div>
                                <select id="template" name="template" class="select2 inputElement" data-rule-required="true">
                                    {html_options  options=$TASK_OBJECT->getTemplates($SOURCE_MODULE) selected=$TASK_OBJECT->template}
                                </select>
                                <input type="hidden" id="template_value" value="{$TASK_OBJECT->template}">
                            </div>
                        </div>
                    </div>
                    <div class="row form-group">
                        <div class="col-sm-3 col-xs-3">
                            <span>{vtranslate('LBL_PDF_LANGUAGE',$QUALIFIED_MODULE)}</span>
                            <span class="redColor">*</span></div>
                        <div class="col-sm-9 col-xs-9">
                            <div>
                                <select id="template_language" name="template_language" class="select2 inputElement" data-rule-required="true">
                                    {html_options  options=$TASK_OBJECT->getLanguages() selected=$TASK_OBJECT->template_language}
                                </select>
                                <input type="hidden" id="template_language_value" value="{$TASK_OBJECT->template_language}">
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <h4>{vtranslate('LBL_RECIPIENT_FIELD', $QUALIFIED_MODULE)}</h4>
                    <hr>
                    <div class="row form-group">
                        <div class="col-sm-3 col-xs-3">
                            <span>{vtranslate('LBL_CONTACT_RELATION', $QUALIFIED_MODULE)}</span>
                            <span class="redColor">*</span>
                        </div>
                        <div class="col-sm-9 col-xs-9">
                            <div>
                                <select id="contact_relation" name="contact_relation" class="select2 inputElement" data-rule-required="true">
                                    {html_options options=$CONTACT_RELATIONS selected=$TASK_OBJECT->contact_relation}
                                </select>
                                <input type="hidden" id="contact_relation_value" value="{$TASK_OBJECT->contact_relation}">
                            </div>
                        </div>
                    </div>
                    <div class="row form-group">
                        <div class="col-sm-3 col-xs-3">
                            <span>{vtranslate('LBL_CONTACT_FIELD', $QUALIFIED_MODULE)}</span>
                            <span class="redColor">*</span>
                        </div>
                        <div class="col-sm-9 col-xs-9">
                            <div>
                                <select id="contact_field" name="contact_field" class="select2 inputElement" data-rule-required="true">
                                    {html_options options=$TASK_OBJECT->getRecipientFields() selected=$TASK_OBJECT->contact_field}
                                </select>
                                <input type="hidden" id="contact_field_value" value="{$TASK_OBJECT->contact_field}">
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <br>
                    <h4>{vtranslate('LBL_EMAIL_TEMPLATE', $QUALIFIED_MODULE)}</h4>
                    <hr>
                    <div class="row form-group">
                        <div class="col-sm-3 col-xs-3">
                            <span>{vtranslate('LBL_EMAIL_TEMPLATE',$QUALIFIED_MODULE)}</span>
                        </div>
                        <div class="col-sm-9 col-xs-9">
                            <div>
                                <select id="email_template" name="email_template" class="select2 inputElement">
                                    {html_options  options=$TASK_OBJECT->getEmailTemplates($SOURCE_MODULE) selected=$TASK_OBJECT->email_template}
                                </select>
                                <input type="hidden" id="email_template_value" value="{$TASK_OBJECT->email_template}">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {else}
        <div class="alert alert-danger displayInlineBlock">
            {vtranslate('LBL_REQUIRE_CONTACT_RELATION', $QUALIFIED_MODULE)}
        </div>
    {/if}
{/strip}