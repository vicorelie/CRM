<?php
/**
 * Plugin Name:       WanaPush SEO Bridge
 * Plugin URI:        https://wanatest.com/wanapush
 * Description:       Permet à WanaPush (https://wanatest.com/wanapush) de modifier les meta SEO de ce site directement depuis sa plateforme. Une fois installé, ne nécessite aucune configuration.
 * Version:           1.6.0
 * Requires at least: 5.5
 * Requires PHP:      7.4
 * Author:            WanaPush
 * Author URI:        https://wanatest.com/wanapush
 * License:           GPL-2.0-or-later
 * Text Domain:       wanapush-seo
 */

if (!defined('ABSPATH')) {
    exit;
}

define('WANAPUSH_SEO_VERSION', '1.6.0');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Enregistrer les post-meta SEO sur pages + posts, exposées via REST API
// ─────────────────────────────────────────────────────────────────────────────

function wanapush_register_meta() {
    $meta_keys = [
        '_wanapush_meta_title'       => 'Title SEO (override)',
        '_wanapush_meta_description' => 'Meta description',
        '_wanapush_canonical'        => 'URL canonical',
        '_wanapush_og_title'         => 'Open Graph title',
        '_wanapush_og_description'   => 'Open Graph description',
        '_wanapush_og_image'         => 'Open Graph image URL',
        '_wanapush_robots'           => 'Meta robots (index/noindex, follow/nofollow)',
        '_wanapush_schema_jsonld'    => 'Bloc JSON-LD schema.org (objet JSON sérialisé)',
        '_wanapush_image_alts'       => 'Mapping JSON {url|filename: alt_text} — patche les <img> au rendu (compatible page builders)',
        '_wanapush_extra_html'       => 'HTML additionnel injecté avant </main> ou </body> au rendu (enrichissement contenu)',
        '_wanapush_normalize_h1'     => 'Si "1" : transforme les <h1> surnuméraires en <h2> au rendu (un seul H1 par page)',
    ];

    foreach (['post', 'page'] as $object_type) {
        foreach ($meta_keys as $key => $label) {
            register_post_meta($object_type, $key, [
                'show_in_rest'      => true,
                'single'            => true,
                'type'              => 'string',
                'default'           => '',
                'description'       => $label,
                'auth_callback'     => function () {
                    return current_user_can('edit_posts');
                },
                // schema_jsonld + extra_html contiennent du HTML/JSON, on évite sanitize_text_field qui strippe trop
                'sanitize_callback' => in_array($key, ['_wanapush_schema_jsonld', '_wanapush_extra_html', '_wanapush_image_alts'], true)
                    ? function ($v) { return is_string($v) ? wp_kses_post(stripslashes($v)) : ''; }
                    : 'sanitize_text_field',
            ]);
        }
    }
}
add_action('init', 'wanapush_register_meta');

// ─────────────────────────────────────────────────────────────────────────────
// 2. Render des balises <meta> dans <head>
// ─────────────────────────────────────────────────────────────────────────────

