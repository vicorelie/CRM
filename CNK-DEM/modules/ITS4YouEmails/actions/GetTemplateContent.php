<?php

/**
 * AJAX action to return EMAILMaker template content with variables substituted
 * Called after template selection in the compose email popup
 */
class ITS4YouEmails_GetTemplateContent_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        $currentUser = Users_Record_Model::getCurrentUserModel();
        if (!$currentUser || !$currentUser->getId()) {
            throw new AppException('Permission denied');
        }
    }

    public function process(Vtiger_Request $request) {
        $response = new Vtiger_Response();

        try {
            $templateId = $request->get('template_id');
            $sourceModule = $request->get('source_module');
            $recordId = $request->get('record_id');
            $language = Vtiger_Language_Handler::getLanguage();

            if (empty($templateId)) {
                throw new Exception('Template ID is required');
            }

            if (!empty($sourceModule) && !empty($recordId)) {
                $emailContentModel = EMAILMaker_EMAILContent_Model::getInstanceById(
                    $templateId, $language, $sourceModule, $recordId
                );
                $emailContentModel->getContent(false);

                $response->setResult([
                    'success' => true,
                    'subject' => $emailContentModel->getSubject(),
                    'body' => $emailContentModel->getBody()
                ]);
            } else {
                $response->setResult([
                    'success' => false,
                    'error' => 'Source module and record ID are required for substitution'
                ]);
            }

        } catch (Exception $e) {
            $response->setResult([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }

        $response->emit();
    }
}
