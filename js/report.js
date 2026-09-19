/**
 * HabitaWatch — Wildlife Habitat Monitoring System
 * Report Generator (Executive Printable Report & Export)
 */

class HabitatReportController {
    constructor() {
        this.currentReport = null;
    }

    /**
     * Generate structured report using HabitatDataProvider
     */
    async generateReport(regionId, beforeYear, afterYear) {
        this.currentReport = await window.HabitatDataProvider.getReport(regionId, beforeYear, afterYear);
        return this.currentReport;
    }

    /**
     * Render report HTML into a designated container or modal
     */
    renderReportHTML(report) {
        if (!report) report = this.currentReport;
        if (!report) return "<p>No report available to render.</p>";

        const { region, observationPeriod, analysis, priorityAreas, keyFindings, recommendations, methodology, limitations, dataStatus } = report;

        return `
            <div class="report-sheet">
                <!-- Header Banner -->
                <div class="report-header-banner">
                    <div>
                        <div style="font-size: 11px; font-weight: 700; color: #557A61; letter-spacing: 0.08em; text-transform: uppercase;">
                            HABITAWATCH &bull; ENVIRONMENTAL INTELLIGENCE
                        </div>
                        <h2 style="font-size: 22px; color: #355443; margin-top: 4px;">Habitat Monitoring Report</h2>
                        <p style="font-size: 13px; color: #5F6B63;">${region.name} (${region.ecosystem})</p>
                    </div>
                    <div style="text-align: right;">
                        <span class="disclaimer-badge" style="background: #EEF1EC; padding: 4px 10px; border-radius: 9999px; border: 1px solid #DCE2DC;">
                            ${dataStatus}
                        </span>
                        <div style="font-size: 12px; color: #89938C; margin-top: 6px;">
                            Generated: ${report.dateFormatted}
                        </div>
                    </div>
                </div>

                <!-- Observation Metadata Bar -->
                <div class="report-meta-grid">
                    <div>
                        <div style="font-size: 11px; color: #89938C; text-transform: uppercase;">Observation Window</div>
                        <strong style="font-size: 14px; color: #1C2520;">${observationPeriod.from} &rarr; ${observationPeriod.to}</strong>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #89938C; text-transform: uppercase;">Composite Habitat Health</div>
                        <strong style="font-size: 14px; color: #355443;">${analysis.habitatHealth} / 100 (${analysis.habitatStatus})</strong>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #89938C; text-transform: uppercase;">Areas Flagged for Review</div>
                        <strong style="font-size: 14px; color: #B76555;">${priorityAreas.length} Priority Locations</strong>
                    </div>
                </div>

                <!-- Summary Indicators Table -->
                <div class="report-section">
                    <h3>1. Comparative Environmental Indicators</h3>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Indicator Metric</th>
                                <th>Observed Change</th>
                                <th>Baseline Interpretation</th>
                                <th>Operational Impact</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Vegetation Index (NDVI)</strong></td>
                                <td style="color: ${analysis.indicators.vegetationChangePercent < 0 ? '#B76555' : '#557A61'}; font-weight: 700;">
                                    ${analysis.indicators.vegetationChangePercent > 0 ? '+' : ''}${analysis.indicators.vegetationChangePercent}%
                                </td>
                                <td>Potential canopy thinning or seasonal senescence</td>
                                <td>Identifies sectors with declining photosynthetic vitality</td>
                            </tr>
                            <tr>
                                <td><strong>Water Index (NDWI)</strong></td>
                                <td style="color: ${analysis.indicators.waterChangePercent < 0 ? '#C59A55' : '#6F9EAD'}; font-weight: 700;">
                                    ${analysis.indicators.waterChangePercent > 0 ? '+' : ''}${analysis.indicators.waterChangePercent}%
                                </td>
                                <td>Surface water extent and riparian moisture</td>
                                <td>Tracks perennial water body availability for fauna</td>
                            </tr>
                            <tr>
                                <td><strong>Built-up / Bare Ground</strong></td>
                                <td style="color: #C59A55; font-weight: 700;">
                                    +${analysis.indicators.builtUpChangePercent}%
                                </td>
                                <td>Fringe clearing or soil exposure</td>
                                <td>Monitors buffer boundary stability and infrastructure</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Key Findings -->
                <div class="report-section">
                    <h3>2. Key Diagnostic Findings</h3>
                    <ul style="padding-left: 1.25rem; font-size: 13.5px; line-height: 1.6; color: #1C2520;">
                        ${keyFindings.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                </div>

                <!-- Priority Areas Requiring Ground Review -->
                <div class="report-section">
                    <h3>3. Priority Review Areas (Hotspots)</h3>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Location & Category</th>
                                <th>Priority</th>
                                <th>Extent</th>
                                <th>Signal Confidence</th>
                                <th>Suggested Field Patrol</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${priorityAreas.map(spot => `
                                <tr>
                                    <td><strong>${spot.id}</strong></td>
                                    <td>
                                        <strong>${spot.name}</strong><br>
                                        <span style="font-size: 12px; color: #5F6B63;">${spot.category}</span>
                                    </td>
                                    <td>
                                        <span class="priority-pill priority-${spot.priority.toLowerCase()}">${spot.priority}</span>
                                    </td>
                                    <td>${spot.affectedAreaKm2} km²</td>
                                    <td>${spot.signalStrength}</td>
                                    <td style="font-size: 12px;">${spot.suggestedNextStep}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Recommended Next Steps -->
                <div class="report-section">
                    <h3>4. Recommended Next Steps</h3>
                    <ol style="padding-left: 1.25rem; font-size: 13.5px; line-height: 1.6; color: #1C2520;">
                        ${recommendations.map(r => `<li>${r}</li>`).join('')}
                    </ol>
                </div>

                <!-- Methodology & Limitations -->
                <div class="report-section" style="background: #F5F6F2; padding: 1rem; border-radius: 6px; border: 1px solid #DCE2DC;">
                    <h3 style="border-bottom: none; margin-bottom: 0.25rem;">5. Scientific Methodology & Limitations</h3>
                    <p style="font-size: 12px; line-height: 1.5; color: #5F6B63; margin-bottom: 0.5rem;">
                        <strong>Framework:</strong> ${methodology.framework}. Indicators are calculated from normalized spectral reflectance ratios.
                    </p>
                    <ul style="padding-left: 1.2rem; font-size: 11.5px; line-height: 1.5; color: #5F6B63;">
                        ${limitations.map(lim => `<li>${lim}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Trigger browser print dialog
     */
    printReport() {
        window.print();
    }
}

if (typeof window !== "undefined") {
    window.HabitatReportController = HabitatReportController;
}
