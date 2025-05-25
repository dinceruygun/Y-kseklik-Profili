// Google Elevation API anahtarınızı buraya ekleyin
const nckesit = {
    API_KEY: 'YOUR_API_KEY',
    currentCoordinates: [],
    currentElevations: [],
    canvasWidth: 0,
    canvasHeight: 0,
    padding: {
        left: 80,    // Sol padding (yükseklik etiketi için)
        right: 30,   // Sağ padding'i azalttım
        top: 30,     // Üst padding'i azalttım
        bottom: 50   // Alt padding'i azalttım
    },
    xScale: 0,
    yScale: 0,
    minElevation: 0,
    maxElevation: 0,
    elevationService: null,
    // --- Fonksiyonlar ---
    interpolate(x, x0, x1, y0, y1) {
        return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
    },
    resizeCanvas() {
        // Hem ana canvas hem modal canvas kontrolü
        const canvas = document.getElementById('canvas') || document.getElementById('profile-canvas');
        if (!canvas) return; // Canvas yoksa fonksiyonu terk et
        const container = canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = container.clientWidth;
        const cssHeight = container.clientHeight || 400;
        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;
        canvas.style.width = cssWidth + 'px';
        canvas.style.height = cssHeight + 'px';
        nckesit.canvasWidth = cssWidth;
        nckesit.canvasHeight = cssHeight;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (nckesit.currentCoordinates.length > 0 && nckesit.currentElevations.length > 0) {
            nckesit.drawProfile(nckesit.currentCoordinates, nckesit.currentElevations);
        }
    },
    generateRandomCoordinates() {
        const numPoints = 5;
        const coordinates = [];
        const minLat = 36.0;
        const maxLat = 42.0;
        const minLng = 26.0;
        const maxLng = 45.0;
        for (let i = 0; i < numPoints; i++) {
            const lat = minLat + Math.random() * (maxLat - minLat);
            const lng = minLng + Math.random() * (maxLng - minLng);
            coordinates.push(`${lat.toFixed(4)},${lng.toFixed(4)}`);
        }
        document.getElementById('coordinatesInput').value = coordinates.join('\n');
    },
    showLoadingOnCanvas() {
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, nckesit.canvasWidth, nckesit.canvasHeight);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, nckesit.canvasWidth, nckesit.canvasHeight);
        ctx.font = 'bold 22px Segoe UI, Arial, sans-serif';
        ctx.fillStyle = '#1976d2';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Yükleniyor...', nckesit.canvasWidth / 2, nckesit.canvasHeight / 2);
    },
    async getElevationAndDraw() {
        const coordinatesInput = document.getElementById('coordinatesInput').value;
        const coordinates = coordinatesInput.split('\n')
            .filter(line => line.trim())
            .map(line => {
                const [lat, lng] = line.split(',').map(Number);
                return { lat, lng };
            });
        if (coordinates.length < 2) {
            alert('Lütfen en az iki koordinat girin!');
            return;
        }
        try {
            nckesit.showLoadingOnCanvas(); // Yükleniyor mesajı göster
            const elevations = await nckesit.getElevations(coordinates);
            nckesit.currentCoordinates = coordinates;
            nckesit.currentElevations = elevations;
            nckesit.drawProfile(coordinates, elevations);
            nckesit.updateProfileSummary(coordinates, elevations);
        } catch (error) {
            console.error('Hata:', error);
            alert('Kesit alınırken bir hata oluştu!');
        }
    },
    initElevationService() {
        if (!this.elevationService) {
            this.elevationService = new google.maps.ElevationService();
        }
    },
    async getElevations(coordinates) {
        this.initElevationService();
        
        const path = coordinates.map(coord => ({
            lat: coord.lat,
            lng: coord.lng
        }));

        return new Promise((resolve, reject) => {
            this.elevationService.getElevationAlongPath({
                path: path,
                samples: path.length
            }, (results, status) => {
                if (status === 'OK') {
                    resolve(results.map(result => result.elevation));
                } else {
                    reject(new Error('Elevation API hatası: ' + status));
                }
            });
        });
    },
    calculateProfileStats(coordinates, elevations) {
        function haversine(lat1, lon1, lat2, lon2) {
            const R = 6371000;
            const toRad = deg => deg * Math.PI / 180;
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        }
        let totalDist = 0;
        let totalUp = 0;
        let totalDown = 0;
        let maxSlope = 0;
        let minSlope = 0;
        let prevElev = elevations[0];
        let prevCoord = coordinates[0];
        for (let i = 1; i < coordinates.length; i++) {
            const dist = haversine(prevCoord.lat, prevCoord.lng, coordinates[i].lat, coordinates[i].lng);
            const diff = elevations[i] - prevElev;
            totalDist += dist;
            if (diff > 0) totalUp += diff;
            if (diff < 0) totalDown += diff;
            const slope = (diff / dist) * 100;
            if (slope > maxSlope) maxSlope = slope;
            if (slope < minSlope) minSlope = slope;
            prevElev = elevations[i];
            prevCoord = coordinates[i];
        }
        const min = Math.min(...elevations);
        const max = Math.max(...elevations);
        const avg = elevations.reduce((a, b) => a + b, 0) / elevations.length;
        return {
            min: min,
            max: max,
            avg: avg,
            totalDist: totalDist,
            totalUp: totalUp,
            totalDown: totalDown,
            maxSlope: maxSlope,
            minSlope: minSlope
        };
    },
    drawProfile: function(coordinates, elevations) {
        const canvas = document.getElementById('canvas') || document.getElementById('profile-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, nckesit.canvasWidth, nckesit.canvasHeight);
        
        // Yükseklik değerlerini hesapla
        nckesit.minElevation = Math.min(...elevations);
        nckesit.maxElevation = Math.max(...elevations);
        const avgElevation = elevations.reduce((a, b) => a + b, 0) / elevations.length;
        const elevationRange = nckesit.maxElevation - nckesit.minElevation;
        
        // Ölçekleri hesapla
        nckesit.xScale = (nckesit.canvasWidth - CONFIG.padding.left - CONFIG.padding.right) / (coordinates.length - 1);
        nckesit.yScale = (nckesit.canvasHeight - CONFIG.padding.top - CONFIG.padding.bottom) / elevationRange;
        
        // Arka plan
        ctx.fillStyle = CONFIG.colors.background;
        ctx.fillRect(0, 0, nckesit.canvasWidth, nckesit.canvasHeight);
        
        // Grid ve eksenleri çiz
        CanvasHelper.drawGrid(ctx, nckesit.canvasWidth, nckesit.canvasHeight, CONFIG.padding);
        CanvasHelper.drawAxes(ctx, nckesit.canvasWidth, nckesit.canvasHeight, CONFIG.padding);
        
        // Alt kısmı doldur
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(CONFIG.padding.left, nckesit.canvasHeight - CONFIG.padding.bottom);
        for (let i = 0; i < coordinates.length; i++) {
            const x = CONFIG.padding.left + i * nckesit.xScale;
            const y = CONFIG.padding.top + (nckesit.canvasHeight - CONFIG.padding.top - CONFIG.padding.bottom) * 
                     (1 - (elevations[i] - nckesit.minElevation) / elevationRange);
            ctx.lineTo(x, y);
        }
        ctx.lineTo(nckesit.canvasWidth - CONFIG.padding.right, nckesit.canvasHeight - CONFIG.padding.bottom);
        ctx.closePath();
        ctx.fillStyle = 'rgba(33, 150, 243, 0.10)';
        ctx.fill();
        ctx.restore();
        
        // Kesit çizgisi
        ctx.beginPath();
        ctx.strokeStyle = CONFIG.colors.primary;
        ctx.lineWidth = CONFIG.dimensions.lineWidth;
        for (let i = 0; i < coordinates.length; i++) {
            const x = CONFIG.padding.left + i * nckesit.xScale;
            const y = CONFIG.padding.top + (nckesit.canvasHeight - CONFIG.padding.top - CONFIG.padding.bottom) * 
                     (1 - (elevations[i] - nckesit.minElevation) / elevationRange);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        // Min, Max, Ort çizgileri
        ctx.save();
        ctx.setLineDash([6, 6]);
        
        // Min çizgisi
        const yMin = CONFIG.padding.top + (nckesit.canvasHeight - CONFIG.padding.top - CONFIG.padding.bottom) * 
                     (1 - (nckesit.minElevation - nckesit.minElevation) / elevationRange);
        ctx.strokeStyle = CONFIG.colors.min;
        ctx.beginPath();
        ctx.moveTo(CONFIG.padding.left, yMin);
        ctx.lineTo(nckesit.canvasWidth - CONFIG.padding.right, yMin);
        ctx.stroke();
        
        // Max çizgisi
        const yMax = CONFIG.padding.top + (nckesit.canvasHeight - CONFIG.padding.top - CONFIG.padding.bottom) * 
                     (1 - (nckesit.maxElevation - nckesit.minElevation) / elevationRange);
        ctx.strokeStyle = CONFIG.colors.max;
        ctx.beginPath();
        ctx.moveTo(CONFIG.padding.left, yMax);
        ctx.lineTo(nckesit.canvasWidth - CONFIG.padding.right, yMax);
        ctx.stroke();
        
        // Ort çizgisi
        const yAvg = CONFIG.padding.top + (nckesit.canvasHeight - CONFIG.padding.top - CONFIG.padding.bottom) * 
                     (1 - (avgElevation - nckesit.minElevation) / elevationRange);
        ctx.strokeStyle = CONFIG.colors.avg;
        ctx.beginPath();
        ctx.moveTo(CONFIG.padding.left, yAvg);
        ctx.lineTo(nckesit.canvasWidth - CONFIG.padding.right, yAvg);
        ctx.stroke();
        
        ctx.setLineDash([]);
        ctx.restore();
        
        // Etiketleri çiz
        CanvasHelper.drawLabels(ctx, nckesit.canvasWidth, nckesit.canvasHeight, CONFIG.padding, elevationRange, nckesit.maxElevation);
        
        // Min, Max, Ort kutucukları
        this.drawInfoBoxes(ctx, yMin, yMax, yAvg, nckesit.minElevation, nckesit.maxElevation, avgElevation);
    },
    drawInfoBoxes(ctx, yMin, yMax, yAvg, minElev, maxElev, avgElev) {
        ctx.save();
        ctx.font = CONFIG.fonts.medium;
        
        // Min kutucuğu
        this.drawInfoBox(ctx, CONFIG.padding.left + 10, yMin - 18, 90, 20, 
                        CONFIG.colors.min, `min: ${Math.round(minElev)} m`);
        
        // Max kutucuğu
        this.drawInfoBox(ctx, nckesit.canvasWidth - CONFIG.padding.right - 100, yMax - 18, 90, 20, 
                        CONFIG.colors.max, `max: ${Math.round(maxElev)} m`);
        
        // Ort kutucuğu
        this.drawInfoBox(ctx, CONFIG.padding.left + 10, yAvg - 18, 120, 20, 
                        CONFIG.colors.avg, `ave: ${avgElev.toFixed(3)} m`);
        
        ctx.restore();
    },
    drawInfoBox(ctx, x, y, width, height, color, text) {
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.fillStyle = color + 'd9'; // %85 opaklık
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(text, x + 5, y + height - 4);
        ctx.stroke();
    },
    handleMouseMove(event, isModal = false) {
        if (nckesit.currentCoordinates.length === 0) return;
        
        const canvas = document.getElementById(isModal ? 'profile-canvas' : 'canvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (x >= CONFIG.padding.left && x <= nckesit.canvasWidth - CONFIG.padding.right && 
            y >= CONFIG.padding.top && y <= nckesit.canvasHeight - CONFIG.padding.bottom) {
            
            const xPos = (x - CONFIG.padding.left) / nckesit.xScale;
            const index = Math.floor(xPos);
            const nextIndex = Math.min(index + 1, nckesit.currentCoordinates.length - 1);
            
            if (index >= 0 && index < nckesit.currentCoordinates.length - 1) {
                const elevation = nckesit.interpolate(
                    xPos, index, nextIndex,
                    nckesit.currentElevations[index],
                    nckesit.currentElevations[nextIndex]
                );
                
                const lat = nckesit.interpolate(
                    xPos, index, nextIndex,
                    nckesit.currentCoordinates[index].lat,
                    nckesit.currentCoordinates[nextIndex].lat
                );
                
                const lng = nckesit.interpolate(
                    xPos, index, nextIndex,
                    nckesit.currentCoordinates[index].lng,
                    nckesit.currentCoordinates[nextIndex].lng
                );
                
                // Harita üzerindeki ok işaretini güncelle (modal için)
                if (isModal && window.updateMarker) {
                    window.updateMarker(lat, lng, elevation);
                }
                
                // Mesafe hesapla
                let totalDist = 0;
                for (let i = 1; i <= index; i++) {
                    totalDist += nckesit.calculateProfileStats(
                        [nckesit.currentCoordinates[i-1], nckesit.currentCoordinates[i]],
                        [nckesit.currentElevations[i-1], nckesit.currentElevations[i]]
                    ).totalDist;
                }
                
                const distToNext = nckesit.calculateProfileStats(
                    [nckesit.currentCoordinates[index], nckesit.currentCoordinates[nextIndex]],
                    [nckesit.currentElevations[index], nckesit.currentElevations[nextIndex]]
                ).totalDist;
                
                const frac = xPos - index;
                const dist = totalDist + frac * distToNext;
                
                // Profili yeniden çiz
                nckesit.drawProfile(nckesit.currentCoordinates, nckesit.currentElevations);
                
                // Dikey çizgi ve kesişim noktası
                const ctx = canvas.getContext('2d');
                const yPos = CONFIG.padding.top + (nckesit.canvasHeight - CONFIG.padding.top - CONFIG.padding.bottom) * 
                            (1 - (elevation - nckesit.minElevation) / (nckesit.maxElevation - nckesit.minElevation));
                
                // Dikey çizgi
                ctx.save();
                ctx.beginPath();
                ctx.strokeStyle = CONFIG.colors.primary;
                ctx.lineWidth = CONFIG.dimensions.lineWidth;
                ctx.setLineDash([4, 4]);
                ctx.moveTo(x, CONFIG.padding.top);
                ctx.lineTo(x, nckesit.canvasHeight - CONFIG.padding.bottom);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
                
                // Kesişim noktası
                ctx.save();
                ctx.beginPath();
                ctx.arc(x, yPos, CONFIG.dimensions.markerRadius, 0, 2 * Math.PI);
                ctx.fillStyle = CONFIG.colors.primary;
                ctx.shadowColor = CONFIG.colors.secondary;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.lineWidth = 3;
                ctx.strokeStyle = CONFIG.colors.background;
                ctx.stroke();
                ctx.restore();
                
                // Bilgi kutucuğu
                this.drawTooltip(ctx, x, yPos, elevation, dist, lat, lng);
                
                if (!isModal) {
                    const tooltip = document.getElementById('tooltip');
                    if (tooltip) tooltip.style.display = 'none';
                }
            }
        } else if (!isModal) {
            const tooltip = document.getElementById('tooltip');
            if (tooltip) tooltip.style.display = 'none';
        }
    },
    drawTooltip(ctx, x, yPos, elevation, dist, lat, lng) {
        const label = `${Math.round(elevation)} m\n${Math.round(dist)} m\nLat: ${lat.toFixed(5)}\nLng: ${lng.toFixed(5)}`;
        const lines = label.split('\n');
        
        let labelX = x - CONFIG.dimensions.labelWidth / 2;
        let labelY = yPos - CONFIG.dimensions.labelHeight - 16;
        
        // Kutucuk pozisyonunu ayarla
        if (labelX < CONFIG.padding.left) labelX = CONFIG.padding.left;
        if (labelX + CONFIG.dimensions.labelWidth > nckesit.canvasWidth - CONFIG.padding.right) {
            labelX = nckesit.canvasWidth - CONFIG.padding.right - CONFIG.dimensions.labelWidth;
        }
        if (labelY < 0) labelY = yPos + 16;
        
        // Kutucuk çiz
        ctx.save();
        ctx.shadowColor = CONFIG.colors.grid;
        ctx.shadowBlur = 8;
        ctx.fillStyle = CONFIG.colors.background;
        ctx.strokeStyle = CONFIG.colors.primary;
        ctx.lineWidth = CONFIG.dimensions.lineWidth;
        
        // Yuvarlak köşeli kutucuk
        this.drawRoundedRect(ctx, labelX, labelY, CONFIG.dimensions.labelWidth, CONFIG.dimensions.labelHeight, 8);
        
        ctx.shadowBlur = 0;
        
        // Metinleri çiz
        ctx.fillStyle = CONFIG.colors.primary;
        ctx.font = CONFIG.fonts.xlarge;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lines[0], labelX + CONFIG.dimensions.labelWidth / 2, labelY + 16);
        
        ctx.fillStyle = CONFIG.colors.secondary;
        ctx.font = CONFIG.fonts.medium;
        ctx.fillText(lines[1], labelX + CONFIG.dimensions.labelWidth / 2, labelY + 32);
        
        ctx.fillStyle = CONFIG.colors.text;
        ctx.font = CONFIG.fonts.small;
        ctx.fillText(lines[2], labelX + CONFIG.dimensions.labelWidth / 2, labelY + 48);
        ctx.fillText(lines[3], labelX + CONFIG.dimensions.labelWidth / 2, labelY + 60);
        
        ctx.restore();
    },
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    },
    updateProfileSummary(coordinates, elevations) {
        const stats = nckesit.calculateProfileStats(coordinates, elevations);
        const summary = document.getElementById('profile-summary');
        summary.innerHTML = `
            <div style="background:#b71c1c;color:#fff;padding:6px 12px;border-radius:4px;font-weight:bold;">İrtifa: <b>${Math.round(stats.min)}</b>, <b>${Math.round(stats.avg)}</b>, <b>${Math.round(stats.max)}</b> m</div>
            <div style="background:#232323;color:#fff;padding:6px 12px;border-radius:4px;">Uzaklık: <b>${Math.round(stats.totalDist)}</b> m</div>
            <div style="background:#232323;color:#fff;padding:6px 12px;border-radius:4px;">Yükseliş/Düşüş: <b>${stats.totalUp.toFixed(2)}</b> m, <b>${stats.totalDown.toFixed(2)}</b> m</div>
            <div style="background:#232323;color:#fff;padding:6px 12px;border-radius:4px;">Maks. Eğim: <b>${stats.maxSlope.toFixed(1)}</b>%, <b>${stats.minSlope.toFixed(1)}</b>%</div>
        `;
    },
    getElevationAndDrawModal: async function(canvasId) {
        const coordinates = nckesit.currentCoordinates;
        try {
            const elevations = await nckesit.getElevations(coordinates);
            nckesit.currentElevations = elevations;
            nckesit.drawProfileModal(coordinates, elevations, canvasId);
        } catch (error) {
            const canvas = document.getElementById(canvasId);
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = 'bold 18px Segoe UI, Arial, sans-serif';
            ctx.fillStyle = '#b71c1c';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Hata oluştu!', canvas.width / 2, canvas.height / 2);
        }
    },
    drawProfileModal: function(coordinates, elevations, canvasId) {
        const modalCanvas = document.getElementById(canvasId);
        if (!modalCanvas) return;

        // Canvas boyutlarını ayarla
        const container = modalCanvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = container.clientWidth;
        const cssHeight = container.clientHeight;

        modalCanvas.width = cssWidth * dpr;
        modalCanvas.height = cssHeight * dpr;
        modalCanvas.style.width = cssWidth + 'px';
        modalCanvas.style.height = cssHeight + 'px';

        // nckesit nesnesinin boyutlarını güncelle
        nckesit.canvasWidth = cssWidth;
        nckesit.canvasHeight = cssHeight;

        // Context'i ayarla
        const ctx = modalCanvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Profili çiz
        nckesit.drawProfile(coordinates, elevations);
    }
};

