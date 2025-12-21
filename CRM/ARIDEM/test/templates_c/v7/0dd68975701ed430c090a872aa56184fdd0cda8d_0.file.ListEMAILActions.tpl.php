<?php
/* Smarty version 4.5.5, created on 2025-12-08 06:34:51
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/ListEMAILActions.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_6936718b2f2ff3_57333927',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '0dd68975701ed430c090a872aa56184fdd0cda8d' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/ListEMAILActions.tpl',
      1 => 1763717833,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_6936718b2f2ff3_57333927 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CRM/ARIDEM/vendor/smarty/smarty/libs/plugins/modifier.count.php','function'=>'smarty_modifier_count',),));
?>
<div id="listview-actions" class="listview-actions-container">
    <div class="row">
        <div class="col-md-3">
            <div class="btn-group listViewMassActions" role="group">
                <?php if (count($_smarty_tpl->tpl_vars['LISTVIEW_MASSACTIONS']->value) > 0 || smarty_modifier_count($_smarty_tpl->tpl_vars['LISTVIEW_LINKS']->value['LISTVIEW']) > 0) {?>
                    <button class="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown"><?php echo vtranslate('LBL_ACTIONS',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;&nbsp;<i class="caret"></i></button>
                    <ul class="dropdown-menu">
                        <?php if (count($_smarty_tpl->tpl_vars['LISTVIEW_MASSACTIONS']->value) > 0) {?>
                            <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['LISTVIEW_MASSACTIONS']->value, 'LISTVIEW_MASSACTION');
$_smarty_tpl->tpl_vars['LISTVIEW_MASSACTION']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['LISTVIEW_MASSACTION']->value) {
$_smarty_tpl->tpl_vars['LISTVIEW_MASSACTION']->do_else = false;
?>
                                <li id="<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
_listView_massAction_<?php echo Vtiger_Util_Helper::replaceSpaceWithUnderScores($_smarty_tpl->tpl_vars['LISTVIEW_MASSACTION']->value->getLabel());?>
"><a href="javascript:void(0);" <?php if (stripos($_smarty_tpl->tpl_vars['LISTVIEW_MASSACTION']->value->getUrl(),'javascript:') === 0) {?>onclick='<?php echo call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'substr' ][ 0 ], array( $_smarty_tpl->tpl_vars['LISTVIEW_MASSACTION']->value->getUrl(),strlen("javascript:") ));?>
'<?php } else { ?> onclick="Vtiger_List_Js.triggerMassAction('<?php echo $_smarty_tpl->tpl_vars['LISTVIEW_MASSACTION']->value->getUrl();?>
')"<?php }?> ><?php echo vtranslate($_smarty_tpl->tpl_vars['LISTVIEW_MASSACTION']->value->getLabel(),$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li>
                            <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>

                            <?php if (smarty_modifier_count($_smarty_tpl->tpl_vars['LISTVIEW_LINKS']->value['LISTVIEW']) > 0) {?>
                                <li class="divider"></li>
                            <?php }?>
                        <?php }?>

                        <?php if (smarty_modifier_count($_smarty_tpl->tpl_vars['LISTVIEW_LINKS']->value['LISTVIEW']) > 0) {?>
                            <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['LISTVIEW_LINKS']->value['LISTVIEW'], 'LISTVIEW_ADVANCEDACTIONS');
$_smarty_tpl->tpl_vars['LISTVIEW_ADVANCEDACTIONS']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['LISTVIEW_ADVANCEDACTIONS']->value) {
$_smarty_tpl->tpl_vars['LISTVIEW_ADVANCEDACTIONS']->do_else = false;
?>
                                <li id="<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
_listView_advancedAction_<?php echo Vtiger_Util_Helper::replaceSpaceWithUnderScores($_smarty_tpl->tpl_vars['LISTVIEW_ADVANCEDACTIONS']->value->getLabel());?>
"><a <?php if (stripos($_smarty_tpl->tpl_vars['LISTVIEW_ADVANCEDACTIONS']->value->getUrl(),'javascript:') === 0) {?> href="javascript:void(0);" onclick='<?php echo call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'substr' ][ 0 ], array( $_smarty_tpl->tpl_vars['LISTVIEW_ADVANCEDACTIONS']->value->getUrl(),strlen("javascript:") ));?>
'<?php } else { ?> href='<?php echo $_smarty_tpl->tpl_vars['LISTVIEW_ADVANCEDACTIONS']->value->getUrl();?>
' <?php }?>><?php echo vtranslate($_smarty_tpl->tpl_vars['LISTVIEW_ADVANCEDACTIONS']->value->getLabel(),$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a></li>
                            <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>
                        <?php }?>
                    </ul>
                <?php }?>
            </div>
        </div>
    </div>
</div><?php }
}
