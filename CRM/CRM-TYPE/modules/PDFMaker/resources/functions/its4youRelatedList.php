<?php
/* * *******************************************************************************
 * The content of this file is subject to the PDF Maker license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

if (!function_exists('its4you_RelatedList')) {
    function its4you_RelatedList($recordId, $relateModuleName, $relatedFieldNames)
    {
        $recordId = (int)$recordId;
        $recordModule = getSalesEntityType($recordId);

        if (empty($recordId) || empty($recordModule) || !isRecordExists($recordId)) {
            return '! Record not exists !';
        }

        if(!vtlib_isModuleActive($recordModule) || !vtlib_isModuleActive($relateModuleName)) {
            return '! Module inactive: ' . $recordModule . ' or ' . $relateModuleName . ' !';
        }

        $recordModel = Vtiger_Record_Model::getInstanceById($recordId, $recordModule);

        if (!$recordModel) {
            return '! Record model not exists !';
        }

        $pagination = new Vtiger_Paging_Model();
        $pagination->set('page', 1);
        $pagination->set('limit', 100);
        $fields = explode(',', $relatedFieldNames);

        /** @var Vtiger_RelationListView_Model $relatedList */
        $relatedList = Vtiger_RelationListView_Model::getInstance($recordModel, $relateModuleName);

        if(!$relatedList->getRelationModel()) {
            return '! Related list view not exists !';
        }

        $cleanInstance = Vtiger_Record_Model::getCleanInstance($relateModuleName);

        if (!$cleanInstance) {
            return '! Related module clean instance not exists !';
        }

        $entries = array_merge([$cleanInstance], array_values($relatedList->getEntries($pagination)));
        $table = [];
        $row = 0;

        function getRecord($recordId)
        {
            global $its4you_RelatedList_records;

            if (!isset($its4you_RelatedList_records[$recordId])) {
                $its4you_RelatedList_records[$recordId] = Vtiger_Record_Model::getInstanceById($recordId);
            }

            return $its4you_RelatedList_records[$recordId];
        }

        foreach ($entries as $entry) {
            $row++;
            $entryData = $entry->getData();
            $entryId = (int)$entryData['id'];

            foreach ($fields as $field) {
                if (1 === $row) {
                    $fieldModel = $entry->getField($field);
                    $table[$row][$field] = $fieldModel ? vtranslate($fieldModel->get('label'), $relateModuleName) : 'field not exists';
                } elseif (array_key_exists($field, $entryData)) {
                    $table[$row][$field] = strip_tags($entry->getDisplayValue($field));
                } else {
                    $record = getRecord($entryId);
                    $table[$row][$field] = $record ? strip_tags((string)$record->getDisplayValue($field)) : 'record not exists';
                }
            }
        }

        $tableHtml = '<table class="rl_table_'.$recordId.'" border="1">';

        foreach ($table as $tableRowId => $tableRow) {
            $tableHtml .= '<tr class="rl_tr_'.$tableRowId.'">';

            foreach ($tableRow as $key => $value) {
                if(1 === $tableRowId) {
                    $tableHtml .= '<th class="rl_th_'.$key.'">' . $value . '</th>';
                } else {
                    $tableHtml .= '<td class="rl_td_'.$key.'">' . $value . '</td>';
                }
            }

            $tableHtml .= '</tr>';
        }

        $tableHtml .= '</table>';

        return $tableHtml;
    }
}