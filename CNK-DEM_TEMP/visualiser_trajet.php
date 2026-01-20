<?php
/*+***********************************************************************************
 * Page pour afficher Google Street View et l'itinéraire
 *************************************************************************************/

chdir(dirname(__FILE__));
require_once 'config.inc.php';
require_once 'includes/main/WebUI.php';

$recordId = $_REQUEST['record'];

if (empty($recordId)) {
    die('Record ID is required');
}

// Récupérer les données de l'affaire
$recordModel = Vtiger_Record_Model::getInstanceById($recordId, 'Potentials');

$potentialName = $recordModel->get('potentialname');

// Adresses
$adresseOrigine = $recordModel->get('cf_955'); // Adresse départ
$villeOrigine = $recordModel->get('cf_933'); // Ville départ
$cpOrigine = $recordModel->get('cf_935'); // Code postal départ

$adresseDestination = $recordModel->get('cf_957'); // Adresse arrivée
$villeDestination = $recordModel->get('cf_949'); // Ville arrivée
$cpDestination = $recordModel->get('cf_951'); // Code postal arrivé

// Construire les adresses complètes
$adresseCompletOrigine = trim(($adresseOrigine ? $adresseOrigine . ' ' : '') . ($cpOrigine ? $cpOrigine . ' ' : '') . $villeOrigine);
$adresseCompletDestination = trim(($adresseDestination ? $adresseDestination . ' ' : '') . ($cpDestination ? $cpDestination . ' ' : '') . $villeDestination);

