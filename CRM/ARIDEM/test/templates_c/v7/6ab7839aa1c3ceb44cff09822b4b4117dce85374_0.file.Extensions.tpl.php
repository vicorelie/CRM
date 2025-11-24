<?php
/* Smarty version 4.5.5, created on 2025-11-21 08:57:06
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/Extensions.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69202962320cc9_95679583',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '6ab7839aa1c3ceb44cff09822b4b4117dce85374' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/EMAILMaker/Extensions.tpl',
      1 => 1754574240,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69202962320cc9_95679583 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="container-fluid" id="licenseContainer">
    <form action="index.php" method="post" class="form-horizontal">
        <br>
        <label class="pull-left themeTextColor font-x-x-large"><?php echo vtranslate('LBL_EXTENSIONS','EMAILMaker');?>
</label>
        <br clear="all">
        <hr>
        <input type="hidden" name="module" value="EMAILMaker"/>
        <input type="hidden" name="view" value=""/>
        <br/>
        <div class="row-fluid">
            <label class="fieldLabel"><strong><?php echo vtranslate('LBL_AVAILABLE_EXTENSIONS','EMAILMaker');?>
:</strong></label>
            <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['EXTENSIONS_ARR']->value, 'arr', false, 'extname');
$_smarty_tpl->tpl_vars['arr']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['extname']->value => $_smarty_tpl->tpl_vars['arr']->value) {
$_smarty_tpl->tpl_vars['arr']->do_else = false;
?>
                <br>
                <table class="table table-bordered table-striped">
                    <thead>
                    <tr class="blockHeader">
                        <th colspan="2">
                            <div class="textAlignLeft"><?php echo vtranslate($_smarty_tpl->tpl_vars['arr']->value['label'],'EMAILMaker');?>

                                <?php if ($_smarty_tpl->tpl_vars['arr']->value['download'] != '') {?>
                                    <span class="pull-right">
                                        <a class="btn" href="<?php echo $_smarty_tpl->tpl_vars['arr']->value['download'];?>
"><?php echo vtranslate('LBL_DOWNLOAD','EMAILMaker');?>
</a>
                                    </span>
                                <?php }?>
                            </div>
                        </th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td class="padding5per">
                            <div class="padding10">
                                <?php echo vtranslate($_smarty_tpl->tpl_vars['arr']->value['desc'],'EMAILMaker');?>

                                <?php if ($_smarty_tpl->tpl_vars['arr']->value['exinstall'] != '') {?>
                                    <br>
                                    <br>
                                    <b><?php echo vtranslate('LBL_INSTAL_EXT','EMAILMaker');?>
</b>
                                    <br>
                                    <?php echo vtranslate($_smarty_tpl->tpl_vars['arr']->value['exinstall'],'EMAILMaker');?>

                                <?php }?>
                                <?php if ($_smarty_tpl->tpl_vars['arr']->value['manual'] != '') {?>
                                    <br>
                                    <br>
                                    <b> <a href="<?php echo $_smarty_tpl->tpl_vars['arr']->value['manual'];?>
" style="cursor: pointer"><?php echo vtranslate($_smarty_tpl->tpl_vars['arr']->value['manual_label'],'EMAILMaker');?>
</a></b>
                                <?php }?>
                                <?php if ($_smarty_tpl->tpl_vars['arr']->value['install_info'] != '') {?>
                                    <br>
                                    <br>
                                    <div id="install_<?php echo $_smarty_tpl->tpl_vars['extname']->value;?>
_info" class="fontBold<?php if ($_smarty_tpl->tpl_vars['arr']->value['install_info'] == '') {?> hide<?php }?>"><?php echo $_smarty_tpl->tpl_vars['arr']->value['install_info'];?>
</div>
                                <?php }?>
                                <?php if ($_smarty_tpl->tpl_vars['arr']->value['install'] != '') {?>
                                    <br>
                                    <button type="button" id="install_<?php echo $_smarty_tpl->tpl_vars['extname']->value;?>
_btn" class="btn btn-success" data-extname="<?php echo $_smarty_tpl->tpl_vars['extname']->value;?>
" data-url="<?php echo $_smarty_tpl->tpl_vars['arr']->value['install'];?>
"><?php echo vtranslate('LBL_INSTALL_BUTTON','Install');?>
</button>
                                <?php }?>
                            </div>
                        </td>
                    </tr>
                    </tbody>
                </table>
            <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>
        </div>
        <?php if ($_smarty_tpl->tpl_vars['MODE']->value == "edit") {?>
            <div class="pull-right">
                <button class="btn btn-success" type="submit"><?php echo vtranslate('LBL_SAVE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</button>
                <a class="cancelLink" onclick="window.history.back();" type="reset"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a>
            </div>
        <?php }?>
    </form>
</div>
<?php echo '<script'; ?>
 language="javascript" type="text/javascript">
    <?php if ($_smarty_tpl->tpl_vars['ERROR']->value == 'true') {?>
    alert('<?php echo vtranslate('ALERT_DOWNLOAD_ERROR','EMAILMaker');?>
');
    <?php }
echo '</script'; ?>
>
   <?php }
}
