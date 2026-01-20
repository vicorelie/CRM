<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouSignature_Sign_View extends Vtiger_Edit_View
{
    /**
     * @var ITS4YouSignature_Record_Model
     */
    public $recordModel;
    public $recordModule = 'ITS4YouSignature';
    public $recordId;

    /**
     * @throws AppException
     */
    public function validate()
    {
        if(!class_exists('PDFMaker_Signatures_Model')) {
            throw new AppException(vtranslate('LBL_UPDATE_PDF_MAKER', $this->recordModule));
        }

        $this->validateRequestParams();
        $this->retrieveRecordModel();
        $this->validateSourceRecord();
        $this->validateAcceptance();
    }

    public function validateAcceptance()
    {
        if (empty($_REQUEST['v']) || empty($_SERVER['HTTP_REFERER']) || empty($_SESSION['authenticated_user_id'])) {
            return;
        }

        if (intval($_SESSION['authenticated_user_id']) !== $this->recordModel->getAcceptanceUserId()) {
            header('location:' . $this->recordModel->getSignatureUrl());
        }
    }

    /**
     * @throws Exception
     */
    public function validateSourceRecord()
    {
        $sourceRecord = $this->recordModel->get('source_record');

        if (empty($sourceRecord) || !isRecordExists($sourceRecord)) {
            throw new AppException(vtranslate('LBL_SOURCE_RECORD_DELETED', 'ITS4YouSignature'));
        }
    }

    public function validateRequestParams()
    {
        $site_URL = ITS4YouSignature_Module_Model::getSiteUrl();

        if (empty($_REQUEST['s']) || empty($_REQUEST['u']) || $_REQUEST['u'] !== md5($site_URL)) {
            throw new AppException(vtranslate('LBL_SIGNATURE_MISSING_PARAMS', $this->recordModule));
        }
    }

    public function validateModule()
    {
        if (!vtlib_isModuleActive($this->recordModule)) {
            throw new AppException(vtranslate('LBL_SIGNATURE_MODULE_INACTIVE', $this->recordModule));
        }
    }

    public function validateRecord()
    {
        if (empty($this->recordId) || !isRecordExists($this->recordId)) {
            throw new AppException(vtranslate('LBL_SIGNATURE_DELETED', $this->recordModule));
        }
    }

    public function validateRecordModule()
    {
        if ($this->recordModule !== $this->recordModel->getModuleName()) {
            throw new AppException(vtranslate('LBL_SIGNATURE_EXPECTED', $this->recordModule));
        }
    }

    /**
     * @throws AppException
     */
    public function retrieveRecordModel()
    {
        $this->validateModule();

        $this->recordId = intval(base64_decode($_REQUEST['s']));
        $this->validateRecord();

        $this->recordModel = Vtiger_Record_Model::getInstanceById($this->recordId);
        $this->validateRecordModule();
    }

    public static function showDocumentSign()
    {
        try {
            if (!session_id()) {
                session_start();
            }

            global $current_user, $log;

            $current_user = Users::getActiveAdminUser();

            $signView = new self();
            $signView->validate();

            $request = new Vtiger_Request($_REQUEST, $_REQUEST);
            $request->set('module', $signView->recordModule);
            $request->set('record', $signView->recordId);
            $request->set('view', 'Sign');

            $signView->process($request);
        } catch (Exception $e) {
            echo '<p>' . $e->getMessage() . '</p>';
        }
    }

    /**
     * @param Vtiger_Request $request
     * @throws Exception
     */
    public function process(Vtiger_Request $request)
    {
        $mode = $request->getMode();

        if(!empty($mode)) {
            $this->$mode($request);
            return;
        }

        $this->showPreview($request);
    }

    /**
     * @param Vtiger_Request $request
     * @throws AppException
     */
    public function showSigned(Vtiger_Request $request)
    {
        if ($request->isEmpty('image')) {
            throw new AppException(vtranslate('LBL_EMPTY_SIGNATURE', $request->getModule()));
        }

        /** @var $recordModel ITS4YouSignature_Record_Model */
        $recordModel = Vtiger_Record_Model::getInstanceById($request->get('record'));
        $recordModel->saveSignatureImage($request->get('image'));
        $recordModel->saveSignatureDate();

        if (!headers_sent($fileName, $lineNum)) {
            header('location:' . $recordModel->getSignatureUrl());
        } else {
            echo sprintf('<a href="%s" title="Headers Already Sent. File: %s, Line: %s">%s</a>',
                $recordModel->getSignatureUrl(), $fileName, $lineNum, vtranslate('LBL_MANUAL_REDIRECT', 'ITS4YouSignature')
            );
        }
    }

    /**
     * @param Vtiger_Request $request
     * @throws Exception
     */
    public function showPreviewPDF(Vtiger_Request $request)
    {
        if (vtlib_isModuleActive('PDFMaker')) {
            $_REQUEST = [
                'module' => 'PDFMaker',
                'action' => 'IndexAjax',
                'mode' => 'getPreviewContent',
                'source_module' => $this->recordModel->get('source_module'),
                'pdftemplateid' => $this->recordModel->get('template'),
                'language' => $this->recordModel->get('language'),
                'forview' => 'Detail',
                'record' => $this->recordModel->get('source_record'),
            ];

            vglobal(ITS4YouSignature_Record_Model::CONFIRM_VARIABLE, 2);

            $this->recordModel->retrieveDefaultSign();
            $this->recordModel->assignPreContent($_REQUEST);

            (new PDFMaker_IndexAjax_Action())->getPreviewContent(new Vtiger_Request($_REQUEST, $_REQUEST));
        }
    }

    /**
     * @param Vtiger_Request $request
     * @throws Exception
     */
    public function sendEmail(Vtiger_Request $request)
    {
        /** @var $recordModel ITS4YouSignature_Record_Model */
        $recordModel = $this->recordModel;

        if ($recordModel) {
            $recordModel->sendSignedEmail();
        }

        $response = new Vtiger_Response();
        $response->setResult(['success' => true]);
        $response->emit();
    }

    /**
     * @param Vtiger_Request $request
     * @throws Exception
     */
    public function saveSignature(Vtiger_Request $request)
    {
        /** @var $recordModel ITS4YouSignature_Record_Model */
        $recordModel = $this->recordModel;

        if ($recordModel) {
            $user = $recordModel->getUser();

            if ($user) {
                if ($recordModel->isTypeAcceptance() && !$recordModel->isAcceptanceUser($request)) {
                    $recordModel->setStatus('Waiting for acceptance');

                    if ('Yes' === $request->get('sendEmail')) {
                        $recordModel->sendAcceptEmail();
                    }
                } else {
                    $recordModel->setStatus('Signed');
                    $recordModel->generatePDF();

                    if ('Yes' === $request->get('sendEmail')) {
                        $recordModel->sendSignedEmail();
                    }
                }
            }
        }

        $response = new Vtiger_Response();
        $response->setResult(['success' => true]);
        $response->emit();
    }

    public function deleteSignature(Vtiger_Request $request)
    {
        /** @var $recordModel ITS4YouSignature_Record_Model */
        $recordModel = $this->recordModel;

        if ($recordModel) {
            $recordModel->setStatus('Waiting for Others');
            $recordModel->deleteSignatures();
            $recordModel->deleteDocuments();
        }

        $response = new Vtiger_Response();
        $response->setResult(['success' => true]);
        $response->emit();
    }


    /**
     * @param Vtiger_Request $request
     */
    public function showModal(Vtiger_Request $request)
    {
        $module = $request->getModule();
        $recordId = $request->get('record');
        $recordModel = Vtiger_Record_Model::getInstanceById($recordId);
        $siteUrl = vglobal('site_URL');

        $viewer = $this->getViewer($request);
        $viewer->assign('REQUEST', $request);
        $viewer->assign('MODULE', $module);
        $viewer->assign('RECORD_ID', $recordId);
        $viewer->assign('RECORD_MODEL', $recordModel);
        $viewer->assign('SITE_URL', $siteUrl);
        $viewer->view('SignatureModal.tpl', $module);
    }

    /**
     * @param Vtiger_Request $request
     */
    public function showPreview(Vtiger_Request $request)
    {
        $module = $request->getModule();
        $viewer = $this->getViewer($request);
        $recordStructure = Vtiger_RecordStructure_Model::getInstanceFromRecordModel($this->recordModel, Vtiger_RecordStructure_Model::RECORD_STRUCTURE_MODE_SUMMARY);
        $viewer->assign('SUMMARY_RECORD_STRUCTURE', $recordStructure->getStructure());
        $viewer->assign('SKIN_PATH', Vtiger_Theme::getCurrentUserThemePath());
        $viewer->assign('LANGUAGE_STRINGS', $this->getJSLanguageStrings($request));
        $viewer->assign('SCRIPTS', $this->getHeaderScripts($request));
        $viewer->assign('STYLES', $this->getHeaderCss($request));
        $viewer->assign('REQUEST', $request);
        $viewer->assign('MODULE', $module);
        $viewer->assign('RECORD_ID', $request->get('record'));
        $viewer->assign('RECORD_MODEL', $this->recordModel);
        $viewer->assign('ATTACHMENTS', $this->recordModel->getAttachments());
        $viewer->assign('SITE_URL', vglobal('site_URL'));
        $viewer->assign('USER', $this->recordModel->getUser());
        $viewer->assign('RELATED_CONTACT_NAME', $this->recordModel->getRelatedName());

        $viewer->view('SignaturePage.tpl', $module);
    }

    /**
     * @param Vtiger_Request $request
     */
    public function showSignedPDF(Vtiger_Request $request)
    {
        foreach ($this->recordModel->getAttachments() as $attachment) {
            $filename = $file = $attachment['file'];

            if (is_file($file)) {
                header('Content-type: application/pdf');
                header('Content-Disposition: inline; filename="' . $filename . '"');
                header('Content-Transfer-Encoding: binary');
                header('Content-Length: ' . filesize($file));
                header('Accept-Ranges: bytes');
                @readfile($file);
                break;
            }
        }
    }

    /**
     * @param Vtiger_Request $request
     * @return array
     */
    public function getHeaderScripts(Vtiger_Request $request)
    {
        global $root_directory;

        $layout = Vtiger_Viewer::getDefaultLayoutName();
        $module = $request->getModule();
        $jsFileNames = [
            is_file(rtrim($root_directory, '/') . '/modules/ITS4YouLibrary/jquery/jquery-3.6.1.min.js') ? '~modules/ITS4YouLibrary/jquery/jquery-3.6.1.min.js' : '~layouts/' . $layout . '/lib/jquery/jquery.min.js',
            '~layouts/'.$layout.'/lib/jquery/jquery.class.min.js',
            '~layouts/'.$layout.'/modules/Vtiger/resources/Utils.js',
            '~layouts/'.$layout.'/lib/jquery/select2/select2.min.js',
            '~layouts/'.$layout.'/resources/helper.js',
            '~layouts/'.$layout.'/resources/application.js',
            '~layouts/'.$layout.'/lib/todc/js/bootstrap.min.js',
            '~layouts/'.$layout.'/lib/bootbox/bootbox.js',
            '~layouts/'.$layout.'/lib/bootstrap-notify/bootstrap-notify.min.js',
            '~resources/jquery.additions.js',
            '~modules/' . $module . '/resources/signature-pad/assets/flashcanvas.js',
            '~modules/' . $module . '/resources/signature-pad/assets/html2canvas.min.js',
            '~modules/' . $module . '/resources/signature-pad/assets/json2.min.js',
            '~modules/' . $module . '/resources/signature-pad/jquery.signaturepad.js',
            'modules.' . $module . '.resources.Sign',
        ];

        return $this->checkAndConvertJsScripts($jsFileNames);
    }

    /**
     * @param Vtiger_Request $request
     * @return array
     */
    public function getHeaderCss(Vtiger_Request $request)
    {
        $module = $request->getModule();
        $layout = Vtiger_Viewer::getDefaultLayoutName();
        $cssFileNames = [
            '~layouts/v7/lib/font-awesome/css/font-awesome.min.css',
            '~modules/' . $module . '/resources/signature-pad/assets/jquery.signaturepad.css',
            '~layouts/v7/lib/todc/css/bootstrap.min.css',
            '~layouts/v7/skins/marketing/style.css',
            '~layouts/' . $layout . '/modules/' . $module . '/resources/Sign.css',
        ];

        return $this->checkAndConvertCssStyles($cssFileNames);
    }
}