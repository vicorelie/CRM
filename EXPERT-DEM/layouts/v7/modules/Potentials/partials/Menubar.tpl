{if $MENU_STRUCTURE}
{assign var="topMenus" value=$MENU_STRUCTURE->getTop()}
{assign var="moreMenus" value=$MENU_STRUCTURE->getMore()}

<div id="modules-menu" class="modules-menu">
	{foreach key=moduleName item=moduleModel from=$SELECTED_CATEGORY_MENU_LIST}
		{assign var='translatedModuleLabel' value=vtranslate($moduleModel->get('label'),$moduleName )}
		<ul title="{$translatedModuleLabel}" class="module-qtip">
			<li {if $MODULE eq $moduleName && $VIEW neq 'Statistiques'}class="active"{else}class=""{/if}>
				<a href="{$moduleModel->getDefaultUrl()}&app={$SELECTED_MENU_CATEGORY}">
					{$moduleModel->getModuleIcon()}
					<span>{$translatedModuleLabel}</span>
				</a>
			</li>
		</ul>
	{/foreach}
	<ul title="Statistiques" class="module-qtip">
		<li {if $VIEW eq 'Statistiques'}class="active"{else}class=""{/if}>
			<a href="index.php?module=Potentials&view=Statistiques&app={$SELECTED_MENU_CATEGORY}">
				<i class="fa fa-bar-chart" style="font-size:24px;"></i>
				<span>Statistiques</span>
			</a>
		</li>
	</ul>
</div>
{/if}
