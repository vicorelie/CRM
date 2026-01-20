<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

$memory_limit = substr(ini_get('memory_limit'), 0, -1);

if (256 > $memory_limit) {
    ini_set('memory_limit', '256M');
}

class ITS4YouSignature_SignDocument_Action extends Vtiger_BasicAjax_Action
{
    /**
     * @param Vtiger_Request $request
     * @throws Exception
     */
    public function process(Vtiger_Request $request)
    {
        $module = $request->getModule();
        $recordModel = ITS4YouSignature_Record_Model::getInstanceFromRequest($request);
        $signatureId = $recordModel->getId();
        $sourceRecord = $request->get('sourceRecord');
        $sourceModule = $request->get('sourceModule');

        if ($signatureId) {
            foreach ($request->getAll() as $key => $value) {
                $recordModel->set($key, $value);
            }

            $recipientModule = $request->get('recipientModule');

            if ('Contacts' === $recipientModule) {
                $recipientModel = ITS4YouSignature_Module_Model::getReferenceContactRecord($sourceRecord, $sourceModule);
            } elseif ('Accounts' === $recipientModule) {
                $recipientModel = ITS4YouSignature_Module_Model::getReferenceAccountRecord($sourceRecord, $sourceModule);
            } else {
                $contactModel = ITS4YouSignature_Module_Model::getReferenceContactRecord($sourceRecord, $sourceModule);
                $accountModel = ITS4YouSignature_Module_Model::getReferenceAccountRecord($sourceRecord, $sourceModule);

                $recipientModel = $contactModel ? $contactModel : $accountModel;
                $recipientModule = $contactModel ? 'Contacts' : 'Accounts';
            }

            $recordModel->setRelation($recipientModel, $recipientModule);
            $recordModel->saveTemplate();
            $recordModel->saveSentOn();
        }

        $response = new Vtiger_Response();
        $response->setResult([
            'message' => vtranslate('LBL_CREATE_SIGNATURE', $module),
            'success' => true,
            'url' => $recordModel->getSignatureUrl(),
        ]);
        $response->emit();
    }
}