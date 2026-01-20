<?php

/* +***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 * *********************************************************************************** */

class Leads_Detail_View extends Accounts_Detail_View {

	/**
	 * Vérifier si l'email est confirmé avant d'afficher la fiche
	 */
	public function checkPermission(Vtiger_Request $request) {
		parent::checkPermission($request);

		$recordId = $request->get('record');
		if ($recordId) {
			$recordModel = Vtiger_Record_Model::getInstanceById($recordId, 'Leads');
			$emailPrincipal = strtolower(trim($recordModel->get('email'))); // Email principal
			$emailConfirmation = strtolower(trim($recordModel->get('cf_985'))); // Confirmation email

			// Si l'email de confirmation ne correspond pas à l'email principal, afficher le popup
			if (empty($emailConfirmation) || $emailConfirmation !== $emailPrincipal) {
				$this->showEmailConfirmationPopup($recordId, $emailPrincipal);
				exit;
			}
		}
	}

	/**
	 * Affiche un popup pour confirmer l'email
	 */
	private function showEmailConfirmationPopup($recordId, $emailPrincipal) {
		?>
		<!DOCTYPE html>
		<html lang="fr">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Confirmation d'email requise</title>
			<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
			<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
			<style>
				* {
					margin: 0;
					padding: 0;
					box-sizing: border-box;
				}

				body {
					font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
					background: #f5f5f5;
					backdrop-filter: blur(8px);
					min-height: 100vh;
					display: flex;
					align-items: center;
					justify-content: center;
					padding: 20px;
				}

				.popup-container {
					background: white;
					border-radius: 16px;
					box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
					max-width: 550px;
					width: 100%;
					padding: 40px 35px;
					text-align: center;
					animation: slideUp 0.5s ease-out;
				}

				@keyframes slideUp {
					from {
						opacity: 0;
						transform: translateY(30px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				.popup-icon {
					width: 80px;
					height: 80px;
					margin: 0 auto 25px;
					background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					animation: pulse 2s ease-in-out infinite;
				}

				@keyframes pulse {
					0%, 100% {
						transform: scale(1);
					}
					50% {
						transform: scale(1.05);
					}
				}

				.popup-icon i {
					color: white;
					font-size: 40px;
				}

				h1 {
					font-size: 24px;
					color: #2d3748;
					margin-bottom: 15px;
					font-weight: 700;
				}

				.popup-message {
					font-size: 15px;
					color: #718096;
					line-height: 1.6;
					margin-bottom: 30px;
				}

				.form-group {
					margin-bottom: 25px;
					text-align: left;
				}

				.form-group label {
					display: block;
					font-size: 14px;
					font-weight: 600;
					color: #2d3748;
					margin-bottom: 8px;
				}

				.form-group input[type="email"] {
					width: 100%;
					padding: 14px 16px;
					border: 2px solid #e2e8f0;
					border-radius: 10px;
					font-size: 15px;
					transition: all 0.3s ease;
					font-family: inherit;
				}

				.form-group input[type="email"]:focus {
					outline: none;
					border-color: #667eea;
					box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
				}

				.button-container {
					display: flex;
					gap: 12px;
					margin-top: 25px;
				}

				.btn {
					flex: 1;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					gap: 8px;
					padding: 14px 24px;
					border: none;
					border-radius: 10px;
					font-size: 15px;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.3s ease;
					box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
				}

				.btn-primary {
					background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
					color: white;
				}

				.btn-primary:hover:not(:disabled) {
					transform: translateY(-2px);
					box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
				}

				.btn-primary:disabled {
					opacity: 0.6;
					cursor: not-allowed;
				}

				.btn-secondary {
					background: #edf2f7;
					color: #4a5568;
				}

				.btn-secondary:hover {
					background: #e2e8f0;
					transform: translateY(-2px);
				}

				.alert {
					padding: 12px 16px;
					border-radius: 8px;
					margin-bottom: 20px;
					font-size: 14px;
					display: none;
				}

				.alert-error {
					background: #fee;
					color: #c53030;
					border: 1px solid #fc8181;
				}

				.alert-success {
					background: #f0fff4;
					color: #2f855a;
					border: 1px solid #9ae6b4;
				}

				.spinner {
					display: inline-block;
					width: 16px;
					height: 16px;
					border: 3px solid rgba(255, 255, 255, 0.3);
					border-radius: 50%;
					border-top-color: white;
					animation: spin 0.8s linear infinite;
				}

				@keyframes spin {
					to { transform: rotate(360deg); }
				}

				@media (max-width: 600px) {
					.popup-container {
						padding: 35px 30px;
					}

					h1 {
						font-size: 22px;
					}

					.button-container {
						flex-direction: column;
					}
				}
			</style>
		</head>
		<body>
			<div class="popup-container">
				<div class="popup-icon">
					<i class="fas fa-envelope-circle-check"></i>
				</div>

				<h1>Confirmation d'email requise</h1>

				<p class="popup-message">
					Pour accéder à cette fiche, veuillez saisir l'email du prospect pour confirmer votre accès.
				</p>

				<div id="alert" class="alert"></div>

				<form id="confirmEmailForm">
					<div class="form-group">
						<label for="emailConfirmation">
							<i class="fas fa-envelope"></i> Email du prospect
							<span style="color: #e53e3e;">*</span>
						</label>
						<input
							type="email"
							id="emailConfirmation"
							name="emailConfirmation"
							placeholder="Saisissez l'email du prospect"
							required
							autocomplete="off"
						>
					</div>

					<div class="button-container">
						<button type="button" class="btn btn-secondary" onclick="history.back()">
							<i class="fas fa-times"></i>
							Annuler
						</button>
						<button type="submit" class="btn btn-primary" id="confirmBtn">
							<i class="fas fa-check"></i>
							Confirmer et accéder
						</button>
					</div>
				</form>
			</div>

			<script>
				$(document).ready(function() {
					$('#confirmEmailForm').on('submit', function(e) {
						e.preventDefault();

						const emailConfirmation = $('#emailConfirmation').val().trim().toLowerCase();
						const emailPrincipal = '<?= strtolower($emailPrincipal) ?>';
						const recordId = <?= $recordId ?>;

						// Validation côté client
						if (!emailConfirmation) {
							showAlert('Veuillez saisir l\'email de confirmation', 'error');
							return;
						}

						if (emailConfirmation !== emailPrincipal) {
							showAlert('L\'email de confirmation ne correspond pas à l\'email principal', 'error');
							return;
						}

						// Désactiver le bouton et afficher le spinner
						const $btn = $('#confirmBtn');
						$btn.prop('disabled', true);
						$btn.html('<span class="spinner"></span> Confirmation et conversion en cours...');

						// Requête AJAX pour confirmer l'email et convertir automatiquement
						$.ajax({
							url: 'index.php',
							method: 'POST',
							data: {
								module: 'Leads',
								action: 'ConfirmEmailAndConvert',
								record: recordId,
								email: emailConfirmation
							},
							success: function(response) {
								console.log('Response complète:', response);

								if (response.success) {
									showAlert('Email confirmé ! Conversion en Contact et Affaire réussie. Redirection...', 'success');

									// Rediriger vers l'affaire créée en mode édition après 2 secondes
									setTimeout(function() {
										if (response.result && response.result.potentialId) {
											window.location.href = 'index.php?module=Potentials&view=Edit&record=' + response.result.potentialId;
										} else {
											window.location.href = 'index.php?module=Leads';
										}
									}, 2000);
								} else {
									var errorMsg = 'Une erreur est survenue';
									if (response.error) {
										if (typeof response.error === 'string') {
											errorMsg = response.error;
										} else if (response.error.message) {
											errorMsg = response.error.message;
										}
									}
									console.error('Erreur de conversion:', errorMsg);
									console.error('Response.error:', response.error);
									showAlert('Erreur: ' + errorMsg, 'error');
									$btn.prop('disabled', false);
									$btn.html('<i class="fas fa-check"></i> Confirmer et accéder');
								}
							},
							error: function() {
								showAlert('Erreur lors de la conversion. Veuillez réessayer.', 'error');
								$btn.prop('disabled', false);
								$btn.html('<i class="fas fa-check"></i> Confirmer et accéder');
							}
						});
					});

					function showAlert(message, type) {
						const $alert = $('#alert');
						$alert.removeClass('alert-error alert-success');
						$alert.addClass('alert-' + type);
						$alert.text(message);
						$alert.fadeIn();
					}
				});
			</script>
		</body>
		</html>
		<?php
	}
}
