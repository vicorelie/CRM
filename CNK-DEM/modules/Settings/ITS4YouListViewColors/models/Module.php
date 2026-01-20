<?php
/* * *******************************************************************************
 * The content of this file is subject to the ListView Colors 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouListViewColors_Module_Model extends Settings_Vtiger_Module_Model
{
    public $baseTable = 'its4you_lvc';
    public $baseIndex = 'lvcid';
    public $listFields = array(
        'record_colors' => 'Record colors',
        'color' => 'Color',
        'name' => 'Name',
        'description' => 'LBL_DESCRIPTION',
        'field_name' => 'Field Name',
        'record_status' => 'Coloring mode',
        'coloring_type' => 'LBL_TYPE'
    );
    public $name = 'ITS4YouListViewColors';

    public static function getInstance()
    {
        return new self();
    }

    /**
     * Function to get the url for default view of the module
     * @return <string> - url
     */
    public static function getDefaultUrl()
    {
        return 'index.php?module=ITS4YouListViewColors&parent=Settings&view=List';
    }

    /**
     * Function to get List view url
     * @return <String> Url
     */
    public function getListViewUrl()
    {
        return "index.php?module=ITS4YouListViewColors&parent=Settings&view=List";
    }

    /**
     * Function to get the url for create view of the module
     * @return <string> - url
     */
    public static function getCreateViewUrl()
    {
        return "javascript:Settings_ITS4YouListViewColors_List_Js.triggerCreate('index.php?module=ITS4YouListViewColors&parent=Settings&view=Edit')";
    }

    /**
     * Function to get Create view url
     * @return <String> Url
     */
    public static function getCreateRecordUrl()
    {
        return 'index.php?module=ITS4YouListViewColors&parent=Settings&view=Edit';
    }

    /**
     * Function to get Settings links
     * @return <Array>
     */
    public function getSettingLinks()
    {
        return Vtiger_Module_Model::getInstance('ITS4YouListViewColors')->getSettingLinks();
    }


    public function getListFields()
    {
        if (!$this->listFieldModels) {
            $fields = $this->listFields;
            $fieldObjects = array();
            foreach ($fields as $fieldName => $fieldLabel) {
                if ($fieldName == 'module_name') {
                    $fieldObjects[$fieldName] = new Vtiger_Base_Model(array('name' => $fieldName, 'label' => $fieldLabel, 'sort' => false));
                } else {
                    $fieldObjects[$fieldName] = new Vtiger_Base_Model(array('name' => $fieldName, 'label' => $fieldLabel));
                }
            }
            $this->listFieldModels = $fieldObjects;
        }
        return $this->listFieldModels;
    }

    public function getFields()
    {
        return array();
    }

    public function getModuleBasicLinks()
    {
        return array();
    }

    public static function getActionsLinks(Vtiger_Request $request)
    {
        $links = array();
        $moduleModels = Vtiger_Module_Model::getAll(array(0, 2));

        foreach ($moduleModels as $tabId => $moduleModel) {
            if (method_exists($moduleModel, 'getProcessFlowActions')) {
                $recordLinks = $moduleModel->getProcessFlowActions($request);
                foreach ($recordLinks as $recordLink) {
                    $links[] = Vtiger_Link_Model::getInstanceFromValues($recordLink);
                }
            }
        }

        return $links;
    }

    /**
     * @return array
     */
    public function getColorTypes()
    {
        return array(
            'background' => vtranslate('Background', $this->name),
            'text' => vtranslate('Text', $this->name),
        );
    }

    public function getFieldColoring()
    {
        return array(
            '' => vtranslate('field_label_value', $this->name),
            'field_label' => vtranslate('field_label', $this->name),
            'field_value' => vtranslate('field_value', $this->name),
        );
    }

    public function getEntityModulesFields()
    {
        $entityModules = Vtiger_Module_Model::getEntityModules();
        $fields = array();

        foreach ($entityModules as $entityModule) {
            foreach ($entityModule->getFields() as $field) {
                $fields[$entityModule->getName()][$field->getName()] = $field;
            }
        }

        return $fields;
    }

    /**
     * @var array
     */
    public $requestValueNames = array(
        'parentid',
        'parentmodule',
        'parenttype',
        'returnpage',
        'returnsourcemodule',
        'returnsearch_value',
    );

    public function generateUrlFromRequest($request)
    {
        if(!$request) {
            return '';
        }

        $extendUrl = '';

        foreach ($this->requestValueNames as $name) {
            if ($request->has($name)) {
                $extendUrl .= sprintf('&%s=%s', $name, $request->get($name));
            }
        }

        return $extendUrl;
    }

    public function getEditUrlForRecord($request = false)
    {
        return 'index.php?module=ITS4YouListViewColors&parent=Settings&view=Edit&mode=Record' . $this->generateUrlFromRequest($request);
    }

    public function getEditUrlForList($request = false)
    {
        return 'index.php?module=ITS4YouListViewColors&parent=Settings&view=Edit&mode=List' . $this->generateUrlFromRequest($request);
    }
}
