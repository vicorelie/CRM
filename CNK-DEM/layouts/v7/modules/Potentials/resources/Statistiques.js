(function() {
	'use strict';

	var Statistiques = {
		data: null,
		charts: {},
		isAdmin: false,

		init: function() {
			this.isAdmin = jQuery('#stats-is-admin').val() === '1';
			// Hide sidebar and expand content to full width
			jQuery('#sidebar-essentials').addClass('hide');
			jQuery('.listViewPageDiv').addClass('full-width');
			this.populateYearFilter();
			this.setDefaultMonth();
			this.registerEvents();
			this.loadData();
		},

		populateYearFilter: function() {
			var currentYear = new Date().getFullYear();
			var select = jQuery('#stats-year-filter');
			for (var y = currentYear; y >= currentYear - 3; y--) {
				select.append('<option value="' + y + '">' + y + '</option>');
			}
		},

		setDefaultMonth: function() {
			var currentMonth = new Date().getMonth() + 1;
			jQuery('#stats-month-filter').val(currentMonth);
		},

		registerEvents: function() {
			var self = this;
			jQuery('#stats-year-filter').on('change', function() {
				self.loadData();
			});
			jQuery('#stats-month-filter').on('change', function() {
				self.loadData();
			});
			jQuery('#stats-user-filter').on('change', function() {
				self.loadData();
			});
		},

		loadData: function() {
			var self = this;
			var year = jQuery('#stats-year-filter').val();
			var month = jQuery('#stats-month-filter').val() || '0';
			var userFilter = jQuery('#stats-user-filter').val() || 'me';

			jQuery.ajax({
				url: 'index.php',
				type: 'POST',
				data: {
					module: 'Potentials',
					action: 'GetStatistiquesData',
					year: year,
					month: month,
					user_filter: userFilter
				},
				dataType: 'json',
				success: function(response) {
					if (response && response.success) {
						self.data = response;
						self.updateKPIs();
						self.renderCharts();
						self.renderTable();
					}
				},
				error: function() {
					console.error('[Statistiques] Failed to load data');
				}
			});
		},

		updateKPIs: function() {
			var d = this.data;
			jQuery('#kpi-total-ht').text(this.formatCurrency(d.validated_total.total_ht));
			jQuery('#kpi-total-count').text(d.validated_total.count + ' devis valid\u00e9s');
			jQuery('#kpi-validated-count').text(d.validated_total.count);
			jQuery('#kpi-validated-ht').text(this.formatCurrency(d.validated_total.total_ht));
			jQuery('#kpi-pending-count').text(d.pending.count);
			jQuery('#kpi-pending-ht').text(this.formatCurrency(d.pending.total_ht));
			jQuery('#kpi-conversion-rate').text(d.conversion_rate + ' %');
			jQuery('#kpi-avg-value').text(this.formatCurrency(d.avg_quote_value));
		},

		renderCharts: function() {
			this.renderBarChart();
			this.renderLineChart();
			if (this.isAdmin) {
				this.renderPieChart();
			}
		},

		renderBarChart: function() {
			this.destroyChart('chart-monthly-count');
			var monthly = this.data.monthly;

			if (!monthly || monthly.length === 0) {
				jQuery('#chart-monthly-count').hide();
				jQuery('#chart-monthly-count-empty').show();
				return;
			}
			jQuery('#chart-monthly-count').show();
			jQuery('#chart-monthly-count-empty').hide();

			// Build full 12-month data
			var year = this.data.year;
			var allMonths = this.buildFullYear(monthly, year);
			var labels = [];
			var values = [];
			for (var i = 0; i < allMonths.length; i++) {
				labels.push(allMonths[i].label);
				values.push(allMonths[i].count);
			}

			try {
				this.charts['chart-monthly-count'] = jQuery.jqplot('chart-monthly-count', [values], {
					seriesDefaults: {
						renderer: jQuery.jqplot.BarRenderer,
						rendererOptions: {
							barWidth: 30,
							shadow: false
						},
						pointLabels: { show: true, location: 'n' }
					},
					series: [{ color: '#27ae60' }],
					axes: {
						xaxis: {
							renderer: jQuery.jqplot.CategoryAxisRenderer,
							ticks: labels,
							tickRenderer: jQuery.jqplot.CanvasAxisTickRenderer,
							tickOptions: { angle: -30, fontSize: '11px' }
						},
						yaxis: {
							min: 0,
							tickOptions: { formatString: '%d' }
						}
					},
					grid: { shadow: false, borderWidth: 1, background: '#fff' },
					highlighter: {
						show: true,
						tooltipContentEditor: function(str, seriesIndex, pointIndex) {
							return labels[pointIndex] + ': ' + values[pointIndex] + ' devis';
						}
					}
				});
			} catch (e) {
				console.error('[Statistiques] Bar chart error:', e);
			}
		},

		renderLineChart: function() {
			this.destroyChart('chart-monthly-amount');
			var monthly = this.data.monthly;

			if (!monthly || monthly.length === 0) {
				jQuery('#chart-monthly-amount').hide();
				jQuery('#chart-monthly-amount-empty').show();
				return;
			}
			jQuery('#chart-monthly-amount').show();
			jQuery('#chart-monthly-amount-empty').hide();

			var year = this.data.year;
			var allMonths = this.buildFullYear(monthly, year);
			var labels = [];
			var values = [];
			for (var i = 0; i < allMonths.length; i++) {
				labels.push(allMonths[i].label);
				values.push(allMonths[i].total_ht);
			}

			var self = this;
			try {
				this.charts['chart-monthly-amount'] = jQuery.jqplot('chart-monthly-amount', [values], {
					seriesDefaults: {
						pointLabels: { show: false },
						rendererOptions: { smooth: true },
						markerOptions: { size: 8, style: 'filledCircle' }
					},
					series: [{ color: '#2980b9', lineWidth: 3 }],
					axes: {
						xaxis: {
							renderer: jQuery.jqplot.CategoryAxisRenderer,
							ticks: labels,
							tickRenderer: jQuery.jqplot.CanvasAxisTickRenderer,
							tickOptions: { angle: -30, fontSize: '11px' }
						},
						yaxis: {
							min: 0,
							tickOptions: { formatString: '%.0f \u20ac' }
						}
					},
					grid: { shadow: false, borderWidth: 1, background: '#fff' },
					highlighter: {
						show: true,
						tooltipContentEditor: function(str, seriesIndex, pointIndex) {
							return labels[pointIndex] + ': ' + self.formatCurrency(values[pointIndex]);
						}
					}
				});
			} catch (e) {
				console.error('[Statistiques] Line chart error:', e);
			}
		},

		renderPieChart: function() {
			this.destroyChart('chart-user-pie');
			var perUser = this.data.per_user;

			if (!perUser || perUser.length === 0) {
				jQuery('#chart-user-pie').hide();
				jQuery('#chart-user-pie-empty').show();
				return;
			}
			jQuery('#chart-user-pie').show();
			jQuery('#chart-user-pie-empty').hide();

			var pieData = [];
			for (var i = 0; i < perUser.length; i++) {
				pieData.push([perUser[i].user_name, perUser[i].total_ht]);
			}

			var self = this;
			var colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
			try {
				this.charts['chart-user-pie'] = jQuery.jqplot('chart-user-pie', [pieData], {
					seriesDefaults: {
						renderer: jQuery.jqplot.PieRenderer,
						rendererOptions: {
							showDataLabels: true,
							dataLabels: 'percent',
							shadow: false,
							sliceMargin: 2,
							startAngle: -90
						}
					},
					seriesColors: colors,
					legend: {
						show: true,
						location: 's',
						placement: 'outsideGrid',
						rendererOptions: { numberRows: 2 }
					},
					grid: { shadow: false, borderWidth: 0, background: '#fff' },
					highlighter: {
						show: true,
						useAxesFormatters: false,
						tooltipContentEditor: function(str, seriesIndex, pointIndex, jqPlot) {
							var d = jqPlot.data[seriesIndex][pointIndex];
							return d[0] + ': ' + self.formatCurrency(d[1]);
						}
					}
				});
			} catch (e) {
				console.error('[Statistiques] Pie chart error:', e);
			}
		},

		renderTable: function() {
			var monthly = this.data.monthly;
			var year = this.data.year;
			var allMonths = this.buildFullYear(monthly, year);
			var tbody = jQuery('#stats-monthly-tbody');
			tbody.empty();

			if (allMonths.length === 0) {
				tbody.append('<tr><td colspan="3" class="text-center text-muted">Aucune donn\u00e9e</td></tr>');
				jQuery('#stats-monthly-tfoot').hide();
				return;
			}

			var totalCount = 0;
			var totalHT = 0;

			for (var i = 0; i < allMonths.length; i++) {
				var m = allMonths[i];
				totalCount += m.count;
				totalHT += m.total_ht;
				var rowClass = m.count > 0 ? '' : ' class="text-muted"';
				tbody.append(
					'<tr' + rowClass + '>' +
					'<td>' + m.label + '</td>' +
					'<td class="text-right">' + m.count + '</td>' +
					'<td class="text-right">' + this.formatCurrency(m.total_ht) + '</td>' +
					'</tr>'
				);
			}

			jQuery('#stats-total-count').text(totalCount);
			jQuery('#stats-total-ht').text(this.formatCurrency(totalHT));
			jQuery('#stats-monthly-tfoot').show();
		},

		buildFullYear: function(monthly, year) {
			var monthNames = ['Jan', 'F\u00e9v', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Ao\u00fb', 'Sep', 'Oct', 'Nov', 'D\u00e9c'];
			var dataMap = {};
			for (var i = 0; i < monthly.length; i++) {
				dataMap[monthly[i].month] = monthly[i];
			}

			var result = [];
			for (var m = 1; m <= 12; m++) {
				var key = year + '-' + (m < 10 ? '0' + m : '' + m);
				var label = monthNames[m - 1] + ' ' + year;
				if (dataMap[key]) {
					result.push({
						month: key,
						label: label,
						count: dataMap[key].count,
						total_ht: dataMap[key].total_ht
					});
				} else {
					result.push({
						month: key,
						label: label,
						count: 0,
						total_ht: 0
					});
				}
			}
			return result;
		},

		formatCurrency: function(value) {
			var num = parseFloat(value) || 0;
			return num.toLocaleString('fr-FR', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}) + ' \u20ac';
		},

		destroyChart: function(chartId) {
			if (this.charts[chartId]) {
				this.charts[chartId].destroy();
				delete this.charts[chartId];
			}
			jQuery('#' + chartId).empty();
		}
	};

	jQuery(document).ready(function() {
		Statistiques.init();
	});
})();
