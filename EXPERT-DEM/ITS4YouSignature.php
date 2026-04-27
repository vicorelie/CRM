<?php
/* * *******************************************************************************
* The content of this file is subject to the ITS4YouSignature license.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
* ****************************************************************************** */

if (is_file('vendor/autoload.php')) {
	include_once 'vendor/autoload.php';
}

include_once 'config.php';
require_once 'includes/runtime/Cache.php';
include_once 'include/Webservices/Relation.php';
include_once 'vtlib/Vtiger/Module.php';
include_once 'includes/main/WebUI.php';

ITS4YouSignature_Sign_View::showDocumentSign();