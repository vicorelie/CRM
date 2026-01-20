<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouSignature_Sign_Action extends Vtiger_Action_Controller
{
    /**
     * @var ITS4YouSignature_Record_Model
     */
    public $recordModel;

    /**
     * @param Vtiger_Request $request
     * @throws MpdfException
     */
    public function process(Vtiger_Request $request)
    {
        $qualifiedModule = $request->getModule(false);
        $attachments = $this->recordModel->getAttachments();

        if (!class_exists('simple_html_dom')) {
            require_once 'include/simplehtmldom/simple_html_dom.php';
        }

        if (!class_exists('mPDF')) {
            require_once 'modules/PDFMaker/resources/mpdf/mpdf.php';
        }

        foreach ($attachments as $attachment) {
            $fileIn = $attachment['file'];
            $fileOut = str_replace('.pdf', '_SIGNED.pdf', $fileIn);
            $mPDF = new ITS4YouSignature_PDF_Model('');
            $mPDF->enableImports = true;
            $mPDF->percentSubset = 0;
            $search = [
                '$PDF_SIGNATURE$',
            ];
            $replacement = [
                '<img src="' . $request->get('image') . '" alt="">',
            ];
            $mPDF->OverWriteHtml($fileIn, $search, $replacement, $fileOut);
        }

        $response = new Vtiger_Response();
        $response->setResult(['success' => true, 'message' => vtranslate('LBL_PDF_UPDATE', $qualifiedModule)]);
        $response->emit();

    }
}