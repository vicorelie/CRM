{strip}
    <div class="col-sm-11 col-xs-10 padding0 module-action-bar clearfix coloredBorderTop">
        <div class="module-action-content clearfix {$MODULE}-module-action-content">
            <div class="col-lg-7 col-md-6 col-sm-5 col-xs-11 padding0 module-breadcrumb module-breadcrumb-{$smarty.request.view} transitionsAllHalfSecond">
                {assign var=MODULE_MODEL value=Vtiger_Module_Model::getInstance($MODULE)}
                <a title="{vtranslate($MODULE, $MODULE)}" href='{$MODULE_MODEL->getDefaultUrl()}&app={$SELECTED_MENU_CATEGORY}'><h4 class="module-title pull-left text-uppercase"> {vtranslate($MODULE, $MODULE)} </h4>&nbsp;&nbsp;</a>
            </div>
            <div class="col-lg-5 col-md-6 col-sm-7 col-xs-1 padding0 pull-right">
                <div id="appnav" class="navbar-right">
                    <nav class="navbar navbar-inverse border0 margin0">
                        <div class="container-fluid">
                            <div class="navbar-header bg-white marginTop5px">
                                <button type="button" class="navbar-toggle collapsed margin0" data-toggle="collapse" data-target="#appnavcontent" aria-expanded="false">
                                    <i class="fa fa-ellipsis-v"></i>
                                </button>
                            </div>
                            <div class="navbar-collapse collapse" id="appnavcontent" aria-expanded="false" style="height: 1px;">
                                <ul class="nav navbar-nav">
                                    <li>
                                        <button type="button" class="btn addButton btn-default module-buttons" onclick='window.location.href = "{$MODULE_MODEL->getCreateRecordUrl()}&app={$SELECTED_MENU_CATEGORY}"'>
                                            <div class="fa fa-plus" aria-hidden="true"></div>&nbsp;&nbsp;
                                            {vtranslate('LBL_ADD_RECORD', $MODULE)}
                                        </button>
                                    </li>
                                    {if $MODULE_SETTING_ACTIONS|@count gt 0}
                                        <li>
                                            <div class="settingsIcon">
                                                <button type="button" class="btn btn-default module-buttons dropdown-toggle" data-toggle="dropdown" aria-expanded="false" title="{vtranslate('LBL_SETTINGS', $MODULE)}">
                                                    <span class="fa fa-wrench" aria-hidden="true"></span>&nbsp;{vtranslate('LBL_CUSTOMIZE', 'Reports')}&nbsp; <span class="caret"></span>
                                                </button>
                                                <ul class="detailViewSetting dropdown-menu">
                                                    {foreach item=SETTING from=$MODULE_SETTING_ACTIONS}
                                                        <li id="{$MODULE_NAME}_listview_advancedAction_{$SETTING->getLabel()}"><a href={$SETTING->getUrl()}>{vtranslate($SETTING->getLabel(), $MODULE_NAME ,vtranslate($MODULE_NAME, $MODULE_NAME))}</a></li>
                                                    {/foreach}
                                                </ul>
                                            </div>
                                        </li>
                                    {/if}
                                </ul>

                            </div><!-- /.navbar-collapse -->
                        </div><!-- /.container-fluid -->
                    </nav>
                </div>
            </div>
        </div>
        {if $FIELDS_INFO neq null}
            <script type="text/javascript">
                var uimeta = (function () {
                    var fieldInfo = {$FIELDS_INFO};
                    return {
                        field: {
                            get: function (name, property) {
                                if (name && property === undefined) {
                                    return fieldInfo[name];
                                }
                                if (name && property) {
                                    return fieldInfo[name][property]
                                }
                            },
                            isMandatory: function (name) {
                                if (fieldInfo[name]) {
                                    return fieldInfo[name].mandatory;
                                }
                                return false;
                            },
                            getType: function (name) {
                                if (fieldInfo[name]) {
                                    return fieldInfo[name].type
                                }
                                return false;
                            }
                        },
                    };
                })();
            </script>
        {/if}
    </div>
{/strip}
