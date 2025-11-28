<?php
/* Smarty version 4.5.5, created on 2025-11-24 15:15:12
  from '/var/www/CRM/CRM-TYPE/layouts/v7/modules/PDFMaker/GetPDFButtons.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69247680849a97_79236417',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'bcc108c5cd4e4e446a1a6b2f4058934947c935bc' => 
    array (
      0 => '/var/www/CRM/CRM-TYPE/layouts/v7/modules/PDFMaker/GetPDFButtons.tpl',
      1 => 1763716215,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69247680849a97_79236417 (Smarty_Internal_Template $_smarty_tpl) {
if ($_smarty_tpl->tpl_vars['ENABLE_PDFMAKER']->value == 'true' && $_smarty_tpl->tpl_vars['CRM_TEMPLATES_EXIST']->value == '0') {?><div class="pull-right" id="PDFMakerContentDiv" style="padding-left: 5px;"><div class="clearfix"><div class="btn-group pull-right"><button class="btn btn-default selectPDFTemplates"><i title="<?php echo vtranslate('LBL_EXPORT_TO_PDF','PDFMaker');?>
" class="fa fa-file-pdf-o" aria-hidden="true"></i>&nbsp;<?php echo vtranslate('LBL_EXPORT_TO_PDF','PDFMaker');?>
</button><button type="button" class="btn btn-default dropdown-toggle dropdown-toggle-split PDFMoreAction" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><?php echo vtranslate('LBL_MORE','PDFMaker');?>
&nbsp;&nbsp;<span class="caret"></span></button></button><ul class="dropdown-menu"><li class="dropdown-header"><select class="form-control" name="use_common_template" id="use_common_template" multiple><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['CRM_TEMPLATES']->value, 'TEMPLATE_ITEM', false, 'TEMPLATE_KEY');
$_smarty_tpl->tpl_vars['TEMPLATE_ITEM']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['TEMPLATE_KEY']->value => $_smarty_tpl->tpl_vars['TEMPLATE_ITEM']->value) {
$_smarty_tpl->tpl_vars['TEMPLATE_ITEM']->do_else = false;
?><option data-export_edit_disabled="<?php echo $_smarty_tpl->tpl_vars['TEMPLATE_ITEM']->value['disable_export_edit'];?>
"value="<?php echo $_smarty_tpl->tpl_vars['TEMPLATE_KEY']->value;?>
"<?php if ($_smarty_tpl->tpl_vars['TEMPLATE_ITEM']->value['title'] != '') {?> title="<?php echo $_smarty_tpl->tpl_vars['TEMPLATE_ITEM']->value['title'];?>
" <?php }
if ($_smarty_tpl->tpl_vars['TEMPLATE_ITEM']->value['is_default'] == '1' || $_smarty_tpl->tpl_vars['TEMPLATE_ITEM']->value['is_default'] == '3') {?> selected="selected" <?php }?>><?php echo $_smarty_tpl->tpl_vars['TEMPLATE_ITEM']->value['templatename'];?>
</option><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></select></li><?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "GetPDFActions.tpl",'PDFMaker' )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?></ul></div></div></div><?php }
}
}
