<?php
/* Smarty version 4.5.5, created on 2025-11-24 12:56:33
  from '/var/www/CRM/CRM-TYPE/layouts/v7/modules/PDFMaker/SidebarEssentials.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6924560122e833_57920361',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '1b98f327429d322cdb33a501eb7d84f1876906a5' => 
    array (
      0 => '/var/www/CRM/CRM-TYPE/layouts/v7/modules/PDFMaker/SidebarEssentials.tpl',
      1 => 1763716215,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6924560122e833_57920361 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="sidebar-menu">
    <div class="module-filters" id="module-filters">
        <div class="sidebar-container lists-menu-container">
            <div class="sidebar-header clearfix">
                <h5 class="pull-left"><?php echo vtranslate('LBL_LISTS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</h5>
            </div>
            <hr>
            <div class="menu-scroller scrollContainer" style="position:relative; top:0; left:0;">
				<div class="list-menu-content">
                    <ul class="lists-menu">
                        <li style="font-size:12px;" class='listViewFilter <?php if ($_smarty_tpl->tpl_vars['MODE']->value != "Blocks") {?>active<?php }?>'>
                             <a class="filterName listViewFilterElipsis" href="index.php?module=PDFMaker&view=List"><?php echo vtranslate('LBL_PDF_TEMPLATES_LIST',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a>
                        </li>
                        <li style="font-size:12px;" class='listViewFilter <?php if ($_smarty_tpl->tpl_vars['MODE']->value == "Blocks") {?>active<?php }?>'>
                            <a class="filterName listViewFilterElipsis" href="index.php?module=PDFMaker&view=List&mode=Blocks"><?php echo vtranslate('LBL_BLOCKS_LIST',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</div>
<?php }
}
