{*+**********************************************************************************
 * Custom PostProcess for Potentials ListView - Modern Design (Compact + Effects)
 ************************************************************************************}
	</div>
</div>

<style>
/* ============================================
   POTENTIALS LIST VIEW - COMPACT + EFFECTS
   ============================================ */

/* Background page */
body .main-container.main-container-Potentials .listViewPageDiv.content-area {
    background: #f4f6f9 !important;
}

/* Table container - flat border */
body .main-container-Potentials #listViewContent .table-container,
body .main-container-Potentials .listViewPageDiv .table-container {
    background: #fff !important;
    border-radius: 8px !important;
    border: 1px solid #e5e7eb !important;
    overflow: hidden !important;
    margin-top: 4px !important;
    transition: border-color 0.3s ease !important;
}

body .main-container-Potentials #listViewContent .table-container:hover,
body .main-container-Potentials .listViewPageDiv .table-container:hover {
    border-color: #c5cae9 !important;
}

/* Table reset */
body .main-container-Potentials table.listview-table,
body .main-container-Potentials #listview-table {
    margin-bottom: 0 !important;
    border: none !important;
}

/* ---- HEADER GRADIENT ---- */
body .main-container-Potentials table.listview-table thead tr.listViewContentHeader,
body .main-container-Potentials #listview-table thead tr.listViewContentHeader {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
}

body .main-container-Potentials table.listview-table thead tr.listViewContentHeader > th,
body .main-container-Potentials #listview-table thead tr.listViewContentHeader > th {
    background: transparent !important;
    color: #fff !important;
    border: none !important;
    border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
    padding: 7px 8px !important;
    font-weight: 600 !important;
    font-size: 12px !important;
    letter-spacing: 0.3px !important;
    text-transform: uppercase !important;
}

body .main-container-Potentials tr.listViewContentHeader > th:last-child {
    border-right: none !important;
}

body .main-container-Potentials tr.listViewContentHeader th a,
body .main-container-Potentials tr.listViewContentHeader th a:hover,
body .main-container-Potentials tr.listViewContentHeader th a.listViewContentHeaderValues {
    color: #fff !important;
    text-decoration: none !important;
    transition: opacity 0.2s ease !important;
}

body .main-container-Potentials tr.listViewContentHeader th a:hover {
    opacity: 0.85 !important;
}

body .main-container-Potentials tr.listViewContentHeader th .fa-sort,
body .main-container-Potentials tr.listViewContentHeader th .customsort {
    color: rgba(255, 255, 255, 0.5) !important;
    transition: color 0.2s ease !important;
}

body .main-container-Potentials tr.listViewContentHeader th:hover .fa-sort,
body .main-container-Potentials tr.listViewContentHeader th:hover .customsort {
    color: rgba(255, 255, 255, 0.8) !important;
}

body .main-container-Potentials tr.listViewContentHeader th .fa-sort-asc,
body .main-container-Potentials tr.listViewContentHeader th .fa-sort-desc {
    color: #fff !important;
}

/* Column filter icon */
body .main-container-Potentials .listColumnFilter {
    color: rgba(255, 255, 255, 0.7) !important;
    transition: color 0.2s ease, transform 0.2s ease !important;
}

body .main-container-Potentials .listColumnFilter:hover {
    color: #fff !important;
    transform: scale(1.15) !important;
}

/* ---- SEARCH ROW ---- */
body .main-container-Potentials table.listview-table thead tr.listViewSearchContainer > th,
body .main-container-Potentials #listview-table thead tr.searchRow > th {
    background: #fafaff !important;
    border: none !important;
    border-bottom: 1px solid #e5e7eb !important;
    padding: 4px 6px !important;
}

body .main-container-Potentials tr.listViewSearchContainer th input,
body .main-container-Potentials tr.listViewSearchContainer th select,
body .main-container-Potentials tr.searchRow th input,
body .main-container-Potentials tr.searchRow th select {
    border: 1px solid #ddd !important;
    border-radius: 4px !important;
    padding: 3px 6px !important;
    font-size: 11px !important;
    transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
    background: #fff !important;
}

body .main-container-Potentials tr.listViewSearchContainer th input:focus,
body .main-container-Potentials tr.listViewSearchContainer th select:focus {
    border-color: #667eea !important;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.15) !important;
    outline: none !important;
}

