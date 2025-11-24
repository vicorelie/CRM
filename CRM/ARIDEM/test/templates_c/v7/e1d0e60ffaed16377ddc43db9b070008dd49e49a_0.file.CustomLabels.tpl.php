<?php
/* Smarty version 4.5.5, created on 2025-11-21 08:58:25
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/CustomLabels.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_692029b13ae6a5_93160099',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'e1d0e60ffaed16377ddc43db9b070008dd49e49a' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/CustomLabels.tpl',
      1 => 1754574240,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_692029b13ae6a5_93160099 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="container-fluid" id="CustomLabelsContainer"><style>#CustomLabelsContainer {min-height: 86vh;}#CustomLabelTable {padding:0;margin:0;}#CustomLabelTable th:nth-child(1) {width: 30%;}#CustomLabelTable th:nth-child(2) {width: 50%;}#CustomLabelTable th:nth-child(3) {width: 20%;text-align: center;}#CustomLabelTable td:nth-child(2), #CustomLabelTable td:nth-child(3) {border-right: 0;}#CustomLabelTable td:nth-child(3) {min-width: 100px;border-left: 0;}.addCustomLabel, .editCustomLabel, .deleteCustomLabel {margin-right: 0.5em;}.CustomLabelValue {white-space: pre-line;}.CustomLabelTable thead {border-bottom: 1px solid #ccc;background: #F5F5F5;}.actionsLabel {line-height: 1.5;margin-top: 0.5em;}</style><form name="custom_labels" action="index.php" method="post" class="form-horizontal"><input type="hidden" name="module" value="<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
"/><input type="hidden" name="action" value="IndexAjax"/><input type="hidden" name="mode" value="DeleteCustomLabels"/><input type="hidden" name="newItems" value=""/><br><h4><?php echo vtranslate('LBL_CUSTOM_LABELS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</h4><?php echo vtranslate('LBL_CUSTOM_LABELS_DESC',$_smarty_tpl->tpl_vars['MODULE']->value);?>
<hr><div><div class="clearfix"><div class="pull-left actionsLabel"><b><?php echo vtranslate('LBL_DEFINE_CUSTOM_LABELS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</b></div><div class="pull-right btn-group"><button type="button" class="addCustomLabel btn addButton btn-default" data-url="index.php?module=<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
&view=IndexAjax&mode=editCustomLabel"><i class="fa fa-plus"></i>&nbsp;<span> <?php echo vtranslate('LBL_ADD');?>
</span></button><button type="reset" class="btn btn-default" onClick="window.history.back();"><?php echo vtranslate('LBL_CANCEL');?>
</button></div></div><br><div class="clearfix"><?php echo '<script'; ?>
 type="text/javascript">let existingKeys = [];<?php echo '</script'; ?>
><table id="CustomLabelTable" class="table table-bordered table-condensed CustomLabelTable"><thead><tr><th><?php echo vtranslate('LBL_KEY',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</th><th colspan="2"><?php echo vtranslate('LBL_CURR_LANG_VALUE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
 (<?php echo $_smarty_tpl->tpl_vars['CURR_LANG']->value['label'];?>
)</th><th><?php echo vtranslate('LBL_OTHER_LANG_VALUES',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</th></tr></thead><tbody><tr class="CustomLabel opacity cloneCustomLabel hide"><td><label class="CustomLabelKey textOverflowEllipsis"></label></td><td><label class="CustomLabelValue textOverflowEllipsis"></label></td><td><div class="pull-right actions"><a class="editCustomLabel cursorPointer" data-url=''><i title="<?php echo vtranslate('LBL_EDIT_CUSTOM_LABEL','PDFMaker');?>
" class="fa fa-pencil"></i></a><a class="deleteCustomLabel cursorPointer" data-url=''><i title="<?php echo vtranslate('LBL_DELETE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
" class="fa fa-trash"></i></a></div></td><td><a class="showCustomLabelValues textOverflowEllipsis cursorPointer" data-url=""><?php echo vtranslate('LBL_OTHER_VALS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></td></tr><tr id="noItemFoundTr" style="display: none;"><td colspan="3" class="cellText" style="padding:10px; text-align: center;"><b><?php echo vtranslate('LBL_NO_ITEM_FOUND',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</b></td></tr><?php $_smarty_tpl->_assignInScope('lang_id', $_smarty_tpl->tpl_vars['CURR_LANG']->value['id']);
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['LABELS']->value, 'label_value', false, 'label_id', 'lbl_foreach', array (
));
$_smarty_tpl->tpl_vars['label_value']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['label_id']->value => $_smarty_tpl->tpl_vars['label_value']->value) {
$_smarty_tpl->tpl_vars['label_value']->do_else = false;
?><tr class="CustomLabel opacity"><td><label class="CustomLabelKey textOverflowEllipsis"><?php echo $_smarty_tpl->tpl_vars['label_value']->value['key'];?>
</label></td><td><label class="CustomLabelValue textOverflowEllipsis"><?php echo $_smarty_tpl->tpl_vars['label_value']->value['lang_values'][$_smarty_tpl->tpl_vars['lang_id']->value];?>
</label></td><td><div class="pull-right actions"><a class="editCustomLabel cursorPointer" data-url="index.php?module=<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
&view=IndexAjax&mode=editCustomLabel&labelid=<?php echo $_smarty_tpl->tpl_vars['label_id']->value;?>
&langid=<?php echo $_smarty_tpl->tpl_vars['lang_id']->value;?>
"><i title="<?php echo vtranslate('LBL_EDIT_CUSTOM_LABEL','PDFMaker');?>
" class="fa fa-pencil"></i></a><a class="deleteCustomLabel cursorPointer" data-url="index.php?module=<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
&action=IndexAjax&mode=deleteCustomLabel&labelid=<?php echo $_smarty_tpl->tpl_vars['label_id']->value;?>
"><i title="<?php echo vtranslate('LBL_DELETE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
" class="fa fa-trash"></i></a></div></td><td><a class="showCustomLabelValues textOverflowEllipsis cursorPointer" data-url="index.php?module=<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
&view=IndexAjax&mode=showCustomLabelValues&labelid=<?php echo $_smarty_tpl->tpl_vars['label_id']->value;?>
&langid=<?php echo $_smarty_tpl->tpl_vars['lang_id']->value;?>
"><?php echo vtranslate('LBL_OTHER_VALS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></td></tr><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></tbody></table></div><br><div class="clearfix"><div class="pull-right btn-group"><button type="button" class="addCustomLabel btn addButton btn-default" data-url="index.php?module=<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
&view=IndexAjax&mode=editCustomLabel"><i class="fa fa-plus icon-white"></i>&nbsp;<span> <?php echo vtranslate('LBL_ADD');?>
</span></button><button type="reset" class="btn btn-default" onClick="window.history.back();"><?php echo vtranslate('LBL_CANCEL');?>
</button></div></div></div></form></div><?php }
}