function wanapush_render_head() {
    if (!is_singular()) return;

    global $post;
    if (!$post) return;

    $description = trim((string) get_post_meta($post->ID, '_wanapush_meta_description', true));
    $title       = trim((string) get_post_meta($post->ID, '_wanapush_meta_title', true));
    $canonical   = trim((string) get_post_meta($post->ID, '_wanapush_canonical', true));
    $og_title    = trim((string) get_post_meta($post->ID, '_wanapush_og_title', true));
    $og_desc     = trim((string) get_post_meta($post->ID, '_wanapush_og_description', true));
    $og_image    = trim((string) get_post_meta($post->ID, '_wanapush_og_image', true));
    $robots      = trim((string) get_post_meta($post->ID, '_wanapush_robots', true));

    // Anti-collision : si Yoast/RankMath/AIOSEO est déjà actif, on les laisse gagner
    // (sinon on aurait deux <meta description> sur la même page).
    $other_seo_active =
        defined('WPSEO_VERSION') ||                  // Yoast
        defined('RANK_MATH_VERSION') ||              // Rank Math
        function_exists('aioseo');                   // All in One SEO

    if ($other_seo_active) {
        echo "<!-- WanaPush SEO : autre plugin SEO détecté, désactivé pour éviter les doublons -->\n";
        return;
    }

    echo "<!-- WanaPush SEO v" . WANAPUSH_SEO_VERSION . " -->\n";

    if ($description !== '') {
        echo '<meta name="description" content="' . esc_attr($description) . "\">\n";
    }
    if ($robots !== '') {
        echo '<meta name="robots" content="' . esc_attr($robots) . "\">\n";
    }
    if ($canonical !== '') {
        echo '<link rel="canonical" href="' . esc_url($canonical) . "\">\n";
    }

    // Open Graph (fallback vers description / title de la page si vide)
    $effective_og_title = $og_title !== '' ? $og_title : ($title !== '' ? $title : get_the_title($post));
    $effective_og_desc  = $og_desc !== '' ? $og_desc : $description;

    if ($effective_og_title !== '') {
        echo '<meta property="og:title" content="' . esc_attr($effective_og_title) . "\">\n";
    }
    if ($effective_og_desc !== '') {
        echo '<meta property="og:description" content="' . esc_attr($effective_og_desc) . "\">\n";
    }
    if ($og_image !== '') {
        echo '<meta property="og:image" content="' . esc_url($og_image) . "\">\n";
    }
    echo '<meta property="og:type" content="article">' . "\n";
    echo '<meta property="og:url" content="' . esc_url(get_permalink($post)) . "\">\n";

    // Twitter Card
    echo '<meta name="twitter:card" content="' . ($og_image !== '' ? 'summary_large_image' : 'summary') . "\">\n";
    if ($effective_og_title !== '') {
        echo '<meta name="twitter:title" content="' . esc_attr($effective_og_title) . "\">\n";
    }
    if ($effective_og_desc !== '') {
        echo '<meta name="twitter:description" content="' . esc_attr($effective_og_desc) . "\">\n";
    }
    if ($og_image !== '') {
        echo '<meta name="twitter:image" content="' . esc_url($og_image) . "\">\n";
    }

    // Schema.org JSON-LD (Article, FAQPage, BreadcrumbList, etc.)
    $jsonld = trim((string) get_post_meta($post->ID, '_wanapush_schema_jsonld', true));
    if ($jsonld !== '') {
        // Validation : doit être du JSON valide pour éviter de casser le HTML
        $decoded = json_decode($jsonld, true);
        if ($decoded !== null) {
            echo '<script type="application/ld+json">' . wp_json_encode($decoded, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "</script>\n";
        }
    }

    echo "<!-- /WanaPush SEO -->\n";
}
add_action('wp_head', 'wanapush_render_head', 1);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Override du <title> de la page si _wanapush_meta_title est défini
// ─────────────────────────────────────────────────────────────────────────────

function wanapush_filter_title($title) {
    if (!is_singular()) return $title;

    global $post;
    if (!$post) return $title;

    $custom = trim((string) get_post_meta($post->ID, '_wanapush_meta_title', true));
    return $custom !== '' ? $custom : $title;
}
add_filter('pre_get_document_title', 'wanapush_filter_title', 99);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Patch des attributs alt sur les <img> au rendu (output buffering)
//    Compatible avec TOUS les page builders (Elementor, Divi, WPBakery…)
//    car on intercepte le HTML final juste avant l'envoi.
// ─────────────────────────────────────────────────────────────────────────────

function wanapush_image_alts_buffer_start() {
    if (is_admin() || !is_singular()) return;

    global $post;
    if (!$post) return;

    $alts_json    = trim((string) get_post_meta($post->ID, '_wanapush_image_alts', true));
    $extra_html   = trim((string) get_post_meta($post->ID, '_wanapush_extra_html', true));
    $normalize_h1 = trim((string) get_post_meta($post->ID, '_wanapush_normalize_h1', true)) === '1';

    if ($alts_json === '' && $extra_html === '' && !$normalize_h1) return;

    $alts = $alts_json !== '' ? json_decode($alts_json, true) : [];
    if (!is_array($alts)) $alts = [];

    ob_start(function ($html) use ($alts, $extra_html, $normalize_h1) {
        // ── Normalisation H1 : garde le 1er, transforme les autres en H2 ──
        // (Utile quand le thème WP injecte des H1 dans header/sidebar — non éditables via REST)
        if ($normalize_h1) {
            $h1_index = 0;
            $html = preg_replace_callback(
                '/<h1\b([^>]*)>([\s\S]*?)<\/h1>/i',
                function ($m) use (&$h1_index) {
                    $h1_index++;
                    if ($h1_index === 1) return $m[0]; // garde le 1er H1
                    return '<h2' . $m[1] . '>' . $m[2] . '</h2>';
                },
                $html
            );
        }

        // ── Injection HTML additionnel avant </main> (ou </body> en fallback) ──
        if ($extra_html !== '') {
            $marker = '<!-- WanaPush extra content -->';

            // Détecte si le HTML reçu est déjà stylé (classes CSS sur les éléments,
            // venant du scanner de design WanaPush). Si oui, on skip notre wrapper
            // neutre pour préserver le design du thème.
            $hasThemeClasses = (bool) preg_match(
                '/<(h2|h3|p|section|article)\s[^>]*class\s*=\s*["\'][^"\']+["\']/i',
                $extra_html
            );

            if ($hasThemeClasses) {
                // HTML déjà stylé — on injecte tel quel sans wrapper ni CSS additionnel
                $payload = "\n{$marker} (théme classes détectées)\n{$extra_html}\n";
            } else {
                // HTML non stylé — fallback : wrapper neutre + CSS scoped
                $style = '<style data-wanapush-extra-css>
.wanapush-extra-content{max-width:800px;margin:3rem auto 2rem;padding:2rem 1.5rem 0;font-family:inherit;color:inherit;border-top:1px solid rgba(0,0,0,.08)}
.wanapush-extra-content section{margin-bottom:2.25rem}
.wanapush-extra-content section:last-child{margin-bottom:0}
.wanapush-extra-content h2{font-size:1.5rem;font-weight:700;line-height:1.3;margin:0 0 .75rem;color:inherit}
.wanapush-extra-content h3{font-size:1.15rem;font-weight:600;line-height:1.4;margin:1.25rem 0 .5rem}
.wanapush-extra-content p{font-size:1rem;line-height:1.65;margin:0 0 1rem;color:inherit}
.wanapush-extra-content p:last-child{margin-bottom:0}
.wanapush-extra-content ul,.wanapush-extra-content ol{margin:0 0 1rem 1.25rem;padding:0;line-height:1.65}
.wanapush-extra-content li{margin-bottom:.4rem}
@media(prefers-color-scheme:dark){.wanapush-extra-content{border-color:rgba(255,255,255,.12)}}
</style>';
                $payload = $style . "\n{$marker} (wrapper neutre)\n<div class=\"wanapush-extra-content\">\n{$extra_html}\n</div>\n";
            }

            if (stripos($html, '</main>') !== false) {
                $html = preg_replace('/<\/main>/i', $payload . '</main>', $html, 1);
            } elseif (stripos($html, '</body>') !== false) {
                $html = preg_replace('/<\/body>/i', $payload . '</body>', $html, 1);
            }
        }

        if (empty($alts)) return $html;

        foreach ($alts as $key => $alt_text) {
            if (!is_string($alt_text) || trim($alt_text) === '') continue;
            // key peut être une URL complète ou un nom de fichier
            $filename = basename(parse_url((string) $key, PHP_URL_PATH) ?: (string) $key);
            if ($filename === '') continue;

            $escFilename = preg_quote($filename, '/');
            // Match toute balise <img> dont le src contient ce filename
            $pattern = '/<img\b([^>]*?)\bsrc=(["\'])([^"\']*' . $escFilename . ')\2([^>]*)>/i';

            $html = preg_replace_callback($pattern, function ($m) use ($alt_text) {
                $tag = $m[0];
                $escAlt = esc_attr((string) $alt_text);

                // Cas 1 : alt non vide → on remplace
                if (preg_match('/\balt\s*=\s*["\'][^"\']+["\']/', $tag)) {
                    return preg_replace(
                        '/\balt\s*=\s*["\'][^"\']*["\']/',
                        'alt="' . $escAlt . '"',
                        $tag,
                        1
                    );
                }
                // Cas 2 : alt="" vide → on remplit
                if (preg_match('/\balt\s*=\s*["\']["\']/', $tag)) {
                    return preg_replace(
                        '/\balt\s*=\s*["\']["\']/',
                        'alt="' . $escAlt . '"',
                        $tag,
                        1
                    );
                }
                // Cas 3 : pas d'attribut alt → on insère après <img
                return preg_replace('/<img\b/i', '<img alt="' . $escAlt . '"', $tag, 1);
            }, $html);
        }
        return $html;
    });
}
add_action('template_redirect', 'wanapush_image_alts_buffer_start', 1);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Endpoint REST de détection : /wp-json/wanapush/v1/ping
//    Permet à WanaPush de vérifier que le plugin est installé et actif.
// ─────────────────────────────────────────────────────────────────────────────

function wanapush_register_rest_routes() {
    register_rest_route('wanapush/v1', '/ping', [
        'methods'             => 'GET',
        'callback'            => function () {
            return [
                'plugin'  => 'wanapush-seo',
                'version' => WANAPUSH_SEO_VERSION,
                'php'     => PHP_VERSION,
                'wp'      => get_bloginfo('version'),
                'site'    => [
                    'name'        => get_bloginfo('name'),
                    'description' => get_bloginfo('description'),
                    'url'         => get_bloginfo('url'),
                    'language'    => get_bloginfo('language'),
                ],
                'meta_keys' => [
                    '_wanapush_meta_title',
                    '_wanapush_meta_description',
                    '_wanapush_canonical',
                    '_wanapush_og_title',
                    '_wanapush_og_description',
                    '_wanapush_og_image',
                    '_wanapush_robots',
                    '_wanapush_schema_jsonld',
                    '_wanapush_image_alts',
                    '_wanapush_extra_html',
                    '_wanapush_normalize_h1',
                ],
            ];
        },
        'permission_callback' => '__return_true',
    ]);
}
add_action('rest_api_init', 'wanapush_register_rest_routes');
