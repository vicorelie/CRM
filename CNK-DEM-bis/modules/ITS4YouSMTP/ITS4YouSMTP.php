<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSMTP license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouSMTP
{
    public $db;
    public $log;
    public $moduleName = 'ITS4YouSMTP';
    public $parentName = 'Tools';
    public $table_name = 'its4you_smtp';
    public $table_index = 'id';
    public $tab_name = ['its4you_smtp'];
    public $tab_name_index = [
        'its4you_smtp' => 'id',
    ];

    public function __construct()
    {
        global $log;

        $this->db = PearDatabase::getInstance();
        $this->log = $log;
    }

    /**
     * @param string $moduleName
     * @param string $eventType
     * @throws Exception
     */
    public function vtlib_handler($moduleName, $eventType)
    {
        require_once 'include/utils/utils.php';
        require_once 'vtlib/Vtiger/Module.php';
        include_once 'modules/ModComments/ModComments.php';
        include_once 'modules/ModTracker/ModTracker.php';

        switch ($eventType) {
            case 'module.postinstall':
            case 'module.enabled':
            case 'module.postupdate':
                $this->addCustomLinks();
                break;
            case 'module.disabled':
            case 'module.preuninstall':
            case 'module.preupdate':
                $this->deleteCustomLinks();
                break;
        }
    }

    public function addCustomLinks()
    {
        $this->updateTables();
		$this->installAuth();

        Settings_MenuEditor_Module_Model::addModuleToApp($this->moduleName, $this->parentName);
    }

	public function installAuth()
	{
		$file = 'modules/ITS4YouSMTP/resources/ITS4YouAuth.php';
		$newFile = 'ITS4YouAuth.php';

		if (!copy($file, $newFile)) {
			$this->log->debug('You should copy ITS4YouAuth.php to root');
		}
	}

    public function updateTables()
    {
        $fields = [
            ['its4you_smtp', 'encoded_password', 'VARCHAR(1) DEFAULT NULL',],
            ['its4you_smtp', 'mailer_type', 'VARCHAR(20) DEFAULT NULL',],
            ['its4you_smtp', 'from_name_field', 'VARCHAR(50) DEFAULT NULL'],
            ['its4you_smtp', 'provider', 'VARCHAR(200) DEFAULT NULL'],
            ['its4you_smtp', 'client_id', 'VARCHAR(200) DEFAULT NULL'],
            ['its4you_smtp', 'client_secret', 'VARCHAR(200) DEFAULT NULL'],
            ['its4you_smtp', 'client_token', 'text DEFAULT NULL'],
            ['its4you_smtp', 'message', 'text DEFAULT NULL'],
            ['its4you_smtp', 'server_password', 'VARCHAR(1000)'],
        ];

        foreach ($fields as $fieldInfo) {
            $table = $fieldInfo[0];
            $column = $fieldInfo[1];

            if (!columnExists($column, $table)) {
                $sql = sprintf('ALTER TABLE %s ADD COLUMN %s %s', $table, $column, $fieldInfo[2]);
            } else {
                $sql = sprintf('ALTER TABLE %s CHANGE %s %s %s', $table, $column, $column, $fieldInfo[2]);
            }

            $this->db->pquery($sql);
        }
    }

    public function deleteCustomLinks()
    {
    }
}