<?php

class EMAILMaker_Utils_Helper
{
    public static function count($value)
    {
        return !empty($value) && is_array($value) ? count($value) : 0;
    }

    /**
     * @param array $templates
     * @param int $defaultType 1=detail view 2=list view
     * @return array|int|string
     */
    public static function getDefaultTemplateIds($templates, $defaultType)
    {
        $ids = array();

        if (!empty($templates)) {
            foreach ($templates as $templateId => $template) {
                if(!empty($template['is_default_single_template'])) {
                    continue;
                }

                $default = (int)$template['is_default'];

                if ($default === $defaultType || 3 === $default) {
                    $ids[] = $templateId;
                }
            }
        }

        return $ids;
    }

    /**
     * @param string $sourceModule
     * @return array
     */
    public static function getPDFTemplates($sourceModule)
    {
        /** @var PDFMaker_Module_Model $moduleModel */
        $moduleModel = Vtiger_Module_Model::getInstance('PDFMaker');

        return $moduleModel->GetAvailableTemplates($sourceModule);
    }
}