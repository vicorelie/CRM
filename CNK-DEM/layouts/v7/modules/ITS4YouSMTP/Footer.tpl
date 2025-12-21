{*<!--
/* * *******************************************************************************
* The content of this file is subject to the ITS4YouSMTP license.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
* ****************************************************************************** */
-->*}

{strip}
    <br>
    <div class="small" style="color: rgb(153, 153, 153);text-align: center;">{vtranslate('ITS4YouSMTP','ITS4YouSMTP')} {ITS4YouSMTP_Version_Helper::$version} {vtranslate('COPYRIGHT','ITS4YouSMTP')}</div>
    {include file="Footer.tpl"|@vtemplate_path:'Vtiger'}
{/strip}