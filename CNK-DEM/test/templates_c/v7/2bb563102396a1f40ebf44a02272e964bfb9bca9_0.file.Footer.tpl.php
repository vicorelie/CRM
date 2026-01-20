<?php
/* Smarty version 4.5.5, created on 2026-01-19 00:35:14
  from '/var/www/CNK-DEM/layouts/v7/modules/Vtiger/Footer.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_696d602260e469_10617914',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '2bb563102396a1f40ebf44a02272e964bfb9bca9' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/Vtiger/Footer.tpl',
      1 => 1766693566,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_696d602260e469_10617914 (Smarty_Internal_Template $_smarty_tpl) {
?>
<footer class="app-footer">
	<p>
		Développement et design By&nbsp;
		<a href="https://webama.fr/" target="_blank"><b>WEBAMA</b></a>&nbsp;|&nbsp;
		<a href="https://cnkdem.com/" target="_blank"><b>SOCIÉTÉ CNK DEM</b></a>&nbsp;|&nbsp;Tout droit réservé - © 2018 - <?php echo date('Y');?>

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
<div id="maxListFieldsSelectionSize" class="hide noprint"><?php echo $_smarty_tpl->tpl_vars['MAX_LISTFIELDS_SELECTION_SIZE']->value;?>
</div>
<div class="modal myModal fade"></div>
<?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( 'JSResources.tpl' )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?>
</body>

</html>
<?php }
}
