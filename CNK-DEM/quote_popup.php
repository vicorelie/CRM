<?php
chdir(dirname(__FILE__));
require_once 'config.inc.php';
$potentialId = isset($_GET['record']) ? intval($_GET['record']) : 0;
if ($potentialId <= 0) die('ID invalide');
$conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);
$stmt = $conn->prepare("SELECT potentialname FROM vtiger_potential WHERE potentialid = ?");
$stmt->bind_param('i', $potentialId);
$stmt->execute();
$result = $stmt->get_result();
$potential = $result->fetch_assoc();
$potentialName = $potential['potentialname'];
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Générer un devis - <?php echo htmlspecialchars($potentialName); ?></title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; min-height: 100vh; }
        .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        h1 { font-size: 2em; margin-bottom: 10px; }
        .subtitle { opacity: 0.9; font-size: 1.1em; }
        .form-content { padding: 30px; }
        .form-section { margin-bottom: 30px; background: #f8f9fa; border-radius: 10px; padding: 20px; }
        .form-section h3 { color: #667eea; margin-bottom: 15px; font-size: 1.3em; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: 600; color: #333; }
        .form-group input, .form-group select { width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #667eea; }
        .form-group input[readonly] { background-color: #f0f0f0; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .btn { padding: 12px 30px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: 600; }
        .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .btn-success { background: #28a745; color: white; }
        .actions { text-align: center; padding: 20px 30px; background: #f8f9fa; border-top: 1px solid #dee2e6; }
        .required { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-file-invoice"></i> Générer un devis</h1>
            <div class="subtitle">Affaire: <?php echo htmlspecialchars($potentialName); ?></div>
        </div>
        <div class="form-content">
            <form id="quoteForm" method="POST" action="index.php">
                <input type="hidden" name="module" value="Quotes">
                <input type="hidden" name="action" value="Save">
                <input type="hidden" name="potential_id" value="<?php echo $potentialId; ?>">
                <input type="hidden" name="sourceRecord" value="<?php echo $potentialId; ?>">
                <input type="hidden" name="sourceModule" value="Potentials">
                <input type="hidden" name="relationOperation" value="true">

                <div class="form-section">
                    <h3>Informations générales</h3>
                    <div class="form-group">
                        <label><span class="required">*</span> Sujet du devis</label>
                        <input type="text" name="subject" value="Dev-<?php echo htmlspecialchars($potentialName); ?>" required>
                    </div>
                    <div class="form-group">
                        <label>Date de validité</label>
                        <input type="date" name="validtill" value="<?php echo date('Y-m-d', strtotime('+7 days')); ?>">
                    </div>
                </div>

                <div class="form-section">
                    <h3>Forfait</h3>
                    <div class="form-group">
                        <label>Type de forfait</label>
                        <select name="cf_1125">
                            <option value="">-- Sélectionnez --</option>
                            <option value="ECO">ECO</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="PREMIUM">PREMIUM</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Forfait Tarif (€)</label>
                            <input type="number" name="cf_1127" value="0" step="0.01" min="0">
                        </div>
                        <div class="form-group">
                            <label>Forfait Supplément (€)</label>
                            <input type="number" name="cf_1129" value="0" step="0.01" min="0">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Assurance</h3>
                    <div class="form-group">
                        <label>Montant assurance</label>
                        <select name="cf_1145">
                            <option value="">-- Sélectionnez --</option>
                            <option value="4000">4 000 €</option>
                            <option value="8000">8 000 €</option>
                            <option value="12000">12 000 €</option>
                            <option value="16000">16 000 €</option>
                            <option value="20000">20 000 €</option>
                        </select>
                    </div>
                </div>
            </form>
        </div>
        <div class="actions">
            <button type="submit" form="quoteForm" class="btn btn-primary">
                <i class="fas fa-save"></i> Créer le devis
            </button>
        </div>
    </div>
</body>
</html>
