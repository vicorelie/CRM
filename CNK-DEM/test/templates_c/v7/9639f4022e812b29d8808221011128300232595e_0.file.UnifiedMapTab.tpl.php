<?php
/* Smarty version 4.5.5, created on 2026-02-10 14:11:39
  from '/var/www/CNK-DEM/layouts/v7/modules/Potentials/UnifiedMapTab.tpl' */

/* @var Smarty_Internal_Template $_smarty_tpl */
if ($_smarty_tpl->_decodeProperties($_smarty_tpl, array (
  'version' => '4.5.5',
  'unifunc' => 'content_698b207b96b547_84199500',
  'has_nocache_code' => false,
  'file_dependency' => 
  array (
    '9639f4022e812b29d8808221011128300232595e' => 
    array (
      0 => '/var/www/CNK-DEM/layouts/v7/modules/Potentials/UnifiedMapTab.tpl',
      1 => 1770720378,
      2 => 'file',
    ),
  ),
  'includes' => 
  array (
  ),
),false)) {
function content_698b207b96b547_84199500 (Smarty_Internal_Template $_smarty_tpl) {
?><div class="map-tab-container" id="mapTabContainer" data-record-id="<?php echo $_smarty_tpl->tpl_vars['RECORD_ID']->value;?>
"><?php if ($_smarty_tpl->tpl_vars['ADRESSE_ORIGINE']->value || $_smarty_tpl->tpl_vars['ADRESSE_DESTINATION']->value) {?><div class="form-row"><?php if ($_smarty_tpl->tpl_vars['ADRESSE_ORIGINE']->value) {?><div class="card" style="padding: 0; overflow: hidden;"><div class="card-header header-green" style="margin: 0; border-radius: 12px 12px 0 0;"><i class="fa fa-street-view"></i> Chargement : <?php echo $_smarty_tpl->tpl_vars['ADRESSE_ORIGINE']->value;?>
</div><div id="unified-streetview-origin" style="width: 100%; height: 280px;"></div></div><?php }
if ($_smarty_tpl->tpl_vars['ADRESSE_DESTINATION']->value) {?><div class="card" style="padding: 0; overflow: hidden;"><div class="card-header header-red" style="margin: 0; border-radius: 12px 12px 0 0;"><i class="fa fa-street-view"></i> Livraison : <?php echo $_smarty_tpl->tpl_vars['ADRESSE_DESTINATION']->value;?>
</div><div id="unified-streetview-destination" style="width: 100%; height: 280px;"></div></div><?php }?></div><div class="form-row" style="margin-top: 20px;"><div class="card" style="padding: 0; overflow: hidden;"><div class="card-header header-blue" style="margin: 0; border-radius: 12px 12px 0 0;"><i class="fa fa-map"></i><?php if ($_smarty_tpl->tpl_vars['ADRESSE_ORIGINE']->value && $_smarty_tpl->tpl_vars['ADRESSE_DESTINATION']->value) {?>Itineraire complet<?php } else { ?>Localisation<?php }?></div><div id="unified-map" style="width: 100%; height: 280px;"></div></div><div class="distance-panel" id="unified-distance-box"><div class="distance-info"><div class="distance-label">Distance</div><div class="distance-value" id="unified-distance-display"><?php if ($_smarty_tpl->tpl_vars['DISTANCE']->value) {
echo $_smarty_tpl->tpl_vars['DISTANCE']->value;?>
 km<?php } else { ?>--<?php }?></div><div class="distance-sep">|</div><div class="duration-value" id="unified-duration-display"><?php if ($_smarty_tpl->tpl_vars['DURATION']->value) {
echo $_smarty_tpl->tpl_vars['DURATION']->value;
} else { ?>--<?php }?></div></div><?php if ($_smarty_tpl->tpl_vars['ADRESSE_ORIGINE']->value && $_smarty_tpl->tpl_vars['ADRESSE_DESTINATION']->value) {?><a href="https://www.google.com/maps/dir/?api=1&origin=<?php echo rawurlencode((string)$_smarty_tpl->tpl_vars['ADRESSE_ORIGINE']->value);?>
&destination=<?php echo rawurlencode((string)$_smarty_tpl->tpl_vars['ADRESSE_DESTINATION']->value);?>
&travelmode=driving"target="_blank" class="btn btn-success"><i class="fa fa-external-link"></i> Ouvrir dans Google Maps</a><?php } elseif ($_smarty_tpl->tpl_vars['ADRESSE_ORIGINE']->value) {?><a href="https://www.google.com/maps/search/?api=1&query=<?php echo rawurlencode((string)$_smarty_tpl->tpl_vars['ADRESSE_ORIGINE']->value);?>
"target="_blank" class="btn btn-success"><i class="fa fa-external-link"></i> Voir sur Google Maps</a><?php } else { ?><a href="https://www.google.com/maps/search/?api=1&query=<?php echo rawurlencode((string)$_smarty_tpl->tpl_vars['ADRESSE_DESTINATION']->value);?>
"target="_blank" class="btn btn-success"><i class="fa fa-external-link"></i> Voir sur Google Maps</a><?php }?></div></div><?php } else { ?><div class="form-section" style="text-align: center; padding: 60px 30px;"><i class="fa fa-exclamation-triangle" style="font-size: 4em; color: #e74c3c; margin-bottom: 20px;"></i><h3 style="color: #333; margin-bottom: 10px;">Adresses manquantes</h3><p style="color: #666; font-size: 15px;">Les adresses d'origine et de destination ne sont pas renseignees pour cette affaire.</p><a href="index.php?module=Potentials&view=Edit&record=<?php echo $_smarty_tpl->tpl_vars['RECORD_ID']->value;?>
" class="btn btn-purple" style="margin-top: 20px;"><i class="fa fa-edit"></i> Modifier l'affaire</a></div><?php }?></div>

<style>
.distance-panel {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 25px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 20px;
    color: white;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.distance-panel .distance-info {
    text-align: center;
    background: rgba(255, 255, 255, 0.15);
    padding: 20px 30px;
    border-radius: 10px;
    border: 2px solid rgba(255, 255, 255, 0.3);
}

.distance-panel .distance-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.9;
    margin-bottom: 8px;
}

.distance-panel .distance-value {
    font-size: 2em;
    font-weight: 700;
    line-height: 1.2;
}

.distance-panel .distance-sep {
    font-size: 1.5em;
    opacity: 0.5;
    margin: 8px 0;
}

.distance-panel .duration-value {
    font-size: 1.5em;
    font-weight: 600;
}

.distance-panel .btn {
    width: 100%;
    text-align: center;
    justify-content: center;
}
</style>

<?php echo '<script'; ?>
>
window.UnifiedMapData = {
    origin: "<?php echo strtr((string)$_smarty_tpl->tpl_vars['ADRESSE_ORIGINE']->value, array("\\" => "\\\\", "'" => "\\'", "\"" => "\\\"", "\r" => "\\r", 
                       "\n" => "\\n", "</" => "<\/", "<!--" => "<\!--", "<s" => "<\s", "<S" => "<\S",
                       "`" => "\\`", "\${" => "\\\$\{"));?>
",
    destination: "<?php echo strtr((string)$_smarty_tpl->tpl_vars['ADRESSE_DESTINATION']->value, array("\\" => "\\\\", "'" => "\\'", "\"" => "\\\"", "\r" => "\\r", 
                       "\n" => "\\n", "</" => "<\/", "<!--" => "<\!--", "<s" => "<\s", "<S" => "<\S",
                       "`" => "\\`", "\${" => "\\\$\{"));?>
",
    recordId: <?php echo $_smarty_tpl->tpl_vars['RECORD_ID']->value;?>

};
<?php echo '</script'; ?>
>
<?php }
}
