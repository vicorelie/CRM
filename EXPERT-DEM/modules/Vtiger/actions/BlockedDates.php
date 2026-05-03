<?php
/**
 * CRUD des dates bloquées (jours marqués "complets" sur le planning).
 * Accès: Admin (is_admin) ou rôle "Service logistique" (roleid = H6).
 *
 * Modes:
 *   - list   (GET)  → JSON [{date, comment, created_at, created_by_name}, ...]
 *   - add    (POST) → {date, comment?} → ajoute (ignore si déjà bloqué)
 *   - delete (POST) → {date} → supprime
 */

class Vtiger_BlockedDates_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        $user = Users_Record_Model::getCurrentUserModel();
        $isAdmin = ($user->get('is_admin') === 'on');
        $roleId = $user->get('roleid');
        if (!$isAdmin && $roleId !== 'H6') {
            throw new AppException('LBL_PERMISSION_DENIED');
        }
        return true;
    }

    public function process(Vtiger_Request $request) {
        $mode = $request->getMode();
        $db = PearDatabase::getInstance();
        $response = new Vtiger_Response();

        try {
            switch ($mode) {
                case 'list':
                    $result = $db->pquery(
                        "SELECT bd.blocked_date, bd.comment, bd.created_at,
                                CONCAT_WS(' ', u.first_name, u.last_name) AS created_by_name
                         FROM cnk_blocked_dates bd
                         LEFT JOIN vtiger_users u ON u.id = bd.created_by
                         ORDER BY bd.blocked_date ASC",
                        []
                    );
                    $dates = [];
                    while ($row = $db->fetchByAssoc($result)) {
                        $dates[] = [
                            'date'            => $row['blocked_date'],
                            'comment'         => html_entity_decode($row['comment'] ?? '', ENT_QUOTES, 'UTF-8'),
                            'created_at'      => $row['created_at'],
                            'created_by_name' => trim($row['created_by_name'] ?? ''),
                        ];
                    }
                    $response->setResult(['success' => true, 'data' => $dates]);
                    break;

                case 'add':
                    $date = $request->get('date');
                    $comment = trim($request->get('comment') ?? '');
                    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                        throw new Exception('Date invalide (format attendu: YYYY-MM-DD)');
                    }
                    $userId = Users_Record_Model::getCurrentUserModel()->getId();
                    $db->pquery(
                        "INSERT INTO cnk_blocked_dates (blocked_date, comment, created_by)
                         VALUES (?, ?, ?)
                         ON DUPLICATE KEY UPDATE comment = VALUES(comment), created_by = VALUES(created_by)",
                        [$date, $comment !== '' ? $comment : null, $userId]
                    );
                    $response->setResult(['success' => true, 'date' => $date]);
                    break;

                case 'delete':
                    $date = $request->get('date');
                    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                        throw new Exception('Date invalide');
                    }
                    $db->pquery("DELETE FROM cnk_blocked_dates WHERE blocked_date = ?", [$date]);
                    $response->setResult(['success' => true, 'date' => $date]);
                    break;

                default:
                    throw new Exception('Mode inconnu: ' . $mode);
            }
        } catch (Exception $e) {
            $response->setError($e->getMessage());
        }

        $response->emit();
    }
}
