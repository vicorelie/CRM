<?php
/* Smarty version 3.1.39, created on 2025-08-13 10:42:22
  from '/home/vicorelie/crm.tcerenov-design.com/customerportal/layouts/default/templates/Faq/Index.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '3.1.39',
  'unifunc' => 'content_689c6c0eb65114_11193311',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '2c6f0ce206d98e50200e4a36a1407cf67b9fec5f' => 
    array (
      0 => '/home/vicorelie/crm.tcerenov-design.com/customerportal/layouts/default/templates/Faq/Index.tpl',
      1 => 1755006196,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_689c6c0eb65114_11193311 (Smarty_Internal_Template $_smarty_tpl) {
?>
<div class="container-fluid"  ng-controller="<?php echo portal_componentjs_class($_smarty_tpl->tpl_vars['MODULE']->value,'IndexView_Component');?>
">
    <div class="row">
        <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">
            <?php $_smarty_tpl->_subTemplateRender(portal_template_resolve($_smarty_tpl->tpl_vars['MODULE']->value,"partials/IndexContent.tpl"), $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, true);
?>
        </div>
    </div>
</div>
<?php }
}
