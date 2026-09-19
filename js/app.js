/**
 * HabitaWatch — Wildlife Habitat Monitoring System
 * Main Application Orchestrator & State Management (app.js)
 */

class HabitaWatchApp {
    constructor() {
        this.mapController = new HabitatMapController("monitoring-map");
        this.analysisController = new HabitatAnalysisController();
        this.reportController = new HabitatReportController();

        this.state = {
            regionId: "kanha",
            beforeYear: 2025,
            afterYear: 2026,
            currentRegion: null,
            currentAnalysis: null,
            currentHotspots: [],
            selectedHotspot: null,
            viewMode: "detailed", // "detailed" or "simple"
            investigationQueue: [],
            savedAreas: [],
            analysisHistory: [],
            guidedDemoStep: 0,
            guidedDemoActive: false
        };

        this.init();
    }

    async init() {
        this._loadLocalStorage();
        this._bindEvents();
        this._initCompareDragger();
        await this._populateRegionSelectors();

        // Initialize Map
        this.mapController.init();
        await this.selectRegion(this.state.regionId);

        // Run initial baseline analysis
        await this.runAnalysis();
    }

    _loadLocalStorage() {
        try {
            const queue = localStorage.getItem("habitawatch_queue");
            if (queue) this.state.investigationQueue = JSON.parse(queue);
            else {
                // Initialize default sample investigation queue
                this.state.investigationQueue = [
                    {
                        id: "KAN-01",
                        name: "Eastern Buffer Transition Zone",
                        regionId: "kanha",
                        priority: "HIGH",
                        category: "Potential vegetation decline",
                        status: "New",
                        addedAt: new Date().toISOString()
                    }
                ];
                this._persistQueue();
            }

            const history = localStorage.getItem("habitawatch_history");
            if (history) this.state.analysisHistory = JSON.parse(history);

            const saved = localStorage.getItem("habitawatch_saved_areas");
            if (saved) this.state.savedAreas = JSON.parse(saved);
        } catch (e) {
            console.warn("Storage loading fallback", e);
        }
    }

    _persistQueue() {
        try {
            localStorage.setItem("habitawatch_queue", JSON.stringify(this.state.investigationQueue));
            this._renderInvestigationQueue();
        } catch (e) {
            console.warn("Storage save error", e);
        }
    }

    _persistHistory(record) {
        try {
            this.state.analysisHistory.unshift(record);
            if (this.state.analysisHistory.length > 10) this.state.analysisHistory.pop();
            localStorage.setItem("habitawatch_history", JSON.stringify(this.state.analysisHistory));
            this._renderHistoryList();
        } catch (e) {
            console.warn("History save error", e);
        }
    }

