<?php
/**
 * CSRF Protection System
 *
 * Provides CSRF token generation and validation
 * to protect forms from Cross-Site Request Forgery attacks
 */

/**
 * Generate a CSRF token and store it in session
 *
 * @return string The generated token
 */
function csrf_generate_token(): string {
    if (!isset($_SESSION['csrf_tokens'])) {
        $_SESSION['csrf_tokens'] = [];
    }

    // Generate a unique token
    $token = bin2hex(random_bytes(32));

    // Store with timestamp for expiry (1 hour)
    $_SESSION['csrf_tokens'][$token] = time() + 3600;

    // Clean old tokens (keep max 10)
    csrf_clean_old_tokens();

    return $token;
}

/**
 * Validate a CSRF token
 *
 * @param string|null $token The token to validate
 * @return bool True if valid, false otherwise
 */
function csrf_validate_token(?string $token): bool {
    if (empty($token)) {
        return false;
    }

    if (!isset($_SESSION['csrf_tokens'][$token])) {
        return false;
    }

    // Check if token has expired
    $expiry = $_SESSION['csrf_tokens'][$token];
    if (time() > $expiry) {
        unset($_SESSION['csrf_tokens'][$token]);
        return false;
    }

    // Token is valid - remove it (one-time use)
    unset($_SESSION['csrf_tokens'][$token]);

    return true;
}

/**
 * Get CSRF token from request (POST or header)
 *
 * @return string|null The token or null if not found
 */
function csrf_get_token_from_request(): ?string {
    // Check POST
    if (isset($_POST['csrf_token'])) {
        return $_POST['csrf_token'];
    }

    // Check header (for AJAX requests)
    $headers = getallheaders();
    if (isset($headers['X-CSRF-Token'])) {
        return $headers['X-CSRF-Token'];
    }
    if (isset($headers['x-csrf-token'])) {
        return $headers['x-csrf-token'];
    }

    return null;
}

/**
 * Verify CSRF token from current request
 * Dies with error if token is invalid
 *
 * @return void
 */
function csrf_verify_or_die(): void {
    $token = csrf_get_token_from_request();

    if (!csrf_validate_token($token)) {
        http_response_code(403);
        die('CSRF token validation failed. Please refresh the page and try again.');
    }
}

/**
 * Generate HTML hidden input with CSRF token
 *
 * @return string HTML input field
 */
function csrf_field(): string {
    $token = csrf_generate_token();
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars($token) . '">';
}

/**
 * Get CSRF token value (for AJAX)
 *
 * @return string The token value
 */
function csrf_token(): string {
    return csrf_generate_token();
}

/**
 * Get CSRF meta tag for HTML head (for AJAX)
 *
 * @return string HTML meta tag
 */
function csrf_meta(): string {
    $token = csrf_generate_token();
    return '<meta name="csrf-token" content="' . htmlspecialchars($token) . '">';
}

/**
 * Clean expired tokens from session
 *
 * @return void
 */
function csrf_clean_old_tokens(): void {
    if (!isset($_SESSION['csrf_tokens'])) {
        return;
    }

    $now = time();
    $tokens = $_SESSION['csrf_tokens'];

    // Remove expired tokens
    foreach ($tokens as $token => $expiry) {
        if ($now > $expiry) {
            unset($_SESSION['csrf_tokens'][$token]);
        }
    }

    // Keep only 10 most recent tokens
    if (count($_SESSION['csrf_tokens']) > 10) {
        $_SESSION['csrf_tokens'] = array_slice($_SESSION['csrf_tokens'], -10, 10, true);
    }
}

/**
 * Middleware function to protect POST requests
 * Call this at the beginning of any file that processes POST data
 *
 * @return void
 */
function csrf_protect_post(): void {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        csrf_verify_or_die();
    }
}
