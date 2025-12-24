<?php
/* Smarty version 4.5.5, created on 2025-12-21 19:41:46
  from '/var/www/CNK-DEM/layouts/v7/modules/Vtiger/SendSMSForm.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_69484d7a737285_03757935',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '97881995db4fd130932e180a5c6cfd3e7df031ad' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/Vtiger/SendSMSForm.tpl',
      1 => 1765888875,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_69484d7a737285_03757935 (Smarty_Internal_Template $_smarty_tpl) {
?>
<div id="sendSmsContainer" class='modal-xs modal-dialog'>
    <div class = "modal-content">
        <?php ob_start();
echo vtranslate('LBL_SEND_SMS',$_smarty_tpl->tpl_vars['MODULE']->value);
$_prefixVariable1=ob_get_clean();
$_smarty_tpl->_assignInScope('TITLE', $_prefixVariable1);?>
        <?php $_smarty_tpl->_subTemplateRender(call_user_func_array($_smarty_tpl->registered_plugins[ 'modifier' ][ 'vtemplate_path' ][ 0 ], array( "ModalHeader.tpl",$_smarty_tpl->tpl_vars['MODULE']->value )), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array('TITLE'=>$_smarty_tpl->tpl_vars['TITLE']->value), 0, true);
?>

        <form class="form-horizontal" id="massSave" method="post" action="index.php">
            <input type="hidden" name="module" value="<?php echo $_smarty_tpl->tpl_vars['MODULE']->value;?>
" />
            <input type="hidden" name="source_module" value="<?php echo $_smarty_tpl->tpl_vars['SOURCE_MODULE']->value;?>
" />
            <input type="hidden" name="action" value="MassSaveAjax" />
            <input type="hidden" name="viewname" value="<?php echo $_smarty_tpl->tpl_vars['VIEWNAME']->value;?>
" />
            <input type="hidden" name="selected_ids" value=<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['SELECTED_IDS']->value);?>
>
            <input type="hidden" name="excluded_ids" value=<?php echo ZEND_JSON::encode($_smarty_tpl->tpl_vars['EXCLUDED_IDS']->value);?>
>
            <input type="hidden" name="search_key" value= "<?php echo $_smarty_tpl->tpl_vars['SEARCH_KEY']->value;?>
" />
            <input type="hidden" name="operator" value="<?php echo $_smarty_tpl->tpl_vars['OPERATOR']->value;?>
" />
            <input type="hidden" name="search_value" value="<?php echo $_smarty_tpl->tpl_vars['ALPHABET_VALUE']->value;?>
" />
            <input type="hidden" name="search_params" value='<?php echo Vtiger_Util_Helper::toSafeHTML(ZEND_JSON::encode($_smarty_tpl->tpl_vars['SEARCH_PARAMS']->value));?>
' />
            
            <div class="modal-body">
                <div>
                    <span><strong><?php echo vtranslate('LBL_STEP_1',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></span>
                    &nbsp;:&nbsp;
                    <?php echo vtranslate('LBL_SELECT_THE_PHONE_NUMBER_FIELDS_TO_SEND',$_smarty_tpl->tpl_vars['MODULE']->value);?>

                </div>
                <br>
                <div>
                    <div>
                        <select name="fields[]" data-placeholder="<?php echo vtranslate('LBL_SELECT_THE_PHONE_NUMBER_FIELDS_TO_SEND',$_smarty_tpl->tpl_vars['MODULE']->value);?>
" data-rule-required="true" multiple class = "select2 form-control">
                            <?php
$_from = $_smarty_tpl->smarty->ext->_foreach->init($_smarty_tpl, $_smarty_tpl->tpl_vars['PHONE_FIELDS']->value, 'PHONE_FIELD');
$_smarty_tpl->tpl_vars['PHONE_FIELD']->do_else = true;
if ($_from !== null) foreach ($_from as $_smarty_tpl->tpl_vars['PHONE_FIELD']->value) {
$_smarty_tpl->tpl_vars['PHONE_FIELD']->do_else = false;
?>
                                <?php $_smarty_tpl->_assignInScope('PHONE_FIELD_NAME', $_smarty_tpl->tpl_vars['PHONE_FIELD']->value->get('name'));?>
                                <option value="<?php echo $_smarty_tpl->tpl_vars['PHONE_FIELD_NAME']->value;?>
">
                                    <?php if (!empty($_smarty_tpl->tpl_vars['SINGLE_RECORD']->value)) {?>
                                        <?php $_smarty_tpl->_assignInScope('FIELD_VALUE', $_smarty_tpl->tpl_vars['SINGLE_RECORD']->value->get($_smarty_tpl->tpl_vars['PHONE_FIELD_NAME']->value));?>
                                    <?php }?>
                                    <?php echo vtranslate($_smarty_tpl->tpl_vars['PHONE_FIELD']->value->get('label'),$_smarty_tpl->tpl_vars['SOURCE_MODULE']->value);
if (!empty($_smarty_tpl->tpl_vars['FIELD_VALUE']->value)) {?> (<?php echo $_smarty_tpl->tpl_vars['FIELD_VALUE']->value;?>
)<?php }?>
                                </option>
                            <?php
}
$_smarty_tpl->smarty->ext->_foreach->restore($_smarty_tpl, 1);?>
                        </select>
                    </div>
                    <br>        
                    <div>
                        <span id='phoneFormatWarning'> 
                            <i rel="popover" data-placement="right" id="phoneFormatWarningPop" class="glyphicon glyphicon-info-sign" style="padding-right : 5px; padding-left : 5px" data-original-title="<?php echo vtranslate('LBL_WARNING',$_smarty_tpl->tpl_vars['MODULE']->value);?>
" data-trigger="hover" data-content="<?php echo vtranslate('LBL_PHONEFORMAT_WARNING_CONTENT',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"></i>
                            <?php echo vtranslate('LBL_PHONE_FORMAT_WARNING',$_smarty_tpl->tpl_vars['MODULE']->value);?>

                        </span>
                    </div>
                </div>
                <hr>
                <div>
                    <span><strong><?php echo vtranslate('LBL_STEP_2',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></span>
                    &nbsp;:&nbsp;
                    <?php echo vtranslate('LBL_TYPE_THE_MESSAGE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;(&nbsp;<?php echo vtranslate('LBL_SMS_MAX_CHARACTERS_ALLOWED',$_smarty_tpl->tpl_vars['MODULE']->value);?>
&nbsp;)
                </div>
                <br>
                <textarea class="form-control smsTextArea" data-rule-required="true" name="message" id="message" maxlength="160" placeholder="<?php echo vtranslate('LBL_WRITE_YOUR_MESSAGE_HERE',$_smarty_tpl->tpl_vars['MODULE']->value);?>
"></textarea>
            </div>
            <div>
                <div class="modal-footer">
                    <center>
                        <button class="btn btn-success" type="submit" name="saveButton"><strong><?php echo vtranslate('LBL_SEND',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</strong></button>
                        <a class="cancelLink" type="reset" data-dismiss="modal"><?php echo vtranslate('LBL_CANCEL',$_smarty_tpl->tpl_vars['MODULE']->value);?>
</a>
                    </center>
                </div>
            </div>
        </form>
    </div>
</div>
<?php }
}
