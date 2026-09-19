/**
 * HabitaWatch — Wildlife Habitat Monitoring System
 * Central Data Layer (Backend-Ready Architecture)
 * 
 * =========================================================================
 * BACKEND INTEGRATION INSTRUCTIONS:
 * -------------------------------------------------------------------------
 * This module isolates all data operations.
 * To integrate with a real production backend or cloud GIS pipeline:
 * 
 * Replace the local DEMO_DATA lookup inside HabitatDataProvider methods
 * with standard asynchronous REST/JSON calls, e.g.:
 * 
 *   async getRegions() {
 *     const res = await fetch('/api/regions');
 *     return await res.json();
 *   }
 * 
 * The UI layer strictly calls `HabitatDataProvider.get...()` methods,
 * guaranteeing zero UI refactoring when switching from Demo to Production.
 * =========================================================================
 */

const DEMO_DATA = {
    disclaimer: "Demonstration Dataset. Indicators reflect prepared sample observations for prototype evaluation and require field verification.",
    regions: [
        {
            id: "kanha",
            name: "Kanha Landscape",
            subtitle: "Central India — Tiger Habitat & Mixed Forest Corridor",
            center: [22.3345, 80.6115],
            zoom: 10,
            areaKm2: 2060,
            ecosystem: "Tropical Moist Deciduous & Sal Forest",
            focus: ["Vegetation Change", "Habitat Continuity", "Water Bodies"],
            image: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
            imageAlt: "Misty lush deciduous forest canopy in central India landscape",
            compareBeforeImage: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=80",
            compareAfterImage: "https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1400&q=80",
            compareBeforeLabel: "2025 Baseline Observation — Healthy Sal Forest Canopy",
            compareAfterLabel: "2026 Comparison Period — Canopy Opening & Moisture Stress",
            boundaryGeoJSON: {
                type: "Feature",
                properties: { name: "Kanha Monitoring Boundary" },
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [80.35, 22.48],
                        [80.85, 22.52],
                        [80.92, 22.20],
                        [80.65, 22.12],
                        [80.38, 22.25],
                        [80.35, 22.48]
                    ]]
                }
            },
            baseline: {
                vegetationHealth: 72,
                vegetationScore: 78,
                waterScore: 71,
                stabilityScore: 69,
                connectivityScore: 65,
                reviewAreasCount: 3
            }
        },
        {
            id: "western_ghats",
            name: "Western Ghats Corridor",
            subtitle: "Southern India — Anamalai-Nilgiri Montane Biodiversity Hotspot",
            center: [10.4500, 77.0200],
            zoom: 10,
            areaKm2: 1840,
            ecosystem: "Tropical Wet Evergreen & Shola-Grassland",
            focus: ["Vegetation Change", "Fragmentation", "Linear Infrastructure"],
            image: "https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1200&q=80",
            imageAlt: "Highland tropical forest ridge with morning mist",
            compareBeforeImage: "https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1400&q=80",
            compareAfterImage: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=80",
            compareBeforeLabel: "2025 Baseline Observation — Continuous Wet Evergreen Corridor",
            compareAfterLabel: "2026 Comparison Period — Linear Road Corridor Fragmentation",
            boundaryGeoJSON: {
                type: "Feature",
                properties: { name: "Western Ghats Monitoring Boundary" },
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [76.80, 10.65],
                        [77.25, 10.60],
                        [77.30, 10.25],
                        [76.95, 10.20],
                        [76.75, 10.40],
                        [76.80, 10.65]
                    ]]
                }
            },
            baseline: {
                vegetationHealth: 68,
                vegetationScore: 74,
                waterScore: 68,
                stabilityScore: 64,
                connectivityScore: 60,
                reviewAreasCount: 2
            }
        },
        {
            id: "sundarbans",
            name: "Sundarbans Estuarine Wetland",
            subtitle: "Bay of Bengal — Mangrove Biosphere & Intertidal Delta",
            center: [21.9497, 88.8997],
            zoom: 10,
            areaKm2: 2420,
            ecosystem: "Tidal Mangrove Swamp & Brackish Estuary",
            focus: ["Water-Body Changes", "Vegetation Salinity", "Shoreline Dynamics"],
            image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
            imageAlt: "Tidal mangrove estuary waterway with lush shoreline vegetation",
            compareBeforeImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
            compareAfterImage: "https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1400&q=80",
            compareBeforeLabel: "2025 Baseline Observation — Intertidal Mangrove Islands",
            compareAfterLabel: "2026 Comparison Period — Shoreline Shift & Channel Expansion",
            boundaryGeoJSON: {
                type: "Feature",
                properties: { name: "Sundarbans Monitoring Boundary" },
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [88.65, 22.15],
                        [89.15, 22.12],
                        [89.20, 21.75],
                        [88.75, 21.70],
                        [88.58, 21.92],
                        [88.65, 22.15]
                    ]]
                }
            },
            baseline: {
                vegetationHealth: 75,
                vegetationScore: 79,
                waterScore: 76,
                stabilityScore: 71,
                connectivityScore: 73,
                reviewAreasCount: 2
            }
        }
    ],

    // Observation Analyses across year comparisons
    analyses: {
        "kanha_2025_2026": {
            regionId: "kanha",
            beforeYear: 2025,
            afterYear: 2026,
            habitatHealth: 72,
            habitatStatus: "Moderate",
            breakdown: {
                vegetation: 78,
                water: 71,
                stability: 69,
                connectivity: 65
            },
            indicators: {
                vegetationChangePercent: -18.4,
                waterChangePercent: -3.2,
                builtUpChangePercent: 4.1,
                areasRequiringReview: 3
            },
            summaryText: "Vegetation indicators decreased in concentrated eastern sectors between 2025 and 2026, while primary water bodies remained relatively stable. Three concentrated areas require further review.",
            simpleExplanation: "Vegetation health decreased compared to the previous period. This can happen due to seasonal variations, forest canopy thinning, agriculture, or land clearing. Three specific locations show notable changes that conservation teams should inspect.",
            trends: [
                { year: 2024, ndvi: 0.68, ndwi: 0.36, label: "Baseline" },
                { year: 2025, ndvi: 0.62, ndwi: 0.34, label: "Prior Period" },
                { year: 2026, ndvi: 0.48, ndwi: 0.32, label: "Current Period" }
            ],
            connectivity: {
                connectedPatches: 8,
                potentialBreaks: 3,
                fragmentationRating: "Moderate",
                summary: "Corridor continuity between core sal forest patches shows 3 potential break points along seasonal drainage lines."
            }
        },
        "kanha_2024_2026": {
            regionId: "kanha",
            beforeYear: 2024,
            afterYear: 2026,
            habitatHealth: 67,
            habitatStatus: "Moderate",
            breakdown: {
                vegetation: 73,
                water: 68,
                stability: 64,
                connectivity: 61
            },
            indicators: {
                vegetationChangePercent: -22.1,
                waterChangePercent: -5.1,
                builtUpChangePercent: 6.8,
                areasRequiringReview: 4
            },
            summaryText: "Multi-year monitoring indicates cumulative vegetation decline along buffer margins and expanding agricultural frontiers.",
            simpleExplanation: "Over two observation cycles, green cover showed a steady decrease in peripheral zones. Water reserves contracted slightly during prolonged dry intervals.",
            trends: [
                { year: 2024, ndvi: 0.68, ndwi: 0.36, label: "Baseline" },
                { year: 2025, ndvi: 0.62, ndwi: 0.34, label: "Prior Period" },
                { year: 2026, ndvi: 0.48, ndwi: 0.32, label: "Current Period" }
            ],
            connectivity: {
                connectedPatches: 7,
                potentialBreaks: 4,
                fragmentationRating: "Significant",
                summary: "Peripheral fragmentation has increased, notably along the northeastern agricultural boundary."
            }
        },
        "kanha_2024_2025": {
            regionId: "kanha",
            beforeYear: 2024,
            afterYear: 2025,
            habitatHealth: 79,
            habitatStatus: "Stable",
            breakdown: {
                vegetation: 82,
                water: 78,
                stability: 76,
                connectivity: 74
            },
            indicators: {
                vegetationChangePercent: -6.5,
                waterChangePercent: -1.4,
                builtUpChangePercent: 1.8,
                areasRequiringReview: 1
            },
            summaryText: "Minimal environmental fluctuations observed across core sal forest zones with stable seasonal water reserves.",
            simpleExplanation: "Forest vegetation was mostly healthy and intact, with only small natural seasonal adjustments in canopy thickness.",
            trends: [
                { year: 2024, ndvi: 0.68, ndwi: 0.36, label: "Baseline" },
                { year: 2025, ndvi: 0.62, ndwi: 0.34, label: "Current Period" },
                { year: 2026, ndvi: 0.48, ndwi: 0.32, label: "Projected" }
            ],
            connectivity: {
                connectedPatches: 10,
                potentialBreaks: 1,
                fragmentationRating: "Low",
                summary: "Core habitat corridors remained well-connected with unbroken forest links."
            }
        },
        "western_ghats_2025_2026": {
            regionId: "western_ghats",
            beforeYear: 2025,
            afterYear: 2026,
            habitatHealth: 68,
            habitatStatus: "Moderate",
            breakdown: {
                vegetation: 74,
                water: 68,
                stability: 64,
                connectivity: 60
            },
            indicators: {
                vegetationChangePercent: -15.8,
                waterChangePercent: -2.8,
                builtUpChangePercent: 5.3,
                areasRequiringReview: 2
            },
            summaryText: "Canopy opening detected near road corridors and foothill transitions; high-altitude shola grasslands remain stable.",
            simpleExplanation: "Forest margins alongside transit corridors show lower green indices. Two zones warrant attention to protect elephant migration paths.",
            trends: [
                { year: 2024, ndvi: 0.74, ndwi: 0.42, label: "Baseline" },
                { year: 2025, ndvi: 0.71, ndwi: 0.40, label: "Prior Period" },
                { year: 2026, ndvi: 0.58, ndwi: 0.38, label: "Current Period" }
            ],
            connectivity: {
                connectedPatches: 6,
                potentialBreaks: 3,
                fragmentationRating: "Moderate",
                summary: "Linear transportation infrastructure creates potential barrier points across natural wildlife movement corridors."
            }
        },
        "sundarbans_2025_2026": {
            regionId: "sundarbans",
            beforeYear: 2025,
            afterYear: 2026,
            habitatHealth: 75,
            habitatStatus: "Stable",
            breakdown: {
                vegetation: 79,
                water: 76,
                stability: 71,
                connectivity: 73
            },
            indicators: {
                vegetationChangePercent: -8.7,
                waterChangePercent: 3.8,
                builtUpChangePercent: 2.2,
                areasRequiringReview: 2
            },
            summaryText: "Tidal mudflat shifts and localized mangrove edge fluctuations detected along dynamic estuarine channels.",
            simpleExplanation: "Waterways and mangrove fringes are constantly shifting with tidal tides and sediment. Two areas show altered water-to-vegetation ratios.",
            trends: [
                { year: 2024, ndvi: 0.58, ndwi: 0.52, label: "Baseline" },
                { year: 2025, ndvi: 0.56, ndwi: 0.50, label: "Prior Period" },
                { year: 2026, ndvi: 0.51, ndwi: 0.53, label: "Current Period" }
            ],
            connectivity: {
                connectedPatches: 12,
                potentialBreaks: 2,
                fragmentationRating: "Low",
                summary: "Waterways provide natural aquatic connections while mangrove islands show localized shore adjustments."
            }
        }
    },

    // Hotspot locations requiring investigation
    hotspots: {
        "kanha": [
            {
                id: "KAN-01",
                name: "Eastern Buffer Transition Zone",
                regionId: "kanha",
                coords: [22.385, 80.725],
                priority: "HIGH",
                priorityClass: "significant",
                category: "Potential vegetation decline",
                affectedAreaKm2: 18.4,
                ndviBefore: 0.62,
                ndviAfter: 0.38,
                vegChangePercent: -18.4,
                signalStrength: "High (0.84 confidence indicator)",
                whyFlagged: "Multiple environmental indicators changed synchronously within a concentrated 18.4 km² contiguous cluster.",
                whyItMatters: "This zone directly borders the designated eastern wildlife movement corridor linking Kanha to neighboring protected ranges.",
                whatNotProved: "This indicator change alone does not confirm permanent deforestation or illegal tree felling. It may also reflect severe localized dry-season distress, bamboo flowering die-back, or authorized selective clearing.",
                suggestedNextStep: "Review high-resolution aerial or field patrol imagery and schedule ground inspection with local forest staff.",
                recommendedVerificationOutcome: "Field patrol check required",
                polygonCoords: [
                    [22.36, 80.70],
                    [22.41, 80.71],
                    [22.40, 80.75],
                    [22.36, 80.74]
                ]
            },
            {
                id: "KAN-02",
                name: "Northern Drainage & Agriculture Interface",
                regionId: "kanha",
                coords: [22.445, 80.520],
                priority: "MEDIUM",
                priorityClass: "moderate",
                category: "Potential land-cover transition",
                affectedAreaKm2: 7.2,
                ndviBefore: 0.58,
                ndviAfter: 0.46,
                vegChangePercent: -12.1,
                signalStrength: "Medium (0.68 confidence indicator)",
                whyFlagged: "Moderate canopy thinning and spectral shift towards exposed soil or low-canopy crops.",
                whyItMatters: "Proximity to community grazing lands can increase wildlife-human conflict if buffer canopy decreases.",
                whatNotProved: "Does not differentiate between rotating crop harvesting, seasonal dry grass burns, or boundary expansion.",
                suggestedNextStep: "Cross-reference with local agricultural planting calendar and satellite baseline from prior wet season.",
                recommendedVerificationOutcome: "Seasonal agricultural evaluation",
                polygonCoords: [
                    [22.43, 80.50],
                    [22.46, 80.51],
                    [22.45, 80.54],
                    [22.42, 80.53]
                ]
            },
            {
                id: "KAN-03",
                name: "Southern Riparian Reservoir Fringes",
                regionId: "kanha",
                coords: [22.210, 80.640],
                priority: "LOW",
                priorityClass: "moderate",
                category: "Water-related change",
                affectedAreaKm2: 3.8,
                ndviBefore: 0.52,
                ndviAfter: 0.49,
                ndwiBefore: 0.34,
                ndwiAfter: 0.22,
                vegChangePercent: -3.2,
                signalStrength: "Low (0.54 confidence indicator)",
                whyFlagged: "Recession of open water surface area along reservoir margins during transition between dry and monsoon months.",
                whyItMatters: "Wildlife rely on perennial waterholes; seasonal reduction informs artificial watering hole maintenance.",
                whatNotProved: "Does not confirm persistent drought; normal seasonal water drawdown is typical in central Indian deciduous parks.",
                suggestedNextStep: "Inspect waterhole sensor levels and track replenishment post-monsoon.",
                recommendedVerificationOutcome: "Routine seasonal water audit",
                polygonCoords: [
                    [22.19, 80.62],
                    [22.23, 80.63],
                    [22.22, 80.66],
                    [22.18, 80.65]
                ]
            }
        ],
        "western_ghats": [
            {
                id: "WG-01",
                name: "Anamalai Foothill Transition",
                regionId: "western_ghats",
                coords: [10.510, 76.920],
                priority: "HIGH",
                priorityClass: "significant",
                category: "Potential vegetation decline",
                affectedAreaKm2: 14.2,
                ndviBefore: 0.71,
                ndviAfter: 0.49,
                vegChangePercent: -15.8,
                signalStrength: "High (0.81 confidence indicator)",
                whyFlagged: "Persistent decrease in green reflectance over 14.2 km² along the lower evergreen forest boundary.",
                whyItMatters: "Key transition habitat for hornbills and arboreal mammals.",
                whatNotProved: "Does not prove permanent land diversion. Plantation pruning or invasive weed clearing may produce similar indicators.",
                suggestedNextStep: "Conduct drone survey or ranger trail assessment.",
                recommendedVerificationOutcome: "Field patrol review",
                polygonCoords: [
                    [10.49, 76.90],
                    [10.53, 76.91],
                    [10.52, 76.94],
                    [10.48, 76.93]
                ]
            },
            {
                id: "WG-02",
                name: "Highland Highway Passage Buffer",
                regionId: "western_ghats",
                coords: [10.360, 77.110],
                priority: "MEDIUM",
                priorityClass: "moderate",
                category: "Potential land-cover transition",
                affectedAreaKm2: 5.6,
                ndviBefore: 0.65,
                ndviAfter: 0.52,
                vegChangePercent: -9.4,
                signalStrength: "Medium (0.64 confidence indicator)",
                whyFlagged: "Narrow linear spectral deviation directly flanking roadway easement.",
                whyItMatters: "May indicate road widening impact or roadside vegetation trimming.",
                whatNotProved: "Does not verify unauthorized construction.",
                suggestedNextStep: "Check road authority maintenance records.",
                recommendedVerificationOutcome: "Infrastructure inspection",
                polygonCoords: [
                    [10.34, 77.09],
                    [10.38, 77.10],
                    [10.37, 77.13],
                    [10.33, 77.12]
                ]
            }
        ],
        "sundarbans": [
            {
                id: "SUN-01",
                name: "Intertidal Mangrove Island Spit",
                regionId: "sundarbans",
                coords: [21.860, 88.940],
                priority: "HIGH",
                priorityClass: "significant",
                category: "Water-related change",
                affectedAreaKm2: 11.5,
                ndviBefore: 0.54,
                ndviAfter: 0.42,
                ndwiBefore: 0.48,
                ndwiAfter: 0.31,
                vegChangePercent: -8.7,
                signalStrength: "High (0.79 confidence indicator)",
                whyFlagged: "Shoreline inundation boundary shift and canopy thinning on exposed mangrove spit.",
                whyItMatters: "Mangroves provide natural storm surge dampening and critical nesting territory.",
                whatNotProved: "Does not separate natural tidal sedimentation erosion from human timber cutting.",
                suggestedNextStep: "Review historical tidal elevation charts and dispatch boat patrol.",
                recommendedVerificationOutcome: "Tidal erosion verification",
                polygonCoords: [
                    [21.84, 88.92],
                    [21.88, 88.93],
                    [21.87, 88.96],
                    [21.83, 88.95]
                ]
            },
            {
                id: "SUN-02",
                name: "Northern Embankment & Fishery Fringe",
                regionId: "sundarbans",
                coords: [22.080, 88.780],
                priority: "MEDIUM",
                priorityClass: "moderate",
                category: "Potential land-cover transition",
                affectedAreaKm2: 6.3,
                ndviBefore: 0.50,
                ndviAfter: 0.44,
                vegChangePercent: -11.2,
                signalStrength: "Medium (0.66 confidence indicator)",
                whyFlagged: "Increased specular water reflection near earthen flood protection embankments.",
                whyItMatters: "Embankment stability is critical for preventing saline ingress into freshwater pockets.",
                whatNotProved: "Does not prove embankment breach; may represent regular seasonal aquaculture pond flooding.",
                suggestedNextStep: "Inquire with local irrigation circle.",
                recommendedVerificationOutcome: "Embankment status check",
                polygonCoords: [
                    [22.06, 88.76],
                    [22.10, 88.77],
                    [22.09, 88.80],
                    [22.05, 88.79]
                ]
            }
        ]
    }
};

