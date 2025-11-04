<?php
/**
 * Centralized Error Handler
 *
 * Provides consistent error handling across the application
 * Replaces die(), header redirects, and inconsistent error messages
 */

/**
 * Application error codes
 */
class ErrorCode {
    // Authentication errors (1xxx)
    const AUTH_REQUIRED = 1001;
    const AUTH_INVALID_CREDENTIALS = 1002;
    const AUTH_SESSION_EXPIRED = 1003;
    const AUTH_INSUFFICIENT_PERMISSIONS = 1004;

    // Validation errors (2xxx)
    const VALIDATION_REQUIRED_FIELD = 2001;
    const VALIDATION_INVALID_FORMAT = 2002;
    const VALIDATION_ALREADY_EXISTS = 2003;
    const VALIDATION_NOT_FOUND = 2004;

    // Database errors (3xxx)
    const DB_CONNECTION_FAILED = 3001;
    const DB_QUERY_FAILED = 3002;
    const DB_TRANSACTION_FAILED = 3003;

    // API errors (4xxx)
    const API_RATE_LIMIT = 4001;
    const API_INVALID_RESPONSE = 4002;
    const API_CONNECTION_FAILED = 4003;

    // File errors (5xxx)
    const FILE_UPLOAD_FAILED = 5001;
    const FILE_NOT_FOUND = 5002;
    const FILE_INVALID_TYPE = 5003;

    // General errors (9xxx)
    const GENERAL_ERROR = 9001;
    const NOT_IMPLEMENTED = 9002;
}

/**
 * Redirect with error message
 *
 * @param string $location Redirect location (relative URL)
 * @param string $error_message Error message to display
 * @param int $error_code Optional error code
 */
function error_redirect(string $location, string $error_message, int $error_code = ErrorCode::GENERAL_ERROR): never {
    // Store error in session for display on next page
    $_SESSION['error_message'] = $error_message;
    $_SESSION['error_code'] = $error_code;
    $_SESSION['error_time'] = time();

    // Log the error
    error_log(sprintf(
        "[ERROR %d] Redirecting to %s: %s",
        $error_code,
        $location,
        $error_message
    ));

    header("Location: $location");
    exit();
}

/**
 * Die with error message (for API endpoints)
 *
 * @param string $error_message Error message
 * @param int $error_code Error code
 * @param int $http_code HTTP status code
 */
function error_die(string $error_message, int $error_code = ErrorCode::GENERAL_ERROR, int $http_code = 400): never {
    http_response_code($http_code);

    // Log the error with stack trace
    error_log(sprintf(
        "[ERROR %d] %s\nStack trace:\n%s",
        $error_code,
        $error_message,
        debug_backtrace_string()
    ));

    // In production, don't expose technical details
    if (getenv('APP_ENV') === 'production') {
        die("An error occurred. Please try again later.");
    }

    die("Error [$error_code]: $error_message");
}

/**
 * Send JSON error response (for AJAX/API)
 *
 * @param string $error_message Error message
 * @param int $error_code Error code
 * @param int $http_code HTTP status code
 * @param array $additional_data Optional additional data
 */
function error_json(string $error_message, int $error_code = ErrorCode::GENERAL_ERROR, int $http_code = 400, array $additional_data = []): never {
    http_response_code($http_code);
    header('Content-Type: application/json');

    // Log the error
    error_log(sprintf(
        "[JSON ERROR %d] %s",
        $error_code,
        $error_message
    ));

    $response = [
        'success' => false,
        'error' => [
            'code' => $error_code,
            'message' => $error_message,
        ]
    ];

    // Add additional data if provided
    if (!empty($additional_data)) {
        $response['error']['details'] = $additional_data;
    }

    // In production, sanitize error message
    if (getenv('APP_ENV') === 'production') {
        $response['error']['message'] = "An error occurred";
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Check if there's an error message to display
 *
 * @return array|null Array with 'message' and 'code' keys, or null
 */
function error_get_last(): ?array {
    if (isset($_SESSION['error_message'])) {
        $error = [
            'message' => $_SESSION['error_message'],
            'code' => $_SESSION['error_code'] ?? ErrorCode::GENERAL_ERROR,
            'time' => $_SESSION['error_time'] ?? time()
        ];

        // Clear the error from session
        unset($_SESSION['error_message'], $_SESSION['error_code'], $_SESSION['error_time']);

        return $error;
    }

    return null;
}

/**
 * Display error alert HTML (for views)
 *
 * @param string|null $custom_class Optional custom CSS class
 * @return string HTML alert or empty string
 */
function error_display_alert(string $custom_class = null): string {
    $error = error_get_last();

    if ($error === null) {
        return '';
    }

    $class = $custom_class ?? 'alert alert-danger';
    $message = htmlspecialchars($error['message']);

    return <<<HTML
<div class="$class" role="alert">
    <strong>Erreur:</strong> $message
</div>
HTML;
}

/**
 * Require authentication or redirect to login
 *
 * @param string $redirect_to Where to redirect if not authenticated
 */
function require_auth(string $redirect_to = 'login.php'): void {
    if (!isset($_SESSION['user_uuid'])) {
        error_redirect($redirect_to, 'Vous devez être connecté pour accéder à cette page', ErrorCode::AUTH_REQUIRED);
    }
}

/**
 * Validate required POST fields
 *
 * @param array $required_fields Array of required field names
 * @param string $redirect_to Where to redirect on error
 * @return array Sanitized values
 */
function validate_required_post(array $required_fields, string $redirect_to): array {
    $values = [];

    foreach ($required_fields as $field) {
        if (!isset($_POST[$field]) || trim($_POST[$field]) === '') {
            error_redirect(
                $redirect_to,
                "Le champ '$field' est requis",
                ErrorCode::VALIDATION_REQUIRED_FIELD
            );
        }

        $values[$field] = trim($_POST[$field]);
    }

    return $values;
}

/**
 * Get formatted stack trace as string
 *
 * @return string Stack trace
 */
function debug_backtrace_string(): string {
    $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 10);
    $output = [];

    foreach ($trace as $i => $frame) {
        $file = $frame['file'] ?? 'unknown';
        $line = $frame['line'] ?? 0;
        $function = $frame['function'] ?? 'unknown';

        $output[] = "#$i $file($line): $function()";
    }

    return implode("\n", $output);
}

/**
 * Handle database PDO exceptions
 *
 * @param PDOException $e The exception
 * @param string $context Description of what was being done
 * @param string $redirect_to Where to redirect
 */
function handle_db_error(PDOException $e, string $context, string $redirect_to): never {
    // Log the full exception
    error_log(sprintf(
        "[DB ERROR] %s: %s\nSQL State: %s\nStack trace:\n%s",
        $context,
        $e->getMessage(),
        $e->getCode(),
        $e->getTraceAsString()
    ));

    // User-friendly message (don't expose SQL details)
    error_redirect(
        $redirect_to,
        "Une erreur de base de données s'est produite. Veuillez réessayer.",
        ErrorCode::DB_QUERY_FAILED
    );
}

/**
 * Convenience function: throw 404 error
 *
 * @param string $resource What was not found
 */
function error_not_found(string $resource = 'Resource'): never {
    http_response_code(404);
    error_log("[404] $resource not found");
    die("$resource not found");
}

/**
 * Convenience function: throw 403 forbidden
 *
 * @param string $message Optional message
 */
function error_forbidden(string $message = 'Access forbidden'): never {
    http_response_code(403);
    error_log("[403] $message");
    die($message);
}
