{*+**********************************************************************************
* Unified Map Tab - Google Maps route visualization embedded in unified view
* Uses common design system from UnifiedTabbedView.tpl
************************************************************************************}
{strip}
<div class="map-tab-container" id="mapTabContainer" data-record-id="{$RECORD_ID}">

    {if $ADRESSE_ORIGINE || $ADRESSE_DESTINATION}

    {* Street View Panels *}
    <div class="form-row">
        {if $ADRESSE_ORIGINE}
        <div class="card" style="padding: 0; overflow: hidden;">
            <div class="card-header header-green" style="margin: 0; border-radius: 12px 12px 0 0;">
                <i class="fa fa-street-view"></i> Chargement : {$ADRESSE_ORIGINE|escape}
            </div>
            <div id="unified-streetview-origin" style="width: 100%; height: 280px;"></div>
        </div>
        {/if}
        {if $ADRESSE_DESTINATION}
        <div class="card" style="padding: 0; overflow: hidden;">
            <div class="card-header header-red" style="margin: 0; border-radius: 12px 12px 0 0;">
                <i class="fa fa-street-view"></i> Livraison : {$ADRESSE_DESTINATION|escape}
            </div>
            <div id="unified-streetview-destination" style="width: 100%; height: 280px;"></div>
        </div>
        {/if}
    </div>

    {* Main Map + Distance Panel Row *}
    <div class="form-row" style="margin-top: 20px;">
        <div class="card" style="padding: 0; overflow: hidden;">
            <div class="card-header header-blue" style="margin: 0; border-radius: 12px 12px 0 0;">
                <i class="fa fa-map"></i>
                {if $ADRESSE_ORIGINE && $ADRESSE_DESTINATION}Itineraire complet{else}Localisation{/if}
            </div>
            <div id="unified-map" style="width: 100%; height: 280px;"></div>
        </div>
        <div class="distance-panel" id="unified-distance-box">
            <div class="distance-info">
                <div class="distance-label">Distance</div>
                <div class="distance-value" id="unified-distance-display">{if $DISTANCE}{$DISTANCE} km{else}--{/if}</div>
                <div class="distance-sep">|</div>
                <div class="duration-value" id="unified-duration-display">{if $DURATION}{$DURATION}{else}--{/if}</div>
            </div>
            {if $ADRESSE_ORIGINE && $ADRESSE_DESTINATION}
            <a href="https://www.google.com/maps/dir/?api=1&origin={$ADRESSE_ORIGINE|escape:'url'}&destination={$ADRESSE_DESTINATION|escape:'url'}&travelmode=driving"
               target="_blank" class="btn btn-success">
                <i class="fa fa-external-link"></i> Ouvrir dans Google Maps
            </a>
            {elseif $ADRESSE_ORIGINE}
            <a href="https://www.google.com/maps/search/?api=1&query={$ADRESSE_ORIGINE|escape:'url'}"
               target="_blank" class="btn btn-success">
                <i class="fa fa-external-link"></i> Voir sur Google Maps
            </a>
            {else}
            <a href="https://www.google.com/maps/search/?api=1&query={$ADRESSE_DESTINATION|escape:'url'}"
               target="_blank" class="btn btn-success">
                <i class="fa fa-external-link"></i> Voir sur Google Maps
            </a>
            {/if}
        </div>
    </div>

    {else}
    {* No addresses *}
    <div class="form-section" style="text-align: center; padding: 60px 30px;">
        <i class="fa fa-exclamation-triangle" style="font-size: 4em; color: #e74c3c; margin-bottom: 20px;"></i>
        <h3 style="color: #333; margin-bottom: 10px;">Adresses manquantes</h3>
        <p style="color: #666; font-size: 15px;">Les adresses d'origine et de destination ne sont pas renseignees pour cette affaire.</p>
        <a href="index.php?module=Potentials&view=Edit&record={$RECORD_ID}" class="btn btn-purple" style="margin-top: 20px;">
            <i class="fa fa-edit"></i> Modifier l'affaire
        </a>
    </div>
    {/if}
</div>
{/strip}

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

<script>
window.UnifiedMapData = {
    origin: "{$ADRESSE_ORIGINE|escape:'javascript'}",
    destination: "{$ADRESSE_DESTINATION|escape:'javascript'}",
    recordId: {$RECORD_ID}
};
</script>
