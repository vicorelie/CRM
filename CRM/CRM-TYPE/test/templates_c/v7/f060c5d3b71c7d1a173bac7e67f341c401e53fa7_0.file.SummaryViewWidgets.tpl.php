<?php
/* Smarty version 4.5.5, created on 2025-08-27 15:41:17
  from '/home/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/Project/SummaryViewWidgets.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_68af271d2551f2_15460136',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'f060c5d3b71c7d1a173bac7e67f341c401e53fa7' => 
    array (
      0 => '/home/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/Project/SummaryViewWidgets.tpl',
      1 => 1752241498,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_68af271d2551f2_15460136 (Smarty_Internal_Template $_smarty_tpl) {
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['DETAILVIEW_LINKS']->value['DETAILVIEWWIDGET'], 'DETAIL_VIEW_WIDGET');
$_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->value) {
$_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->do_else = false;
if (($_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->value->getLabel() == 'Documents')) {
$_smarty_tpl->_assignInScope('DOCUMENT_WIDGET_MODEL', $_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->value);
} elseif (($_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->value->getLabel() == 'LBL_MILESTONES')) {
$_smarty_tpl->_assignInScope('MILESTONE_WIDGET_MODEL', $_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->value);
} elseif (($_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->value->getLabel() == 'HelpDesk')) {
$_smarty_tpl->_assignInScope('HELPDESK_WIDGET_MODEL', $_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->value);
} elseif (($_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->value->getLabel() == 'LBL_TASKS')) {
$_smarty_tpl->_assignInScope('TASKS_WIDGET_MODEL', $_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->value);
} elseif (($_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->value->getLabel() == 'ModComments')) {
$_smarty_tpl->_assignInScope('COMMENTS_WIDGET_MODEL', $_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->value);
} elseif (($_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->value->getLabel() == 'LBL_UPDATES')) {
$_smarty_tpl->_assignInScope('UPDATES_WIDGET_MODEL', $_smarty_tpl->tpl_vars['DETAIL_VIEW_WIDGET']->value);
}
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?><div class="left-block col-lg-4 col-md-4 col-sm-4"><div class="summaryView"><div class="summaryViewHeader" style="margin-bottom: 15px;"><h4 class="display-inline-block"><?php echo vtranslate('LBL_KEY_METRICS',$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</h4></div><div class="summaryViewFields"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['SUMMARY_INFORMATION']->value, 'SUMMARY_CATEGORY');
$_smarty_tpl->tpl_vars['SUMMARY_CATEGORY']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['SUMMARY_CATEGORY']->value) {
$_smarty_tpl->tpl_vars['SUMMARY_CATEGORY']->do_else = false;
?><div class="row textAlignCenter roundedCorners"><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['SUMMARY_CATEGORY']->value, 'FIELD_VALUE', false, 'FIELD_NAME');
$_smarty_tpl->tpl_vars['FIELD_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['FIELD_NAME']->value => $_smarty_tpl->tpl_vars['FIELD_VALUE']->value) {
$_smarty_tpl->tpl_vars['FIELD_VALUE']->do_else = false;
?><div class="col-lg-3"><div class="well" style="min-height: 125px; padding-left: 0px; padding-right: 0px;"><div><label class="font-x-small"><?php echo vtranslate($_smarty_tpl->tpl_vars['FIELD_NAME']->value,$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</label></div><div><label class="font-x-x-large"><?php if (!empty($_smarty_tpl->tpl_vars['FIELD_VALUE']->value)) {
echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;
} else { ?>0<?php }?></label></div></div></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div></div><div class="summaryView"><div class="summaryViewHeader"><h4 class="display-inline-block"><?php echo vtranslate('LBL_KEY_FIELDS',$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</h4></div><div class="summaryViewFields"><?php echo $_smarty_tpl->tpl_vars['MODULE_SUMMARY']->value;?>
</div></div><?php if ($_smarty_tpl->tpl_vars['DOCUMENT_WIDGET_MODEL']->value) {?><div class="summaryWidgetContainer"><div class="widgetContainer_documents" data-url="<?php echo $_smarty_tpl->tpl_vars['DOCUMENT_WIDGET_MODEL']->value->getUrl();?>
" data-name="<?php echo $_smarty_tpl->tpl_vars['DOCUMENT_WIDGET_MODEL']->value->getLabel();?>
"><div class="widget_header clearfix"><input type="hidden" name="relatedModule" value="<?php echo $_smarty_tpl->tpl_vars['DOCUMENT_WIDGET_MODEL']->value->get('linkName');?>
" /><span class="toggleButton pull-left"><i class="fa fa-angle-down"></i>&nbsp;&nbsp;</span><h4 class="display-inline-block pull-left"><?php echo vtranslate($_smarty_tpl->tpl_vars['DOCUMENT_WIDGET_MODEL']->value->getLabel(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</h4><?php if ($_smarty_tpl->tpl_vars['DOCUMENT_WIDGET_MODEL']->value->get('action')) {
$_smarty_tpl->_assignInScope('PARENT_ID', $_smarty_tpl->tpl_vars['RECORD']->value->getId());?><div class="pull-right"><div class="dropdown"><button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown"><span class="fa fa-plus" title="<?php echo vtranslate('LBL_NEW_DOCUMENT',$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
"></span>&nbsp;<?php echo vtranslate('LBL_NEW_DOCUMENT','Documents');?>
&nbsp; <span class="caret"></span></button><ul class="dropdown-menu"><li class="dropdown-header"><i class="fa fa-upload"></i> <?php echo vtranslate('LBL_FILE_UPLOAD','Documents');?>
</li><li id="VtigerAction"><a href="javascript:Documents_Index_Js.uploadTo('Vtiger',<?php echo $_smarty_tpl->tpl_vars['PARENT_ID']->value;?>
,'<?php echo $_smarty_tpl->tpl_vars['MODULE_NAME']->value;?>
')"><img style="  margin-top: -3px;margin-right: 4%;" title="Vtiger" alt="Vtiger" src="layouts/v7/skins//images/Vtiger.png"><?php ob_start();
echo vtranslate('LBL_VTIGER','Documents');
$_prefixVariable1 = ob_get_clean();
echo vtranslate('LBL_TO_SERVICE','Documents',$_prefixVariable1);?>
</a></li><li role="separator" class="divider"></li><li class="dropdown-header"><i class="fa fa-link"></i> <?php echo vtranslate('LBL_LINK_EXTERNAL_DOCUMENT','Documents');?>
</li><li id="shareDocument"><a href="javascript:Documents_Index_Js.createDocument('E',<?php echo $_smarty_tpl->tpl_vars['PARENT_ID']->value;?>
,'<?php echo $_smarty_tpl->tpl_vars['MODULE_NAME']->value;?>
')">&nbsp;<i class="fa fa-external-link"></i>&nbsp;&nbsp; <?php ob_start();
echo vtranslate('LBL_FILE_URL','Documents');
$_prefixVariable2 = ob_get_clean();
echo vtranslate('LBL_FROM_SERVICE','Documents',$_prefixVariable2);?>
</a></li><li role="separator" class="divider"></li><li id="createDocument"><a href="javascript:Documents_Index_Js.createDocument('W',<?php echo $_smarty_tpl->tpl_vars['PARENT_ID']->value;?>
,'<?php echo $_smarty_tpl->tpl_vars['MODULE_NAME']->value;?>
')"><i class="fa fa-file-text"></i> <?php ob_start();
echo vtranslate('SINGLE_Documents','Documents');
$_prefixVariable3 = ob_get_clean();
echo vtranslate('LBL_CREATE_NEW','Documents',$_prefixVariable3);?>
</a></li></ul></div></div><?php }?></div><div class="widget_contents"></div></div></div><?php }?></div><div class="middle-block col-lg-4 col-md-4 col-sm-4"><?php if ($_smarty_tpl->tpl_vars['COMMENTS_WIDGET_MODEL']->value) {?><div class="summaryWidgetContainer"><div class="widgetContainer_comments" data-url="<?php echo $_smarty_tpl->tpl_vars['COMMENTS_WIDGET_MODEL']->value->getUrl();?>
" data-name="<?php echo $_smarty_tpl->tpl_vars['COMMENTS_WIDGET_MODEL']->value->getLabel();?>
"><div class="widget_header"><input type="hidden" name="relatedModule" value="<?php echo $_smarty_tpl->tpl_vars['COMMENTS_WIDGET_MODEL']->value->get('linkName');?>
" /><h4 class="display-inline-block"><?php echo vtranslate($_smarty_tpl->tpl_vars['COMMENTS_WIDGET_MODEL']->value->getLabel(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</h4></div><div class="widget_contents"></div></div></div><?php }?></div><div class="right-block col-lg-4 col-md-4 col-sm-4"><?php if ($_smarty_tpl->tpl_vars['HELPDESK_WIDGET_MODEL']->value) {?><div class="summaryWidgetContainer"><div class="widgetContainer_troubleTickets" data-url="<?php echo $_smarty_tpl->tpl_vars['HELPDESK_WIDGET_MODEL']->value->getUrl();?>
" data-name="<?php echo $_smarty_tpl->tpl_vars['HELPDESK_WIDGET_MODEL']->value->getLabel();?>
"><div class="widget_header clearfix"><input type="hidden" name="relatedModule" value="<?php echo $_smarty_tpl->tpl_vars['HELPDESK_WIDGET_MODEL']->value->get('linkName');?>
" /><span class="toggleButton pull-left"><i class="fa fa-angle-down"></i>&nbsp;&nbsp;</span><h4 class="display-inline-block pull-left"><?php echo vtranslate($_smarty_tpl->tpl_vars['HELPDESK_WIDGET_MODEL']->value->getLabel(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</h4><?php if ($_smarty_tpl->tpl_vars['HELPDESK_WIDGET_MODEL']->value->get('action')) {?><div class="pull-right"><button class="btn addButton btn-default btn-sm createRecord" type="button" data-url="<?php echo $_smarty_tpl->tpl_vars['HELPDESK_WIDGET_MODEL']->value->get('actionURL');?>
"><i class="fa fa-plus"></i>&nbsp;&nbsp;<?php echo vtranslate('LBL_ADD',$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</button></div><?php }?></div><div class="clearfix"><div class="widget_filter clearfix"><div class="pull-left"><?php $_smarty_tpl->_assignInScope('RELATED_MODULE_MODEL', Vtiger_Module_Model::getInstance('HelpDesk'));
$_smarty_tpl->_assignInScope('FIELD_MODEL', $_smarty_tpl->tpl_vars['RELATED_MODULE_MODEL']->value->getField('ticketstatus'));
$_smarty_tpl->_assignInScope('FIELD_INFO', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getFieldInfo());
$_smarty_tpl->_assignInScope('PICKLIST_VALUES', $_smarty_tpl->tpl_vars['FIELD_INFO']->value['picklistvalues']);
$_smarty_tpl->_assignInScope('FIELD_INFO', Vtiger_Util_Helper::toSafeHTML(Zend_Json::encode($_smarty_tpl->tpl_vars['FIELD_INFO']->value)));
$_smarty_tpl->_assignInScope('SPECIAL_VALIDATOR', $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->getValidator());?><select class="select2" name="<?php echo $_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('name');?>
" data-validation-engine="validate[<?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->isMandatory() == true) {?> required,<?php }?>funcCall[Vtiger_Base_Validator_Js.invokeValidation]]" data-fieldinfo='<?php echo htmlspecialchars((string)$_smarty_tpl->tpl_vars['FIELD_INFO']->value, ENT_QUOTES, 'UTF-8', true);?>
' <?php if (!empty($_smarty_tpl->tpl_vars['SPECIAL_VALIDATOR']->value)) {?>data-validator='<?php echo Zend_Json::encode($_smarty_tpl->tpl_vars['SPECIAL_VALIDATOR']->value);?>
'<?php }?> ><option value=""><?php echo vtranslate('LBL_SELECT_STATUS',$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</option><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['PICKLIST_VALUES']->value, 'PICKLIST_VALUE', false, 'PICKLIST_NAME');
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PICKLIST_NAME']->value => $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['PICKLIST_NAME']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['FIELD_MODEL']->value->get('fieldvalue') == $_smarty_tpl->tpl_vars['PICKLIST_NAME']->value) {?> selected <?php }?>><?php echo $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value;?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select></div></div></div><div class="widget_contents"></div></div></div><?php }
if ($_smarty_tpl->tpl_vars['MILESTONE_WIDGET_MODEL']->value) {?><div class="summaryWidgetContainer"><div class="widgetContainer_mileStone" data-url="<?php echo $_smarty_tpl->tpl_vars['MILESTONE_WIDGET_MODEL']->value->getUrl();?>
" data-name="<?php echo $_smarty_tpl->tpl_vars['MILESTONE_WIDGET_MODEL']->value->getLabel();?>
"><div class="widget_header clearfix"><input type="hidden" name="relatedModule" value="<?php echo $_smarty_tpl->tpl_vars['MILESTONE_WIDGET_MODEL']->value->get('linkName');?>
" /><span class="toggleButton pull-left"><i class="fa fa-angle-down"></i>&nbsp;&nbsp;</span><h4 class="display-inline-block pull-left"><?php echo vtranslate($_smarty_tpl->tpl_vars['MILESTONE_WIDGET_MODEL']->value->getLabel(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</h4><?php if ($_smarty_tpl->tpl_vars['MILESTONE_WIDGET_MODEL']->value->get('action')) {?><div class="pull-right"><button class="btn addButton btn-sm btn-default createRecord" id="createProjectMileStone" type="button" data-url="<?php echo $_smarty_tpl->tpl_vars['MILESTONE_WIDGET_MODEL']->value->get('actionURL');?>
"><i class="fa fa-plus"></i>&nbsp;&nbsp;<?php echo vtranslate('LBL_ADD',$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</button></div><?php }?></div><div class="widget_contents"></div></div></div><?php }
if ($_smarty_tpl->tpl_vars['TASKS_WIDGET_MODEL']->value) {
$_smarty_tpl->_assignInScope('RELATED_MODULE_MODEL', Vtiger_Module_Model::getInstance('ProjectTask'));
$_smarty_tpl->_assignInScope('PROGRESS_FIELD_MODEL', $_smarty_tpl->tpl_vars['RELATED_MODULE_MODEL']->value->getField('projecttaskprogress'));
$_smarty_tpl->_assignInScope('STATUS_FIELD_MODEL', $_smarty_tpl->tpl_vars['RELATED_MODULE_MODEL']->value->getField('projecttaskstatus'));?><div class="summaryWidgetContainer"><div class="widgetContainer_tasks" data-url="<?php echo $_smarty_tpl->tpl_vars['TASKS_WIDGET_MODEL']->value->getUrl();?>
" data-name="<?php echo $_smarty_tpl->tpl_vars['TASKS_WIDGET_MODEL']->value->getLabel();?>
"><div class="widget_header clearfix"><input type="hidden" name="relatedModule" value="<?php echo $_smarty_tpl->tpl_vars['TASKS_WIDGET_MODEL']->value->get('linkName');?>
" /><span class="toggleButton pull-left"><i class="fa fa-angle-down"></i>&nbsp;&nbsp;</span><h4 class="display-inline-block pull-left"><?php echo vtranslate($_smarty_tpl->tpl_vars['TASKS_WIDGET_MODEL']->value->getLabel(),$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</h4><?php if ($_smarty_tpl->tpl_vars['TASKS_WIDGET_MODEL']->value->get('action')) {?><div class="pull-right"><button class="btn addButton btn-sm btn-default createRecord" id="createProjectTask" type="button" data-url="<?php echo $_smarty_tpl->tpl_vars['TASKS_WIDGET_MODEL']->value->get('actionURL');?>
"><i class="fa fa-plus"></i>&nbsp;&nbsp;<?php echo vtranslate('LBL_ADD',$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</button></div><?php }?></div><div class="clearfix"><div class="widget_filter clearfix"><?php if ($_smarty_tpl->tpl_vars['PROGRESS_FIELD_MODEL']->value->isViewableInDetailView()) {?><div class="pull-left marginRight15"><?php $_smarty_tpl->_assignInScope('FIELD_INFO', $_smarty_tpl->tpl_vars['PROGRESS_FIELD_MODEL']->value->getFieldInfo());
$_smarty_tpl->_assignInScope('PICKLIST_VALUES', $_smarty_tpl->tpl_vars['FIELD_INFO']->value['picklistvalues']);
$_smarty_tpl->_assignInScope('FIELD_INFO', Vtiger_Util_Helper::toSafeHTML(Zend_Json::encode($_smarty_tpl->tpl_vars['FIELD_INFO']->value)));
$_smarty_tpl->_assignInScope('SPECIAL_VALIDATOR', $_smarty_tpl->tpl_vars['PROGRESS_FIELD_MODEL']->value->getValidator());?><select class="select2" name="<?php echo $_smarty_tpl->tpl_vars['PROGRESS_FIELD_MODEL']->value->get('name');?>
" data-validation-engine="validate[<?php if ($_smarty_tpl->tpl_vars['PROGRESS_FIELD_MODEL']->value->isMandatory() == true) {?> required,<?php }?>funcCall[Vtiger_Base_Validator_Js.invokeValidation]]" data-fieldinfo='<?php echo htmlspecialchars((string)$_smarty_tpl->tpl_vars['FIELD_INFO']->value, ENT_QUOTES, 'UTF-8', true);?>
' <?php if (!empty($_smarty_tpl->tpl_vars['SPECIAL_VALIDATOR']->value)) {?>data-validator='<?php echo Zend_Json::encode($_smarty_tpl->tpl_vars['SPECIAL_VALIDATOR']->value);?>
'<?php }?> ><option value=""><?php echo vtranslate('LBL_SELECT_PROGRESS',$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</option><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['PICKLIST_VALUES']->value, 'PICKLIST_VALUE', false, 'PICKLIST_NAME');
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PICKLIST_NAME']->value => $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['PICKLIST_NAME']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['PROGRESS_FIELD_MODEL']->value->get('fieldvalue') == $_smarty_tpl->tpl_vars['PICKLIST_NAME']->value) {?> selected <?php }?>><?php echo $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value;?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select></div><?php }?>&nbsp;&nbsp;<?php if ($_smarty_tpl->tpl_vars['STATUS_FIELD_MODEL']->value->isViewableInDetailView()) {?><div class="pull-left marginRight15"><?php $_smarty_tpl->_assignInScope('FIELD_INFO', $_smarty_tpl->tpl_vars['STATUS_FIELD_MODEL']->value->getFieldInfo());
$_smarty_tpl->_assignInScope('PICKLIST_VALUES', $_smarty_tpl->tpl_vars['FIELD_INFO']->value['picklistvalues']);
$_smarty_tpl->_assignInScope('FIELD_INFO', Vtiger_Util_Helper::toSafeHTML(Zend_Json::encode($_smarty_tpl->tpl_vars['FIELD_INFO']->value)));
$_smarty_tpl->_assignInScope('SPECIAL_VALIDATOR', $_smarty_tpl->tpl_vars['STATUS_FIELD_MODEL']->value->getValidator());?><select class="select2" name="<?php echo $_smarty_tpl->tpl_vars['STATUS_FIELD_MODEL']->value->get('name');?>
" data-validation-engine="validate[<?php if ($_smarty_tpl->tpl_vars['STATUS_FIELD_MODEL']->value->isMandatory() == true) {?> required,<?php }?>funcCall[Vtiger_Base_Validator_Js.invokeValidation]]" data-fieldinfo='<?php echo htmlspecialchars((string)$_smarty_tpl->tpl_vars['FIELD_INFO']->value, ENT_QUOTES, 'UTF-8', true);?>
' <?php if (!empty($_smarty_tpl->tpl_vars['SPECIAL_VALIDATOR']->value)) {?>data-validator='<?php echo Zend_Json::encode($_smarty_tpl->tpl_vars['SPECIAL_VALIDATOR']->value);?>
'<?php }?> ><option value=""><?php echo vtranslate('LBL_SELECT_STATUS',$_smarty_tpl->tpl_vars['MODULE_NAME']->value);?>
</option><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['PICKLIST_VALUES']->value, 'PICKLIST_VALUE', false, 'PICKLIST_NAME');
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PICKLIST_NAME']->value => $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value) {
$_smarty_tpl->tpl_vars['PICKLIST_VALUE']->do_else = false;
?><option value="<?php echo $_smarty_tpl->tpl_vars['PICKLIST_NAME']->value;?>
" <?php if ($_smarty_tpl->tpl_vars['STATUS_FIELD_MODEL']->value->get('fieldvalue') == $_smarty_tpl->tpl_vars['PICKLIST_NAME']->value) {?> selected <?php }?>><?php echo $_smarty_tpl->tpl_vars['PICKLIST_VALUE']->value;?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select></div><?php }?></div></div><div class="widget_contents"></div></div></div><?php }?></div>
<?php }
}
