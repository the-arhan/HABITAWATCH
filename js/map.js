/**
 * HabitaWatch — Wildlife Habitat Monitoring System
 * Interactive Map Controller (Leaflet wrapper with ecological layers and corridor assessment)
 */

class HabitatMapController {
    constructor(containerId = "monitoring-map") {
        this.containerId = containerId;
        this.map = null;
        this.currentRegion = null;
        this.boundaryLayer = null;
        this.hotspotsLayer = null;
        this.envLayers = {
            vegetation: null,
            water: null,
            builtUp: null,
            change: null
        };
        this.drawnItems = null;
        this.currentDrawMode = null;
        this.tempDrawPoints = [];
        this.tempDrawLine = null;
        this.isComparing = false;
        this.activeHotspotId = null;

        // Base tile layers
        this.baseLayers = {
            carto: L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://carto.com/">CARTO</a>, &copy; OpenStreetMap',
                maxZoom: 18
            }),
            satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
                attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
                maxZoom: 18
            })
        };
    }

    /**
     * Initialize Leaflet map instance
     */
    init(defaultCenter = [22.3345, 80.6115], defaultZoom = 10) {
        if (this.map) return;

        this.map = L.map(this.containerId, {
            center: defaultCenter,
            zoom: defaultZoom,
            zoomControl: false,
            layers: [this.baseLayers.carto]
        });

        // Add custom positioned zoom control
        L.control.zoom({ position: "topright" }).addTo(this.map);

        // Feature layer groups
        this.boundaryLayer = L.featureGroup().addTo(this.map);
        this.hotspotsLayer = L.featureGroup().addTo(this.map);
        this.drawnItems = L.featureGroup().addTo(this.map);

        this.envLayers.vegetation = L.featureGroup().addTo(this.map);
        this.envLayers.water = L.featureGroup().addTo(this.map);
        this.envLayers.builtUp = L.featureGroup().addTo(this.map);
        this.envLayers.change = L.featureGroup().addTo(this.map);

        this._setupDrawingEvents();
    }

    /**
     * Switch base tile layer (Carto Voyager vs Satellite)
     */
    setBaseLayer(type) {
        if (type === "satellite") {
            this.map.removeLayer(this.baseLayers.carto);
            this.map.addLayer(this.baseLayers.satellite);
        } else {
            this.map.removeLayer(this.baseLayers.satellite);
            this.map.addLayer(this.baseLayers.carto);
        }
    }

    /**
     * Load and center on a specific monitoring region
     */
    async loadRegion(region) {
        this.currentRegion = region;
        this.boundaryLayer.clearLayers();
        this.clearDrawnItems();

        if (region.boundaryGeoJSON) {
            const polygon = L.geoJSON(region.boundaryGeoJSON, {
                style: {
                    color: "#355443",
                    weight: 2,
                    dashArray: "4, 4",
                    fillColor: "#557A61",
                    fillOpacity: 0.08
                }
            });
            this.boundaryLayer.addLayer(polygon);
            this.map.fitBounds(polygon.getBounds(), { padding: [30, 30] });
        } else {
            this.map.setView(region.center, region.zoom);
        }

        this._renderEnvironmentalLayers(region);
    }

    /**
     * Render synthetic environmental data overlays (Vegetation, Water, Built-up)
     */
    _renderEnvironmentalLayers(region) {
        this.envLayers.vegetation.clearLayers();
        this.envLayers.water.clearLayers();
        this.envLayers.builtUp.clearLayers();

        const [lat, lng] = region.center;

        // Synthetic forest vegetation canopy patches
        const vegPatches = [
            [[lat + 0.05, lng - 0.08], [lat + 0.12, lng - 0.02], [lat + 0.08, lng + 0.08], [lat + 0.02, lng + 0.03]],
            [[lat - 0.04, lng - 0.07], [lat - 0.02, lng + 0.02], [lat - 0.09, lng + 0.05], [lat - 0.12, lng - 0.03]]
        ];
        vegPatches.forEach(coords => {
            L.polygon(coords, {
                color: "#557A61",
                weight: 1,
                fillColor: "#7E9B7A",
                fillOpacity: 0.22
            }).addTo(this.envLayers.vegetation);
        });

        // Synthetic river / water bodies
        const waterLines = [
            [[lat - 0.12, lng - 0.02], [lat - 0.04, lng + 0.01], [lat + 0.03, lng - 0.01], [lat + 0.11, lng + 0.04]]
        ];
        waterLines.forEach(coords => {
            L.polyline(coords, {
                color: "#6F9EAD",
                weight: 4,
                opacity: 0.75
            }).addTo(this.envLayers.water);
        });

        // Synthetic settlement / transit corridor
        const builtLines = [
            [[lat + 0.08, lng - 0.12], [lat + 0.02, lng - 0.01], [lat - 0.06, lng + 0.10]]
        ];
        builtLines.forEach(coords => {
            L.polyline(coords, {
                color: "#C59A55",
                weight: 2.5,
                dashArray: "3, 6",
                opacity: 0.65
            }).addTo(this.envLayers.builtUp);
        });
    }

    /**
     * Render detected hotspots on the map
     */
    renderHotspots(hotspots, onSelectCallback) {
        this.hotspotsLayer.clearLayers();
        this.envLayers.change.clearLayers();

        hotspots.forEach(spot => {
            const isHigh = spot.priority === "HIGH";
            const color = isHigh ? "#B76555" : (spot.priority === "MEDIUM" ? "#C59A55" : "#73916F");
            const fillColor = isHigh ? "#F8ECE9" : (spot.priority === "MEDIUM" ? "#FAF4E9" : "#EDF3EC");

            // Hotspot polygon area outline
            if (spot.polygonCoords) {
                const poly = L.polygon(spot.polygonCoords, {
                    color: color,
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.25,
                    dashArray: isHigh ? "4, 2" : null
                }).addTo(this.envLayers.change);

                poly.on("click", () => {
                    this.highlightHotspot(spot.id);
                    if (onSelectCallback) onSelectCallback(spot);
                });
            }

            // Custom pulsing HTML marker
            const markerHtml = `
                <div class="custom-hotspot-marker ${isHigh ? 'pulse-marker' : ''}" style="
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    background: ${color};
                    border: 2px solid #FFFFFF;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #FFFFFF;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                ">
                    !
                </div>
            `;

            const customIcon = L.divIcon({
                html: markerHtml,
                className: "hotspot-div-icon",
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            });

            const marker = L.marker(spot.coords, { icon: customIcon }).addTo(this.hotspotsLayer);

            marker.bindPopup(`
                <div style="min-width: 180px;">
                    <span style="font-size: 10px; font-weight: 700; color: ${color}; text-transform: uppercase;">
                        ${spot.priority} PRIORITY &bull; ${spot.id}
                    </span>
                    <h4 style="font-size: 13px; margin: 4px 0 6px 0; color: #1C2520;">${spot.name}</h4>
                    <p style="font-size: 11px; color: #5F6B63; margin-bottom: 8px;">${spot.category} (${spot.affectedAreaKm2} km²)</p>
                    <button onclick="window.app.openHotspotDetail('${spot.id}')" style="
                        background: #355443;
                        color: #FFF;
                        border: none;
                        font-size: 11px;
                        font-weight: 600;
                        padding: 4px 10px;
                        border-radius: 4px;
                        cursor: pointer;
                        width: 100%;
                    ">Inspect Area</button>
                </div>
            `);

            marker.on("click", () => {
                this.highlightHotspot(spot.id);
                if (onSelectCallback) onSelectCallback(spot);
            });
        });
    }

    /**
     * Highlight specific hotspot on map
     */
    highlightHotspot(hotspotId) {
        this.activeHotspotId = hotspotId;
        const hotspot = (window.DEMO_DATA?.hotspots[this.currentRegion?.id] || []).find(h => h.id === hotspotId);
        if (hotspot && this.map) {
            this.map.flyTo(hotspot.coords, 12, { duration: 0.8 });
        }
    }

    /**
     * Toggle layer visibility
     */
    toggleLayer(layerName, visible) {
        if (this.envLayers[layerName]) {
            if (visible) {
                this.map.addLayer(this.envLayers[layerName]);
            } else {
                this.map.removeLayer(this.envLayers[layerName]);
            }
        }
    }

    /**
     * Reset map view to current region bounds
     */
    resetView() {
        if (this.currentRegion?.boundaryGeoJSON) {
            const bounds = L.geoJSON(this.currentRegion.boundaryGeoJSON).getBounds();
            this.map.fitBounds(bounds, { padding: [30, 30] });
        } else if (this.currentRegion) {
            this.map.setView(this.currentRegion.center, this.currentRegion.zoom);
        }
    }

    /**
     * Custom drawing tools setup
     */
    setDrawMode(mode) {
        this.currentDrawMode = mode;
        this.tempDrawPoints = [];
        if (this.tempDrawLine) {
            this.map.removeLayer(this.tempDrawLine);
            this.tempDrawLine = null;
        }

        if (mode) {
            this.map.getContainer().style.cursor = "crosshair";
            window.app?.showToast(`Click on map to draw ${mode}. Double-click or complete to finish.`);
        } else {
            this.map.getContainer().style.cursor = "";
        }
    }

    clearDrawnItems() {
        this.drawnItems.clearLayers();
        if (this.tempDrawLine) {
            this.map.removeLayer(this.tempDrawLine);
            this.tempDrawLine = null;
        }
        this.tempDrawPoints = [];
    }

    _setupDrawingEvents() {
        this.map.on("click", (e) => {
            if (!this.currentDrawMode) return;

            const latlng = e.latlng;
            this.tempDrawPoints.push([latlng.lat, latlng.lng]);

            if (this.currentDrawMode === "line") {
                if (this.tempDrawPoints.length === 1) {
                    this.tempDrawLine = L.polyline(this.tempDrawPoints, { color: "#C59A55", weight: 3, dashArray: "4, 4" }).addTo(this.map);
                } else {
                    this.tempDrawLine.setLatLngs(this.tempDrawPoints);
                }

                // If user clicks 3 points or double clicks, finalize corridor line
                if (this.tempDrawPoints.length >= 3) {
                    this._finalizeCorridorLine();
                }
            } else if (this.currentDrawMode === "rectangle") {
                if (this.tempDrawPoints.length === 2) {
                    const bounds = [this.tempDrawPoints[0], this.tempDrawPoints[1]];
                    const rect = L.rectangle(bounds, {
                        color: "#557A61",
                        weight: 2,
                        fillColor: "#7E9B7A",
                        fillOpacity: 0.2
                    }).addTo(this.drawnItems);

                    rect.bindPopup("<strong>Custom Monitored Rectangle</strong><br>Area: ~14.8 km²<br><button class='btn-sm btn-primary' onclick='window.app.analyzeDrawnArea()'>Analyze Area</button>");
                    this.setDrawMode(null);
                    rect.openPopup();
                }
            } else if (this.currentDrawMode === "polygon") {
                if (this.tempDrawPoints.length >= 4) {
                    const poly = L.polygon(this.tempDrawPoints, {
                        color: "#557A61",
                        weight: 2,
                        fillColor: "#7E9B7A",
                        fillOpacity: 0.2
                    }).addTo(this.drawnItems);

                    poly.bindPopup("<strong>Custom Monitored Polygon</strong><br>Area: ~21.2 km²<br><button class='btn-sm btn-primary' onclick='window.app.analyzeDrawnArea()'>Analyze Area</button>");
                    this.setDrawMode(null);
                    poly.openPopup();
                }
            }
        });

        this.map.on("dblclick", () => {
            if (this.currentDrawMode === "line" && this.tempDrawPoints.length >= 2) {
                this._finalizeCorridorLine();
            }
        });
    }

    _finalizeCorridorLine() {
        if (this.tempDrawLine) {
            this.map.removeLayer(this.tempDrawLine);
            this.tempDrawLine = null;
        }

        const polyline = L.polyline(this.tempDrawPoints, {
            color: "#C59A55",
            weight: 4,
            opacity: 0.9
        }).addTo(this.drawnItems);

        // Compute route distance
        let totalDistanceMeters = 0;
        for (let i = 0; i < this.tempDrawPoints.length - 1; i++) {
            const p1 = L.latLng(this.tempDrawPoints[i]);
            const p2 = L.latLng(this.tempDrawPoints[i + 1]);
            totalDistanceMeters += p1.distanceTo(p2);
        }
        const distanceKm = (totalDistanceMeters / 1000).toFixed(1);

        // Simulated potential connectivity assessment
        const assessment = {
            length: `${distanceKm} km`,
            continuity: distanceKm > 10 ? "Moderate" : "Good",
            breaks: distanceKm > 8 ? 3 : 1,
            builtOverlap: (distanceKm * 0.14).toFixed(1) + " km",
            waterCrossings: 2
        };

        const popupContent = `
            <div style="min-width: 220px; font-size: 12px;">
                <h4 style="font-size: 13px; color: #355443; margin-bottom: 6px;">Potential Connectivity Assessment</h4>
                <div style="margin-bottom: 6px; line-height: 1.4;">
                    <div><strong>Length:</strong> ${assessment.length}</div>
                    <div><strong>Vegetation continuity:</strong> ${assessment.continuity}</div>
                    <div><strong>Potential breaks:</strong> ${assessment.breaks}</div>
                    <div><strong>Built-up overlap:</strong> ${assessment.builtOverlap}</div>
                    <div><strong>Water crossings:</strong> ${assessment.waterCrossings}</div>
                </div>
                <p style="font-size: 11px; color: #5F6B63; margin-bottom: 8px;">
                    The selected route intersects varied land-cover. Segments with potential breaks warrant wildlife connectivity evaluation.
                </p>
                <button onclick="window.app.addCorridorToInvestigation('${distanceKm}', '${assessment.breaks}')" style="
                    background: #355443;
                    color: #FFF;
                    border: none;
                    font-size: 11px;
                    font-weight: 600;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    width: 100%;
                ">Add to Investigation</button>
            </div>
        `;

        polyline.bindPopup(popupContent).openPopup();
        this.setDrawMode(null);
    }
}

// Attach to window
if (typeof window !== "undefined") {
    window.HabitatMapController = HabitatMapController;
}
