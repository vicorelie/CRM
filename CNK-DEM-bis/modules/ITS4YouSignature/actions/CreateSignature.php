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

class ITS4YouSignature_CreateSignature_Action extends Vtiger_BasicAjax_Action
{
    /**
     * @param Vtiger_Request $request
     * @throws Exception
     */
    public function process(Vtiger_Request $request)
    {
        $module = $request->getModule();
        $success = false;
        $message = 'LBL_CREATE_SIGNATURE';
        $recordModel = ITS4YouSignature_Record_Model::getInstanceFromRequest($request);
        $signatureId = $recordModel->getId();

        if ($signatureId) {
            /** Required include before PDFMaker on multiple simple_html_dom*/
            include_once 'modules/Emails/models/Mailer.php';

            if (!$request->isEmpty('recipientId')) {
                $recordModel->setRelation($request->get('recipientId'), getSalesEntityType($request->get('recipientId')));
            }

            foreach ($request->getAll() as $key => $value) {
                $recordModel->set($key, $value);
            }
            if ($recordModel->saveTemplate()) {
                $email = $recordModel->sendSignEmail();

                if ($email) {
                    $recordModel->saveSentOn();

                    if (strlen($email) > 1) {
                        $message = $email;
                    } else {
                        $message = 'LBL_EMAIL_SEND';
                        $success = true;
                    }
                }
            }
        }

        $response = new Vtiger_Response();
        $response->setResult(['message' => vtranslate($message, $module), 'success' => $success]);
        $response->emit();
    }
}