<?php
/**
 * Helper Functions
 *
 * Common utility functions used across the application
 * These functions were previously duplicated in multiple files
 */

/**
 * Fix JSON quotes in a string
 * Escapes double quotes within JSON string values
 *
 * @param string $json JSON string to fix
 * @return string Fixed JSON string
 */
function fixJsonQuotes(string $json): string {
    return preg_replace_callback(
        '/"((?:\\\\.|[^"\\\\])*)"/u',
        fn($m) => '"' . str_replace('"', '\"', $m[1]) . '"',
        $json
    );
}

/**
 * Ensure PDO connection is alive, reconnect if needed
 * Useful for long-running scripts to avoid "MySQL server has gone away"
 *
 * @param PDO $pdo Current PDO connection
 * @return PDO Active PDO connection
 */
function ensurePdo(PDO $pdo): PDO {
    try {
        $pdo->query('SELECT 1');
        return $pdo;
    } catch (PDOException) {
        // Reconnect
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        return new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
}

/**
 * Fetch one row from database
 * Convenience wrapper for prepare + execute + fetch
 *
 * @param PDO $pdo PDO connection
 * @param string $sql SQL query with placeholders
 * @param array $params Parameters for the query
 * @return array|null Row data or null if not found
 */
function fetchOne(PDO $pdo, string $sql, array $params = []): ?array {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result ?: null;
}

/**
 * Fetch all rows from database
 * Convenience wrapper for prepare + execute + fetchAll
 *
 * @param PDO $pdo PDO connection
 * @param string $sql SQL query with placeholders
 * @param array $params Parameters for the query
 * @return array Array of rows
 */
function fetchAll(PDO $pdo, string $sql, array $params = []): array {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Fetch a single column value
 * Convenience wrapper for prepare + execute + fetchColumn
 *
 * @param PDO $pdo PDO connection
 * @param string $sql SQL query with placeholders
 * @param array $params Parameters for the query
 * @return mixed|false Column value or false if not found
 */
function fetchColumn(PDO $pdo, string $sql, array $params = []) {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchColumn();
}

/**
 * Sanitize filename for safe storage
 * Removes dangerous characters and limits length
 *
 * @param string $filename Original filename
 * @param int $max_length Maximum length (default 255)
 * @return string Sanitized filename
 */
function sanitizeFilename(string $filename, int $max_length = 255): string {
    // Get file extension
    $extension = pathinfo($filename, PATHINFO_EXTENSION);
    $basename = pathinfo($filename, PATHINFO_FILENAME);

    // Remove dangerous characters
    $basename = preg_replace('/[^A-Za-z0-9._-]/', '_', $basename);

    // Limit length
    $max_basename_length = $max_length - strlen($extension) - 1;
    if (strlen($basename) > $max_basename_length) {
        $basename = substr($basename, 0, $max_basename_length);
    }

    return $extension ? "$basename.$extension" : $basename;
}

/**
 * Generate unique filename with timestamp and random bytes
 *
 * @param string $original_filename Original filename
 * @return string Unique filename
 */
function generateUniqueFilename(string $original_filename): string {
    $extension = pathinfo($original_filename, PATHINFO_EXTENSION);
    $safe_basename = sanitizeFilename(pathinfo($original_filename, PATHINFO_FILENAME));
    $unique_id = bin2hex(random_bytes(8));
    $timestamp = date('YmdHis');

    return "{$timestamp}_{$unique_id}_{$safe_basename}" . ($extension ? ".$extension" : "");
}

/**
 * Truncate text to specified length with ellipsis
 *
 * @param string $text Text to truncate
 * @param int $length Maximum length
 * @param string $ellipsis Ellipsis string (default '...')
 * @return string Truncated text
 */
function truncate(string $text, int $length, string $ellipsis = '...'): string {
    if (mb_strlen($text) <= $length) {
        return $text;
    }

    return mb_substr($text, 0, $length - mb_strlen($ellipsis)) . $ellipsis;
}

/**
 * Format bytes to human-readable size
 *
 * @param int $bytes Size in bytes
 * @param int $decimals Number of decimals
 * @return string Formatted size (e.g., "1.5 MB")
 */
function formatBytes(int $bytes, int $decimals = 2): string {
    if ($bytes === 0) return '0 B';

    $k = 1024;
    $sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    $i = floor(log($bytes) / log($k));

    return round($bytes / pow($k, $i), $decimals) . ' ' . $sizes[$i];
}

/**
 * Check if string is valid JSON
 *
 * @param string $string String to check
 * @return bool True if valid JSON
 */
function isJson(string $string): bool {
    json_decode($string);
    return json_last_error() === JSON_ERROR_NONE;
}

/**
 * Parse JSON safely with error handling
 *
 * @param string $json JSON string
 * @param bool $assoc Return associative array (default true)
 * @return mixed|null Parsed data or null on error
 */
function parseJson(string $json, bool $assoc = true) {
    $data = json_decode($json, $assoc);

    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON parse error: " . json_last_error_msg() . "\nJSON: " . substr($json, 0, 500));
        return null;
    }

    return $data;
}

/**
 * Clean text by removing extra whitespace and normalizing line breaks
 *
 * @param string $text Text to clean
 * @return string Cleaned text
 */
function cleanText(string $text): string {
    // Normalize line breaks
    $text = str_replace(["\r\n", "\r"], "\n", $text);

    // Remove multiple consecutive newlines (keep max 2)
    $text = preg_replace("/\n{3,}/", "\n\n", $text);

    // Trim each line
    $lines = explode("\n", $text);
    $lines = array_map('trim', $lines);
    $text = implode("\n", $lines);

    // Trim the whole text
    return trim($text);
}

/**
 * Get array value safely with default fallback
 *
 * @param array $array Array to search
 * @param string|int $key Key to look for
 * @param mixed $default Default value if key not found
 * @return mixed Value or default
 */
function arrayGet(array $array, $key, $default = null) {
    return $array[$key] ?? $default;
}

/**
 * Check if array has all specified keys
 *
 * @param array $array Array to check
 * @param array $keys Keys to check for
 * @return bool True if all keys exist
 */
function arrayHasKeys(array $array, array $keys): bool {
    foreach ($keys as $key) {
        if (!array_key_exists($key, $array)) {
            return false;
        }
    }
    return true;
}

/**
 * Calculate percentage
 *
 * @param int|float $value Value
 * @param int|float $total Total
 * @param int $decimals Number of decimals
 * @return float Percentage
 */
function percentage($value, $total, int $decimals = 2): float {
    if ($total == 0) return 0;
    return round(($value / $total) * 100, $decimals);
}

/**
 * Generate random string
 *
 * @param int $length Length of string
 * @param string $characters Characters to use
 * @return string Random string
 */
function randomString(int $length = 32, string $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'): string {
    $charactersLength = strlen($characters);
    $randomString = '';

    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[random_int(0, $charactersLength - 1)];
    }

    return $randomString;
}

/**
 * Convert snake_case to camelCase
 *
 * @param string $string Snake case string
 * @return string Camel case string
 */
function snakeToCamel(string $string): string {
    return lcfirst(str_replace('_', '', ucwords($string, '_')));
}

/**
 * Convert camelCase to snake_case
 *
 * @param string $string Camel case string
 * @return string Snake case string
 */
function camelToSnake(string $string): string {
    return strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $string));
}

/**
 * Debug helper - dump variable and die (for development only)
 *
 * @param mixed $var Variable to dump
 */
function dd($var): never {
    echo '<pre>';
    var_dump($var);
    echo '</pre>';
    die();
}

/**
 * Debug helper - dump variable without dying
 *
 * @param mixed $var Variable to dump
 */
function dump($var): void {
    echo '<pre>';
    var_dump($var);
    echo '</pre>';
}
