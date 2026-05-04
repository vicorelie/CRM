/**
 * Validation + picker des dates bloquées sur input.cnk-blockable-date.
 *
 * Stratégie LAZY (pas d'observer, pas d'attachement au load) :
 *  - Au document.ready : charge la liste des dates bloquées (1 AJAX) et bind events
 *  - Au "change/blur" : warning badge rouge si la date saisie est bloquée
 *  - Au "mousedown/focusin" : lazy-attach flatpickr (1ère fois seulement)
 *    → calendrier avec dates bloquées en rouge + non-cliquables
 *  - flatpickr est chargé via CDN
 */
(function() {
    if (window.CNKBlockedDates) return;

    var BD = {
        loaded: false,
        blockedMap: {}, // { 'YYYY-MM-DD': 'comment' }
        flatpickrLoading: false,
        flatpickrReady: (typeof window.flatpickr !== 'undefined'),

        init: function() {
            this.injectCss();
            this.load();
            this.bindEvents();
            this.preloadFlatpickr();
        },

        injectCss: function() {
            var css = ''
                + '.cnk-blockable-date.cnk-blocked-input {'
                + '  background: #f8d7da !important;'
                + '  border: 2px solid #c82333 !important;'
                + '  color: #721c24 !important;'
                + '}'
                + '.cnk-blocked-warning {'
                + '  display: inline-block;'
                + '  margin-left: 6px;'
                + '  padding: 2px 8px;'
                + '  background: #c82333;'
                + '  color: #fff;'
                + '  font-size: 11px;'
                + '  border-radius: 3px;'
                + '  font-weight: bold;'
                + '}'
                + '.flatpickr-day.flatpickr-disabled.cnk-blocked-day,'
                + '.flatpickr-day.cnk-blocked-day {'
                + '  background: #f8d7da !important;'
                + '  color: #c82333 !important;'
                + '  border-color: #f5c6cb !important;'
                + '  text-decoration: line-through !important;'
                + '  font-weight: bold !important;'
                + '  cursor: not-allowed !important;'
                + '  opacity: 1 !important;'
                + '}';
            var el = document.createElement('style');
            el.appendChild(document.createTextNode(css));
            document.head.appendChild(el);
        },

        load: function() {
            var self = this;
            jQuery.ajax({
                url: 'index.php?module=Vtiger&action=GetBlockedDates',
                type: 'GET',
                dataType: 'json',
                cache: true,
                success: function(resp) {
                    var data = (resp && resp.result && resp.result.data) || [];
                    data.forEach(function(d) { self.blockedMap[d.date] = d.comment || ''; });
                    self.loaded = true;
                    jQuery('input.cnk-blockable-date').each(function() { self.check(this); });
                }
            });
        },

        preloadFlatpickr: function() {
            if (this.flatpickrReady || this.flatpickrLoading) return;
            this.flatpickrLoading = true;
            var self = this;
            // CSS
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.css';
            document.head.appendChild(link);
            // JS
            var script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.js';
            script.onload = function() {
                var locScript = document.createElement('script');
                locScript.src = 'https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/l10n/fr.js';
                locScript.onload = function() {
                    self.flatpickrReady = true;
                    self.flatpickrLoading = false;
                };
                locScript.onerror = function() {
                    self.flatpickrReady = true;
                    self.flatpickrLoading = false;
                };
                document.head.appendChild(locScript);
            };
            script.onerror = function() { self.flatpickrLoading = false; };
            document.head.appendChild(script);
        },

        bindEvents: function() {
            var self = this;
            // Validation badge au change/blur
            jQuery(document).on('change blur', 'input.cnk-blockable-date', function() {
                self.check(this);
            });
            // Lazy-attach flatpickr au focus/click
            jQuery(document).on('mousedown focusin', 'input.cnk-blockable-date', function(e) {
                self.attach(this);
            });
        },

        check: function(input) {
            if (!this.loaded) return;
            var $input = jQuery(input);
            var date = input.value;
            // Si flatpickr est attaché, son altInput a la valeur Y-m-d via le hidden original
            var $warning = $input.next('.cnk-blocked-warning');
            // Pour les altInput, on récupère la vraie valeur via _flatpickr.input
            if (input._flatpickr && input.classList.contains('flatpickr-alt-input')) {
                date = input._flatpickr.input.value;
            }
            if (date && this.blockedMap.hasOwnProperty(date)) {
                $input.addClass('cnk-blocked-input');
                var msg = '⚠️ Date bloquée' + (this.blockedMap[date] ? ' : ' + this.blockedMap[date] : '');
                if ($warning.length) {
                    $warning.text(msg);
                } else {
                    $input.after('<span class="cnk-blocked-warning">' + jQuery('<div>').text(msg).html() + '</span>');
                }
            } else {
                $input.removeClass('cnk-blocked-input');
                if ($warning.length) $warning.remove();
            }
        },

        attach: function(input) {
            if (!input || input._cnkBlockedAttached) return;
            if (input.classList && (input.classList.contains('flatpickr-alt-input') || input.classList.contains('flatpickr-input'))) return;
            if (input._flatpickr) return;
            if (!this.flatpickrReady) {
                // flatpickr pas encore chargé : laisser le picker natif fonctionner pour cette fois
                return;
            }
            input._cnkBlockedAttached = true;
            var self = this;
            var initialValue = input.value || '';
            try { input.type = 'text'; } catch (e) {}

            window.flatpickr(input, {
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'd/m/Y',
                allowInput: false,
                showMonths: 1,
                locale: (window.flatpickr && window.flatpickr.l10ns && window.flatpickr.l10ns.fr) ? window.flatpickr.l10ns.fr : 'default',
                defaultDate: initialValue || null,
                disable: [function(d) {
                    var iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
                    return self.blockedMap.hasOwnProperty(iso);
                }],
                onDayCreate: function(dObj, dStr, fp, dayElem) {
                    var d = dayElem.dateObj;
                    if (!d) return;
                    var iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
                    if (self.blockedMap.hasOwnProperty(iso)) {
                        dayElem.classList.add('cnk-blocked-day');
                        dayElem.title = 'Date bloquée' + (self.blockedMap[iso] ? ' : ' + self.blockedMap[iso] : '');
                    }
                },
                onChange: function(selectedDates, dateStr) {
                    jQuery(input).trigger('change').trigger('input');
                    self.check(input);
                },
                onReady: function(selectedDates, dateStr, fp) {
                    if (fp.altInput) {
                        fp.altInput._cnkBlockedAttached = true;
                        fp.altInput.classList.remove('cnk-blockable-date');
                    }
                    // Ouvre le calendrier directement à l'attachement (clic initial déjà fait)
                    setTimeout(function() { try { fp.open(); } catch (e) {} }, 0);
                }
            });
        }
    };

    window.CNKBlockedDates = BD;
    jQuery(document).ready(function() { BD.init(); });
})();
