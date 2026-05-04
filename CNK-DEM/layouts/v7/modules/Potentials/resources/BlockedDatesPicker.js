/**
 * Transforme les <input type="date" class="cnk-blockable-date"> en flatpickr
 * avec les dates marquées "complètes" grisées et désactivées.
 *
 * Utilisation: ajouter la classe "cnk-blockable-date" sur n'importe quel input.
 * Les dates bloquées sont chargées une fois au démarrage et appliquées
 * automatiquement (y compris aux inputs ajoutés dynamiquement par AJAX).
 */
(function() {
    if (window.CNKBlockedDates) return; // already initialized

    var BD = {
        loaded: false,
        loading: false,
        blockedSet: new Set(),
        pendingInputs: [],

        init: function() {
            var self = this;
            this.load();
            this.attachAll();
            // Re-scan when AJAX requests complete (covers tab loading)
            jQuery(document).ajaxComplete(function(event, xhr, settings) {
                // Skip our own AJAX calls
                if (settings && settings.url && settings.url.indexOf('GetBlockedDates') !== -1) return;
                if (settings && settings.url && settings.url.indexOf('BlockedDates') !== -1) return;
                self.attachAll();
            });
            // Lazy attach on focus/click (covers any late-loaded inputs)
            jQuery(document).on('focusin mousedown', 'input.cnk-blockable-date', function() {
                if (!this._cnkBlockedAttached) self.attach(this);
            });
        },

        load: function() {
            if (this.loading || this.loaded) return;
            this.loading = true;
            var self = this;
            jQuery.ajax({
                url: 'index.php?module=Vtiger&action=GetBlockedDates',
                type: 'GET',
                dataType: 'json',
                success: function(resp) {
                    var data = (resp && resp.result && resp.result.data) || [];
                    self.blockedSet = new Set(data.map(function(d) { return d.date; }));
                    self.loaded = true;
                    self.loading = false;
                    self.flushPending();
                    self.attachAll();
                },
                error: function() {
                    self.loading = false;
                    console.warn('[CNKBlockedDates] failed to load');
                }
            });
        },

        flushPending: function() {
            var self = this;
            this.pendingInputs.forEach(function(el) { self.attach(el); });
            this.pendingInputs = [];
        },

        attachAll: function() {
            var self = this;
            jQuery('input.cnk-blockable-date').each(function() { self.attach(this); });
        },

        attach: function(input) {
            if (!input || input._cnkBlockedAttached) return;
            // Skip flatpickr's own altInput sibling (created with altInput:true)
            if (input.classList && (input.classList.contains('flatpickr-alt-input') || input.classList.contains('flatpickr-input'))) return;
            if (input._flatpickr) return; // already has a flatpickr instance
            if (typeof flatpickr === 'undefined') return; // flatpickr not loaded yet
            if (!this.loaded) {
                this.pendingInputs.push(input);
                return;
            }
            input._cnkBlockedAttached = true;
            var self = this;

            var initialValue = input.value || '';
            // Convert <input type="date"> -> <input type="text"> to avoid native picker
            try { input.type = 'text'; } catch (e) {}

            flatpickr(input, {
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'd/m/Y',
                allowInput: false,
                showMonths: 1,
                locale: (typeof flatpickr.l10ns !== 'undefined' && flatpickr.l10ns.fr) ? flatpickr.l10ns.fr : 'default',
                defaultDate: initialValue || null,
                disable: [function(d) {
                    var iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
                    return self.blockedSet.has(iso);
                }],
                onDayCreate: function(dObj, dStr, fp, dayElem) {
                    var d = dayElem.dateObj;
                    if (!d) return;
                    var iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
                    if (self.blockedSet.has(iso)) {
                        dayElem.classList.add('cnk-blocked-day');
                        dayElem.title = 'Date bloquée';
                    }
                },
                onChange: function(selectedDates, dateStr) {
                    // Trigger change on the original input so existing handlers fire
                    jQuery(input).trigger('change').trigger('input');
                },
                onReady: function(selectedDates, dateStr, fp) {
                    // Mark the altInput sibling so it's not re-processed
                    if (fp.altInput) {
                        fp.altInput._cnkBlockedAttached = true;
                        fp.altInput.classList.remove('cnk-blockable-date');
                    }
                }
            });
        },

    };

    // Inject CSS for blocked dates (red, non-clickable)
    var css = ''
        + '.flatpickr-day.flatpickr-disabled.cnk-blocked-day,'
        + '.flatpickr-day.cnk-blocked-day {'
        + '  background: #f8d7da !important;'
        + '  color: #c82333 !important;'
        + '  border-color: #f5c6cb !important;'
        + '  text-decoration: line-through !important;'
        + '  font-weight: bold !important;'
        + '  cursor: not-allowed !important;'
        + '  opacity: 1 !important;'
        + '}'
        + '.flatpickr-day.cnk-blocked-day:hover {'
        + '  background: #f5c6cb !important;'
        + '  color: #721c24 !important;'
        + '}';
    var styleEl = document.createElement('style');
    styleEl.type = 'text/css';
    styleEl.appendChild(document.createTextNode(css));
    document.head.appendChild(styleEl);

    window.CNKBlockedDates = BD;
    jQuery(document).ready(function() { BD.init(); });
})();
