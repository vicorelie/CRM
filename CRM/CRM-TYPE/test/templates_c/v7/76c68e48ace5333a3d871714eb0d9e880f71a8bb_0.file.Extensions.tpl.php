<?php
/* Smarty version 4.5.5, created on 2025-08-11 11:22:21
  from '/home/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/PDFMaker/Extensions.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6899d26d44a547_08420654',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '76c68e48ace5333a3d871714eb0d9e880f71a8bb' => 
    array (
      0 => '/home/vicorelie/crm.tcerenov-design.com/layouts/v7/modules/PDFMaker/Extensions.tpl',
      1 => 1754577870,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6899d26d44a547_08420654 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="container-fluid" id="licenseContainer"><form name="profiles_privilegies" action="index.php" method="post" class="form-horizontal"><br><h4 class="themeTextColor font-x-x-large"><?php echo vtranslate('LBL_EXTENSIONS','PDFMaker');?>
</h4><hr><input type="hidden" name="module" value="PDFMaker" /><input type="hidden" name="view" value="" /><br /><div class="row-fluid"><label class="fieldLabel"><strong><?php echo vtranslate('LBL_AVAILABLE_EXTENSIONS','PDFMaker');?>
:</strong></label><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['EXTENSIONS_ARR']->value, 'arr', false, 'extname');
$_smarty_tpl->tpl_vars['arr']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['extname']->value => $_smarty_tpl->tpl_vars['arr']->value) {
$_smarty_tpl->tpl_vars['arr']->do_else = false;
?><table class="table table-bordered table-striped"><thead><tr class="blockHeader"><th colspan="2"><div class="textAlignLeft"><?php echo vtranslate($_smarty_tpl->tpl_vars['arr']->value['label'],'PDFMaker');?>
<span class="pull-right"><?php if ($_smarty_tpl->tpl_vars['arr']->value['install'] != '') {?>&nbsp;<button type="button" id="install_<?php echo $_smarty_tpl->tpl_vars['extname']->value;?>
_btn" class="btn ext_btn btn-success" data-extname="<?php echo $_smarty_tpl->tpl_vars['extname']->value;?>
" data-url="<?php echo $_smarty_tpl->tpl_vars['arr']->value['install'];?>
"><?php echo vtranslate('LBL_INSTALL_BUTTON','Install');?>
</button><?php }
if ($_smarty_tpl->tpl_vars['arr']->value['download'] != '') {?>&nbsp;<a class="padding-left1per btn btn-default" href="<?php echo $_smarty_tpl->tpl_vars['arr']->value['download'];?>
"><?php echo vtranslate('LBL_DOWNLOAD','PDFMaker');?>
</a><?php }
if ($_smarty_tpl->tpl_vars['arr']->value['button'] != '') {?>&nbsp;<button type="button" id="<?php echo $_smarty_tpl->tpl_vars['arr']->value['button']['type'];?>
_<?php echo $_smarty_tpl->tpl_vars['extname']->value;?>
_btn" class="padding-left1per btn <?php echo $_smarty_tpl->tpl_vars['extname']->value;?>
_btn <?php echo $_smarty_tpl->tpl_vars['arr']->value['button']['style'];?>
 ext_btn" data-extname="<?php echo $_smarty_tpl->tpl_vars['extname']->value;?>
" data-url="<?php echo $_smarty_tpl->tpl_vars['arr']->value['button']['url'];?>
"><?php ob_start();
echo $_smarty_tpl->tpl_vars['arr']->value['button']['label'];
$_prefixVariable1 = ob_get_clean();
echo vtranslate($_prefixVariable1,'PDFMaker');?>
</button><?php }?></div></th></tr></thead><tbody><tr><td class="padding5per"><div class="padding10"><?php echo vtranslate($_smarty_tpl->tpl_vars['arr']->value['desc'],'PDFMaker');
if ($_smarty_tpl->tpl_vars['arr']->value['exinstall'] != '') {?><br><br><b><?php echo vtranslate('LBL_INSTAL_EXT','PDFMaker');?>
</b><br><?php echo vtranslate($_smarty_tpl->tpl_vars['arr']->value['exinstall'],'PDFMaker');
}
if ($_smarty_tpl->tpl_vars['arr']->value['manual'] != '') {?><br><br><?php echo vtranslate('LBL_CUSTOM_INSTAL_EXT','PDFMaker');?>
<b> <a href="<?php echo $_smarty_tpl->tpl_vars['arr']->value['manual'];?>
" style="cursor: pointer"><?php echo vtranslate($_smarty_tpl->tpl_vars['arr']->value['label'],'PDFMaker');?>
.txt</a></b><?php }?><br><br><div id="install_<?php echo $_smarty_tpl->tpl_vars['extname']->value;?>
_info" class="fontBold<?php if ($_smarty_tpl->tpl_vars['arr']->value['install_info'] == '') {?> hide<?php }?>"><b><?php echo $_smarty_tpl->tpl_vars['arr']->value['install_info'];?>
</b></div></div></td></tr></tbody></table><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></div><?php if ($_smarty_tpl->tpl_vars['MODE']->value == "edit") {?><div class="pull-right"><button class="btn btn-success" type="submit"><?php echo vtranslate('LBL_SAVE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</button><a class="cancelLink" onclick="javascript:window.history.back();" type="reset"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></div><?php }?></form></div><?php echo '<script'; ?>
 language="javascript" type="text/javascript"><?php if ($_smarty_tpl->tpl_vars['ERROR']->value == 'true') {?>alert('<?php echo vtranslate('ALERT_DOWNLOAD_ERROR','PDFMaker');?>
');<?php }
echo '</script'; ?>
><?php }
}
