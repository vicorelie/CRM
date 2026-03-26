<?php
/* Smarty version 4.5.5, created on 2026-03-19 23:50:38
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/PDFMaker/SidebarEssentials.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69bc8bcec013d6_07468548',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '05715112bb286e20677e09bb25c9318dc7573e3e' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/PDFMaker/SidebarEssentials.tpl',
      1 => 1773964200,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69bc8bcec013d6_07468548 (Smarty_Internal_Template $_smarty_tpl) {
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
