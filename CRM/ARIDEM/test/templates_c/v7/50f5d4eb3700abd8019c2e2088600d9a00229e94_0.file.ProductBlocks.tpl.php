<?php
/* Smarty version 4.5.5, created on 2025-11-21 08:58:55
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/ProductBlocks.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_692029cf51c466_40672935',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '50f5d4eb3700abd8019c2e2088600d9a00229e94' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/ProductBlocks.tpl',
      1 => 1754574240,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_692029cf51c466_40672935 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="container-fluid" id="ProductBlocksContainer"><form name="product_blocks" action="index.php" method="post" class="form-horizontal"><input type="hidden" name="module" value="<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
"/><input type="hidden" name="view" value="EditProductBlock"/><input type="hidden" name="action" value=""/><input type="hidden" name="tplid" value=""/><input type="hidden" name="mode" value=""/><br><label class="pull-left themeTextColor font-x-x-large"><?php echo vtranslate('LBL_PRODUCTBLOCKTPL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</label><br clear="all"><?php echo vtranslate('LBL_PRODUCTBLOCKTPL_DESC',$_smarty_tpl->tpl_vars['MODULE']->value);?>
<hr><br/><div class="row-fluid"><label class="fieldLabel"><strong><?php echo vtranslate('LBL_DEFINE_PBTPL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
:</strong></label><br><div class="row-fluid"><div class="pull-right btn-group"><button type="button" class="addProductBlock btn addButton btn-default ProductBlockBtn" data-url="index.php?module=<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
&view=EditProductBlock"><i class="icon-plus icon-white"></i>&nbsp;<strong> <?php echo vtranslate('LBL_ADD');?>
</strong></button><button type="reset" class="btn btn-default" onClick="window.history.back();"><?php echo vtranslate('LBL_CANCEL');?>
</button></div></div><div class="pushDownHalfper"><table id="ProductBlocksTable" class="table table-bordered table-condensed ProductBlocksTable" style="padding:0px;margin:0px" id="lbltbl"><thead><tr class="blockHeader"><th style="border-left: 1px solid #DDD !important;" width="250px"><?php echo vtranslate('LBL_EMAIL_NAME',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</th><th style="border-left: 1px solid #DDD !important;" id="bodyColumn"><?php echo vtranslate('LBL_BODY',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</th><th style="border-left: 0px solid #DDD !important;" width="200px" nowrap></th></tr></thead><tbody><?php echo '<script'; ?>
 type="text/javascript" language="javascript">var existingKeys = [];<?php echo '</script'; ?>
><?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['PB_TEMPLATES']->value, 'tpl_value', false, 'tpl_id', 'tpl_foreach', array (
));
$_smarty_tpl->tpl_vars['tpl_value']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['tpl_id']->value => $_smarty_tpl->tpl_vars['tpl_value']->value) {
$_smarty_tpl->tpl_vars['tpl_value']->do_else = false;
?><tr class="opacity"><td><?php echo $_smarty_tpl->tpl_vars['tpl_value']->value['name'];?>
</td><td><div style="overflow-x:auto; overflow-y:auto; width:100px;" class="bodyCell"><?php echo $_smarty_tpl->tpl_vars['tpl_value']->value['body'];?>
</div></td><td style="border-left: none;"><div class="pull-right actions"><div class="btn-group"><button type="button" class="btn btn-default editProductBlock ProductBlockBtn" data-url="index.php?module=<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
&view=EditProductBlock&tplid=<?php echo $_smarty_tpl->tpl_vars['tpl_id']->value;?>
" data-tplid="<?php echo $_smarty_tpl->tpl_vars['tpl_id']->value;?>
"><i title="<?php echo vtranslate('LBL_EDIT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
" class="fa fa-pencil"></i></button><button type="button" class="btn btn-default duplicateProductBlock ProductBlockBtn" data-url="index.php?module=<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
&view=EditProductBlock&tplid=<?php echo $_smarty_tpl->tpl_vars['tpl_id']->value;?>
&mode=duplicate" data-tplid="<?php echo $_smarty_tpl->tpl_vars['tpl_id']->value;?>
"><?php echo vtranslate('LBL_DUPLICATE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</button><button type="button" class="btn btn-danger ProductBlockBtn" data-url="index.php?module=<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
&action=IndexAjax&mode=DeleteProductBlock&tplid=<?php echo $_smarty_tpl->tpl_vars['tpl_id']->value;?>
" data-tplid="<?php echo $_smarty_tpl->tpl_vars['tpl_id']->value;?>
"><i title="<?php echo vtranslate('LBL_DELETE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
" class="fa fa-trash"></i></button></div></div></td></tr><?php
}
if ($_smarty_tpl->tpl_vars['tpl_value']->do_else) {
?><tr id="noItemFountTr"><td colspan="4" class="cellText" align="center" style="padding:10px;"><strong><?php echo vtranslate('LBL_NO_ITEM_FOUND',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></td></tr><?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?></tbody></table></div><div id="otherLangsDiv" style="display:none; width:350px; position:absolute;" class="layerPopup"></div><div class="row-fluid pushDownHalfper"><div class="pull-right btn-group"><button type="button" class="addProductBlock btn btn-default addButton ProductBlockBtn" data-url="index.php?module=<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
&view=EditProductBlock"><i class="icon-plus icon-white"></i>&nbsp;<strong> <?php echo vtranslate('LBL_ADD');?>
</strong></button><button type="reset" class="btn btn-default" onClick="window.history.back();"><?php echo vtranslate('LBL_CANCEL');?>
</button></div></div></div></form></div><?php echo '<script'; ?>
 type="text/javascript" language="javascript">
        jQuery(document).ready(function () {
            var elmWidth = jQuery("#bodyColumn").width();
            jQuery(".bodyCell").each(function () {
                jQuery(this).css("width", elmWidth + "px");
            });
        });
        <?php echo '</script'; ?>
><?php }
}
