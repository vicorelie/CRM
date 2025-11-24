<?php
/* Smarty version 4.5.5, created on 2025-11-21 09:11:14
  from '/var/www/CRM/CRM-TYPE/layouts/v7/modules/EMAILMaker/ListEMAILActions.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69202cb21aafa6_33644278',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '2e412ec7521b98010e3f5dd13c70b5c6cfeeb7db' => 
    array (
      0 => '/var/www/CRM/CRM-TYPE/layouts/v7/modules/EMAILMaker/ListEMAILActions.tpl',
      1 => 1754577898,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69202cb21aafa6_33644278 (Smarty_Internal_Template $_smarty_tpl) {
$_smarty_tpl->_checkPlugins(array(0=>array('file'=>'/var/www/CRM/CRM-TYPE/vendor/smarty/smarty/libs/plugins/modifier.count.php','function'=>'smarty_modifier_count',),));
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
