/**
 * ARIDEM CRM - Modern Theme JavaScript
 * Animations et interactions modernes
 */

(function($) {
    'use strict';

    // Attendre que le DOM soit chargé
    $(document).ready(function() {

        // Initialiser toutes les améliorations
        initModernTheme();

        /**
         * Fonction principale d'initialisation
         */
        function initModernTheme() {
            addFadeInAnimations();
            enhanceButtons();
            enhanceCards();
            enhanceTables();
            enhanceForms();
            addSmoothScroll();
            addLoadingStates();
            enhanceModals();
            addTooltipEnhancements();
            addSearchEnhancements();
        }

        /**
         * Ajouter des animations d'apparition progressive
         */
        function addFadeInAnimations() {
            // Animer les panels et widgets au chargement
            $('.panel, .widget, .dashboard-widget').each(function(index) {
                var $elem = $(this);
                setTimeout(function() {
                    $elem.addClass('fade-in-up');
                }, index * 50); // Délai progressif
            });

            // Animer les lignes de tableau
            $('.table tbody tr').each(function(index) {
                if (index < 20) { // Limiter aux 20 premières lignes pour la performance
                    var $row = $(this);
                    setTimeout(function() {
                        $row.css({
                            'opacity': '0',
                            'transform': 'translateY(10px)'
                        }).animate({
                            'opacity': 1
                        }, 300).css({
                            'transform': 'translateY(0)',
                            'transition': 'transform 0.3s ease'
                        });
                    }, index * 20);
                }
            });
        }

        /**
         * Améliorer les boutons avec des effets ripple
         */
        function enhanceButtons() {
            // Effet ripple sur les boutons
            $('.btn').on('click', function(e) {
                var $btn = $(this);
                var $ripple = $('<span class="ripple"></span>');

                var diameter = Math.max($btn.outerWidth(), $btn.outerHeight());
                var radius = diameter / 2;

                $ripple.css({
                    width: diameter,
                    height: diameter,
                    left: e.pageX - $btn.offset().left - radius,
                    top: e.pageY - $btn.offset().top - radius
                });

                $btn.append($ripple);

                setTimeout(function() {
                    $ripple.remove();
                }, 600);
            });

            // Ajouter des icônes de chargement sur les boutons submit
            $('button[type="submit"], .btn-submit').on('click', function() {
                var $btn = $(this);
                if (!$btn.hasClass('loading')) {
                    var originalText = $btn.html();
                    $btn.data('original-text', originalText);
                    $btn.html('<i class="fa fa-spinner fa-spin"></i> ' + originalText);
                    $btn.addClass('loading').prop('disabled', true);

                    // Retirer le loading après 3 secondes (sécurité)
                    setTimeout(function() {
                        if ($btn.hasClass('loading')) {
                            $btn.html(originalText).removeClass('loading').prop('disabled', false);
                        }
                    }, 3000);
                }
            });
        }

        /**
         * Améliorer les cards avec des effets hover
         */
        function enhanceCards() {
            // Ajouter un effet de surbrillance sur les cards
            $('.panel, .widget, .dashboard-widget').hover(
                function() {
                    $(this).css({
                        'transform': 'translateY(-4px)',
                        'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    });
                },
                function() {
                    $(this).css({
                        'transform': 'translateY(0)',
                        'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    });
                }
            );
        }

        /**
         * Améliorer les tables avec des animations
         */
        function enhanceTables() {
            // Animer les lignes au survol
            $('.table tbody tr').hover(
                function() {
                    $(this).css({
                        'transform': 'scale(1.01)',
                        'transition': 'all 0.2s ease'
                    });
                },
                function() {
                    $(this).css({
                        'transform': 'scale(1)',
                        'transition': 'all 0.2s ease'
                    });
                }
            );

            // Améliorer les checkboxes dans les tables
            $('.table input[type="checkbox"]').on('change', function() {
                var $row = $(this).closest('tr');
                if ($(this).is(':checked')) {
                    $row.css({
                        'background': 'rgba(79, 70, 229, 0.05)',
                        'transition': 'background 0.3s ease'
                    });
                } else {
                    $row.css({
                        'background': '',
                        'transition': 'background 0.3s ease'
                    });
                }
            });

            // Tri de table avec animation
            $('.table th.sortable, .table th[data-sort]').on('click', function() {
                $(this).find('.fa, .glyphicon').addClass('fa-spin');
                setTimeout(function() {
                    $('.fa-spin').removeClass('fa-spin');
                }, 500);
            });
        }

        /**
         * Améliorer les formulaires
         */
        function enhanceForms() {
            // Effet focus sur les inputs
            $('.form-control').on('focus', function() {
                $(this).closest('.form-group').addClass('focused');
            }).on('blur', function() {
                $(this).closest('.form-group').removeClass('focused');
            });

            // Labels flottants pour les inputs non vides
            $('.form-control').each(function() {
                if ($(this).val()) {
                    $(this).addClass('has-value');
                }
            }).on('change keyup', function() {
                if ($(this).val()) {
                    $(this).addClass('has-value');
                } else {
                    $(this).removeClass('has-value');
                }
            });

            // Validation visuelle
            $('.form-control').on('blur', function() {
                var $input = $(this);
                if ($input.attr('required') && !$input.val()) {
                    $input.css('border-color', '#EF4444');
                    setTimeout(function() {
                        $input.css('border-color', '');
                    }, 2000);
                }
            });
        }

        /**
         * Ajouter un scroll fluide
         */
        function addSmoothScroll() {
            $('a[href^="#"]').on('click', function(e) {
                var target = $(this.getAttribute('href'));
                if (target.length) {
                    e.preventDefault();
                    $('html, body').stop().animate({
                        scrollTop: target.offset().top - 100
                    }, 600, 'swing');
                }
            });

            // Bouton "retour en haut"
            if ($('#back-to-top').length === 0) {
                $('body').append('<button id="back-to-top" class="btn btn-primary" style="position: fixed; bottom: 30px; right: 30px; z-index: 9999; display: none; border-radius: 50%; width: 50px; height: 50px; padding: 0;"><i class="fa fa-arrow-up"></i></button>');
            }

            $(window).scroll(function() {
                if ($(this).scrollTop() > 300) {
                    $('#back-to-top').fadeIn();
                } else {
                    $('#back-to-top').fadeOut();
                }
            });

            $('#back-to-top').on('click', function() {
                $('html, body').animate({scrollTop: 0}, 600);
                return false;
            });
        }

        /**
         * Ajouter des états de chargement
         */
        function addLoadingStates() {
            // Intercepter les soumissions de formulaires
            $('form').on('submit', function() {
                var $form = $(this);
                if (!$form.hasClass('no-loader')) {
                    showLoader();
                }
            });

            // Intercepter les clics sur les liens de navigation
            $('a[href]:not([target="_blank"]):not([href^="#"]):not(.no-loader)').on('click', function(e) {
                var href = $(this).attr('href');
                if (href && href !== '#' && href.indexOf('javascript:') === -1) {
                    showLoader();
                }
            });

            // Fonction pour afficher le loader
            function showLoader() {
                if ($('#page-loader').length === 0) {
                    $('body').append('<div id="page-loader" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.9); z-index: 99999; display: flex; align-items: center; justify-content: center;"><div style="text-align: center;"><i class="fa fa-spinner fa-spin fa-3x" style="color: #4F46E5;"></i><p style="margin-top: 20px; color: #6B7280; font-weight: 500;">Chargement...</p></div></div>');

                    // Auto-hide après 10 secondes (sécurité)
                    setTimeout(function() {
                        $('#page-loader').fadeOut(300, function() {
                            $(this).remove();
                        });
                    }, 10000);
                }
            }
        }

        /**
         * Améliorer les modals
         */
        function enhanceModals() {
            // Animation d'apparition des modals
            $('.modal').on('show.bs.modal', function() {
                var $modal = $(this);
                $modal.find('.modal-dialog').css({
                    'transform': 'scale(0.7)',
                    'opacity': '0'
                });

                setTimeout(function() {
                    $modal.find('.modal-dialog').css({
                        'transform': 'scale(1)',
                        'opacity': '1',
                        'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    });
                }, 10);
            });

            // Animation de fermeture
            $('.modal').on('hide.bs.modal', function() {
                var $modal = $(this);
                $modal.find('.modal-dialog').css({
                    'transform': 'scale(0.7)',
                    'opacity': '0',
                    'transition': 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                });
            });
        }

        /**
         * Améliorer les tooltips
         */
        function addTooltipEnhancements() {
            // Réinitialiser les tooltips avec animation
            if ($.fn.tooltip) {
                $('[data-toggle="tooltip"], .tooltip-trigger').tooltip({
                    animation: true,
                    delay: { show: 300, hide: 100 },
                    container: 'body'
                });
            }
        }

        /**
         * Améliorer la recherche
         */
        function addSearchEnhancements() {
            // Animer l'icône de recherche lors de la saisie
            $('.search-module-typeahead, input[type="search"]').on('keyup', function() {
                var $input = $(this);
                var $icon = $input.siblings('.fa-search, .glyphicon-search');

                if ($icon.length) {
                    $icon.addClass('fa-spin');
                    setTimeout(function() {
                        $icon.removeClass('fa-spin');
                    }, 500);
                }
            });

            // Effet focus sur la barre de recherche
            $('.search-module-typeahead').on('focus', function() {
                $(this).closest('.search-container, .form-group').addClass('search-active');
            }).on('blur', function() {
                $(this).closest('.search-container, .form-group').removeClass('search-active');
            });
        }

        /**
         * Ajouter des notifications toast modernes
         */
        function showToast(message, type = 'info', duration = 3000) {
            var bgColor = {
                'success': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                'error': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                'warning': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                'info': 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)'
            };

            var $toast = $('<div class="modern-toast" style="position: fixed; top: 20px; right: 20px; z-index: 99999; padding: 16px 24px; border-radius: 8px; background: ' + (bgColor[type] || bgColor['info']) + '; color: white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); min-width: 250px; max-width: 400px; transform: translateX(500px); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);"><i class="fa fa-' + (type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation' : 'info') + '-circle" style="margin-right: 10px;"></i>' + message + '</div>');

            $('body').append($toast);

            setTimeout(function() {
                $toast.css('transform', 'translateX(0)');
            }, 10);

            setTimeout(function() {
                $toast.css('transform', 'translateX(500px)');
                setTimeout(function() {
                    $toast.remove();
                }, 300);
            }, duration);
        }

        // Exposer showToast globalement
        window.showModernToast = showToast;

        /**
         * Améliorer les dropdowns
         */
        $('.dropdown').on('show.bs.dropdown', function() {
            var $dropdown = $(this).find('.dropdown-menu');
            $dropdown.css({
                'opacity': '0',
                'transform': 'translateY(-10px)'
            });

            setTimeout(function() {
                $dropdown.css({
                    'opacity': '1',
                    'transform': 'translateY(0)',
                    'transition': 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                });
            }, 10);
        });

        /**
         * Améliorer les tabs
         */
        $('.nav-tabs a').on('shown.bs.tab', function(e) {
            var target = $(e.target).attr('href');
            $(target).css({
                'opacity': '0',
                'transform': 'translateY(10px)'
            }).animate({
                'opacity': 1
            }, 300).css({
                'transform': 'translateY(0)',
                'transition': 'transform 0.3s ease'
            });
        });

        /**
         * Performance: Lazy loading des images
         */
        if ('IntersectionObserver' in window) {
            var imageObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img.lazy').forEach(function(img) {
                imageObserver.observe(img);
            });
        }

        /**
         * Ajouter des styles CSS dynamiques pour le ripple
         */
        if ($('#modern-theme-ripple-style').length === 0) {
            $('head').append('<style id="modern-theme-ripple-style">' +
                '.ripple { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.6); transform: scale(0); animation: ripple-animation 0.6s ease-out; pointer-events: none; }' +
                '@keyframes ripple-animation { to { transform: scale(2); opacity: 0; } }' +
                '.btn { position: relative; overflow: hidden; }' +
                '.focused .form-control { border-color: #818CF8 !important; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1) !important; }' +
                '.search-active { transform: scale(1.02); transition: transform 0.2s ease; }' +
                '</style>');
        }

        // Console log pour confirmer le chargement
        console.log('%c🎨 ARIDEM Modern Theme loaded successfully!', 'color: #4F46E5; font-weight: bold; font-size: 14px;');
        console.log('%cVersion: 1.0.0', 'color: #6B7280; font-size: 12px;');
    });

})(jQuery);