// Distance
$distance = $recordModel->get('cf_961'); // Distance
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Visualiser Trajet</title>
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
        .button-row {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            justify-content: center;
        }
        .btn {
            padding: 12px 24px;
            border-radius: 5px;
            border: none;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
        }
        .btn-primary {
            background: #007bff;
            color: white;
        }
        .btn-primary:hover {
            background: #0056b3;
        }
        .btn-success {
            background: #28a745;
            color: white;
        }
        .btn-success:hover {
            background: #218838;
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
            margin-bottom: 20px;
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
        .error {
            text-align: center;
            color: #dc3545;
            padding: 40px;
            background: white;
            border-radius: 8px;
            margin: 20px;
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
        <h1>Visualisation du Trajet</h1>
    </div>

    <div class="container">
        <?php if (!empty($adresseCompletOrigine) || !empty($adresseCompletDestination)): ?>
            <!-- Informations sur les adresses -->
            <div class="info-panel">
                <div class="info-row">
                    <?php if (!empty($adresseCompletOrigine)): ?>
                    <div class="info-box">
                        <h3>📍 Adresse départ</h3>
                        <p><?php echo htmlspecialchars($adresseCompletOrigine); ?></p>
                    </div>
                    <?php endif; ?>
                    <?php if (!empty($adresseCompletDestination)): ?>
                    <div class="info-box destination">
                        <h3>📍 Adresse arrivée</h3>
                        <p><?php echo htmlspecialchars($adresseCompletDestination); ?></p>
                    </div>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Distance -->
            <div class="distance-box" id="distance-box">
                <h2>Distance Estimée</h2>
                <div class="distance" id="distance-display">
                    <?php if (!empty($distance)): ?>
                        <?php echo htmlspecialchars($distance); ?> km
                    <?php else: ?>
                        <span style="font-size: 18px;">Calcul en cours...</span>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Google Street View côte à côte -->
            <div class="maps-container">
                <?php if (!empty($adresseCompletOrigine)): ?>
                <div class="map-box">
                    <h3>🏠 Street View - Origine</h3>
                    <div id="streetview-origin" style="width: 100%; height: 400px;"></div>
                </div>
                <?php endif; ?>
                <?php if (!empty($adresseCompletDestination)): ?>
                <div class="map-box destination">
                    <h3>🏠 Street View - Destination</h3>
                    <div id="streetview-destination" style="width: 100%; height: 400px;"></div>
                </div>
                <?php endif; ?>
            </div>

            <!-- Carte Google Maps avec itinéraire -->
            <div class="itinerary-box">
                <h3><?php echo (!empty($adresseCompletOrigine) && !empty($adresseCompletDestination)) ? '🚗 Itinéraire sur Google Maps' : '📍 Localisation sur Google Maps'; ?></h3>
                <div id="map" style="width: 100%; height: 600px;"></div>
            </div>

            <!-- Bouton Ouvrir dans Google Maps -->
            <div class="button-row" style="margin-top: 20px;">
                <?php if (!empty($adresseCompletOrigine) && !empty($adresseCompletDestination)): ?>
                <a href="https://www.google.com/maps/dir/?api=1&origin=<?php echo urlencode($adresseCompletOrigine); ?>&destination=<?php echo urlencode($adresseCompletDestination); ?>&travelmode=driving"
                   target="_blank"
                   class="btn btn-success"
                   style="font-size: 18px; padding: 15px 30px;">
                    🗺️ Ouvrir l'itinéraire dans Google Maps
                </a>
                <?php elseif (!empty($adresseCompletOrigine)): ?>
                <a href="https://www.google.com/maps/search/?api=1&query=<?php echo urlencode($adresseCompletOrigine); ?>"
                   target="_blank"
                   class="btn btn-success"
                   style="font-size: 18px; padding: 15px 30px;">
                    🗺️ Ouvrir dans Google Maps
                </a>
                <?php else: ?>
                <a href="https://www.google.com/maps/search/?api=1&query=<?php echo urlencode($adresseCompletDestination); ?>"
                   target="_blank"
                   class="btn btn-success"
                   style="font-size: 18px; padding: 15px 30px;">
                    🗺️ Ouvrir dans Google Maps
                </a>
                <?php endif; ?>
            </div>

            <!-- Google Maps JavaScript API -->
            <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDAZCUe6KGJIB7INTcvhureUd8AojU67CE&callback=initAll&libraries=geometry" async defer></script>

            <script>
                let map;
                let directionsService;
                let directionsRenderer;

                // Fonction principale d'initialisation
                async function initAll() {
                    const origin = "<?php echo addslashes($adresseCompletOrigine); ?>";
                    const destination = "<?php echo addslashes($adresseCompletDestination); ?>";

                    // Initialiser les services Google Maps
                    const geocoder = new google.maps.Geocoder();
                    directionsService = new google.maps.DirectionsService();
                    directionsRenderer = new google.maps.DirectionsRenderer();

                    <?php if (!empty($adresseCompletOrigine)): ?>
                    // Géocoder et afficher Street View pour l'origine
                    geocoder.geocode({ address: origin }, function(results, status) {
                        if (status === 'OK' && results[0]) {
                            const location = results[0].geometry.location;

                            // Créer le panorama Street View pour l'origine
                            const panoramaOrigin = new google.maps.StreetViewPanorama(
                                document.getElementById('streetview-origin'),
                                {
                                    position: location,
                                    pov: { heading: 0, pitch: 0 },
                                    zoom: 1,
                                    addressControl: true,
                                    enableCloseButton: false,
                                    fullscreenControl: true
                                }
                            );
                        } else {
                            document.getElementById('streetview-origin').innerHTML =
                                '<div style="padding: 40px; text-align: center; color: #dc3545;">Impossible de trouver Street View pour cette adresse</div>';
                        }
                    });
                    <?php endif; ?>

                    <?php if (!empty($adresseCompletDestination)): ?>
                    // Géocoder et afficher Street View pour la destination
                    geocoder.geocode({ address: destination }, function(results, status) {
                        if (status === 'OK' && results[0]) {
                            const location = results[0].geometry.location;

                            // Créer le panorama Street View pour la destination
                            const panoramaDest = new google.maps.StreetViewPanorama(
                                document.getElementById('streetview-destination'),
                                {
                                    position: location,
                                    pov: { heading: 0, pitch: 0 },
                                    zoom: 1,
                                    addressControl: true,
                                    enableCloseButton: false,
                                    fullscreenControl: true
                                }
                            );
                        } else {
                            document.getElementById('streetview-destination').innerHTML =
                                '<div style="padding: 40px; text-align: center; color: #dc3545;">Impossible de trouver Street View pour cette adresse</div>';
                        }
                    });
                    <?php endif; ?>

                    // Initialiser la carte avec l'itinéraire ou un simple marker
                    <?php if (!empty($adresseCompletOrigine) && !empty($adresseCompletDestination)): ?>
                    initMapWithRoute(origin, destination);
                    <?php elseif (!empty($adresseCompletOrigine)): ?>
                    initMapWithSingleLocation(origin);
                    <?php else: ?>
                    initMapWithSingleLocation(destination);
                    <?php endif; ?>
                }

                // Initialiser la carte avec l'itinéraire
                function initMapWithRoute(origin, destination) {
                    // Créer la carte
                    map = new google.maps.Map(document.getElementById('map'), {
                        zoom: 7,
                        center: { lat: 48.8566, lng: 2.3522 } // Paris par défaut
                    });

                    // Configurer le renderer de directions
                    directionsRenderer.setMap(map);

                    // Calculer et afficher l'itinéraire
                    const request = {
                        origin: origin,
                        destination: destination,
                        travelMode: google.maps.TravelMode.DRIVING
                    };

                    directionsService.route(request, function(result, status) {
                        if (status === 'OK') {
                            directionsRenderer.setDirections(result);

                            // Extraire les informations de distance et durée
                            const route = result.routes[0];
                            if (route.legs && route.legs.length > 0) {
                                const leg = route.legs[0];
                                const distanceKm = (leg.distance.value / 1000).toFixed(1);
                                const durationMin = Math.round(leg.duration.value / 60);
                                const hours = Math.floor(durationMin / 60);
                                const minutes = durationMin % 60;

                                let durationText = '';
                                if (hours > 0) {
                                    durationText = hours + 'h' + (minutes > 0 ? ' ' + minutes + 'min' : '');
                                } else {
                                    durationText = minutes + ' min';
                                }

                                // Mettre à jour l'affichage de la distance
                                document.getElementById('distance-display').innerHTML =
                                    '<strong>' + distanceKm + ' km</strong><br>' +
                                    '<small style="font-size: 16px;">' + durationText + '</small>';

                                // Sauvegarder la distance dans le CRM
                                fetch('index.php?module=Potentials&action=CalculateDistance&record=<?php echo intval($recordId); ?>&distance=' + distanceKm + '&duration=' + encodeURIComponent(durationText));
                            }
                        } else {
                            document.getElementById('map').innerHTML =
                                '<div style="padding: 40px; text-align: center; color: #dc3545;">Impossible de calculer l\'itinéraire: ' + status + '</div>';
                        }
                    });
                }

                // Initialiser la carte avec une seule adresse
                function initMapWithSingleLocation(address) {
                    const geocoder = new google.maps.Geocoder();

                    geocoder.geocode({ address: address }, function(results, status) {
                        if (status === 'OK' && results[0]) {
                            const location = results[0].geometry.location;

                            // Créer la carte centrée sur l'adresse
                            map = new google.maps.Map(document.getElementById('map'), {
                                zoom: 15,
                                center: location
                            });

                            // Ajouter un marker
                            new google.maps.Marker({
                                position: location,
                                map: map,
                                title: address
                            });

                            // Masquer la box de distance car pas d'itinéraire
                            document.getElementById('distance-box').style.display = 'none';
                        } else {
                            document.getElementById('map').innerHTML =
                                '<div style="padding: 40px; text-align: center; color: #dc3545;">Impossible de géolocaliser l\'adresse: ' + status + '</div>';
                        }
                    });
                }
            </script>

        <?php else: ?>
            <div class="error">
                <h2>⚠️ Adresses manquantes</h2>
                <p>Les adresses d'origine et de destination ne sont pas renseignées pour cette affaire.</p>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
