<?php
/* Smarty version 4.5.5, created on 2025-11-21 09:03:06
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/Documents/partials/Menubar.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69202acaf35989_98692818',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    'a09ef95c44619fbf4754902daae6edcda8dda795' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/Documents/partials/Menubar.tpl',
      1 => 1752055882,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69202acaf35989_98692818 (Smarty_Internal_Template $_smarty_tpl) {
if ($_smarty_tpl->tpl_vars['REQ']->value->get('view') == 'Detail') {?>
<div id="modules-menu" class="modules-menu">    
    <ul>
        <li class="active">
            <a href="<?php echo $_smarty_tpl->tpl_vars['MODULE_MODEL']->value->getListViewUrl();?>
">
				<?php echo $_smarty_tpl->tpl_vars['MODULE_MODEL']->value->getModuleIcon();?>

                <span><?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
</span>
            </a>
        </li>
    </ul>
</div>
<?php }
}
}