// Eski global fonksiyonları nckesit API'ye yönlendir
window.resizeCanvas = nckesit.resizeCanvas;
window.generateRandomCoordinates = nckesit.generateRandomCoordinates;
window.getElevationAndDraw = nckesit.getElevationAndDraw;
window.handleMouseMove = function(event) { nckesit.handleMouseMove(event); };

// Sayfa yüklendiğinde ve yeniden boyutlandırıldığında
window.addEventListener('load', () => {
    resizeCanvas();
    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.addEventListener('mousemove', (event) => nckesit.handleMouseMove(event, false));
    }
});

window.addEventListener('resize', resizeCanvas);

$(function() {
    initMap();

    $('#drawLineBtn').click(function() {
        // Eğer points dizisi boşsa (temizle butonuna basıldıysa) yeni çizim başlat
        if (points.length === 0) {
            enableDraw();
        } else {
            // Mevcut çizime devam et
            enableDraw();
        }
        $('#getProfileBtn').prop('disabled', true);
    });

    $('#getProfileBtn').click(function() {
        // Paneli aç
        $('#profilePanel').show();
        // Canvas boyutlarını ayarla
        const canvas = document.getElementById('profile-canvas');
        if (canvas) {
            const container = canvas.parentElement;
            const dpr = window.devicePixelRatio || 1;
            const cssWidth = container.clientWidth;
            const cssHeight = container.clientHeight;
            canvas.width = cssWidth * dpr;
            canvas.height = cssHeight * dpr;
            canvas.style.width = cssWidth + 'px';
            canvas.style.height = cssHeight + 'px';
            // Yükleniyor mesajı
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = 'bold 22px Segoe UI, Arial, sans-serif';
            ctx.fillStyle = '#1976d2';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Yükleniyor...', canvas.width / 2, canvas.height / 2);
            // Koordinatları al ve kesit oluştur
            const coords = getLineCoordinatesLatLng();
            if (coords.length > 1) {
                nckesit.currentCoordinates = coords;
                nckesit.getElevationAndDrawModal('profile-canvas');
                // Mouse etkileşimini ekle
                canvas.addEventListener('mousemove', (event) => nckesit.handleMouseMove(event, true));

                // Haritaya zoom yap
                if (window.map && window.vectorSource) {
                    // Vector source'daki tüm feature'ları al
                    const features = window.vectorSource.getFeatures();
                    if (features.length > 0) {
                        // Feature'ların extent'ini al
                        const extent = window.vectorSource.getExtent();
                        
                        // Modal yüksekliğini al
                        const modalHeight = $('#profilePanel').height();
                        
                        // Haritayı extent'e zoom yap
                        window.map.getView().fit(extent, {
                            duration: 1000,
                            padding: [50, 50, modalHeight, 50], // Üst padding'i modal yüksekliği kadar yap
                            maxZoom: 18 // Maksimum zoom seviyesi
                        });
                    }
                }
            }
        }
    });

    // Panel kapatma butonu
    $('#closeProfilePanel').click(function() {
        $('#profilePanel').hide();
        const canvas = document.getElementById('profile-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.removeEventListener('mousemove', (event) => nckesit.handleMouseMove(event, true));
        }
        // Sadece ok işaretini kaldır
        if (window.removeMarker) window.removeMarker();
    });

    // Temizle butonu: tüm koordinatları ve harita çizimlerini sil, panel açıksa kapat
    $('#clearBtn').click(function() {
        // Önce panel açıksa kapat
        $('#profilePanel').hide();
        
        // Canvasları temizle
        const canvas = document.getElementById('profile-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.removeEventListener('mousemove', (event) => nckesit.handleMouseMove(event, true));
        }

        // Koordinatları ve yükseklikleri sıfırla
        nckesit.currentCoordinates = [];
        nckesit.currentElevations = [];
        
        // Haritadaki çizgi, noktalar ve ok işaretini sil
        if (window.vectorSource) {
            try {
                window.vectorSource.clear();
            } catch (error) {
                console.log('Vector source temizlenirken hata oluştu:', error);
            }
        }
        
        if (window.removeMarker) {
            try {
                window.removeMarker();
            } catch (error) {
                console.log('Marker kaldırılırken hata oluştu:', error);
            }
        }
        
        if (window.disableDraw) {
            try {
                window.disableDraw();
            } catch (error) {
                console.log('Çizim devre dışı bırakılırken hata oluştu:', error);
            }
        }
        
        // Points dizisini sıfırla
        points = [];
        window.points = points;
        
        // Koordinat listesini temizle
        $('#coordinatesList').html('');
        
        // Kesit butonunu pasifleştir
        $('#getProfileBtn').prop('disabled', true);
    });
});

