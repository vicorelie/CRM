<?php
/* Smarty version 4.5.5, created on 2025-11-21 09:11:17
  from '/var/www/CRM/CRM-TYPE/layouts/v7/modules/EMAILMaker/EditSelectContent.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69202cb530d614_46728171',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '1db48cb58eaa5bab1b10200feea4a01aaf4b1b34' => 
    array (
      0 => '/var/www/CRM/CRM-TYPE/layouts/v7/modules/EMAILMaker/EditSelectContent.tpl',
      1 => 1754577898,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69202cb530d614_46728171 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="main-container main-container-<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
">
    <div class='editViewContainer '>

        <form class="form-horizontal recordEditView" id="EditView" name="EditView" method="post" action="index.php" enctype="multipart/form-data">
            <div class="row-fluid">
                <div class="col-xs-12">
                    <input type="hidden" name="module" value="EMAILMaker">
                    <input type="hidden" name="parenttab" value="<?php echo $_smarty_tpl->tpl_vars['PARENTTAB']->value;?>
">
                    <input type="hidden" name="templateid" value="<?php echo $_smarty_tpl->tpl_vars['SAVETEMPLATEID']->value;?>
">
                    <input type="hidden" name="action" value="SaveEMAILTemplate">
                    <input type="hidden" name="redirect" value="true">
                    <br>
                    <label class="pull-left themeTextColor font-x-x-large"><?php echo vtranslate('LBL_THEME_LIST','EMAILMaker');?>
</label>
                    <br clear="all">
                    <hr>
                    <div class="row-fluid">
                        <label class="fieldLabel"><strong><?php echo vtranslate('LBL_THEME_GENERATOR_DESCRIPTION','EMAILMaker');?>
</strong></label><br>
                    </div>
                    <br>


                    <div class="col-sm-12 portal-dashboard">
                        <div id="dashboardContent" class="show"><h4><?php echo vtranslate('LBL_SELECT_THEME','EMAILMaker');?>
</h4>
                            <hr class="hrHeader">

                            <div class="row-fluid">
                                <div class="col-lg-2 col-md-2 col-sm-2 " style="margin-bottom:10px;">
                                    <div class="extension_container extensionWidgetContainer">
                                        <div class="extension_header">
                                            <div class="font-x-x-large boxSizingBorderBox" style="font-size: 14px;"><a href="index.php?module=EMAILMaker&view=Edit&return_module=EMAILMaker&return_view=List">Blank</a>
                                            </div>
                                        </div>
                                        <div style="padding-left:3px;">
                                            <div class="extension_contents padding10" style="border:none;">
                                                <a href="index.php?module=EMAILMaker&view=Edit&return_module=EMAILMaker&return_view=List"><img src="modules/EMAILMaker/templates/blank.png" border="0"></a>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['EMAILTEMPLATES']->value, 'templatename', false, 'templatenameid');
$_smarty_tpl->tpl_vars['templatename']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['templatenameid']->value => $_smarty_tpl->tpl_vars['templatename']->value) {
$_smarty_tpl->tpl_vars['templatename']->do_else = false;
?>
                                    <div class="col-lg-2 col-md-2 col-sm-2 " style="margin-bottom:10px;">
                                        <div class="extension_container extensionWidgetContainer">
                                            <div class="extension_header">
                                                <div class="font-x-x-large boxSizingBorderBox" style="font-size: 14px;"><a href="index.php?module=EMAILMaker&view=Edit&theme=<?php echo $_smarty_tpl->tpl_vars['templatename']->value;?>
&return_module=EMAILMaker&return_view=List"><?php echo $_smarty_tpl->tpl_vars['templatename']->value;?>
</a>
                                                </div>
                                            </div>
                                            <div style="padding-left:3px;">
                                                <div class="extension_contents" style="border:none;">
                                                    <a href="index.php?module=EMAILMaker&view=Edit&theme=<?php echo $_smarty_tpl->tpl_vars['templatename']->value;?>
&return_module=EMAILMaker&return_view=List"><img src="modules/EMAILMaker/templates/<?php echo $_smarty_tpl->tpl_vars['templatename']->value;?>
/image.png" border="0"></a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>
                                <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['EMAILTHEMES']->value, 'theme', false, NULL, 'themes', array (
));
$_smarty_tpl->tpl_vars['theme']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['theme']->value) {
$_smarty_tpl->tpl_vars['theme']->do_else = false;
?>
                                    <div class="col-lg-4 col-md-4 col-sm-4 " style="margin-bottom:10px;">
                                        <div class="extension_container extensionWidgetContainer">
                                            <div class="extension_header row">
                                                <div class="col-lg-10 col-md-10 col-sm-10">
                                                    <div class="font-x-x-large boxSizingBorderBox" style="font-size: 14px;">
                                                        <a href="index.php?module=EMAILMaker&view=Edit&themeid=<?php echo $_smarty_tpl->tpl_vars['theme']->value['themeid'];?>
&return_module=EMAILMaker&return_view=List" title="<?php echo $_smarty_tpl->tpl_vars['theme']->value['themename'];?>
"><?php echo $_smarty_tpl->tpl_vars['theme']->value['themename'];?>

                                                        </a>
                                                    </div>
                                                </div>
                                                <div class="col-lg-2 col-md-2 col-sm-2">
                                                    <?php if ($_smarty_tpl->tpl_vars['theme']->value['edit'] != '') {?>
                                                        <div class="pull-right">
                                                            <?php echo $_smarty_tpl->tpl_vars['theme']->value['edit'];?>

                                                        </div>
                                                    <?php }?>
                                                </div>
                                            </div>
                                            <div style="padding-left:3px;">
                                                <div class="extension_contents" style="border:none;">
                                                    <?php echo $_smarty_tpl->tpl_vars['theme']->value['description'];?>

                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>

                                <div class="col-lg-2 col-md-2 col-sm-2 " style="margin-bottom:10px;">
                                    <div class="extension_container extensionWidgetContainer">
                                        <div class="extension_header">
                                            <div class="font-x-x-large boxSizingBorderBox" style="font-size: 14px;"><a href="index.php?module=EMAILMaker&view=Edit&theme=new&mode=EditTheme&return_module=EMAILMaker&return_view=List"><?php echo vtranslate('LBL_ADD_THEME','EMAILMaker');?>
</a>
                                            </div>
                                        </div>
                                        <div style="padding-left:3px;">
                                            <div class="extension_contents" style="border:none;">
                                                <?php echo vtranslate('LBL_ADD_THEME_INFO','EMAILMaker');?>

                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>

    </div>
</div><?php }
}
