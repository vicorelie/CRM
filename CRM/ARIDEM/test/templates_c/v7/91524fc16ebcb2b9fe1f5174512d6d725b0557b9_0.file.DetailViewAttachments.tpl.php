<?php
/* Smarty version 4.5.5, created on 2025-11-23 20:25:00
  from '/var/www/CRM/ARIDEM/layouts/v7/modules/ITS4YouEmails/DetailViewAttachments.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69236d9c73fd60_41237635',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '91524fc16ebcb2b9fe1f5174512d6d725b0557b9' => 
    array (
      0 => '/var/www/CRM/ARIDEM/layouts/v7/modules/ITS4YouEmails/DetailViewAttachments.tpl',
      1 => 1754574240,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69236d9c73fd60_41237635 (Smarty_Internal_Template $_smarty_tpl) {
if ($_smarty_tpl->tpl_vars['ATTACHMENTS']->value) {?>
    <div class="block">
        <div>
            <h4 class="textOverflowEllipsis maxWidth50"><?php echo vtranslate('LBL_ATTACHMENTS',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</h4>
        </div>
        <hr>
        <div class="padding20px">
            <table class="table no-border">
                <thead>
                <tr>
                    <th><?php echo vtranslate('File Name',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</th>
                    <th><?php echo vtranslate('Actions',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
</th>
                </tr>
                </thead>
                <tbody>
                <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['ATTACHMENTS']->value, 'ATTACHMENT');
$_smarty_tpl->tpl_vars['ATTACHMENT']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['ATTACHMENT']->value) {
$_smarty_tpl->tpl_vars['ATTACHMENT']->do_else = false;
?>
                    <tr>
                        <td>
                            <a target="_blank" href="<?php echo $_smarty_tpl->tpl_vars['ATTACHMENT']->value['filenamewithpath'];?>
">
                                <?php echo $_smarty_tpl->tpl_vars['ATTACHMENT']->value['attachment'];?>

                            </a>
                        </td>
                        <td>
                            <a title="<?php echo vtranslate('Download',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
" href="index.php?module=Emails&action=DownloadFile&attachment_id=<?php echo $_smarty_tpl->tpl_vars['ATTACHMENT']->value['fileid'];?>
&name=<?php echo $_smarty_tpl->tpl_vars['ATTACHMENT']->value['attachment'];?>
">
                                <i class="fa fa-download"></i>
                            </a>
                            <?php if (!empty($_smarty_tpl->tpl_vars['ATTACHMENT']->value['docid'])) {?>
                                &nbsp;&nbsp;
                                <a title="<?php echo vtranslate('Preview',$_smarty_tpl->tpl_vars['QUALIFIED_MODULE']->value);?>
" href="javascript:void(0)" onclick="Vtiger_Header_Js.previewFile(event,<?php echo $_smarty_tpl->tpl_vars['ATTACHMENT']->value['docid'];?>
)" data-filelocationtype="I" data-filename="<?php echo $_smarty_tpl->tpl_vars['ATTACHMENT']->value['attachment'];?>
">
                                    <i class="fa fa-eye"></i>
                                </a>
                            <?php }?>
                        </td>
                    </tr>
                <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>
                </tbody>
            </table>
        </div>
    </div>
    <br>
<?php }
}
}
