<?php

/**
 * Action pour prévisualiser le contenu d'un template EMAILMaker
 */
class Potentials_PreviewEmailTemplate_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        $currentUser = Users_Record_Model::getCurrentUserModel();
        if (!$currentUser || !$currentUser->getId()) {
            throw new AppException('Permission denied');
        }
    }

    public function process(Vtiger_Request $request) {
        $response = new Vtiger_Response();

        try {
            $recordId = $request->get('record');
            $emailTemplateId = $request->get('email_template');
            $quoteId = $request->get('quote_id');
            $salesOrderId = $request->get('salesorder_id');

            if (empty($recordId) || empty($emailTemplateId)) {
                throw new Exception('Paramètres manquants');
            }

            $invoiceId = $request->get('invoice_id');
            $targetModule = 'Potentials';
            $targetRecordId = $recordId;
            if (!empty($invoiceId)) {
                $targetModule = 'Invoice';
                $targetRecordId = $invoiceId;
            } elseif (!empty($salesOrderId)) {
                $targetModule = 'SalesOrder';
                $targetRecordId = $salesOrderId;
            } elseif (!empty($quoteId)) {
                $targetModule = 'Quotes';
                $targetRecordId = $quoteId;
            }

            $language = Vtiger_Language_Handler::getLanguage();

            // Récupérer le contact lié
            $potentialModel = Vtiger_Record_Model::getInstanceById($recordId, 'Potentials');
            $contactId = $potentialModel->get('contact_id');
            $recipientId = !empty($contactId) ? $contactId : '';
            $recipientModule = !empty($contactId) ? 'Contacts' : '';

            $emailContentModel = EMAILMaker_EMAILContent_Model::getInstanceById(
                $emailTemplateId,
                $language,
                $targetModule,
                $targetRecordId,
                $recipientId,
                $recipientModule
            );
            $emailContentModel->getContent(true, true, true);

            $subject = $emailContentModel->getSubject();
            $body = $emailContentModel->getBody();

            $response->setResult([
                'success' => true,
                'subject' => $subject,
                'body' => $body
            ]);

        } catch (Exception $e) {
            $response->setResult([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }

        $response->emit();
    }
}