/**
 * HabitatDataProvider
 * Standalone asynchronous data interface.
 * All application UI logic binds exclusively to this object.
 */
const HabitatDataProvider = {
    /**
     * Retrieve all selectable monitoring regions
     */
    async getRegions() {
        // Simulates async microtask to mimic REST API behavior
        await new Promise(resolve => setTimeout(resolve, 30));
        return DEMO_DATA.regions;
    },

    /**
     * Retrieve single region by ID
     */
    async getRegion(id) {
        await new Promise(resolve => setTimeout(resolve, 30));
        const found = DEMO_DATA.regions.find(r => r.id === id);
        return found || DEMO_DATA.regions[0];
    },

    /**
     * Retrieve comparative analysis for region and temporal range
     */
    async getAnalysis(regionId, beforeYear, afterYear) {
        await new Promise(resolve => setTimeout(resolve, 50));
        const key = `${regionId}_${beforeYear}_${afterYear}`;
        
        if (DEMO_DATA.analyses[key]) {
            return DEMO_DATA.analyses[key];
        }

        // Deterministic synthetic fallback for arbitrary year pairings
        const region = await this.getRegion(regionId);
        const yearDiff = Math.max(1, afterYear - beforeYear);
        const vegDelta = -(5.5 * yearDiff).toFixed(1);
        const waterDelta = -(1.2 * yearDiff).toFixed(1);
        const builtUpDelta = +(1.5 * yearDiff).toFixed(1);

        return {
            regionId: region.id,
            beforeYear,
            afterYear,
            habitatHealth: Math.max(50, 76 - yearDiff * 4),
            habitatStatus: "Moderate",
            breakdown: {
                vegetation: Math.max(55, 80 - yearDiff * 3),
                water: Math.max(60, 74 - yearDiff * 2),
                stability: Math.max(50, 71 - yearDiff * 3),
                connectivity: Math.max(50, 68 - yearDiff * 4)
            },
            indicators: {
                vegetationChangePercent: parseFloat(vegDelta),
                waterChangePercent: parseFloat(waterDelta),
                builtUpChangePercent: parseFloat(builtUpDelta),
                areasRequiringReview: Math.min(5, 2 + yearDiff)
            },
            summaryText: `Comparative observation across ${beforeYear}–${afterYear} indicates potential localized vegetation fluctuations.`,
            simpleExplanation: `Between ${beforeYear} and ${afterYear}, overall vegetation condition trended slightly lower while water bodies followed expected seasonal variations.`,
            trends: [
                { year: beforeYear, ndvi: 0.65, ndwi: 0.35, label: "Initial" },
                { year: afterYear, ndvi: 0.52, ndwi: 0.32, label: "Target" }
            ],
            connectivity: {
                connectedPatches: 8,
                potentialBreaks: 2,
                fragmentationRating: "Moderate",
                summary: "Corridor linkage between core habitat patches displays moderate connectivity with minor breaks."
            }
        };
    },

    /**
     * Retrieve flagged areas requiring review for a given region
     */
    async getHotspots(regionId, beforeYear, afterYear) {
        await new Promise(resolve => setTimeout(resolve, 40));
        const list = DEMO_DATA.hotspots[regionId];
        return list || DEMO_DATA.hotspots["kanha"];
    },

    /**
     * Retrieve analysis for a custom drawn user geometry
     */
    async getCustomAreaAnalysis(geometry, beforeYear, afterYear) {
        await new Promise(resolve => setTimeout(resolve, 40));
        const areaKm2 = geometry.areaKm2 || 14.8;
        const yearDiff = Math.max(1, afterYear - beforeYear);
        const vegDelta = -(3.8 * yearDiff + (parseFloat(areaKm2) % 4)).toFixed(1);
        const waterDelta = -(1.1 * yearDiff + (parseFloat(areaKm2) % 2)).toFixed(1);
        const health = Math.max(50, Math.min(88, Math.round(75 - yearDiff * 4 - (areaKm2 > 25 ? 4 : 0))));

        const center = geometry.center || [22.33, 80.61];
        const lat = center[0];
        const lng = center[1];
        const offset = Math.min(0.035, Math.max(0.012, Math.sqrt(areaKm2) * 0.004));

        const hotspots = [
            {
                id: "CUST-01",
                name: "Custom Perimeter — Sector North",
                regionId: "custom",
                coords: [lat + offset, lng - offset],
                priority: "HIGH",
                priorityClass: "significant",
                category: "Potential vegetation decline",
                affectedAreaKm2: parseFloat((areaKm2 * 0.32).toFixed(1)),
                ndviBefore: 0.64,
                ndviAfter: 0.42,
                vegChangePercent: parseFloat(vegDelta),
                signalStrength: "High (0.83 confidence indicator)",
                whyFlagged: `Concentrated canopy spectral decline observed inside custom-drawn ${areaKm2} km² perimeter.`,
                whyItMatters: "Direct indicator of local canopy loss or thinning within the user's focus boundary.",
                whatNotProved: "Does not confirm permanent clearing; local drought or seasonal tree fall may contribute.",
                suggestedNextStep: "Deploy ground patrol with GPS coordinates to verify canopy condition.",
                polygonCoords: [
                    [lat + offset, lng - offset],
                    [lat + offset + 0.015, lng - offset + 0.01],
                    [lat + offset + 0.01, lng - offset + 0.025],
                    [lat + offset - 0.01, lng - offset + 0.018]
                ]
            },
            {
                id: "CUST-02",
                name: "Custom Perimeter — Sector South",
                regionId: "custom",
                coords: [lat - offset, lng + offset],
                priority: "MEDIUM",
                priorityClass: "moderate",
                category: "Potential land-cover transition",
                affectedAreaKm2: parseFloat((areaKm2 * 0.21).toFixed(1)),
                ndviBefore: 0.58,
                ndviAfter: 0.47,
                vegChangePercent: -9.8,
                signalStrength: "Medium (0.67 confidence indicator)",
                whyFlagged: "Moderate spectral variation near peripheral edge of drawn geometry.",
                whyItMatters: "Potential edge effects or transition to scrubland / crop cultivation.",
                whatNotProved: "Does not differentiate between rotating crop harvesting and permanent encroachment.",
                suggestedNextStep: "Cross-reference with seasonal planting records.",
                polygonCoords: [
                    [lat - offset, lng + offset],
                    [lat - offset + 0.012, lng + offset + 0.018],
                    [lat - offset - 0.012, lng + offset + 0.024],
                    [lat - offset - 0.018, lng + offset + 0.01]
                ]
            }
        ];

        return {
            analysis: {
                regionId: "custom",
                isCustomArea: true,
                customAreaKm2: areaKm2,
                beforeYear,
                afterYear,
                habitatHealth: health,
                habitatStatus: health > 74 ? "Stable" : (health > 58 ? "Moderate" : "Significant"),
                breakdown: {
                    vegetation: Math.max(50, health + 5),
                    water: Math.max(50, health - 2),
                    stability: Math.max(50, health - 4),
                    connectivity: Math.max(50, health - 7)
                },
                indicators: {
                    vegetationChangePercent: parseFloat(vegDelta),
                    waterChangePercent: parseFloat(waterDelta),
                    builtUpChangePercent: +(2.6 * yearDiff).toFixed(1),
                    areasRequiringReview: hotspots.length
                },
                summaryText: `User-defined custom perimeter (${areaKm2} km²) analyzed between ${beforeYear} and ${afterYear}. ${hotspots.length} concentrated areas flagged for field inspection.`,
                simpleExplanation: `Within your drawn boundary (${areaKm2} km²), overall vegetation cover shifted by ${vegDelta}% compared to ${beforeYear}. Two locations require closer ground checking.`,
                trends: [
                    { year: 2024, ndvi: 0.65, ndwi: 0.35, label: "Baseline" },
                    { year: beforeYear, ndvi: 0.61, ndwi: 0.34, label: "Prior" },
                    { year: afterYear, ndvi: 0.49, ndwi: 0.31, label: "Current" }
                ],
                connectivity: {
                    connectedPatches: Math.max(3, Math.round(areaKm2 / 4)),
                    potentialBreaks: 2,
                    fragmentationRating: areaKm2 > 15 ? "Moderate" : "Low",
                    summary: `Custom perimeter encompasses ~${Math.max(3, Math.round(areaKm2 / 4))} contiguous habitat patches with 2 potential fracture lines.`
                }
            },
            hotspots
        };
    },

    /**
     * Retrieve structured report data
     */
    async getReport(regionId, beforeYear, afterYear) {
        let region, analysis, hotspots;

        if (regionId === "custom" && window.app?.state?.customGeometry) {
            const geom = window.app.state.customGeometry;
            region = {
                id: "custom",
                name: `Custom Drawn Area (${geom.areaKm2} km²)`,
                subtitle: `Centroid ${geom.center[0].toFixed(3)}°N, ${geom.center[1].toFixed(3)}°E`,
                ecosystem: "User-Defined Geographical Perimeter",
                areaKm2: geom.areaKm2
            };
            const customRes = await this.getCustomAreaAnalysis(geom, beforeYear, afterYear);
            analysis = customRes.analysis;
            hotspots = customRes.hotspots;
        } else {
            [region, analysis, hotspots] = await Promise.all([
                this.getRegion(regionId),
                this.getAnalysis(regionId, beforeYear, afterYear),
                this.getHotspots(regionId, beforeYear, afterYear)
            ]);
        }

        return {
            title: "HabitaWatch Habitat Monitoring Report",
            subtitle: "Environmental Indicator Assessment & Investigation Guidance",
            generatedAt: new Date().toISOString(),
            dateFormatted: new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            }),
            region,
            observationPeriod: {
                from: beforeYear,
                to: afterYear
            },
            analysis,
            priorityAreas: hotspots,
            keyFindings: [
                `Habitat Health composite indicator estimated at ${analysis.habitatHealth}/100 (${analysis.habitatStatus}).`,
                `Vegetation indicator shifted by ${analysis.indicators.vegetationChangePercent}% across the analyzed observation window.`,
                `Surface water indicators registered a ${analysis.indicators.waterChangePercent}% adjustment.`,
                `${hotspots.length} discrete clusters identified with concentrated spectral variance requiring field patrol or high-res verification.`
            ],
            recommendations: [
                "Prioritize ground survey at highest ranked sector (" + (hotspots[0]?.name || "Sector 1") + ") to verify ground cover status.",
                "Cross-reference detected decline with recent rainfall and agricultural harvesting timelines to exclude natural cyclical variations.",
                "Review wildlife transit corridors in areas showing fragmented patches to maintain seasonal migration corridors.",
                "Log verified field outcomes in HabitaWatch to calibrate ongoing prototype thresholds."
            ],
            methodology: {
                framework: "OBSERVE → COMPARE → CALCULATE → DETECT → PRIORITIZE → VERIFY",
                indicatorsUsed: [
                    { name: "NDVI (Normalized Difference Vegetation Index)", formula: "(NIR - Red) / (NIR + Red)", purpose: "Indicator associated with chlorophyll absorption and canopy density." },
                    { name: "NDWI (Normalized Difference Water Index)", formula: "(Green - NIR) / (Green + NIR)", purpose: "Indicator associated with open water extent and surface moisture." },
                    { name: "Habitat Health Score", formula: "Composite weighted score (Veg 35%, Water 25%, Stability 20%, Connectivity 20%)", purpose: "Comparative landscape index for relative prioritization." }
                ]
            },
            limitations: [
                "Demonstration dataset: Measurements represent prepared sample values calibrated for evaluation.",
                "Indicator change does NOT prove confirmed deforestation, land clearing, or illegal intrusion.",
                "Cloud shadow, atmospheric haze, seasonal moisture, and crop cycles can affect optical indicators.",
                "Field verification by trained rangers or researchers is indispensable before taking operational or legal action."
            ],
            dataStatus: DEMO_DATA.disclaimer
        };
    }
};

// Make available globally on browser window
if (typeof window !== "undefined") {
    window.HabitatDataProvider = HabitatDataProvider;
    window.DEMO_DATA = DEMO_DATA;
}
