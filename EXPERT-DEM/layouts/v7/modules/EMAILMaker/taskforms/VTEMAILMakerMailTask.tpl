{*<!--
/* * *******************************************************************************
 * The content of this file is subject to the EMAIL Maker license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */
-->*}
{strip}
    {assign var=TASK_MODULE value='EMAILMaker'}
    <div id="VtEmailTaskContainer">
    <div class="contents tabbable ui-sortable">
        <div class="tab-content layoutContent themeTableColor overflowVisible">
            <div id="detailViewLayout">
                <div class="row form-group">
                    <div class="col-lg-12">
                        <h4>{vtranslate('LBL_EMAIL_DETAILS',$TASK_MODULE)}</h4>
                    </div>
                </div>
                {if EMAILMaker_Module_Model::isSMTPInstalled()}
                    <div class="row form-group">
                        <div class="col-lg-2">{vtranslate('SMTP', $QUALIFIED_MODULE)}</div>
                        <div class="col-lg-4">
                            <select name="smtp" id="smtp" class="select2 inputElement">
                                <option>{vtranslate('LBL_NONE', $QUALIFIED_MODULE)}</option>
                                <option value="assigned_user_smtp" {if 'assigned_user_smtp' eq $TASK_OBJECT->smtp}selected="selected"{/if}>{vtranslate('LBL_ASSIGNED_USER_SMTP', 'EMAILMaker')}</option>
                                {foreach from=$TASK_OBJECT->getSMTPServers() key=SMTP_SERVER_ID item=SMTP_SERVER}
                                    <option value="{$SMTP_SERVER_ID}" {if $SMTP_SERVER_ID eq $TASK_OBJECT->smtp}selected="selected"{/if}>{$SMTP_SERVER->get('server')} &lt;{$SMTP_SERVER->get('server_username')}&gt;</option>
                                {/foreach}
                            </select>
                        </div>
                    </div>
                {/if}
                <div class="row form-group">
                    <div class="col-lg-2">{vtranslate('LBL_FROM',$QUALIFIED_MODULE)}</div>
                    <div class="col-lg-4">
                        <input name="replyTo" class="fields inputElement" type="text" value="{$TASK_OBJECT->replyTo}"/>
                    </div>
                    <div class="col-lg-4">
                        <select style="min-width: 250px" class="inputElement task-fields select2 overwriteSelection" data-placeholder={vtranslate('LBL_SELECT_OPTIONS',$QUALIFIED_MODULE)}>
                            <option></option>
                            {$EMAIL_FIELD_OPTION}
                        </select>
                    </div>
                </div>
                <div class="row form-group">
                    <div class="col-lg-2">{vtranslate('LBL_TO',$QUALIFIED_MODULE)}<span class="redColor">*</span></div>
                    <div class="col-lg-4">
                        <input data-rule-required="true" name="recepient" class="fields inputElement" type="text" value="{$TASK_OBJECT->recepient}"/>
                    </div>
                    <div class="col-lg-4">
                        <select style="min-width: 250px" class="inputElement task-fields select2" data-placeholder={vtranslate('LBL_SELECT_OPTIONS',$QUALIFIED_MODULE)}>
                            <option></option>
                            {$EMAIL_FIELD_OPTION}
                            <optgroup label="{vtranslate('LBL_SPECIAL_OPTIONS', $QUALIFIED_MODULE)}">
                                {html_options options=$TASK_OBJECT->getSpecialOptions()}
                            </optgroup>
                        </select>
                    </div>
                </div>
                <div class="row form-group {if empty($TASK_OBJECT->emailcc)}hide {/if}" id="ccContainer">
                    <div class="col-lg-2">{vtranslate('LBL_CC',$QUALIFIED_MODULE)}</div>
                    <div class="col-lg-4">
                        <input class="fields inputElement" type="text" name="emailcc" value="{$TASK_OBJECT->emailcc}"/>
                    </div>
                    <div class="col-lg-4">
                        <select class="inputElement task-fields select2" data-placeholder='{vtranslate('LBL_SELECT_OPTIONS',$QUALIFIED_MODULE)}' style="min-width: 250px">
                            <option></option>
                            {$EMAIL_FIELD_OPTION}
                            <optgroup label="{vtranslate('LBL_SPECIAL_OPTIONS', $QUALIFIED_MODULE)}">
                                {html_options options=$TASK_OBJECT->getSpecialOptions()}
                            </optgroup>
                        </select>
                    </div>
                </div>
                <div class="row form-group {if empty($TASK_OBJECT->emailbcc)}hide {/if}" id="bccContainer">
                    <div class="col-lg-2">{vtranslate('LBL_BCC',$QUALIFIED_MODULE)}</div>
                    <div class="col-lg-4">
                        <input class="fields inputElement" type="text" name="emailbcc" value="{$TASK_OBJECT->emailbcc}"/>
                    </div>
                    <div class="col-lg-4">
                        <select class="inputElement task-fields select2" data-placeholder='{vtranslate('LBL_SELECT_OPTIONS',$QUALIFIED_MODULE)}' style="min-width: 250px">
                            <option></option>
                            {$EMAIL_FIELD_OPTION}
                            <optgroup label="{vtranslate('LBL_SPECIAL_OPTIONS', $QUALIFIED_MODULE)}">
                                {html_options options=$TASK_OBJECT->getSpecialOptions()}
                            </optgroup>
                        </select>
                    </div>
                </div>
                <div class="row form-group {if (!empty($TASK_OBJECT->emailcc)) and (!empty($TASK_OBJECT->emailbcc))} hide {/if}">
                    <div class="col-lg-2">&nbsp;</div>
                    <div class="col-lg-4">
                        <a class="cursorPointer {if (!empty($TASK_OBJECT->emailcc))}hide{/if}" id="ccLink">{vtranslate('LBL_ADD_CC',$QUALIFIED_MODULE)}</a>&nbsp;&nbsp;
                        <a class="cursorPointer {if (!empty($TASK_OBJECT->emailbcc))}hide{/if}" id="bccLink">{vtranslate('LBL_ADD_BCC',$QUALIFIED_MODULE)}</a>
                    </div>
                </div>
                {assign var=MODULE_FIELDS value=$TASK_OBJECT->getModuleFields($SOURCE_MODULE)}
                {if $MODULE_FIELDS}
                    <div class="row form-group" id="templateFieldsContainer">
                        <div class="col-lg-2">{vtranslate('LBL_EMAIL_CONTENT',$TASK_MODULE)}</div>
                        <div class="col-lg-4">
                            <select id="template_field" name="template_field" data-rule-required="true" class="inputElement span7 select2">
                                {html_options  options=$MODULE_FIELDS selected=$TASK_OBJECT->template_field}
                            </select>
                        </div>
                        <div class="col-lg-4"></div>
                    </div>
                {/if}
            </div>
            <div id="relatedTabTemplate">
                <div class="row form-group">
                    <div class="col-lg-12">
                        <h4>{vtranslate('LBL_EMAIL_CONTENT',$TASK_MODULE)}</h4>
                    </div>
                </div>
                <div class="row form-group">
                    <div class="col-lg-2">{vtranslate('LBL_EMAIL_TEMPLATE',$TASK_MODULE)}</div>
                    <div class="col-lg-8">
                        <select id="task_template" name="template" data-rule-required="true" class="span7 chzn-select inputElement select2">
                            {html_options  options=$TASK_OBJECT->getTemplates($SOURCE_MODULE) selected=$TASK_OBJECT->template}
                        </select>
                        <input type="hidden" id="task_folder_value" value="{$TASK_OBJECT->template}">
                    </div>
                </div>
                <div class="row form-group">
                    <div class="col-lg-2">{vtranslate('LBL_EMAIL_LANGUAGE',$TASK_MODULE)}</div>
                    <div class="col-lg-8">
                        {assign var=LANGUAGES_ARRAY value=$TASK_OBJECT->getLanguages()}
                        <select style="min-width: 215px" id="task_template_language" name="template_language" class="inputElement select2 chzn-select">
                            {html_options  options=$LANGUAGES_ARRAY selected=$TASK_OBJECT->template_language}
                        </select>
                        <input type="hidden" id="template_language_value" value="{$TASK_OBJECT->template_language}">
                    </div>
                </div>
                <div class="row form-group">
                    <div class="col-lg-2">{vtranslate('LBL_SIGNATURE',$TASK_MODULE)}</div>
                    <div class="col-lg-8">
                        <input type="checkbox" name="signature" id="signature" {if $TASK_OBJECT->signature}checked="checked"{/if}">
                    </div>
                </div>
                <div class="row form-group">
                    <div class="col-lg-2">{vtranslate('LBL_EXECUTE_AFTER_SAVE', $TASK_MODULE)}</div>
                    <div class="col-lg-4">
                        <input type="hidden" name="executeImmediately" value="">
                        <input type="checkbox" name="executeImmediately" value="1" {if $TASK_OBJECT->executeImmediately}checked="checked"{/if}>
                    </div>
                </div>
                <div class="row form-group">
                    <div class="col-lg-2">{vtranslate('LBL_CHECK_OPTOUT', $TASK_MODULE)}</div>
                    <div class="col-lg-4">
                        <input type="hidden" name="check_optout" value="No">
                        <input type="checkbox" name="check_optout" value="Yes" {if 'Yes' eq $TASK_OBJECT->check_optout}checked="checked"{/if}>
                    </div>
                </div>
            </div>
            {if EMAILMaker_Module_Model::isPDFMakerInstalled()}
                <div id="relatedTabPDF">
                    <div class="row form-group">
                        <div class="col-lg-12">
                            <h4>{vtranslate('LBL_PDF_CONTENT',$TASK_MODULE)}</h4>
                        </div>
                    </div>
                    <div class="row form-group">
                        <div class="col-sm-2">{vtranslate('LBL_PDF_TEMPLATE','PDFMaker')}</div>
                        <div class="col-lg-8">
                            <input type="hidden" id="pdf_template" name="pdf_template" value={Zend_Json::encode($TASK_OBJECT->pdf_template)}>
                            <select multiple id="pdf_template_select" name="pdf_template_select" class="select2 task-fields" style="width: 100%;">
                                {html_options  options=$TASK_OBJECT->getPDFTemplates($SOURCE_MODULE) selected=$TASK_OBJECT->pdf_template}
                            </select>
                        </div>
                    </div>
                    <div class="row form-group">
                        <div class="col-sm-2">{vtranslate('LBL_PDF_LANGUAGE','PDFMaker')}</div>
                        <div class="col-lg-8">
                            {assign var=LANGUAGES_ARRAY value=$TASK_OBJECT->getLanguages()}
                            <select id="pdf_template_language" name="pdf_template_language" class="select2 task-fields" style="width: 100%;">
                                {html_options options=$LANGUAGES_ARRAY selected=$TASK_OBJECT->pdf_template_language}
                            </select>
                            <input type="hidden" id="template_language_value" value="{$TASK_OBJECT->pdf_template_language}">
                        </div>
                    </div>
                    <div class="row form-group">
                        <div class="col-sm-2">{vtranslate('LBL_MERGE_TEMPLATES','PDFMaker')}</div>
                        <div class="col-lg-8">
                            <input type="checkbox" id="pdf_template_merge" value="Yes" name="pdf_template_merge" {if 'Yes' eq $TASK_OBJECT->pdf_template_merge}checked{/if} class="task-fields">
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
    <script src="modules/EMAILMaker/workflow/VTEMAILMakerMailTask.js" type="text/javascript" charset="utf-8"></script>
{/strip}