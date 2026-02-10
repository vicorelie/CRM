<?php
/* * *******************************************************************************
 * The content of this file is subject to the EMAIL Maker license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class EMAILMaker_FieldNames_View extends Vtiger_IndexAjax_View
{
    public function process(Vtiger_Request $request)
    {
        $modules = Vtiger_Module_Model::getEntityModules();

        foreach ($modules as $module) {
            echo '<div style="width: 300px; display: inline-block; vertical-align: top;">';
            echo '<h1>' . $module->getName() . '</h1>';
            $fields = $module->getFields();

            foreach ($fields as $field) {
                echo sprintf('<p><b>%s</b>: %s</p>', $field->get('label'), $field->getName());
            }

            echo '</div>';
        }
    }
}