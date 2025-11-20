<?php
/* Smarty version 3.1.39, created on 2025-08-13 10:44:43
  from '/home/vicorelie/crm.tcerenov-design.com/customerportal/layouts/default/templates/Portal/partials/DetailRelatedContent.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '3.1.39',
  'unifunc' => 'content_689c6c9b924710_35052409',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '9fbf03f67e21262d68927fab12d59ca809d9873a' => 
    array (
      0 => '/home/vicorelie/crm.tcerenov-design.com/customerportal/layouts/default/templates/Portal/partials/DetailRelatedContent.tpl',
      1 => 1755006199,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
    'file:Portal/partials/CommentContent.tpl' => 1,
    'file:Portal/partials/UpdatesContent.tpl' => 1,
    'file:Project/partials/ProjectTaskContent.tpl' => 1,
    'file:Project/partials/ProjectMilestoneContent.tpl' => 1,
    'file:Documents/partials/RelatedDocumentsContent.tpl' => 1,
  ),
),false)) {
function content_689c6c9b924710_35052409 (Smarty_Internal_Template $_smarty_tpl) {
?>
<div ng-if="splitContentView" class="col-lg-7 col-md-7 col-sm-12 col-xs-12 rightEditContent">
    
        <ul tabset>
            <tab ng-repeat="relatedModule in relatedModules" select="selectedTab(relatedModule.name)" ng-if="relatedModule.value" heading={{relatedModule.name}} active="tab.active" disabled="tab.disabled">
                <tab-heading><strong translate="{{relatedModule.uiLabel}}">{{relatedModule.uiLabel}}</strong><tab-heading>
						</ul>
                    
                    <br>
                    <div class="tab-content">
                        <div ng-show="selection==='ModComments'">
                            <?php $_smarty_tpl->_subTemplateRender("file:Portal/partials/CommentContent.tpl", $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, false);
?>
                        </div>
                        <div ng-hide="selection!=='History'"> 
                            <?php $_smarty_tpl->_subTemplateRender("file:Portal/partials/UpdatesContent.tpl", $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, false);
?>
                        </div>
                        <div ng-hide="selection!=='ProjectTask'"> 
                            <?php $_smarty_tpl->_subTemplateRender("file:Project/partials/ProjectTaskContent.tpl", $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, false);
?>
                        </div>
                        <div ng-hide="selection!=='ProjectMilestone'"> 
                            <?php $_smarty_tpl->_subTemplateRender("file:Project/partials/ProjectMilestoneContent.tpl", $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, false);
?>
                        </div>
                        <div ng-hide="selection!=='Documents'"> 
                            <?php $_smarty_tpl->_subTemplateRender("file:Documents/partials/RelatedDocumentsContent.tpl", $_smarty_tpl->cache_id, $_smarty_tpl->compile_id, 0, $_smarty_tpl->cache_lifetime, array(), 0, false);
?>
                        </div>
                    </div>
                    </div>
<?php }
}
