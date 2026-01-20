<?php

class ITS4YouSMTP_Auth_View extends Vtiger_Index_View {
	public function preProcess(Vtiger_Request $request, $display = true)
	{
	}

	public function process(Vtiger_Request $request)
	{
		$this->exposeMethod('modal');
		$this->exposeMethod('data');

		$mode = $request->getMode();

		if (!empty($mode)) {
			$this->invokeExposedMethod($mode, $request);
		}
	}

	public function modal(Vtiger_Request $request)
	{

	}

	public function data(Vtiger_Request $request) {

	}

	public function postProcess(Vtiger_Request $request)
	{
	}
}