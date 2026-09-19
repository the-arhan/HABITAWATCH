/**
 * HabitaWatch — Wildlife Habitat Monitoring System
 * Environmental Analysis Controller (5-step progress, indicators, SVG trend charts, connectivity)
 */

class HabitatAnalysisController {
    constructor() {
        this.isAnalyzing = false;
    }

    /**
     * Run the 5-step client-side analysis simulation (~1.25s)
     * Step 1: Preparing spatial data
     * Step 2: Comparing environmental observations
     * Step 3: Calculating change indicators
     * Step 4: Identifying spatial patterns
     * Step 5: Preparing monitoring results
     */
    async executeAnalysis(regionId, beforeYear, afterYear, onStepCallback) {
        this.isAnalyzing = true;

        const steps = [
            { step: 1, label: "Preparing spatial data" },
            { step: 2, label: "Comparing environmental observations" },
            { step: 3, label: "Calculating change indicators" },
            { step: 4, label: "Identifying spatial patterns" },
            { step: 5, label: "Preparing monitoring results" }
        ];

        for (const s of steps) {
            if (onStepCallback) onStepCallback(s.step, s.label);
            await new Promise(res => setTimeout(res, 220));
        }

        // Fetch deterministic analysis from backend-ready provider
        const analysis = await window.HabitatDataProvider.getAnalysis(regionId, beforeYear, afterYear);
        const hotspots = await window.HabitatDataProvider.getHotspots(regionId, beforeYear, afterYear);

        this.isAnalyzing = false;
        return { analysis, hotspots };
    }

    /**
     * Render SVG trend chart for multi-year NDVI and NDWI observations
     */
    renderTrendChart(containerId, trends) {
        const container = document.getElementById(containerId);
        if (!container || !trends || trends.length === 0) return;

        const width = 360;
        const height = 140;
        const padding = { top: 20, right: 30, bottom: 25, left: 35 };

        const graphW = width - padding.left - padding.right;
        const graphH = height - padding.top - padding.bottom;

        // X scale (years)
        const xStep = graphW / (trends.length - 1);

        // Y scale (0.0 to 1.0)
        const getY = (val) => padding.top + graphH - (val * graphH);

        // Build SVG paths
        let ndviPoints = [];
        let ndwiPoints = [];

        trends.forEach((t, i) => {
            const x = padding.left + (i * xStep);
            const yNdvi = getY(t.ndvi);
            const yNdwi = getY(t.ndwi);
            ndviPoints.push({ x, y: yNdvi, val: t.ndvi, year: t.year });
            ndwiPoints.push({ x, y: yNdwi, val: t.ndwi, year: t.year });
        });

        const ndviPathD = ndviPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, "");
        const ndwiPathD = ndwiPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, "");

        // Build SVG HTML string
        const svg = `
            <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;" aria-label="Multi-year NDVI and NDWI environmental trend chart">
                <!-- Grid Lines -->
                <line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="#E7ECE6" stroke-dasharray="3,3" />
                <line x1="${padding.left}" y1="${padding.top + graphH / 2}" x2="${width - padding.right}" y2="${padding.top + graphH / 2}" stroke="#E7ECE6" stroke-dasharray="3,3" />
                <line x1="${padding.left}" y1="${padding.top + graphH}" x2="${width - padding.right}" y2="${padding.top + graphH}" stroke="#DCE2DC" />

                <!-- Y Axis Labels -->
                <text x="${padding.left - 8}" y="${padding.top + 4}" font-size="10" fill="#89938C" text-anchor="end">1.0</text>
                <text x="${padding.left - 8}" y="${padding.top + graphH / 2 + 4}" font-size="10" fill="#89938C" text-anchor="end">0.5</text>
                <text x="${padding.left - 8}" y="${padding.top + graphH + 4}" font-size="10" fill="#89938C" text-anchor="end">0.0</text>

                <!-- Trend Lines -->
                <path d="${ndviPathD}" fill="none" stroke="#557A61" stroke-width="2.5" stroke-linecap="round" />
                <path d="${ndwiPathD}" fill="none" stroke="#6F9EAD" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="4,3" />

                <!-- Data Points & Year Labels -->
                ${ndviPoints.map(p => `
                    <circle cx="${p.x}" cy="${p.y}" r="4" fill="#FFFFFF" stroke="#557A61" stroke-width="2" />
                    <text x="${p.x}" y="${p.y - 8}" font-size="10" font-weight="600" fill="#355443" text-anchor="middle">${p.val.toFixed(2)}</text>
                    <text x="${p.x}" y="${height - 6}" font-size="11" font-weight="500" fill="#5F6B63" text-anchor="middle">${p.year}</text>
                `).join('')}

                ${ndwiPoints.map(p => `
                    <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#FFFFFF" stroke="#6F9EAD" stroke-width="2" />
                    <text x="${p.x}" y="${p.y + 14}" font-size="9" fill="#5F6B63" text-anchor="middle">${p.val.toFixed(2)}</text>
                `).join('')}
            </svg>
        `;

        container.innerHTML = svg;
    }
}

if (typeof window !== "undefined") {
    window.HabitatAnalysisController = HabitatAnalysisController;
}
