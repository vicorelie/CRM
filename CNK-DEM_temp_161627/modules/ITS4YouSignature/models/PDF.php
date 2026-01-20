<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouSignature_PDF_Model extends mPDF
{

    public function OverWriteHtml($file_in, $search, $replacement, $file_out = '')
    {
        $pdf = file_get_contents($file_in);

        if (!$file_out) {
            $file_out = $file_in;
        }
        if (!is_array($search)) {
            $x = $search;
            $search = array($x);
        }
        if (!is_array($replacement)) {
            $x = $replacement;
            $replacement = array($x); // mPDF 5.7.4
        }
        if (!$this->onlyCoreFonts && !$this->usingCoreFont) {
            foreach ($search as $k => $val) {
                $search[$k] = $this->UTF8ToUTF16BE($search[$k], false);
                $search[$k] = $this->_escape($search[$k]);
                $replacement[$k] = $this->UTF8ToUTF16BE($replacement[$k], false);
                $replacement[$k] = $this->_escape($replacement[$k]);
            }
        } else {
            foreach ($replacement as $k => $val) {
                $replacement[$k] = mb_convert_encoding($replacement[$k], $this->mb_enc, 'utf-8');
                $replacement[$k] = $this->_escape($replacement[$k]);
            }
        }

        $xref = array();
        preg_match("/xref\n0 (\d+)\n(.*?)\ntrailer/s", $pdf, $m);
        $xref_objid = $m[1];
        preg_match_all('/(\d{10}) (\d{5}) (f|n)/', $m[2], $x);

        for ($i = 0; $i < count($x[0]); $i++) {
            $xref[] = array(intval($x[1][$i]), $x[2][$i], $x[3][$i]);
        }

        $changes = array();
        preg_match("/<<\s*\/Type\s*\/Pages\s*\/Kids\s*\[(.*?)\]\s*\/Count/s", $pdf, $m);
        preg_match_all("/(\d+) 0 R /s", $m[1], $o);
        $objlist = $o[1];

        foreach ($objlist as $obj) {
            if ($this->compress) {
                preg_match("/" . ($obj + 1) . " 0 obj\n<<\s*\/Filter\s*\/FlateDecode\s*\/Length (\d+)>>\nstream\n(.*?)\nendstream\n/s", $pdf, $m);
            } else {
                preg_match("/" . ($obj + 1) . " 0 obj\n<<\s*\/Length (\d+)>>\nstream\n(.*?)\nendstream\n/s", $pdf, $m);
            }

            $s = $m[2];

            if (!$s) {
                continue;
            }

            $oldlen = $m[1];

            if ($this->encrypted) {
                $s = $this->_RC4($this->_objectkey($obj + 1), $s);
            }
            if ($this->compress) {
                $s = gzuncompress($s);
            }
            foreach ($search as $k => $val) {
                $s = str_replace($search[$k], $replacement[$k], $s);
            }
            if ($this->compress) {
                $s = gzcompress($s);
            }
            if ($this->encrypted) {
                $s = $this->_RC4($this->_objectkey($obj + 1), $s);
            }

            $newlen = strlen($s);
            $changes[($xref[$obj + 1][0])] = ($newlen - $oldlen) + (strlen($newlen) - strlen($oldlen));

            if ($this->compress) {
                $newstr = ($obj + 1) . " 0 obj\n<</Filter /FlateDecode /Length " . $newlen . ">>\nstream\n" . $s . "\nendstream\n";
            } else {
                $newstr = ($obj + 1) . " 0 obj\n<</Length " . $newlen . ">>\nstream\n" . $s . "\nendstream\n";
            }

            $pdf = str_replace($m[0], $newstr, $pdf);
        }

        krsort($changes);
        $newxref = "xref\n0 " . $xref_objid . "\n";

        foreach ($xref as $v) {
            foreach ($changes as $ck => $cv) {
                if ($v[0] > $ck) {
                    $v[0] += $cv;
                }
            }

            $newxref .= sprintf('%010d', $v[0]) . ' ' . $v[1] . ' ' . $v[2] . " \n";
        }

        $newxref .= "trailer";
        $pdf = preg_replace("/xref\n0 \d+\n.*?\ntrailer/s", $newxref, $pdf);
        preg_match("/startxref\n(\d+)\n%%EOF/s", $pdf, $m);
        $startxref = $m[1];
        $startxref += array_sum($changes);
        $pdf = preg_replace("/startxref\n(\d+)\n%%EOF/s", "startxref\n" . $startxref . "\n%%EOF", $pdf);

        $f = fopen($file_out, 'wb');

        if (!$f) {
            throw new MpdfException('Unable to create output file: ' . $file_out);
        }

        fwrite($f, $pdf, strlen($pdf));
        fclose($f);
    }
}