<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouProcessFlow_Info_View extends Settings_Vtiger_Index_View
{

    public $maxcolumnnum = 0;
    public $endline = 0;
    public $endcolumn = 0;
    public $Map = array();
    public $inMap = array();

    public $PF = array();

    public function checkPermission(Vtiger_Request $request)
    {
        $currentUserModel = Users_Record_Model::getCurrentUserModel();
        if (!$currentUserModel->isAdminUser()) {
            throw new AppException(vtranslate('LBL_PERMISSION_DENIED', 'Vtiger'));
        }
    }

    public function getHeaderScripts(Vtiger_Request $request)
    {
        $headerScriptInstances = parent::getHeaderScripts($request);
        $moduleName = $request->getModule();

        $jsFileNames = array(
            '~/libraries/jquery/bootstrapswitch/js/bootstrap-switch.min.js',
            "~layouts/v7/lib/jquery/Lightweight-jQuery-In-page-Filtering-Plugin-instaFilta/instafilta.js",
            "~layouts/" . Vtiger_Viewer::getDefaultLayoutName() . "/lib/jquery/floatThead/jquery.floatThead.js",
            "~layouts/" . Vtiger_Viewer::getDefaultLayoutName() . "/lib/jquery/perfect-scrollbar/js/perfect-scrollbar.jquery.js",
        );

        $jsScriptInstances = $this->checkAndConvertJsScripts($jsFileNames);
        $headerScriptInstances = array_merge($headerScriptInstances, $jsScriptInstances);
        return $headerScriptInstances;
    }

    public function getHeaderCss(Vtiger_Request $request)
    {
        $headerCssInstances = parent::getHeaderCss($request);
        $cssFileNames = array(
            '~/libraries/jquery/bootstrapswitch/css/bootstrap3/bootstrap-switch.min.css',
            "~layouts/" . Vtiger_Viewer::getDefaultLayoutName() . "/lib/jquery/perfect-scrollbar/css/perfect-scrollbar.css",
        );
        $cssInstances = $this->checkAndConvertCssStyles($cssFileNames);
        $headerCssInstances = array_merge($headerCssInstances, $cssInstances);
        return $headerCssInstances;
    }

    public function process(Vtiger_Request $request)
    {
        $ITS4YouProcessFlowIndexAjaxAction = new ITS4YouProcessFlow_IndexAjax_Action();
        $ITS4YouProcessFlowIndexAjaxAction->setInfoMode(true);
        $ITS4YouProcessFlowIndexAjaxAction->controlFields($request);

        $this->PF = $ITS4YouProcessFlowIndexAjaxAction->getInfo();

        $maps = $links = $nodes = "";

        $this->inMap["pf0"]["position"] = array("line" => 0, "column" => 0);
        $this->inMap["pf0"]["yes"] = array("line" => 0, "column" => 0);
        $this->Map[0][0] = "pf0";

        foreach ($this->PF As $k => $Data) {

            $startSourceId = "pf" . $Data["id"];
            $startSourceName = !empty($Data["name"]) ? $Data["name"] : $startSourceId;

            $nodes .= "{id: '" . $startSourceId . "', label: {name: '" . $startSourceName . "'}, style: {fillColor: '#fff'}}, ";

            $columns = 0;

            foreach (array("yes", "no") AS $type) {

                $add_label = ($Data["id"] == "0" ? false : true);

                $startsourceid_for_action = $startSourceId;

                if (!empty($Data["Actions"][$type]) && ITS4YouProcessFlow_Utils_Helper::count($Data["Actions"][$type]) > 0) {

                    foreach ($Data["Actions"][$type] As $a => $ActionData) {

                        $actionid = $Data["id"] . "pfaction" . $type . $a;

                        if ($Data["add_action"] == "yes" && ($Data["conditions_result"] == "1" && $type == "yes") OR ($Data["conditions_result"] == "0" && $type == "no")) {
                            $style = "{shape: 'rect', width: 100, height: 25, rx: 3, ry: 3, fillColor: '#8dcf7c', strokeColor: '#72a964'}";
                        } else {
                            $style = "{shape: 'rect', width: 100, height: 25, rx: 3, ry: 3, fillColor: '#c0c0c0', strokeColor: '#000000'}";
                        }

                        $nodes .= "{id: '" . $actionid . "', label: {name: '" . $ActionData["name"] . "', color: '#000', dx: 0, dy: 0, textAnchor: 'middle'}, style: " . $style . "}, ";

                        $links .= "{source: '" . $startsourceid_for_action . "', target: '" . $actionid . "'" . ($add_label ? ", label: {name: '" . $type . "'}" : "") . "},";
                        $add_label = false;

                        $this->addActionToMap($startSourceId, $startsourceid_for_action, $actionid, $type);

                        $startsourceid_for_action = $actionid;
                    }

                }

                if (!empty($Data["next_pf"][$type]) && ITS4YouProcessFlow_Utils_Helper::count($Data["next_pf"][$type]) > 0) {
                    foreach ($Data["next_pf"][$type] As $p => $PFKey) {
                        $links .= "{source: '" . $startsourceid_for_action . "', target: 'pf" . $PFKey . "'" . ($add_label ? ", label: {name: '" . $type . "'}" : "") . "},";
                        $this->addToMap($startsourceid_for_action, 'pf' . $PFKey, $columns);
                        $columns += $this->getNumColumns($PFKey, "start");
                    }
                }

            }

        }

        $Map = $this->getMap();

        foreach ($Map AS $l => $CD) {
            $ID = array();
            for ($i = 0; $i <= $this->maxcolumnnum; $i++) {
                if (isset($CD[$i])) {
                    $ID[] = $CD[$i];
                } else {
                    $ID[] = "";
                }

            }
            $maps .= "['','" . implode("','", $ID) . "'],";
        }

        Echo '

<svg width="960" height="720"></svg>

<script src="//d3js.org/d3.v5.min.js"></script>
<script src="layouts/v7/modules/Settings/ITS4YouProcessFlow/lib/flowcharty.js"></script>
<script>';

        Echo '
  var data = {
    nodes: [ 
    ' . $nodes . '      
    ],    
    map: [ 
    ' . $maps . '      
    ],     
    
    links: [
    ' . $links . '
    ]
    };';

        echo '
      var flowcharty = new Flowcharty.default();
      flowcharty.nodeRX = 7;
      flowcharty.nodeRY = 7;
      flowcharty.nodeFillColor = "#000";
      flowcharty.render(d3.select("svg"), data);
    </script>';
    }

    public function addActionToMap($startsourceid, $parent_skey, $skey, $type = false, $next = false)
    {
        $line = $this->inMap[$parent_skey]["position"]["line"];

        if (isset($this->inMap[$startsourceid][$type]["column"])) {
            $column = $this->inMap[$startsourceid][$type]["column"];
        } else {
            $column = $this->inMap[$startsourceid]["position"]["column"];
            if ($type == "no") {
                if (isset($this->inMap[$startsourceid]["yes"])) {
                    $column++;
                }
            }

            $this->inMap[$startsourceid][$type] = array("line" => $line, "column" => $column);

        }

        $line++;

        $this->inMap[$skey]["position"] = array("line" => $line, "column" => $column);


        if ($this->maxcolumnnum < $column) {
            $this->maxcolumnnum = $column;
        }

        $this->Map[$line][$column] = $skey;
    }

    public function addToMap($parent_skey, $skey, $columns)
    {

        $line = $this->inMap[$parent_skey]["position"]["line"];
        $line++;
        if ($columns > $this->maxcolumnnum) {
            $this->maxcolumnnum = $columns;
        }

        $this->inMap[$skey]["position"] = array("line" => $line, "column" => $columns);


        $this->Map[$line][$columns] = $skey;
    }

    public function getNumColumns($key, $mode)
    {

        if (isset($this->PF[$key]["columns"][$mode])) {

            $columns = $this->PF[$key]["columns"][$mode];

        } else {

            $columns = "0";
            if (isset($this->PF[$key]["Actions"]["yes"])) {
                $columns++;
            }
            if (isset($this->PF[$key]["Actions"]["no"])) {
                $columns++;
            }

            $c = 0;
            foreach (array("yes", "no") AS $type) {

                if ($type != "all" && $type == "no") {
                    continue;
                }

                if (isset($this->PF[$key]["next_pf"][$type])) {
                    foreach ($this->PF[$key]["next_pf"][$type] AS $i) {
                        $c += $this->getNumColumns($i, 'all');
                    }
                }
            }

            if ($c > 0) {
                $columns = $c;
            } elseif (empty($columns)) {
                $columns = 1;
            }

            $this->PF[$key]["columns"][$mode] = $columns;
        }

        return $columns;
    }

    public function getMap()
    {
        return $this->Map;
    }


}
