<?php
// rappel_popup.php - Popup de création de rappel
// Compatible avec Prospects (Leads) et Affaires (Potentials)

chdir(dirname(__FILE__));
require_once 'config.inc.php';

// Récupération des paramètres
$module = isset($_GET['module']) ? $_GET['module'] : '';
$recordId = isset($_GET['record_id']) ? intval($_GET['record_id']) : 0;
$recordName = isset($_GET['record_name']) ? htmlspecialchars($_GET['record_name']) : '';
$userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : 1;

if (empty($module) || $recordId == 0) {
    die('Paramètres manquants');
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Planifier un rappel</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
        }

        .popup-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 500px;
            margin: 0 auto;
            padding: 25px;
        }

        h2 {
            color: #333;
            margin-bottom: 10px;
            font-size: 20px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }

        .record-info {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-size: 14px;
            color: #555;
        }

        .form-group {
            margin-bottom: 15px;
        }

        label {
            display: block;
            margin-bottom: 5px;
            color: #555;
            font-weight: 600;
            font-size: 14px;
        }

        label.required:after {
            content: " *";
            color: #e74c3c;
        }

        input[type="date"],
        input[type="time"],
        input[type="text"],
        textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            font-family: Arial, sans-serif;
        }

        input:focus,
        textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        textarea {
            resize: vertical;
            min-height: 80px;
        }

        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .btn-primary {
            background: #667eea;
            color: white;
        }

        .btn-primary:hover {
            background: #5568d3;
        }

        .btn-secondary {
            background: #e0e0e0;
            color: #555;
        }

        .btn-secondary:hover {
            background: #d0d0d0;
        }

        .error {
            background: #fee;
            border: 1px solid #fcc;
            color: #c33;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            font-size: 14px;
        }

        .success {
            background: #efe;
            border: 1px solid #cfc;
            color: #3c3;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            font-size: 14px;
        }

        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }

        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="popup-container">
        <h2>📅 Planifier un rappel</h2>

        <div class="record-info">
            <strong><?php echo $module == 'Leads' ? 'Prospect' : 'Affaire'; ?>:</strong> <?php echo $recordName; ?>
        </div>

        <div id="messageArea"></div>

        <form id="rappelForm">
            <input type="hidden" name="module" value="<?php echo $module; ?>">
            <input type="hidden" name="record_id" value="<?php echo $recordId; ?>">
            <input type="hidden" name="user_id" value="<?php echo $userId; ?>">

            <div class="form-group">
                <label for="rappel_date" class="required">Date du rappel</label>
                <input type="date" id="rappel_date" name="rappel_date" required>
            </div>

            <div class="form-group">
                <label for="rappel_heure" class="required">Heure du rappel</label>
                <input type="time" id="rappel_heure" name="rappel_heure" required>
            </div>

            <div class="form-group">
                <label for="rappel_motif" class="required">Motif du rappel</label>
                <input type="text" id="rappel_motif" name="rappel_motif"
                       placeholder="Ex: Relance devis, Suite RDV, Décision finale..." required>
            </div>

            <div class="form-group">
                <label for="rappel_notes">Notes (optionnel)</label>
                <textarea id="rappel_notes" name="rappel_notes"
                          placeholder="Informations complémentaires à retenir..."></textarea>
            </div>

            <div class="button-group">
                <button type="button" class="btn-secondary" onclick="window.close()">Annuler</button>
                <button type="submit" class="btn-primary">Créer le rappel</button>
            </div>
        </form>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p style="margin-top: 10px; color: #666;">Création du rappel...</p>
        </div>
    </div>

    <script>
        // Définir la date par défaut à aujourd'hui
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        document.getElementById('rappel_date').setAttribute('min', today);
        document.getElementById('rappel_date').value = today;

        // Définir l'heure par défaut à l'heure actuelle
        const currentHour = String(now.getHours()).padStart(2, '0');
        const currentMinute = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('rappel_heure').value = currentHour + ':' + currentMinute;

        // Gestion du formulaire
        document.getElementById('rappelForm').addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const messageArea = document.getElementById('messageArea');
            const loading = document.getElementById('loading');
            const form = this;

            // Afficher le loading
            form.style.display = 'none';
            loading.style.display = 'block';
            messageArea.innerHTML = '';

            // Envoyer la requête AJAX
            fetch('rappel_create_task.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                loading.style.display = 'none';

                if (data.success) {
                    messageArea.innerHTML = '<div class="success">✓ Rappel créé avec succès !</div>';

                    // Fermer le popup après 1.5 secondes
                    setTimeout(function() {
                        window.close();
                        // Si window.close() ne fonctionne pas (popup non ouvert par JS), rediriger
                        if (!window.closed) {
                            window.location.href = 'index.php?module=' + formData.get('module') + '&view=Detail&record=' + formData.get('record_id');
                        }
                    }, 1500);
                } else {
                    messageArea.innerHTML = '<div class="error">❌ Erreur: ' + (data.error || 'Erreur inconnue') + '</div>';
                    form.style.display = 'block';
                }
            })
            .catch(error => {
                loading.style.display = 'none';
                messageArea.innerHTML = '<div class="error">❌ Erreur de communication: ' + error.message + '</div>';
                form.style.display = 'block';
            });
        });
    </script>
</body>
</html>
