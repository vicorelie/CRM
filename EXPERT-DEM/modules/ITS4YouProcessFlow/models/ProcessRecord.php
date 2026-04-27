<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouProcessFlow_ProcessRecord_Model extends Vtiger_Base_Model
{

    public $actionsList = array();
    public $AllActionsList = array();


    public static function getInstance()
    {
        $processRecordModel = new self();

        return $processRecordModel;
    }

    public function setAction($Action, $group = "All", $actionid = "")
    {
        if ($actionid != "") {
            $this->actionsList[$group][$actionid] = $Action;
        } else {
            $this->actionsList[$group][] = $Action;
        }
    }

    public function getActionsByGroup($group = "All")
    {
        $A = array();
        foreach ($this->actionsList[$group] AS $group => $Action) {
            $A[] = $Action;
        }
        return $A;
    }


    public function saveActions()
    {

        if (count($this->actionsList) > 0) {
            foreach ($this->actionsList AS $group => $Actions) {
                foreach ($Actions AS $Action) {
                    $this->AllActionsList[] = $Action;
                }
            }
        }
        $this->actionsList = array();
    }

    public function getAllActions()
    {
        return $this->AllActionsList;
    }
}
