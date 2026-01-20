<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouSignature_DetailView_Model extends Vtiger_DetailView_Model
{
    public function getDetailViewLinks($linkParams)
    {
        $linkModelList = parent::getDetailViewLinks($linkParams);
        /** @var ITS4YouSignature_Record_Model $recordModel */
        $recordModel = $this->getRecord();
        $detailViewLink = array(
            'linktype' => 'DETAILVIEW',
            'linklabel' => 'Completed' === strval($recordModel->get('status')) ? 'LBL_VIEW_DOCUMENT' : 'LBL_SIGN_DOCUMENT',
            'linkurl' => $recordModel->getSignatureUrl(),
            'linkicon' => ''
        );

        $linkModelList['DETAILVIEW'][] = Vtiger_Link_Model::getInstanceFromValues($detailViewLink);

        return $linkModelList;
    }

}