<?php
/* * *******************************************************************************
* The content of this file is subject to the ITS4YouSignature license.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
* ****************************************************************************** */

class Settings_ITS4YouSignature_Record_Model extends Settings_Vtiger_Record_Model
{
    /**
     * @param string $module
     * @return self
     */
    public static function getInstance($module = 'ITS4YouSignature')
    {
        $instance = new self();

        if ($instance->isEmpty('signed_email_subject')) {
            $instance->set('signed_email_subject', 'Document Signed');
        }

        if ($instance->isEmpty('email_subject')) {
            $instance->set('email_subject', 'Review and Sign Document');
        }

        if ($instance->isEmpty('accept_email_subject')) {
            $instance->set('accept_email_subject', 'Review and Accept Document');
        }

        return $instance;
    }

    /**
     * @param array $values
     * @throws Exception
     */
    public function __construct($values = array())
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery('SELECT * FROM its4you_signature_settings');
        $data = (array)$adb->query_result_rowdata($result);

        foreach ($data as $key => $value) {
            $values[$key] = decode_html($value);
        }

        parent::__construct($values);
    }

    public function save()
    {
        $adb = PearDatabase::getInstance();
        $params = $this->getParams();

        if ($this->isRecordExists()) {
            $sql = 'UPDATE its4you_signature_settings SET ' . implode('=?,', array_keys($params)) . '=? ';
        } else {
            $sql = 'INSERT INTO its4you_signature_settings (' . implode(',', array_keys($params)) . ') VALUES (' . generateQuestionMarks($params) . ')';
        }

        $adb->pquery($sql, $params);
    }

    /**
     * @return array
     */
    public function getParams()
    {
        $params = [];

        foreach ($this->getFieldNames() as $fieldName) {
            $params[$fieldName] = $this->get($fieldName);
        }

        return $params;
    }

    /**
     * @return bool
     */
    public function isRecordExists()
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery('SELECT * FROM its4you_signature_settings');

        return (bool)$adb->num_rows($result);
    }

    /**
     * @return string
     */
    public function getEditURL() {
        return 'index.php?module=ITS4YouSignature&view=Edit&parent=Settings';
    }

    /**
     * @param string $name
     * @return string
     */
    public function getDecoded($name)
    {
        return decode_html($this->get($name));
    }

    /**
     * @return int
     */
    public function getId()
    {
        return 1;
    }

    /**
     * @return string
     */
    public function getName()
    {
        return 'ITS4YouSignature';
    }

    public function getFieldNames()
    {
        return [
            'email_subject',
            'email_message',
            'signed_email_subject',
            'signed_email_message',
            'accept_email_subject',
            'accept_email_message',
        ];
    }

    /**
     * @param string $name
     * @return bool
     */
    public function isRequired($name)
    {
        return in_array($name, ['email_subject', 'signed_email_subject', 'accept_email_subject']);
    }
}