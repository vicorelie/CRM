<?php
/**
 * Webhook Stripe - Redirige vers webhook_standalone.php
 *
 * Les deux URLs fonctionnent :
 *   - /stripe/webhook.php
 *   - /stripe/webhook_standalone.php
 */
require_once __DIR__ . '/webhook_standalone.php';
