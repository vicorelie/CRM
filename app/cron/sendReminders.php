<?php
// cron/sendReminders.php

require_once __DIR__ . '/../config.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Fonction de log personnalisée
function logMessage($message) {
    error_log(date('Y-m-d H:i:s') . " - " . $message . PHP_EOL, 3, __DIR__ . '/sendReminders.log');
}

// Récupérer la date et l'heure actuelles
$now = new DateTime();
$windowMinutes = 5;

// Calculer l'intervalle de temps : de (now - windowMinutes) à now
$startTime = clone $now;
$startTime->modify("-{$windowMinutes} minutes");

// Formatage des dates pour la requête SQL
$nowFormatted = $now->format('Y-m-d H:i:s');
$startTimeFormatted = $startTime->format('Y-m-d H:i:s');

logMessage("Script sendReminders.php exécuté à {$nowFormatted}");

try {
    $stmt = $pdo->prepare("
        SELECT e.*, u.email, u.username
        FROM exams e
        JOIN Users u ON e.uuid = u.uuid
        WHERE e.reminder_enabled = 1
          AND e.reminder_sent = 0
          AND TIMESTAMP(e.exam_date, e.exam_time) - INTERVAL e.reminder_time_before MINUTE <= :now
          AND TIMESTAMP(e.exam_date, e.exam_time) - INTERVAL e.reminder_time_before MINUTE > :start_time
    ");
    $stmt->execute([
        ':now' => $nowFormatted,
        ':start_time' => $startTimeFormatted
    ]);
    $exams = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($exams)) {
        logMessage("Aucun examen éligible pour le rappel.");
    } else {
        logMessage(count($exams) . " examen(s) trouvé(s) pour le rappel.");
    }

    foreach ($exams as $exam) {
        logMessage("Préparation de l'envoi pour l'examen ID {$exam['id']} à {$exam['email']}");

        $mail = new PHPMailer(true);

        try {
            // Configuration SMTP
            // Pour le cron, vous pouvez désactiver le mode debug (SMTPDebug = 0)
            $mail->SMTPDebug = 0;
            $mail->isSMTP();
            $mail->Host       = $_ENV['SMTP_HOST'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $_ENV['SMTP_USERNAME'];
            $mail->Password   = $_ENV['SMTP_PASSWORD'];
            $mail->SMTPSecure = $_ENV['SMTP_ENCRYPTION'];
            $mail->Port       = $_ENV['SMTP_PORT'];

            // Destinataire et expéditeur
            $mail->setFrom($_ENV['MAIL_FROM_ADDRESS'], $_ENV['MAIL_FROM_NAME']);
            $mail->addAddress($exam['email'], $exam['username']);

            // Contenu de l'e-mail
            $mail->isHTML(true);
            $mail->Subject = 'Rappel : ' . $exam['exam_name'];
            $mail->Body    = "
                <p>Bonjour " . htmlspecialchars($exam['username']) . ",</p>
                <p>Ceci est un rappel pour votre examen : <strong>" . htmlspecialchars($exam['exam_name']) . "</strong></p>
                <p><strong>Date :</strong> " . htmlspecialchars($exam['exam_date']) . "</p>
                <p><strong>Heure :</strong> " . htmlspecialchars($exam['exam_time']) . "</p>
                <p>Bonne chance !</p>
                <p>Cordialement,<br>Wanatest</p>
            ";
            $mail->AltBody = "Bonjour " . $exam['username'] . ",\n\n" .
                             "Ceci est un rappel pour votre examen : " . $exam['exam_name'] . "\n" .
                             "Date : " . $exam['exam_date'] . "\n" .
                             "Heure : " . $exam['exam_time'] . "\n\n" .
                             "Bonne chance !\n\n" .
                             "Cordialement,\nWanatest";

            // Envoyer l'e-mail
            $mail->send();
            logMessage("E-mail envoyé pour l'examen ID {$exam['id']} à {$exam['email']}");

            // Marquer l'examen comme rappel envoyé
            $updateStmt = $pdo->prepare("
                UPDATE exams
                SET reminder_sent = 1
                WHERE id = :id
            ");
            $updateStmt->execute([':id' => $exam['id']]);
            logMessage("Exam ID {$exam['id']} marqué comme rappel envoyé.");
        } catch (Exception $e) {
            logMessage("Erreur lors de l'envoi de l'e-mail pour l'examen ID {$exam['id']} : {$mail->ErrorInfo}");
        }
    }
} catch (PDOException $e) {
    logMessage('Erreur lors de la récupération des examens pour les rappels : ' . $e->getMessage());
}
?>