body .main-container-Potentials .inline-search-btn .btn-success,
body .main-container-Potentials button[data-trigger="listSearch"] {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    border: none !important;
    border-radius: 4px !important;
    font-weight: 600 !important;
    color: #fff !important;
    padding: 3px 10px !important;
    font-size: 11px !important;
    transition: opacity 0.2s ease, transform 0.15s ease !important;
}

body .main-container-Potentials .inline-search-btn .btn-success:hover,
body .main-container-Potentials button[data-trigger="listSearch"]:hover {
    opacity: 0.9 !important;
    transform: translateY(-1px) !important;
}

body .main-container-Potentials .inline-search-btn .btn-danger,
body .main-container-Potentials .searchAndClearButton {
    background: #e74c3c !important;
    border: none !important;
    border-radius: 4px !important;
    font-weight: 600 !important;
    color: #fff !important;
    padding: 3px 10px !important;
    font-size: 11px !important;
    transition: opacity 0.2s ease, transform 0.15s ease !important;
}

body .main-container-Potentials .inline-search-btn .btn-danger:hover,
body .main-container-Potentials .searchAndClearButton:hover {
    opacity: 0.9 !important;
    transform: translateY(-1px) !important;
}

/* ---- DATA ROWS - Ne touche PAS au background des lignes ---- */
body .main-container-Potentials table.listview-table tbody tr.listViewEntries,
body .main-container-Potentials #listview-table tbody tr.listViewEntries {
    transition: transform 0.15s ease, box-shadow 0.15s ease !important;
}

body .main-container-Potentials table.listview-table tbody tr.listViewEntries:hover,
body .main-container-Potentials #listview-table tbody tr.listViewEntries:hover {
    transform: scale(1.002) !important;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1) !important;
    position: relative !important;
    z-index: 1 !important;
}

body .main-container-Potentials table.listview-table tbody tr.listViewEntries > td,
body .main-container-Potentials #listview-table tbody tr.listViewEntries > td {
    border: none !important;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
    padding: 5px 8px !important;
    font-size: 12px !important;
    vertical-align: middle !important;
    transition: padding-left 0.2s ease !important;
}

body .main-container-Potentials table.listview-table tbody tr.listViewEntries:last-child > td {
    border-bottom: none !important;
}

/* Name links */
body .main-container-Potentials table.listview-table tbody tr.listViewEntries td a {
    color: #667eea !important;
    font-weight: 600 !important;
    text-decoration: none !important;
    transition: color 0.2s ease !important;
    position: relative !important;
}

body .main-container-Potentials table.listview-table tbody tr.listViewEntries td a:hover {
    color: #764ba2 !important;
}