    async _populateRegionSelectors() {
        const regions = await window.HabitatDataProvider.getRegions();
        const select = document.getElementById("region-select");
        if (select) {
            select.innerHTML = regions.map(r => `
                <option value="${r.id}">${r.name}</option>
            `).join('');
            select.value = this.state.regionId;
        }

        // Home featured cards
        const container = document.getElementById("featured-regions-container");
        if (container) {
            container.innerHTML = regions.map(r => `
                <div class="region-card" onclick="window.app.selectRegionAndMonitor('${r.id}')" role="button" tabindex="0">
                    <div class="region-card-img">
                        <img src="${r.image}" alt="${r.imageAlt}" loading="lazy">
                    </div>
                    <div class="region-card-body">
                        <h4 class="region-title">${r.name}</h4>
                        <div class="region-meta">${r.subtitle}</div>
                        <div class="region-tags">
                            ${r.focus.map(f => `<span class="region-tag-pill">${f}</span>`).join('')}
                        </div>
                        <div class="region-card-footer">
                            <span style="font-size: 11px; font-weight: 600; color: #557A61;">Area: ${r.areaKm2} km²</span>
                            <button class="btn btn-sm btn-secondary">Monitor Area &rarr;</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    _bindEvents() {
        // Region Select
        const regionSelect = document.getElementById("region-select");
        if (regionSelect) {
            regionSelect.addEventListener("change", (e) => {
                this.selectRegion(e.target.value);
            });
        }

        // Search input
        const searchInput = document.getElementById("region-search-input");
        if (searchInput) {
            searchInput.addEventListener("keyup", (e) => {
                const q = e.target.value.toLowerCase().trim();
                const regions = window.DEMO_DATA.regions;
                const match = regions.find(r => r.name.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q));
                if (match && e.key === "Enter") {
                    this.selectRegion(match.id);
                    searchInput.value = "";
                }
            });
        }

        // Year selectors
        const beforeSelect = document.getElementById("before-year-select");
        const afterSelect = document.getElementById("after-year-select");
        if (beforeSelect && afterSelect) {
            beforeSelect.addEventListener("change", (e) => {
                this.state.beforeYear = parseInt(e.target.value);
                this._updateCompareSliderContent();
            });
            afterSelect.addEventListener("change", (e) => {
                this.state.afterYear = parseInt(e.target.value);
                this._updateCompareSliderContent();
            });
        }

        // Analyze button
        const analyzeBtn = document.getElementById("btn-analyze-main");
        if (analyzeBtn) {
            analyzeBtn.addEventListener("click", () => {
                if (this.state.isCustomArea && this.state.customGeometry) {
                    this.analyzeCustomArea(this.state.customGeometry);
                } else {
                    this.runAnalysis();
                }
            });
        }

        // Simple vs Detailed view toggle
        const btnSimple = document.getElementById("view-mode-simple");
        const btnDetailed = document.getElementById("view-mode-detailed");
        if (btnSimple && btnDetailed) {
            btnSimple.addEventListener("click", () => this.setViewMode("simple"));
            btnDetailed.addEventListener("click", () => this.setViewMode("detailed"));
        }

        // Modal close listeners on Escape key
        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.closeAllModals();
            }
        });
    }

    async selectRegion(regionId) {
        if (regionId === "custom") {
            if (this.state.customGeometry) {
                await this.analyzeCustomArea(this.state.customGeometry);
            }
            return;
        }

        this.state.isCustomArea = false;
        this.state.regionId = regionId;
        const region = await window.HabitatDataProvider.getRegion(regionId);
        this.state.currentRegion = region;

        const select = document.getElementById("region-select");
        if (select) select.value = regionId;

        await this.mapController.loadRegion(region);
        this._updateCompareSliderContent();
        this.showToast(`Monitoring area set to ${region.name}`);
    }

    async selectRegionAndMonitor(regionId) {
        await this.selectRegion(regionId);
        document.getElementById("workspace-section")?.scrollIntoView({ behavior: "smooth" });
        await this.runAnalysis();
    }

    async runAnalysis() {
        const analyzeBtn = document.getElementById("btn-analyze-main");
        const progressStrip = document.getElementById("analysis-progress-strip");
        const progressLabel = document.getElementById("analysis-step-label");

        if (analyzeBtn) {
            analyzeBtn.classList.add("loading");
            analyzeBtn.disabled = true;
        }
        if (progressStrip) progressStrip.classList.add("active");

        try {
            const result = await this.analysisController.executeAnalysis(
                this.state.regionId,
                this.state.beforeYear,
                this.state.afterYear,
                (stepNum, stepLabel) => {
                    if (progressLabel) progressLabel.innerText = `Step ${stepNum}/5: ${stepLabel}`;
                    for (let i = 1; i <= 5; i++) {
                        const dot = document.getElementById(`step-item-${i}`);
                        if (dot) {
                            dot.classList.remove("current", "done");
                            if (i < stepNum) dot.classList.add("done");
                            else if (i === stepNum) dot.classList.add("current");
                        }
                    }
                }
            );

            this.state.currentAnalysis = result.analysis;
            this.state.currentHotspots = result.hotspots;

            this._renderAnalysisResults(result.analysis, result.hotspots);

            // Log history
            this._persistHistory({
                regionName: this.state.currentRegion.name,
                regionId: this.state.regionId,
                beforeYear: this.state.beforeYear,
                afterYear: this.state.afterYear,
                habitatHealth: result.analysis.habitatHealth,
                status: result.analysis.habitatStatus,
                reviewAreas: result.hotspots.length,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            this.showToast("Observation analysis updated");
        } catch (err) {
            console.error("Analysis execution error", err);
            this.showToast("Analysis encountered an issue. Using cached baseline.");
        } finally {
            if (analyzeBtn) {
                analyzeBtn.classList.remove("loading");
                analyzeBtn.disabled = false;
            }
            if (progressStrip) progressStrip.classList.remove("active");
        }
    }

    _renderAnalysisResults(analysis, hotspots) {
        // Summary Metrics
        const healthVal = document.getElementById("metric-health-val");
        const healthStatus = document.getElementById("metric-health-status");
        if (healthVal) healthVal.innerText = analysis.habitatHealth;
        if (healthStatus) {
            healthStatus.innerText = analysis.habitatStatus;
            healthStatus.className = `metric-status-badge status-${analysis.habitatStatus.toLowerCase()}`;
        }

        const vegVal = document.getElementById("metric-veg-val");
        if (vegVal) {
            const p = analysis.indicators.vegetationChangePercent;
            vegVal.innerText = `${p > 0 ? '+' : ''}${p}%`;
            vegVal.style.color = p < 0 ? '#B76555' : '#557A61';
        }

        const waterVal = document.getElementById("metric-water-val");
        if (waterVal) {
            const p = analysis.indicators.waterChangePercent;
            waterVal.innerText = `${p > 0 ? '+' : ''}${p}%`;
            waterVal.style.color = p < 0 ? '#C59A55' : '#6F9EAD';
        }

        const areasVal = document.getElementById("metric-areas-val");
        if (areasVal) areasVal.innerText = hotspots.length;

        // Change Summary Box
        const summaryText = document.getElementById("change-summary-text");
        const simpleText = document.getElementById("change-simple-text");
        const reviewPill = document.getElementById("review-areas-pill");

        if (summaryText) summaryText.innerText = analysis.summaryText;
        if (simpleText) simpleText.innerText = analysis.simpleExplanation;
        if (reviewPill) reviewPill.innerHTML = `&bull; ${hotspots.length} areas require review`;

        // Render Map Markers & Layers
        this.mapController.renderHotspots(hotspots, (spot) => {
            this.openHotspotDetail(spot.id);
        });

        // Render Hotspots List Card
        const listContainer = document.getElementById("hotspots-list-container");
        if (listContainer) {
            listContainer.innerHTML = hotspots.map(spot => `
                <div class="hotspot-item" id="hotspot-card-${spot.id}" onclick="window.app.openHotspotDetail('${spot.id}')" tabindex="0">
                    <div class="hotspot-top">
                        <span class="hotspot-id">${spot.id}</span>
                        <span class="priority-pill priority-${spot.priority.toLowerCase()}">${spot.priority} PRIORITY</span>
                    </div>
                    <div class="hotspot-category">${spot.category}</div>
                    <div class="hotspot-metrics-mini">
                        <span><strong>${spot.affectedAreaKm2} km²</strong> affected</span>
                        <span>NDVI: <strong>${spot.ndviBefore} &rarr; ${spot.ndviAfter}</strong></span>
                    </div>
                    <div class="hotspot-cta-row">
                        <span style="font-size: 11px; color: #5F6B63;">${spot.name}</span>
                        <span class="btn-investigate">Investigate &rarr;</span>
                    </div>
                </div>
            `).join('');
        }

        // Multi-year SVG Trend Chart
        this.analysisController.renderTrendChart("trend-chart-container", analysis.trends);

        // Connectivity Info
        const connPatches = document.getElementById("conn-metric-patches");
        const connBreaks = document.getElementById("conn-metric-breaks");
        const connRating = document.getElementById("conn-metric-rating");
        const connDesc = document.getElementById("conn-description-text");

        if (connPatches) connPatches.innerText = analysis.connectivity.connectedPatches;
        if (connBreaks) connBreaks.innerText = analysis.connectivity.potentialBreaks;
        if (connRating) connRating.innerText = analysis.connectivity.fragmentationRating;
        if (connDesc) connDesc.innerText = analysis.connectivity.summary;

        this.applyViewMode();
    }

    openHotspotDetail(hotspotId) {
        const hotspot = (this.state.currentHotspots || []).find(h => h.id === hotspotId);
        if (!hotspot) return;

        this.state.selectedHotspot = hotspot;
        this.mapController.highlightHotspot(hotspotId);

        // Highlight card in list
        document.querySelectorAll(".hotspot-item").forEach(el => el.classList.remove("active"));
        document.getElementById(`hotspot-card-${hotspotId}`)?.classList.add("active");

        const modal = document.getElementById("hotspot-detail-modal");
        const content = document.getElementById("hotspot-modal-content");
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="evidence-box">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span class="priority-pill priority-${hotspot.priority.toLowerCase()}">${hotspot.priority} PRIORITY &bull; ${hotspot.id}</span>
                    <span style="font-size: 12px; color: #5F6B63;">${hotspot.signalStrength}</span>
                </div>
                <h3 style="font-size: 18px; margin-bottom: 12px; color: #355443;">${hotspot.name}</h3>
                <div class="evidence-grid">
                    <div class="evidence-item">
                        <strong>Vegetation Indicator Shift</strong>
                        <span>${hotspot.vegChangePercent}%</span>
                    </div>
                    <div class="evidence-item">
                        <strong>NDVI Transition</strong>
                        <span>${hotspot.ndviBefore} &rarr; ${hotspot.ndviAfter}</span>
                    </div>
                    <div class="evidence-item">
                        <strong>Affected Contiguous Extent</strong>
                        <span>${hotspot.affectedAreaKm2} km²</span>
                    </div>
                    <div class="evidence-item">
                        <strong>Category Classification</strong>
                        <span>${hotspot.category}</span>
                    </div>
                </div>
            </div>

            <div class="explanation-section">
                <div class="explanation-title">Why was this area flagged?</div>
                <div class="explanation-desc">${hotspot.whyFlagged}</div>
            </div>

            <div class="explanation-section">
                <div class="explanation-title">Why it matters</div>
                <div class="explanation-desc">${hotspot.whyItMatters}</div>
            </div>

            <div class="scientific-caveat">
                <strong>Scientific Disclaimer &bull; What this does NOT prove:</strong>
                <p style="margin-top: 4px;">${hotspot.whatNotProved}</p>
            </div>

            <div class="suggested-step-box">
                <strong>Suggested Next Action:</strong>
                <p style="margin-top: 2px;">${hotspot.suggestedNextStep}</p>
            </div>
        `;

        modal.classList.add("open");
    }

    addCurrentHotspotToQueue() {
        if (!this.state.selectedHotspot) return;
        const spot = this.state.selectedHotspot;

        const exists = this.state.investigationQueue.some(item => item.id === spot.id);
        if (!exists) {
            this.state.investigationQueue.push({
                id: spot.id,
                name: spot.name,
                regionId: this.state.regionId,
                priority: spot.priority,
                category: spot.category,
                status: "New",
                addedAt: new Date().toISOString()
            });
            this._persistQueue();
            this.showToast(`Area ${spot.id} added to Investigation Queue`);
        } else {
            this.showToast(`Area ${spot.id} is already in the queue`);
        }
        this.closeAllModals();
    }

    addCorridorToInvestigation(lengthKm, breaks) {
        const id = `CORR-${Math.floor(100 + Math.random() * 900)}`;
        this.state.investigationQueue.push({
            id: id,
            name: `Drawn Wildlife Corridor (${lengthKm} km)`,
            regionId: this.state.regionId,
            priority: "MEDIUM",
            category: "Connectivity assessment",
            status: "New",
            notes: `${breaks} potential breaks detected along drawn route.`,
            addedAt: new Date().toISOString()
        });
        this._persistQueue();
        this.showToast("Corridor route logged to Investigation Queue");
    }

    openFieldVerificationModal(itemId) {
        const item = this.state.investigationQueue.find(i => i.id === itemId);
        if (!item) return;

        const modal = document.getElementById("verification-modal");
        const title = document.getElementById("verify-item-title");
        const idInput = document.getElementById("verify-item-id");
        if (title) title.innerText = `${item.id} — ${item.name}`;
        if (idInput) idInput.value = item.id;

        modal.classList.add("open");
    }

    saveFieldVerification() {
        const itemId = document.getElementById("verify-item-id")?.value;
        const notes = document.getElementById("verify-notes")?.value;
        const outcomeRadio = document.querySelector('input[name="verify-outcome"]:checked');
        const outcome = outcomeRadio ? outcomeRadio.value : "Confirmed vegetation loss";

        const item = this.state.investigationQueue.find(i => i.id === itemId);
        if (item) {
            item.notes = notes;
            item.outcome = outcome;
            item.status = (outcome === "False positive" || outcome === "Dismissed") ? "Dismissed" : "Verified";
            item.verifiedAt = new Date().toISOString();
            this._persistQueue();
            this.showToast(`Field verification recorded: ${item.status}`);
        }
        this.closeAllModals();
    }

    _renderInvestigationQueue() {
        const container = document.getElementById("investigation-queue-container");
        const badgeCount = document.getElementById("queue-count-badge");
        if (!container) return;

        if (badgeCount) badgeCount.innerText = this.state.investigationQueue.length;

        if (this.state.investigationQueue.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #89938C;">
                    <h4>Nothing requires review yet</h4>
                    <p style="font-size: 13px; margin-top: 4px;">Areas flagged during observation analysis will appear here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.state.investigationQueue.map(item => `
            <div class="investigation-item">
                <div class="investigation-info">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <span class="status-badge status-${item.status.toLowerCase().replace(/\s+/g, '-')}">${item.status}</span>
                        <span class="priority-pill priority-${item.priority.toLowerCase()}">${item.priority}</span>
                    </div>
                    <h4>${item.name}</h4>
                    <p style="color: #5F6B63;">${item.category} ${item.outcome ? `&bull; Outcome: <strong>${item.outcome}</strong>` : ''}</p>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-sm btn-secondary" onclick="window.app.openFieldVerificationModal('${item.id}')">
                        Field Verify
                    </button>
                    <button class="btn btn-sm btn-secondary" style="color: #B76555;" onclick="window.app.removeFromQueue('${item.id}')">
                        &times;
                    </button>
                </div>
            </div>
        `).join('');
    }

    removeFromQueue(id) {
        this.state.investigationQueue = this.state.investigationQueue.filter(i => i.id !== id);
        this._persistQueue();
        this.showToast(`Item removed from queue`);
    }

    _renderHistoryList() {
        const container = document.getElementById("history-list-container");
        if (!container) return;

        if (this.state.analysisHistory.length === 0) {
            container.innerHTML = "<p style='color: #89938C; font-size: 13px;'>No past analyses logged yet.</p>";
            return;
        }

        container.innerHTML = this.state.analysisHistory.map((h, idx) => `
            <div style="border-bottom: 1px solid #E7ECE6; padding: 10px 0; font-size: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div>
                    <strong style="color: #355443;">${h.regionName}</strong> (${h.beforeYear} &rarr; ${h.afterYear})<br>
                    <span style="color: #5F6B63;">Health: ${h.habitatHealth}/100 &bull; ${h.reviewAreas} review areas</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #89938C; font-size: 11px;">${h.timestamp}</span>
                    <button class="btn btn-sm btn-secondary" onclick="window.app.openHistoryRecord(${idx})" style="padding: 2px 8px; font-size: 11px;">
                        Open
                    </button>
                </div>
            </div>
        `).join('');
    }

    async openHistoryRecord(index) {
        const record = this.state.analysisHistory[index];
        if (!record) return;

        const beforeSelect = document.getElementById("before-year-select");
        const afterSelect = document.getElementById("after-year-select");
        if (beforeSelect) beforeSelect.value = record.beforeYear;
        if (afterSelect) afterSelect.value = record.afterYear;
        this.state.beforeYear = record.beforeYear;
        this.state.afterYear = record.afterYear;

        if (record.regionId !== "custom") {
            await this.selectRegion(record.regionId);
            await this.runAnalysis();
        } else if (this.state.customGeometry) {
            await this.analyzeCustomArea(this.state.customGeometry);
        }
        document.getElementById("workspace-section")?.scrollIntoView({ behavior: "smooth" });
        this.showToast(`Reloaded analysis: ${record.regionName}`);
    }

    // Custom Drawn Area Analysis and Persistence
    async analyzeDrawnGeometry() {
        const geom = this.mapController.lastDrawnGeometry;
        if (!geom) {
            this.showToast("Please draw a boundary or corridor on the map first.");
            return;
        }
        await this.analyzeCustomArea(geom);
    }

    async analyzeCustomArea(geom) {
        const analyzeBtn = document.getElementById("btn-analyze-main");
        const progressStrip = document.getElementById("analysis-progress-strip");
        const progressLabel = document.getElementById("analysis-step-label");

        if (analyzeBtn) {
            analyzeBtn.classList.add("loading");
            analyzeBtn.disabled = true;
        }
        if (progressStrip) progressStrip.classList.add("active");

        try {
            const steps = [
                "Clipping spatial boundary to drawn coordinates",
                "Sampling optical indices across custom bounds",
                "Calculating localized NDVI and NDWI deltas",
                "Clustering potential change anomalies",
                "Synthesizing custom monitoring report"
            ];

            for (let i = 0; i < steps.length; i++) {
                if (progressLabel) progressLabel.innerText = `Step ${i + 1}/5: ${steps[i]}`;
                for (let j = 1; j <= 5; j++) {
                    const dot = document.getElementById(`step-item-${j}`);
                    if (dot) {
                        dot.classList.remove("current", "done");
                        if (j < i + 1) dot.classList.add("done");
                        else if (j === i + 1) dot.classList.add("current");
                    }
                }
                await new Promise(r => setTimeout(r, 220));
            }

            const customResult = await window.HabitatDataProvider.getCustomAreaAnalysis(
                geom,
                this.state.beforeYear,
                this.state.afterYear
            );

            this.state.currentAnalysis = customResult.analysis;
            this.state.currentHotspots = customResult.hotspots;
            this.state.isCustomArea = true;
            this.state.customGeometry = geom;

            // Add/Select custom option in region selector
            const regionSelect = document.getElementById("region-select");
            if (regionSelect) {
                let opt = regionSelect.querySelector("option[value='custom']");
                if (!opt) {
                    opt = document.createElement("option");
                    opt.value = "custom";
                    regionSelect.appendChild(opt);
                }
                opt.innerText = `Custom Drawn Area (${geom.areaKm2} km²)`;
                regionSelect.value = "custom";
            }

            this._renderAnalysisResults(customResult.analysis, customResult.hotspots);

            // Log history
            this._persistHistory({
                regionName: `Custom Area (${geom.areaKm2} km²)`,
                regionId: "custom",
                beforeYear: this.state.beforeYear,
                afterYear: this.state.afterYear,
                habitatHealth: customResult.analysis.habitatHealth,
                status: customResult.analysis.habitatStatus,
                reviewAreas: customResult.hotspots.length,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            this.showToast(`Analyzed custom area (${geom.areaKm2} km²). ${customResult.hotspots.length} hotspots detected.`);
        } catch (err) {
            console.error("Error analyzing drawn area:", err);
            this.showToast("Analysis encountered an error on drawn geometry.");
        } finally {
            if (analyzeBtn) {
                analyzeBtn.classList.remove("loading");
                analyzeBtn.disabled = false;
            }
            if (progressStrip) progressStrip.classList.remove("active");
        }
    }

    saveCustomDrawnArea() {
        const geom = this.mapController.lastDrawnGeometry;
        if (!geom) {
            this.showToast("No drawn geometry found to save.");
            return;
        }
        const defaultName = `Monitored Zone (${geom.areaKm2} km²)`;
        const name = prompt("Enter a label for this saved monitoring area:", defaultName) || defaultName;

        const record = {
            id: `SAVED-${Date.now()}`,
            name: name,
            areaKm2: geom.areaKm2,
            center: geom.center,
            coords: geom.coords,
            type: geom.type,
            beforeYear: this.state.beforeYear,
            afterYear: this.state.afterYear,
            savedAt: new Date().toLocaleDateString()
        };

        this.state.savedAreas.unshift(record);
        localStorage.setItem("habitawatch_saved_areas", JSON.stringify(this.state.savedAreas));
        this.showToast(`Saved area "${name}" to local storage`);
        this.openSavedAreasModal();
    }

    openSavedAreasModal() {
        this._renderSavedAreasList();
        document.getElementById("saved-areas-modal")?.classList.add("open");
    }

    _renderSavedAreasList() {
        const container = document.getElementById("saved-areas-list-container");
        if (!container) return;

        if (this.state.savedAreas.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #89938C;">
                    <h4>No saved monitoring areas yet</h4>
                    <p style="font-size: 13px; margin-top: 4px;">Draw an area on the map and click 'Save to Monitored Areas' to preserve it here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.state.savedAreas.map(item => `
            <div class="investigation-item">
                <div class="investigation-info">
                    <h4>${item.name}</h4>
                    <p style="color: #5F6B63;">Extent: <strong>${item.areaKm2} km²</strong> &bull; Saved: ${item.savedAt}</p>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-sm btn-primary" onclick="window.app.loadSavedArea('${item.id}')">
                        Analyze
                    </button>
                    <button class="btn btn-sm btn-secondary" style="color: #B76555;" onclick="window.app.deleteSavedArea('${item.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadSavedArea(id) {
        const item = this.state.savedAreas.find(s => s.id === id);
        if (!item) return;

        this.closeAllModals();
        this.mapController.clearDrawnItems();

        // Reconstruct polygon on map
        const poly = L.polygon(item.coords, {
            color: "#355443",
            weight: 2.5,
            fillColor: "#557A61",
            fillOpacity: 0.25
        }).addTo(this.mapController.drawnItems);

        this.mapController.lastDrawnGeometry = {
            type: item.type,
            coords: item.coords,
            areaKm2: item.areaKm2,
            center: item.center,
            bounds: poly.getBounds()
        };

        this.mapController.map.fitBounds(poly.getBounds(), { padding: [40, 40] });
        await this.analyzeCustomArea(this.mapController.lastDrawnGeometry);
    }

    deleteSavedArea(id) {
        this.state.savedAreas = this.state.savedAreas.filter(s => s.id !== id);
        localStorage.setItem("habitawatch_saved_areas", JSON.stringify(this.state.savedAreas));
        this._renderSavedAreasList();
        this.showToast("Saved area removed");
    }

    setViewMode(mode) {
        this.state.viewMode = mode;
        const btnSimple = document.getElementById("view-mode-simple");
        const btnDetailed = document.getElementById("view-mode-detailed");

        if (mode === "simple") {
            btnSimple?.classList.add("active");
            btnDetailed?.classList.remove("active");
            document.body.classList.add("simple-mode");
        } else {
            btnDetailed?.classList.add("active");
            btnSimple?.classList.remove("active");
            document.body.classList.remove("simple-mode");
        }

        this.applyViewMode();
        this.showToast(`Switched to ${mode === 'simple' ? 'Simple (General / Farmer)' : 'Detailed (Technical)'} View`);
    }

    applyViewMode() {
        const isSimple = this.state.viewMode === "simple";
        const techLabels = document.querySelectorAll(".tech-label");
        const simpleLabels = document.querySelectorAll(".simple-label");

        techLabels.forEach(el => el.style.display = isSimple ? "none" : "");
        simpleLabels.forEach(el => el.style.display = isSimple ? "" : "none");
    }

    // Modal Triggers
    async openReportModal() {
        const modal = document.getElementById("report-modal");
        const reportContent = document.getElementById("report-modal-content");
        if (!modal || !reportContent) return;

        const report = await this.reportController.generateReport(
            this.state.isCustomArea ? "custom" : this.state.regionId,
            this.state.beforeYear,
            this.state.afterYear
        );

        reportContent.innerHTML = this.reportController.renderReportHTML(report);
        modal.classList.add("open");
    }

    openMethodologyModal() {
        document.getElementById("methodology-modal")?.classList.add("open");
    }

    openDataStatusModal() {
        document.getElementById("datastatus-modal")?.classList.add("open");
    }

    openDeveloperApiModal() {
        document.getElementById("developer-modal")?.classList.add("open");
    }

    openQueueModal() {
        this._renderInvestigationQueue();
        document.getElementById("queue-modal")?.classList.add("open");
    }

    openHealthCalculationModal() {
        document.getElementById("health-calc-modal")?.classList.add("open");
    }

    // Interactive Before / After Split Slider
    _initCompareDragger() {
        const container = document.getElementById("compare-container");
        const slider = document.getElementById("compare-slider-handle");
        const divider = document.getElementById("compare-divider");
        const afterLayer = document.getElementById("compare-layer-after");
        if (!container || !slider || !divider || !afterLayer) return;

        let isDragging = false;

        const setPosition = (clientX) => {
            const rect = container.getBoundingClientRect();
            let x = clientX - rect.left;
            x = Math.max(0, Math.min(x, rect.width));
            const pct = (x / rect.width) * 100;

            slider.style.left = `${pct}%`;
            divider.style.left = `${pct}%`;
            afterLayer.style.clipPath = `inset(0 0 0 ${pct}%)`;
        };

        slider.addEventListener("mousedown", (e) => {
            isDragging = true;
            e.stopPropagation();
            e.preventDefault();
        });

        container.addEventListener("mousedown", (e) => {
            isDragging = true;
            setPosition(e.clientX);
        });

        window.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            setPosition(e.clientX);
        });

        window.addEventListener("mouseup", () => {
            isDragging = false;
        });

        // Touch support
        slider.addEventListener("touchstart", (e) => {
            isDragging = true;
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
        }, { passive: false });

        container.addEventListener("touchstart", (e) => {
            isDragging = true;
            if (e.touches && e.touches[0]) {
                setPosition(e.touches[0].clientX);
            }
            if (e.cancelable) e.preventDefault();
        }, { passive: false });

        window.addEventListener("touchmove", (e) => {
            if (!isDragging) return;
            if (e.touches && e.touches[0]) {
                setPosition(e.touches[0].clientX);
            }
            if (e.cancelable) e.preventDefault();
        }, { passive: false });

        window.addEventListener("touchend", () => {
            isDragging = false;
        });
    }

    _updateCompareSliderContent() {
        const region = this.state.currentRegion;
        if (!region) return;

        const nameEl = document.getElementById("compare-region-name");
        const imgBefore = document.getElementById("compare-img-before");
        const imgAfter = document.getElementById("compare-img-after");
        const labelBefore = document.getElementById("compare-label-before");
        const labelAfter = document.getElementById("compare-label-after");

        if (nameEl) nameEl.innerText = this.state.isCustomArea ? `Custom Area (${this.state.customGeometry?.areaKm2 || 15} km²)` : region.name;
        if (imgBefore) imgBefore.src = region.compareBeforeImage || region.image;
        if (imgAfter) imgAfter.src = region.compareAfterImage || region.image;

        if (labelBefore) {
            labelBefore.innerHTML = `<strong>${this.state.beforeYear} Baseline Observation</strong> &bull; ${region.compareBeforeLabel || 'Healthy Canopy'}`;
        }
        if (labelAfter) {
            labelAfter.innerHTML = `<strong>${this.state.afterYear} Comparison Observation</strong> &bull; ${region.compareAfterLabel || 'Observed Canopy Stress'}`;
        }
    }

    toggleCompareSlider() {
        const container = document.getElementById("compare-container");
        const mapEl = document.getElementById("monitoring-map");
        const btn = document.getElementById("btn-compare-slider");
        if (!container || !mapEl) return;

        const isCurrentlyComparing = container.classList.contains("active");
        if (!isCurrentlyComparing) {
            this._updateCompareSliderContent();
            container.classList.add("active");
            mapEl.style.display = "none";
            if (btn) {
                btn.classList.add("active");
                btn.innerText = "Exit Compare";
            }
            this.showToast("Before / After Comparison Mode active. Drag slider to compare.");
        } else {
            container.classList.remove("active");
            mapEl.style.display = "block";
            this.mapController.map.invalidateSize();
            if (btn) {
                btn.classList.remove("active");
                btn.innerText = "Compare Slider";
            }
            this.showToast("Exited Comparison Mode. Interactive map restored.");
        }
    }

    // Guided Demo Mode (60-90 seconds walkthrough)
    startGuidedDemo() {
        this.state.guidedDemoActive = true;
        this.state.guidedDemoStep = 1;
        this._renderGuidedDemoStep();
        this.showToast("Guided Demo Started");
    }

    nextGuidedDemoStep() {
        this.state.guidedDemoStep++;
        if (this.state.guidedDemoStep > 6) {
            this.skipGuidedDemo();
            return;
        }
        this._renderGuidedDemoStep();
    }

    prevGuidedDemoStep() {
        if (this.state.guidedDemoStep > 1) {
            this.state.guidedDemoStep--;
            this._renderGuidedDemoStep();
        }
    }

    skipGuidedDemo() {
        this.state.guidedDemoActive = false;
        this.state.guidedDemoStep = 0;
        document.getElementById("demo-guide-badge")?.classList.remove("active");
        this.showToast("Guided Demo Finished");
    }

    async _renderGuidedDemoStep() {
        const badge = document.getElementById("demo-guide-badge");
        if (!badge) return;

        badge.classList.add("active");

        const steps = [
            {
                step: "01 — Select",
                title: "Choose Monitoring Landscape",
                text: "Select a predefined ecological landscape such as Kanha Tiger Corridor with prepared baseline bounds.",
                action: async () => {
                    await this.selectRegion("kanha");
                    document.getElementById("workspace-section")?.scrollIntoView({ behavior: "smooth" });
                }
            },
            {
                step: "02 — Compare",
                title: "Set Observation Window",
                text: "Compare baseline observations from 2025 to 2026 to track multi-temporal ecological trends.",
                action: () => {
                    const before = document.getElementById("before-year-select");
                    const after = document.getElementById("after-year-select");
                    if (before) before.value = 2025;
                    if (after) after.value = 2026;
                }
            },
            {
                step: "03 — Analyze",
                title: "Run Comparative Analysis",
                text: "Click ANALYZE to run the 5-step spatial indicators workflow (NDVI, NDWI, Canopy Stability).",
                action: async () => {
                    await this.runAnalysis();
                }
            },
            {
                step: "04 — Detect",
                title: "Review Detected Hotspots",
                text: "The platform identifies 3 concentrated areas of potential environmental change requiring attention.",
                action: () => {
                    this.mapController.resetView();
                }
            },
            {
                step: "05 — Investigate",
                title: "Understand Why Flagged",
                text: "Inspect High-Priority Sector KAN-01 to review spectral evidence and what the data does NOT prove.",
                action: () => {
                    this.openHotspotDetail("KAN-01");
                }
            },
            {
                step: "06 — Verify",
                title: "Ground Field Verification",
                text: "Ground patrols verify whether the detected indicator reflects true vegetation loss or seasonal variation.",
                action: () => {
                    this.closeAllModals();
                    this.openFieldVerificationModal("KAN-01");
                }
            }
        ];

        const curr = steps[this.state.guidedDemoStep - 1];
        if (curr) {
            document.getElementById("demo-step-num").innerText = curr.step;
            document.getElementById("demo-step-title").innerText = curr.title;
            document.getElementById("demo-step-text").innerText = curr.text;
            if (curr.action) await curr.action();
        }
    }

    closeAllModals() {
        document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("open"));
    }

    showToast(message) {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = "toast";
        toast.innerHTML = `<span>&bull;</span> ${message}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 250);
        }, 3000);
    }
}

// Global bootstrap
window.addEventListener("DOMContentLoaded", () => {
    window.app = new HabitaWatchApp();
});