// Stil ve konfigürasyon sabitleri
const CONFIG = {
    colors: {
        primary: '#1976d2',
        secondary: '#b71c1c',
        background: '#fff',
        grid: '#e0e0e0',
        text: '#333',
        min: '#43a047',
        max: '#d32f2f',
        avg: '#fbc02d'
    },
    fonts: {
        small: '12px "Segoe UI", Arial, sans-serif',
        medium: '13px "Segoe UI", Arial, sans-serif',
        large: '14px "Segoe UI", Arial, sans-serif',
        xlarge: '15px "Segoe UI", Arial, sans-serif',
        xxlarge: '22px "Segoe UI", Arial, sans-serif'
    },
    dimensions: {
        labelWidth: 120,
        labelHeight: 68,
        markerRadius: 8,
        lineWidth: 2
    },
    padding: {
        left: 80,
        right: 30,
        top: 30,
        bottom: 50
    }
};

// Canvas çizim yardımcı fonksiyonları
const CanvasHelper = {
    drawGrid(ctx, width, height, padding) {
        ctx.save();
        ctx.strokeStyle = CONFIG.colors.grid;
        ctx.lineWidth = 1;
        
        // Yatay grid çizgileri
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + i * (height - padding.top - padding.bottom) / 5;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }
        
        // Dikey grid çizgileri
        for (let i = 0; i <= 10; i++) {
            const x = padding.left + i * (width - padding.left - padding.right) / 10;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, height - padding.bottom);
            ctx.stroke();
        }
        ctx.restore();
    },
    
    drawAxes(ctx, width, height, padding) {
        ctx.save();
        ctx.strokeStyle = CONFIG.colors.text;
        ctx.lineWidth = 1.5;
        
        // Y ekseni
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.stroke();
        
        // X ekseni
        ctx.beginPath();
        ctx.moveTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();
        
        ctx.restore();
    },
    
    drawLabels(ctx, width, height, padding, elevationRange, maxElevation) {
        ctx.save();
        ctx.fillStyle = CONFIG.colors.text;
        ctx.font = CONFIG.fonts.medium;
        
        // Y ekseni etiketleri
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + i * (height - padding.top - padding.bottom) / 5;
            const elev = maxElevation - i * elevationRange / 5;
            ctx.fillText(`${Math.round(elev)}`, padding.left - 8, y);
        }
        
        // X ekseni başlığı
        ctx.font = CONFIG.fonts.large;
        ctx.textAlign = 'center';
        ctx.fillText('Mesafe(km)', width / 2, height - 10);
        
        // Y ekseni başlığı
        ctx.save();
        ctx.translate(25, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Yükseklik(m)', 0, 0);
        ctx.restore();
        
        ctx.restore();
    }
}; 