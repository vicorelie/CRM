<?php
/* Smarty version 4.5.5, created on 2025-11-24 12:56:33
  from '/var/www/CRM/CRM-TYPE/layouts/v7/modules/PDFMaker/Footer.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69245601274578_83076466',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '050168faff461a5753746b7a3570be1e3130437d' => 
    array (
      0 => '/var/www/CRM/CRM-TYPE/layouts/v7/modules/PDFMaker/Footer.tpl',
      1 => 1763716215,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69245601274578_83076466 (Smarty_Internal_Template $_smarty_tpl) {
?><br>
<div class="small" style="color: rgb(153, 153, 153);text-align: center;"><?php echo vtranslate('PDFMaker','PDFMaker');?>
 <?php echo PDFMaker_Version_Helper::$version;?>
 <?php echo vtranslate('COPYRIGHT','PDFMaker');?>
</div>
<footer class="app-footer">
	<p>
		Powered by vtiger CRM - <?php echo $_smarty_tpl->tpl_vars['VTIGER_VERSION']->value;?>
&nbsp;&nbsp;© 2004 - <?php echo date('Y');?>
&nbsp;&nbsp;
		<a href="//www.vtiger.com" target="_blank">Vtiger</a>&nbsp;|&nbsp;
		<a href="https://www.vtiger.com/privacy-policy" target="_blank">Privacy Policy</a>
	</p>
</footer>
</div>
<div id='overlayPage'>
	<!-- arrow is added to point arrow to the clicked element (Ex:- TaskManagement),
	any one can use this by adding "show" class to it -->
	<div class='arrow'></div>
	<div class='data'>
	</div>
</div>
<div id='helpPageOverlay'></div>
<div id="js_strings" class="hide noprint"><?php echo Zend_Json::encode($_smarty_tpl->tpl_vars['LANGUAGE_STRINGS']->value);?>
</div>
<div class="modal myModal fade"></div>
<?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'JSResources.tpl',$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?>
</body>

</html><?php }
}
