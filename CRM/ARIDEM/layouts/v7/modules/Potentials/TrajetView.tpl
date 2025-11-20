<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Visualiser Trajet - {$RECORD_LABEL}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .header h1 {
            font-size: 24px;
            margin-bottom: 5px;
        }
        .header p {
            font-size: 14px;
            opacity: 0.9;
        }
        .container {
            max-width: 1400px;
            margin: 20px auto;
            padding: 0 20px;
        }
        .info-panel {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 15px;
        }
        .info-box {
            flex: 1;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            border-left: 4px solid #28a745;
        }
        .info-box.destination {
            border-left-color: #dc3545;
        }
        .info-box h3 {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .info-box p {
            font-size: 16px;
            color: #333;
            line-height: 1.5;
        }
        .distance-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 20px;
        }
        .distance-box h2 {
            font-size: 18px;
            margin-bottom: 10px;
        }
        .distance-box .distance {
            font-size: 36px;
            font-weight: bold;
        }
        .maps-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .map-box {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .map-box h3 {
            background: #28a745;
            color: white;
            padding: 15px;
            font-size: 16px;
            margin: 0;
        }
        .map-box.destination h3 {
            background: #dc3545;
        }
        .map-box iframe {
            width: 100%;
            height: 400px;
            border: none;
        }
        .itinerary-box {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .itinerary-box h3 {
            background: #007bff;
            color: white;
            padding: 15px;
            font-size: 16px;
            margin: 0;
        }
        .itinerary-box iframe {
            width: 100%;
            height: 600px;
            border: none;
        }
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        @media (max-width: 968px) {
            .maps-container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🗺️ Visualisation du Trajet</h1>
        <p>{$RECORD_LABEL}</p>
    </div>

    <div class="container">
        {if !empty($ADRESSE_ORIGINE) && !empty($ADRESSE_DESTINATION)}
            <!-- Informations sur les adresses -->
            <div class="info-panel">
                <div class="info-row">
                    <div class="info-box">
                        <h3>📍 Adresse d'Origine</h3>
                        <p>{$ADRESSE_ORIGINE}</p>
                    </div>
                    <div class="info-box destination">
                        <h3>📍 Adresse de Destination</h3>
                        <p>{$ADRESSE_DESTINATION}</p>
                    </div>
                </div>
            </div>

            <!-- Distance -->
            <div class="distance-box" id="distance-box">
                <h2>Distance Estimée</h2>
                <div class="distance" id="distance-display">
                    {if !empty($DISTANCE_KM)}
                        {$DISTANCE_KM} km
                    {else}
                        <span class="loading">Calcul en cours...</span>
                    {/if}
                </div>
            </div>

            <!-- Google Street View -->
            <div class="maps-container">
                <div class="map-box">
                    <h3>🏠 Street View - Origine</h3>
                    <iframe
                        src="https://www.google.com/maps/embed/v1/streetview?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&location={$ADRESSE_ORIGINE|escape:'url'}&heading=0&pitch=0&fov=90"
                        allowfullscreen>
                    </iframe>
                </div>
                <div class="map-box destination">
                    <h3>🏠 Street View - Destination</h3>
                    <iframe
                        src="https://www.google.com/maps/embed/v1/streetview?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&location={$ADRESSE_DESTINATION|escape:'url'}&heading=0&pitch=0&fov=90"
                        allowfullscreen>
                    </iframe>
                </div>
            </div>

            <!-- Itinéraire -->
            <div class="itinerary-box">
                <h3>🚗 Itinéraire Détaillé</h3>
                <iframe
                    src="https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin={$ADRESSE_ORIGINE|escape:'url'}&destination={$ADRESSE_DESTINATION|escape:'url'}&mode=driving"
                    allowfullscreen>
                </iframe>
            </div>

            {literal}
            <script>
                // Calculer la distance en utilisant l'API Google Maps Distance Matrix
                function calculateDistance() {
                    var origin = {/literal}"{$ADRESSE_ORIGINE}"{literal};
                    var destination = {/literal}"{$ADRESSE_DESTINATION}"{literal};

                    // Utiliser l'API Distance Matrix via un service backend
                    var url = 'index.php?module=Potentials&action=CalculateDistance&origin=' +
                              encodeURIComponent(origin) +
                              '&destination=' + encodeURIComponent(destination) +
                              '&record=' + {/literal}{$RECORD_ID}{literal};

                    fetch(url)
                        .then(response => response.json())
                        .then(data => {
                            if (data.success && data.distance) {
                                document.getElementById('distance-display').innerHTML =
                                    '<strong>' + data.distance + ' km</strong><br>' +
                                    '<small style="font-size: 16px;">' + data.duration + '</small>';
                            }
                        })
                        .catch(error => {
                            console.error('Erreur:', error);
                        });
                }

                // Calculer la distance au chargement de la page si pas déjà présente
                {/literal}{if empty($DISTANCE_KM)}{literal}
                window.addEventListener('load', calculateDistance);
                {/literal}{/if}{literal}
            </script>
            {/literal}

        {else}
            <div class="info-panel">
                <p style="text-align: center; color: #dc3545; padding: 40px;">
                    ⚠️ Les adresses d'origine et de destination ne sont pas renseignées pour cette affaire.
                </p>
            </div>
        {/if}
    </div>
</body>
</html>