/* Underline effect on hover for name links */
body .main-container-Potentials table.listview-table tbody tr.listViewEntries td a::after {
    content: '' !important;
    position: absolute !important;
    bottom: -1px !important;
    left: 0 !important;
    width: 0 !important;
    height: 1.5px !important;
    background: linear-gradient(135deg, #667eea, #764ba2) !important;
    transition: width 0.3s ease !important;
}

body .main-container-Potentials table.listview-table tbody tr.listViewEntries td a:hover::after {
    width: 100% !important;
}

/* ---- ACTIONS COLUMN ---- */
body .main-container-Potentials td.listViewRecordActions {
    border-right: 1px solid rgba(0, 0, 0, 0.05) !important;
    padding: 4px 6px !important;
}

body .main-container-Potentials td.listViewRecordActions .table-actions {
    display: flex !important;
    align-items: center !important;
    gap: 3px !important;
}

body .main-container-Potentials td.listViewRecordActions .icon,
body .main-container-Potentials td.listViewRecordActions .fa {
    color: #aaa !important;
    font-size: 12px !important;
    transition: color 0.2s ease, transform 0.2s ease !important;
}

body .main-container-Potentials td.listViewRecordActions .icon:hover,
body .main-container-Potentials td.listViewRecordActions .fa:hover {
    color: #667eea !important;
    transform: scale(1.2) !important;
}

body .main-container-Potentials td.listViewRecordActions .markStar.active,
body .main-container-Potentials td.listViewRecordActions .fa-star.active {
    color: #f1c40f !important;
}

/* Checkboxes */
body .main-container-Potentials input.listViewEntriesCheckBox,
body .main-container-Potentials input.listViewEntriesMainCheckBox {
    accent-color: #667eea !important;
}

/* Picklist badges - compact pills */
body .main-container-Potentials span.picklist-color {
    padding: 2px 8px !important;
    border-radius: 10px !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    transition: filter 0.2s ease !important;
}

body .main-container-Potentials span.picklist-color:hover {
    filter: brightness(1.05) !important;
}

/* ---- DROPDOWN MENU ---- */
body .main-container-Potentials td.listViewRecordActions .dropdown-menu {
    border-radius: 6px !important;
    border: 1px solid #e5e7eb !important;
    padding: 2px 0 !important;
    animation: slideDown 0.15s ease !important;
}

@keyframes slideDown {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
}

body .main-container-Potentials td.listViewRecordActions .dropdown-menu > li > a {
    padding: 5px 12px !important;
    font-size: 12px !important;
    color: #333 !important;
    transition: background 0.15s ease, color 0.15s ease, padding-left 0.2s ease !important;
}

body .main-container-Potentials td.listViewRecordActions .dropdown-menu > li > a:hover {
    background: #f4f6f9 !important;
    color: #667eea !important;
    padding-left: 16px !important;
}

/* ---- TOP ACTION BAR - no custom styling ---- */

/* ---- PAGINATION ---- */
body .main-container-Potentials .pagination > li > a,
body .main-container-Potentials .pagination > li > span {
    border-radius: 4px !important;
    margin: 0 1px !important;
    border: 1px solid #e0e0e0 !important;
    color: #667eea !important;
    font-weight: 600 !important;
    padding: 4px 10px !important;
    font-size: 12px !important;
    transition: all 0.2s ease !important;
}

body .main-container-Potentials .pagination > li.active > a,
body .main-container-Potentials .pagination > li.active > span {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    border-color: transparent !important;
    color: #fff !important;
}

body .main-container-Potentials .pagination > li > a:hover {
    background: #f4f6f9 !important;
    border-color: #667eea !important;
    transform: translateY(-1px) !important;
}

/* ---- SIDEBAR ---- */
body .main-container-Potentials #sidebar-essentials {
    background: #fff !important;
}

body .main-container-Potentials #sidebar-essentials .module-filters .list-menu-item a {
    color: #555 !important;
    font-weight: 500 !important;
    border-radius: 4px !important;
    padding: 5px 10px !important;
    font-size: 12px !important;
    transition: all 0.2s ease !important;
}

body .main-container-Potentials #sidebar-essentials .module-filters .list-menu-item a:hover,
body .main-container-Potentials #sidebar-essentials .module-filters .list-menu-item.active a {
    background: #f4f6f9 !important;
    color: #667eea !important;
    padding-left: 14px !important;
}

/* ---- TOGGLE SIDEBAR ---- */
body .main-container-Potentials .essentials-toggle {
    background: #fff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 0 4px 4px 0 !important;
    transition: border-color 0.2s ease !important;
}

body .main-container-Potentials .essentials-toggle:hover {
    border-color: #667eea !important;
}

body .main-container-Potentials .essentials-toggle .essentials-toggle-marker {
    color: #667eea !important;
    transition: transform 0.2s ease !important;
}

body .main-container-Potentials .essentials-toggle:hover .essentials-toggle-marker {
    transform: scale(1.15) !important;
}

/* ---- RESET VTiger defaults ---- */
body .main-container-Potentials table.listview-table > thead > tr > th,
body .main-container-Potentials table.listview-table > tbody > tr > td {
    border-left: none !important;
}

body .main-container-Potentials .table > thead > tr > th {
    border-bottom: none !important;
}

body .main-container-Potentials .table > tbody > tr > td {
    border-top: none !important;
}

/* Empty state */
body .main-container-Potentials tr.emptyRecordsDiv td {
    padding: 40px 20px !important;
    text-align: center !important;
    color: #888 !important;
}

body .main-container-Potentials tr.emptyRecordsDiv a {
    color: #667eea !important;
    font-weight: 600 !important;
}
</style>
