var map, vectorSource, vectorLayer, draw, points = [], lineFeature = null, markerFeature = null;

function initMap() {
    vectorSource = new ol.source.Vector();
    vectorLayer = new ol.layer.Vector({ source: vectorSource });

    map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({ source: new ol.source.OSM() }),
            vectorLayer
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([32.85, 39.92]),
            zoom: 6
        }),
        controls: ol.control.defaults({ attribution: false, zoom: false })
    });
}

function enableDraw() {
    // Her durumda önce mevcut çizim etkileşimini kaldır
    if (draw) {
        map.removeInteraction(draw);
        draw = null;
    }

    // Eğer points dizisi boşsa (temizle butonuna basıldıysa) yeni çizim başlat
    if (points.length === 0) {
        vectorSource.clear();
        markerFeature = null;
        lineFeature = null;
    }

    // Yeni çizim etkileşimi oluştur
    draw = new ol.interaction.Draw({
        source: vectorSource,
        type: 'Point'
    });
    map.addInteraction(draw);

    draw.on('drawend', function(evt) {
        var coord = evt.feature.getGeometry().getCoordinates();
        points.push(coord);
        window.points = points;
        updateLine();
        updatePoints();
        updateCoordinatesList();
        if (points.length > 1) {
            document.getElementById('getProfileBtn').disabled = false;
        }
    });
}

function updateLine() {
    if (lineFeature) vectorSource.removeFeature(lineFeature);
    if (points.length > 1) {
        var line = new ol.geom.LineString(points);
        lineFeature = new ol.Feature({ geometry: line });
        lineFeature.setStyle(new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: '#1976d2',
                width: 5
            })
        }));
        vectorSource.addFeature(lineFeature);
    }
    updatePoints();
}

function updatePoints() {
    vectorSource.getFeatures().forEach(function(f) {
        if (f.getGeometry() instanceof ol.geom.Point && f !== markerFeature) {
            vectorSource.removeFeature(f);
        }
    });
    points.forEach(function(coord) {
        var pointFeature = new ol.Feature({ geometry: new ol.geom.Point(coord) });
        pointFeature.setStyle(new ol.style.Style({
            image: new ol.style.Circle({
                radius: 6,
                fill: new ol.style.Fill({ color: '#fff' }),
                stroke: new ol.style.Stroke({ color: '#d32f2f', width: 3 })
            })
        }));
        vectorSource.addFeature(pointFeature);
    });
}

function updateMarker(lat, lng, elevation) {
    if (markerFeature) {
        vectorSource.removeFeature(markerFeature);
    }
    
    const coord = ol.proj.fromLonLat([lng, lat]);
    const geometry = new ol.geom.Point(coord);
    
    // Orijinal boyutlu ok
    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="56" viewBox="0 0 48 56">',
        '<polygon points="24,56 12,36 36,36" fill="#d32f2f" stroke="#fff" stroke-width="2"/>',
        '</svg>'
    ].join('');
    const svgUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    
    // Okun ucu tam noktada olacak şekilde anchor ayarı (0.5, 1)
    const style = new ol.style.Style({
        image: new ol.style.Icon({
            src: svgUrl,
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            imgSize: [48, 56],
            scale: 1,
            displacement: [0, 0]
        })
    });
    
    markerFeature = new ol.Feature({ geometry: geometry });
    markerFeature.setStyle(style);
    
    vectorSource.addFeature(markerFeature);
}

function removeMarker() {
    if (markerFeature && vectorSource) {
        try {
            vectorSource.removeFeature(markerFeature);
            markerFeature = null;
        } catch (error) {
            console.log('Marker kaldırılırken hata oluştu:', error);
        }
    }
}

function updateCoordinatesList() {
    var list = document.getElementById('coordinatesList');
    list.innerHTML = '<b>Koordinatlar:</b><br>';
    points.forEach(function(c, i) {
        var lonlat = ol.proj.toLonLat(c);
        list.innerHTML += (i+1) + '. ' + lonlat[1].toFixed(6) + ', ' + lonlat[0].toFixed(6) + '<br>';
    });
}

function getLineCoordinatesLatLng() {
    return points.map(function(c) {
        var lonlat = ol.proj.toLonLat(c);
        return { lat: lonlat[1], lng: lonlat[0] };
    });
}

function disableDraw() {
    if (draw) {
        map.removeInteraction(draw);
        draw = null;
    }
}

window.initMap = initMap;
window.enableDraw = enableDraw;
window.getLineCoordinatesLatLng = getLineCoordinatesLatLng;
window.updateMarker = updateMarker;
window.removeMarker = removeMarker;
window.disableDraw = disableDraw;
window.points = points; 