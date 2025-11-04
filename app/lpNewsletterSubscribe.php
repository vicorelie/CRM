<?php
// app/lpNewsletterSubscribe.php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();

// Charge ta config et l’autoloader Brevo (comme dans register.php)
require __DIR__ . '/config.php';
require_once __DIR__ . '/vendor/autoload.php';

use Brevo\Client\Configuration;
use Brevo\Client\Api\ContactsApi;
use Brevo\Client\Model\CreateContact;

// Récupère et valide l’email POSTé
$email = trim($_POST['email'] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $_SESSION['newsletter_error'] = 'כתובת אימייל לא תקינה.';
    header('Location: ../lp/index.php#newsletter');
    exit();
}

// Configure l’API Brevo
$brevoConfig = Configuration::getDefaultConfiguration()
    ->setApiKey('api-key', BREVO_API_KEY);
$apiInstance = new ContactsApi(
    new \GuzzleHttp\Client(),
    $brevoConfig
);

// Crée le contact dans la liste
$createContact = new CreateContact([
    'email'         => $email,
    'listIds'       => [ BREVO_LP_NEWSLETTER_HE_LIST_ID ],
    'updateEnabled' => true
]);

try {
    $apiInstance->createContact($createContact);
    $_SESSION['newsletter_success'] = 'תודה! נרשמת בהצלחה לניוזלטר.';
} catch (\Exception $e) {
    error_log('Brevo API error: ' . $e->getMessage());
    $_SESSION['newsletter_error'] = 'אירעה שגיאה, נסה שוב מאוחר יותר.';
}

// Retourne sur la landing page
header('Location: ../lp/index.php#newsletter');
exit();
