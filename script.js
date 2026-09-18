(function(){
  "use strict";

  /* =====================================================================
     STATE
  ===================================================================== */
  const CHANGE_THRESHOLDS = { stable: -0.05, moderate: -0.20 };
  const YEARS = [2024, 2025, 2026];
  // Only this baseline/comparison combination has a full prepared demo
  // dataset for the example regions. Other ordered combinations are valid
  // selections but have no fabricated dataset behind them.
  const AVAILABLE_PERIOD = { before: 2025, after: 2026 };

  const appState = {
    currentView: 'landing',
    areaMode: 'example',          // 'example' | 'custom'
    selectedRegion: null,          // active example region or synthesized custom region
    customGeometry: null,          // { type:'polygon'|'rectangle'|'line', points:[...] }
    beforeYear: 2025,
    afterYear: 2026,
    periodAvailable: true,
    analysisComplete: false,
    isAnalyzing: false,
    activeLayers: { vegetation:true, water:true, builtup:false, hotspots:true },
    selectedHotspot: null,
    drawTool: null                 // 'polygon' | 'rectangle' | 'line' | null
  };

  function classify(dNdvi){
    if(dNdvi > CHANGE_THRESHOLDS.stable) return 'stable';
    if(dNdvi > CHANGE_THRESHOLDS.moderate) return 'moderate';
    return 'significant';
  }

  /* =====================================================================
     REGIONS (example demonstration dataset)
  ===================================================================== */
  const demoRegions = {
    kanha: {
      key:'kanha', name:'Kanha Landscape', area:1248, sub:'Central India', type:'Example Region',
      ndviBefore:0.62, ndviAfter:0.53,
      waterBeforeHa:82.4, waterAfterHa:79.8,
      vegetationChange:-14.8, waterChange:-3.2, builtupChange:6.4,
      boundary:[[120,90],[520,60],[680,180],[640,420],[300,470],[100,320]],
      waterBodies:[[[430,300],[500,290],[520,340],[470,380],[420,360]]],
      zones:[
        {poly:[[120,90],[320,80],[330,220],[150,240]], type:'stable'},
        {poly:[[320,80],[520,60],[540,200],[330,220]], type:'moderate'},
        {poly:[[540,200],[680,180],[640,420],[470,380],[420,360],[380,300]], type:'significant'},
        {poly:[[150,240],[330,220],[380,300],[300,470],[100,320]], type:'moderate'}
      ],
      hotspots:[
        {id:'CHANGE AREA 01', title:'Potential vegetation decline', pos:[560,260], dNdvi:-0.24, changePct:-18.4, areaKm2:18.4, severity:'significant'},
        {id:'CHANGE AREA 02', title:'Water-area contraction', pos:[480,330], dNdvi:-0.11, changePct:-9.1, areaKm2:9.6, severity:'moderate'},
        {id:'CHANGE AREA 03', title:'Potential vegetation decline', pos:[610,370], dNdvi:-0.29, changePct:-22.7, areaKm2:22.1, severity:'significant'}
      ]
    },
    ghats: {
      key:'ghats', name:'Western Ghats', area:2103, sub:'Southwestern India', type:'Example Region',
      ndviBefore:0.71, ndviAfter:0.66,
      waterBeforeHa:54.1, waterAfterHa:52.9,
      vegetationChange:-7.1, waterChange:-2.2, builtupChange:3.8,
      boundary:[[90,60],[560,90],[700,260],[560,480],[220,500],[70,300]],
      waterBodies:[[[250,380],[310,370],[320,420],[260,430]]],
      zones:[
        {poly:[[90,60],[350,70],[360,240],[130,260]], type:'stable'},
        {poly:[[350,70],[560,90],[600,260],[360,240]], type:'stable'},
        {poly:[[600,260],[700,260],[560,480],[400,440],[400,340]], type:'moderate'},
        {poly:[[130,260],[360,240],[400,340],[400,440],[220,500],[70,300]], type:'stable'}
      ],
      hotspots:[
        {id:'CHANGE AREA 01', title:'Potential vegetation decline', pos:[520,340], dNdvi:-0.13, changePct:-10.2, areaKm2:12.7, severity:'moderate'},
        {id:'CHANGE AREA 02', title:'Water-area contraction', pos:[290,400], dNdvi:-0.08, changePct:-6.4, areaKm2:6.3, severity:'moderate'}
      ]
    },
    wetland: {
      key:'wetland', name:'Sample Wetland', area:364, sub:'Deltaic lowland', type:'Example Region',
      ndviBefore:0.48, ndviAfter:0.45,
      waterBeforeHa:210.6, waterAfterHa:188.2,
      vegetationChange:-3.4, waterChange:-10.6, builtupChange:8.9,
      boundary:[[140,140],[600,110],[660,340],[420,470],[160,420]],
      waterBodies:[[[220,220],[420,190],[500,300],[380,380],[240,340]]],
      zones:[
        {poly:[[140,140],[380,120],[400,260],[200,280]], type:'stable'},
        {poly:[[380,120],[600,110],[660,340],[460,340],[400,260]], type:'significant'},
        {poly:[[200,280],[400,260],[460,340],[420,470],[160,420]], type:'moderate'}
      ],
      hotspots:[
        {id:'CHANGE AREA 01', title:'Water-area contraction', pos:[500,220], dNdvi:-0.05, changePct:-11.0, areaKm2:31.2, severity:'significant'},
        {id:'CHANGE AREA 02', title:'Potential land-cover expansion', pos:[580,300], dNdvi:-0.18, changePct:-14.1, areaKm2:14.9, severity:'moderate'},
        {id:'CHANGE AREA 03', title:'Water-area contraction', pos:[320,380], dNdvi:-0.09, changePct:-7.8, areaKm2:11.0, severity:'moderate'}
      ]
    }
  };

  /* =====================================================================
     UI: NAVIGATION
  ===================================================================== */
  function showView(name){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    const el = document.getElementById('view-'+name);
    if(el) el.classList.add('active');
    appState.currentView = name;
    document.querySelectorAll('.navbtn').forEach(b=>{
      b.classList.toggle('active', b.dataset.view===name);
    });
    window.scrollTo(0,0);
  }
  document.querySelectorAll('.navbtn').forEach(btn=>{
    btn.addEventListener('click', ()=> showView(btn.dataset.view));
  });
  document.getElementById('brandBtn').addEventListener('click', ()=> showView('landing'));
  document.getElementById('openMonitorBtn').addEventListener('click', ()=> showView('monitor'));

  /* =====================================================================
     TOAST / ERROR MESSAGES
  ===================================================================== */
  let toastTimer = null;
  function showToast(msg){
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> t.classList.remove('show'), 3200);
  }

  function setStatus(state, text){
    const dot = document.getElementById('statusDot');
    dot.className = 'status-dot '+state;
    document.getElementById('statusText').textContent = text;
  }

  /* =====================================================================
     MONITORING AREA MODE SWITCH
  ===================================================================== */
  const modeExampleBtn = document.getElementById('modeExampleBtn');
  const modeCustomBtn = document.getElementById('modeCustomBtn');
  const exampleModePanel = document.getElementById('exampleModePanel');
  const customModePanel = document.getElementById('customModePanel');

  function setAreaMode(mode){
    appState.areaMode = mode;
    modeExampleBtn.classList.toggle('active', mode==='example');
    modeCustomBtn.classList.toggle('active', mode==='custom');
    exampleModePanel.style.display = mode==='example' ? 'flex' : 'none';
    customModePanel.style.display = mode==='custom' ? 'flex' : 'none';
  }
  modeExampleBtn.addEventListener('click', ()=> setAreaMode('example'));
  modeCustomBtn.addEventListener('click', ()=> setAreaMode('custom'));

  /* =====================================================================
     REGIONS: EXAMPLE SELECTION
  ===================================================================== */
  const regionListEl = document.getElementById('regionList');
  Object.values(demoRegions).forEach(r=>{
    const btn = document.createElement('button');
    btn.className = 'region-btn';
    btn.dataset.key = r.key;
    btn.innerHTML = `<span class="rname">${r.name}</span><span class="rmeta">${r.area.toLocaleString()} km² · ${r.sub}</span>`;
    btn.addEventListener('click', ()=> selectRegion(r.key));
    regionListEl.appendChild(btn);
  });

  function selectRegion(key){
    try{
      const region = demoRegions[key];
      if(!region) throw new Error('Unknown region');

      appState.selectedRegion = region;
      appState.customGeometry = null;
      appState.analysisComplete = false;
      appState.selectedHotspot = null;
      cancelDrawing();

      document.querySelectorAll('.region-btn').forEach(b=> b.classList.toggle('selected', b.dataset.key===key));

      renderSelectedAreaPanel();
      resetResultsUI();
      renderBaseMap(region);
      evaluatePeriodAvailability();
      closeDetail();
      setStatus('ready','SAMPLE DATASET');
    }catch(e){
      console.error(e);
      showToast('Unable to load this region. Predefined regions remain available.');
    }
  }

  /* =====================================================================
     MAP GEOMETRY HELPERS
  ===================================================================== */
  const MAP_W = 800, MAP_H = 560;
  const KM2_PER_UNIT2 = 3500 / (MAP_W*MAP_H);   // whole viewbox ≈ 3500 km²
  const KM_PER_UNIT = 70 / MAP_W;                // whole viewbox width ≈ 70 km

  function polyToPoints(poly){ return poly.map(p=>p.join(',')).join(' '); }

  function shoelaceAreaUnits(points){
    let sum = 0;
    for(let i=0;i<points.length;i++){
      const [x1,y1] = points[i];
      const [x2,y2] = points[(i+1)%points.length];
      sum += (x1*y2 - x2*y1);
    }
    return Math.abs(sum)/2;
  }
  function polygonAreaKm2(points){ return shoelaceAreaUnits(points) * KM2_PER_UNIT2; }
  function lineLengthKm(points){
    let d = 0;
    for(let i=0;i<points.length-1;i++){
      const [x1,y1]=points[i], [x2,y2]=points[i+1];
      d += Math.hypot(x2-x1,y2-y1);
    }
    return d * KM_PER_UNIT;
  }
  function polygonCentroid(points){
    let x=0,y=0;
    points.forEach(p=>{x+=p[0];y+=p[1];});
    return [x/points.length, y/points.length];
  }
  function boundingBox(points){
    const xs = points.map(p=>p[0]), ys = points.map(p=>p[1]);
    return { minX:Math.min(...xs), maxX:Math.max(...xs), minY:Math.min(...ys), maxY:Math.max(...ys) };
  }

  // deterministic pseudo-random generator seeded by geometry, so the same
  // shape produces the same demonstration values during the session
  function mulberry32(seed){
    return function(){
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedFromGeometry(points){
    let s = points.length * 97;
    points.forEach((p,i)=>{ s += Math.round(p[0]*3 + p[1]*7 + i*13); });
    return s;
  }

  function buildCustomRegionFromPolygon(points, typeLabel){
    const areaKm2 = Math.max(0.5, polygonAreaKm2(points));
    const rng = mulberry32(seedFromGeometry(points));
    const vegetationChange = -(2 + rng()*22);           // -2% .. -24%
    const waterChange = -(1 + rng()*10);                // -1% .. -11%
    const builtupChange = 2 + rng()*10;                 // +2% .. +12%
    const ndviBefore = 0.5 + rng()*0.2;
    const ndviAfter = ndviBefore + (vegetationChange/100)*ndviBefore;
    const dNdvi = ndviAfter - ndviBefore;
    const cls = classify(dNdvi);

    const hotspotCount = areaKm2 > 60 ? (2 + Math.floor(rng()*2)) : (1 + Math.floor(rng()*2));
    const bbox = boundingBox(points);
    const hotspots = [];
    for(let i=0;i<hotspotCount;i++){
      const hx = bbox.minX + rng()*(bbox.maxX-bbox.minX);
      const hy = bbox.minY + rng()*(bbox.maxY-bbox.minY);
      const hSeverity = rng() > 0.5 ? 'significant' : 'moderate';
      const hChange = hSeverity==='significant' ? -(18+rng()*14) : -(6+rng()*11);
      hotspots.push({
        id: 'CHANGE AREA ' + String(i+1).padStart(2,'0'),
        title: rng() > 0.5 ? 'Potential vegetation decline' : 'Water-area contraction',
        pos:[hx,hy],
        dNdvi: +(hChange/100 * ndviBefore).toFixed(2),
        changePct: +hChange.toFixed(1),
        areaKm2: +(areaKm2 * (0.05 + rng()*0.15)).toFixed(1),
        severity: hSeverity
      });
    }

    return {
      key:'custom', name:'Custom Area', area:+areaKm2.toFixed(1), sub:typeLabel, type:typeLabel,
      ndviBefore:+ndviBefore.toFixed(2), ndviAfter:+ndviAfter.toFixed(2),
      waterBeforeHa:+(areaKm2*100*0.06).toFixed(1), waterAfterHa:+(areaKm2*100*0.06*(1+waterChange/100)).toFixed(1),
      vegetationChange:+vegetationChange.toFixed(1), waterChange:+waterChange.toFixed(1), builtupChange:+builtupChange.toFixed(1),
      boundary: points,
      waterBodies: [],
      zones: [{ poly: points, type: cls }],
      hotspots
    };
  }

  /* =====================================================================
     DRAWING TOOLS (polygon / rectangle / line / clear)
  ===================================================================== */
  const mapsvg = document.getElementById('mapsvg');
  const drawlayer = document.getElementById('drawlayer');
  const drawBtns = {
    polygon: document.getElementById('drawPolygonBtn'),
    rectangle: document.getElementById('drawRectBtn'),
    line: document.getElementById('drawLineBtn')
  };
  let drawPoints = [];
  let rectStart = null;
  let isDraggingRect = false;

  function svgPointFromEvent(e){
    const pt = mapsvg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = mapsvg.getScreenCTM().inverse();
    const loc = pt.matrixTransform(ctm);
    return [Math.max(0,Math.min(MAP_W,loc.x)), Math.max(0,Math.min(MAP_H,loc.y))];
  }

  function setDrawTool(tool){
    // toggle off if re-clicking the same tool
    if(appState.drawTool === tool){
      cancelDrawing();
      return;
    }
    cancelDrawing();
    appState.drawTool = tool;
    Object.entries(drawBtns).forEach(([k,btn])=> btn.classList.toggle('active', k===tool));
    mapsvg.classList.add('drawing');
    drawPoints = [];
    drawlayer.innerHTML = '';
    if(tool === 'polygon'){
      showToast('Click to place points. Click the first point again to finish.');
    } else if(tool === 'rectangle'){
      showToast('Click and drag across the map to draw a rectangle.');
    } else if(tool === 'line'){
      showToast('Click a start point, then an end point.');
    }
  }
  Object.entries(drawBtns).forEach(([tool,btn])=>{
    btn.addEventListener('click', ()=> setDrawTool(tool));
  });

  function cancelDrawing(){
    appState.drawTool = null;
    Object.values(drawBtns).forEach(btn=> btn.classList.remove('active'));
    mapsvg.classList.remove('drawing');
    drawPoints = [];
    rectStart = null;
    isDraggingRect = false;
    drawlayer.innerHTML = '';
  }

  document.getElementById('clearDrawBtn').addEventListener('click', ()=>{
    cancelDrawing();
    appState.customGeometry = null;
    if(appState.selectedRegion && appState.selectedRegion.key === 'custom'){
      appState.selectedRegion = null;
    }
    appState.analysisComplete = false;
    appState.selectedHotspot = null;
    document.querySelectorAll('.region-btn').forEach(b=> b.classList.remove('selected'));
    renderSelectedAreaPanel();
    resetResultsUI();
    viewport_clear();
    closeDetail();
    showToast('Selection cleared.');
  });

  function viewport_clear(){
    document.getElementById('mapviewport').innerHTML = '';
    document.getElementById('emptyOverlay').style.display = 'flex';
    document.getElementById('emptyOverlay').innerHTML =
      `<div class="eyebrow">SELECT A REGION</div><p>Choose an example region or define a custom area to begin.</p>`;
  }

  function drawPreviewPolyline(){
    drawlayer.innerHTML = '';
    if(drawPoints.length === 0) return;
    if(drawPoints.length > 1){
      const poly = document.createElementNS('http://www.w3.org/2000/svg','polyline');
      poly.setAttribute('points', drawPoints.map(p=>p.join(',')).join(' '));
      poly.setAttribute('class','draw-preview-line');
      drawlayer.appendChild(poly);
    }
    drawPoints.forEach((p,i)=>{
      const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('cx',p[0]); c.setAttribute('cy',p[1]); c.setAttribute('r', i===0?6:4);
      c.setAttribute('class','draw-vertex');
      drawlayer.appendChild(c);
    });
  }

  function finalizePolygon(points){
    if(points.length < 3){
      showToast('Please define a valid monitoring area — at least three points are needed.');
      cancelDrawing();
      return;
    }
    const region = buildCustomRegionFromPolygon(points, 'Custom Polygon');
    commitCustomRegion(region, points, 'polygon');
  }

  function finalizeRectangle(p1, p2){
    const w = Math.abs(p2[0]-p1[0]), h = Math.abs(p2[1]-p1[1]);
    if(w < 10 || h < 10){
      showToast('Please define a valid monitoring area.');
      cancelDrawing();
      return;
    }
    const minX = Math.min(p1[0],p2[0]), maxX = Math.max(p1[0],p2[0]);
    const minY = Math.min(p1[1],p2[1]), maxY = Math.max(p1[1],p2[1]);
    const points = [[minX,minY],[maxX,minY],[maxX,maxY],[minX,maxY]];
    const region = buildCustomRegionFromPolygon(points, 'Custom Rectangle');
    commitCustomRegion(region, points, 'rectangle');
  }

  function finalizeLine(p1, p2){
    const dist = Math.hypot(p2[0]-p1[0], p2[1]-p1[1]);
    if(dist < 10){
      showToast('Please define a valid reference line.');
      cancelDrawing();
      return;
    }
    const km = lineLengthKm([p1,p2]);
    appState.customGeometry = { type:'line', points:[p1,p2], lengthKm: km };
    cancelDrawing();

    // draw the persistent reference line on the base viewport (not cleared by analysis)
    const g = document.getElementById('mapviewport');
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',p1[0]); line.setAttribute('y1',p1[1]);
    line.setAttribute('x2',p2[0]); line.setAttribute('y2',p2[1]);
    line.setAttribute('class','custom-line');
    g.appendChild(line);
    [p1,p2].forEach(p=>{
      const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('cx',p[0]); c.setAttribute('cy',p[1]); c.setAttribute('r',5);
      c.setAttribute('class','custom-line-endpoint');
      g.appendChild(c);
    });

    renderReferenceLinePanel(km);
    showToast('Reference line added.');
  }

  function commitCustomRegion(region, points, toolType){
    appState.customGeometry = { type: toolType, points };
    appState.selectedRegion = region;
    appState.analysisComplete = false;
    appState.selectedHotspot = null;
    cancelDrawing();

    document.querySelectorAll('.region-btn').forEach(b=> b.classList.remove('selected'));
    renderSelectedAreaPanel();
    resetResultsUI();
    renderBaseMap(region);
    evaluatePeriodAvailability();
    closeDetail();
    setStatus('ready','SAMPLE DATASET');
  }

  mapsvg.addEventListener('click', function(e){
    if(appState.drawTool === 'polygon'){
      const pt = svgPointFromEvent(e);
      if(drawPoints.length >= 3){
        const first = drawPoints[0];
        const distToFirst = Math.hypot(pt[0]-first[0], pt[1]-first[1]);
        if(distToFirst < 14){
          finalizePolygon(drawPoints);
          return;
        }
      }
      drawPoints.push(pt);
      drawPreviewPolyline();
    } else if(appState.drawTool === 'line'){
      const pt = svgPointFromEvent(e);
      drawPoints.push(pt);
      drawPreviewPolyline();
      if(drawPoints.length === 2){
        finalizeLine(drawPoints[0], drawPoints[1]);
      }
    }
  });

  mapsvg.addEventListener('mousedown', function(e){
    if(appState.drawTool !== 'rectangle') return;
    rectStart = svgPointFromEvent(e);
    isDraggingRect = true;
  });
  mapsvg.addEventListener('mousemove', function(e){
    if(appState.drawTool !== 'rectangle' || !isDraggingRect || !rectStart) return;
    const cur = svgPointFromEvent(e);
    drawlayer.innerHTML = '';
    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x', Math.min(rectStart[0],cur[0]));
    rect.setAttribute('y', Math.min(rectStart[1],cur[1]));
    rect.setAttribute('width', Math.abs(cur[0]-rectStart[0]));
    rect.setAttribute('height', Math.abs(cur[1]-rectStart[1]));
    rect.setAttribute('class','draw-preview-poly');
    drawlayer.appendChild(rect);
  });
  mapsvg.addEventListener('mouseup', function(e){
    if(appState.drawTool !== 'rectangle' || !isDraggingRect || !rectStart) return;
    const cur = svgPointFromEvent(e);
    isDraggingRect = false;
    finalizeRectangle(rectStart, cur);
    rectStart = null;
  });

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && appState.drawTool){
      cancelDrawing();
      showToast('Drawing cancelled.');
    }
  });

  /* =====================================================================
     SELECTED-AREA FLOATING PANEL
  ===================================================================== */
  function renderSelectedAreaPanel(){
    const body = document.getElementById('selectedAreaBody');
    const region = appState.selectedRegion;
    if(!region){
      body.innerHTML = `<p class="sa-empty">Select a region or draw an area to begin.</p>`;
      return;
    }
    body.innerHTML = `
      <div class="sa-row"><span class="k">Type</span><span class="v">${region.type}</span></div>
      <div class="sa-row"><span class="k">Approx. area</span><span class="v">${region.area.toLocaleString()} km²</span></div>
      ${appState.customGeometry && appState.customGeometry.type==='polygon' ? `<div class="sa-row"><span class="k">Vertices</span><span class="v">${appState.customGeometry.points.length}</span></div>` : ''}
      <div class="sa-row"><span class="k">Status</span><span class="v sa-status">${appState.analysisComplete ? 'Analysis complete' : 'Ready for analysis'}</span></div>
      <button class="sa-analyze" id="saAnalyzeBtn">Analyze Area</button>
    `;
    document.getElementById('saAnalyzeBtn').addEventListener('click', runAnalysis);
  }

  function renderReferenceLinePanel(km){
    const body = document.getElementById('selectedAreaBody');
    body.innerHTML = `
      <div class="sa-row"><span class="k">Type</span><span class="v">Transect / Reference Line</span></div>
      <div class="sa-row"><span class="k">Length</span><span class="v">Approx. ${km.toFixed(1)} km</span></div>
      <p class="sa-empty" style="margin-top:8px;">Used as a spatial reference — select or draw an area to run an analysis.</p>
    `;
  }

  /* =====================================================================
     COMPARISON PERIOD
  ===================================================================== */
  const beforeSel = document.getElementById('beforeYear');
  const afterSel = document.getElementById('afterYear');
  YEARS.forEach(y=>{
    beforeSel.appendChild(new Option(y, y, y===2025, y===2025));
    afterSel.appendChild(new Option(y, y, y===2026, y===2026));
  });

  function enforceYearOrder(changed){
    if(parseInt(beforeSel.value) >= parseInt(afterSel.value)){
      if(changed==='before'){
        const idx = YEARS.indexOf(parseInt(beforeSel.value));
        afterSel.value = YEARS[Math.min(idx+1, YEARS.length-1)];
      } else {
        const idx = YEARS.indexOf(parseInt(afterSel.value));
        beforeSel.value = YEARS[Math.max(idx-1, 0)];
      }
    }
    appState.beforeYear = parseInt(beforeSel.value);
    appState.afterYear = parseInt(afterSel.value);
    document.getElementById('beforeYearLabel').textContent = 'BEFORE · '+appState.beforeYear;
    document.getElementById('afterYearLabel').textContent = 'AFTER · '+appState.afterYear;
    evaluatePeriodAvailability();
  }
  beforeSel.addEventListener('change', ()=> enforceYearOrder('before'));
  afterSel.addEventListener('change', ()=> enforceYearOrder('after'));

  function evaluatePeriodAvailability(){
    const region = appState.selectedRegion;
    const isCustom = region && region.key === 'custom';
    // custom areas are formulaic demonstration data and available for any
    // valid ordered baseline/comparison pair; example regions only ship a
    // prepared dataset for 2025 -> 2026.
    const available = isCustom
      ? true
      : (appState.beforeYear === AVAILABLE_PERIOD.before && appState.afterYear === AVAILABLE_PERIOD.after);
    appState.periodAvailable = available;
    document.getElementById('periodWarning').classList.toggle('show', region && !available);
  }

  /* =====================================================================
     LAYERS
  ===================================================================== */
  ['vegetation','water','builtup','hotspots'].forEach(l=>{
    document.getElementById('layer-'+l).addEventListener('change', function(){
      appState.activeLayers[l] = this.checked;
      toggleLayer(l, this.checked);
    });
  });
  function toggleLayer(layer, on){
    if(layer==='vegetation'){
      document.querySelectorAll('.veg-texture').forEach(el=> el.classList.toggle('hidden-layer', !on));
    }
    if(layer==='water'){
      document.querySelectorAll('.water-body').forEach(el=> el.style.opacity = on ? 0.55 : 0);
    }
    if(layer==='hotspots'){
      document.querySelectorAll('.hotspot-marker').forEach(el=> el.classList.toggle('hidden-layer', !on));
      document.querySelectorAll('.change-zone').forEach(el=> el.classList.toggle('hidden-layer', !on));
      document.getElementById('mapLegend').style.display = (on && appState.analysisComplete) ? 'block' : 'none';
    }
    if(layer==='builtup'){
      document.querySelectorAll('.builtup-tint').forEach(el=> el.classList.toggle('hidden-layer', !on));
    }
  }

  // info popovers
  document.querySelectorAll('.info-btn').forEach(btn=>{
    btn.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      const key = this.dataset.info;
      document.querySelectorAll('.info-popover').forEach(p=>{
        if(p.dataset.popover === key){ p.classList.toggle('open'); }
        else { p.classList.remove('open'); }
      });
    });
  });
  document.addEventListener('click', ()=> document.querySelectorAll('.info-popover').forEach(p=>p.classList.remove('open')));

  /* =====================================================================
     MAP RENDERING
  ===================================================================== */
  const viewport = document.getElementById('mapviewport');
  let currentZoom = 1;

  function renderBaseMap(region){
    viewport.innerHTML = '';
    currentZoom = 1;
    viewport.style.transform = '';
    document.getElementById('emptyOverlay').style.display = 'none';

    const base = document.createElementNS('http://www.w3.org/2000/svg','rect');
    base.setAttribute('x','0'); base.setAttribute('y','0');
    base.setAttribute('width', MAP_W); base.setAttribute('height', MAP_H);
    base.setAttribute('class','terrain-base');
    viewport.appendChild(base);

    for(let i=0;i<6;i++){
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      const y = 40 + i*90;
      path.setAttribute('d', `M0,${y} Q200,${y-30} 400,${y} T800,${y}`);
      path.setAttribute('stroke','rgba(53,84,67,0.05)');
      path.setAttribute('stroke-width','1');
      path.setAttribute('fill','none');
      viewport.appendChild(path);
    }

    (region.zones||[]).forEach(z=>{
      const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
      poly.setAttribute('points', polyToPoints(z.poly));
      poly.setAttribute('class', 'change-zone hidden-layer '+z.type);
      viewport.appendChild(poly);
    });

    const vegTex = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    vegTex.setAttribute('points', polyToPoints(region.boundary));
    vegTex.setAttribute('class', 'veg-texture' + (appState.activeLayers.vegetation ? '' : ' hidden-layer'));
    viewport.appendChild(vegTex);

    const builtupTint = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    builtupTint.setAttribute('points', polyToPoints(region.boundary));
    builtupTint.setAttribute('class', 'builtup-tint' + (appState.activeLayers.builtup ? '' : ' hidden-layer'));
    viewport.appendChild(builtupTint);

    const boundary = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    boundary.setAttribute('points', polyToPoints(region.boundary));
    boundary.setAttribute('class','region-boundary');
    viewport.appendChild(boundary);

    (region.waterBodies||[]).forEach(wb=>{
      const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
      poly.setAttribute('points', polyToPoints(wb));
      poly.setAttribute('class','water-body');
      poly.style.opacity = appState.activeLayers.water ? 0.55 : 0;
      viewport.appendChild(poly);
    });

    (region.hotspots||[]).forEach(h=>{
      const g = document.createElementNS('http://www.w3.org/2000/svg','g');
      g.setAttribute('class','hotspot-marker hidden-layer');
      g.dataset.id = h.id;
      const color = h.severity==='significant' ? 'var(--change-significant)' : 'var(--change-moderate)';
      g.innerHTML = `
        <circle class="ring" cx="${h.pos[0]}" cy="${h.pos[1]}" r="14" stroke="${color}"/>
        <circle class="core" cx="${h.pos[0]}" cy="${h.pos[1]}" r="6" fill="${color}"/>
        <text x="${h.pos[0]}" y="${h.pos[1]-18}" text-anchor="middle">${h.id}</text>
      `;
      g.addEventListener('click', ()=> selectHotspot(h.id));
      viewport.appendChild(g);
    });
  }

  document.getElementById('zoomIn').addEventListener('click', ()=>{ currentZoom = Math.min(2.5, currentZoom+0.3); viewport.style.transform = `scale(${currentZoom})`; });
  document.getElementById('zoomOut').addEventListener('click', ()=>{ currentZoom = Math.max(0.6, currentZoom-0.3); viewport.style.transform = `scale(${currentZoom})`; });
  document.getElementById('zoomReset').addEventListener('click', ()=>{ currentZoom = 1; viewport.style.transform = ''; viewport.style.transformOrigin = 'center center'; });

  function resetResultsUI(){
    appState.analysisComplete = false;
    document.getElementById('statsBarWrap').style.display = 'none';
    document.getElementById('mapLegend').style.display = 'none';
    document.getElementById('compareToggle').style.display = 'none';
  }

  /* =====================================================================
     ANALYSIS ENGINE
  ===================================================================== */
  const STEP_LABELS = [
    'Preparing spatial data...',
    'Comparing environmental layers...',
    'Calculating change indicators...',
    'Generating spatial results...'
  ];

  function runAnalysis(){
    if(appState.isAnalyzing) return;

    if(!appState.selectedRegion){
      showToast('Select or draw a monitoring area first.');
      return;
    }
    if(!appState.beforeYear || !appState.afterYear){
      showToast('Select a baseline and comparison period.');
      return;
    }
    if(!appState.periodAvailable){
      showToast('Demonstration data unavailable for this comparison.');
      return;
    }

    appState.isAnalyzing = true;
    setStatus('busy','ANALYZING');

    const overlay = document.getElementById('analysisOverlay');
    const stepsEl = document.getElementById('analysisSteps');
    stepsEl.innerHTML = STEP_LABELS.map((s,i)=>`<div class="astep" data-i="${i}"><span class="dot"></span>${s}</div>`).join('');
    overlay.style.display = 'flex';

    let i=0;
    const stepEls = stepsEl.querySelectorAll('.astep');
    const interval = setInterval(()=>{
      if(i>0) stepEls[i-1].classList.replace('active','done');
      if(i < stepEls.length){
        stepEls[i].classList.add('active');
        i++;
      } else {
        clearInterval(interval);
        setTimeout(finishAnalysis, 200);
      }
    }, 260); // ~4 steps * 260ms + tail ≈ 1240ms total, within the 800–1500ms target
  }

  function finishAnalysis(){
    document.getElementById('analysisOverlay').style.display = 'none';
    appState.isAnalyzing = false;
    appState.analysisComplete = true;
    setStatus('done','ANALYSIS COMPLETE');

    const region = appState.selectedRegion;

    document.querySelectorAll('.change-zone').forEach(z=>{ z.classList.toggle('hidden-layer', !appState.activeLayers.hotspots); });
    document.querySelectorAll('.hotspot-marker').forEach(h=>{ h.classList.toggle('hidden-layer', !appState.activeLayers.hotspots); });
    document.getElementById('mapLegend').style.display = appState.activeLayers.hotspots ? 'block' : 'none';
    document.getElementById('compareToggle').style.display = 'block';
    document.getElementById('statsBarWrap').style.display = 'block';

    const hotspotCount = appState.activeLayers.hotspots ? (region.hotspots||[]).length : 0;
    countUp('statVeg', region.vegetationChange, '%');
    countUp('statWater', region.waterChange, '%');
    countUp('statBuiltup', region.builtupChange, '%', true);
    countUp('statHotspots', hotspotCount, '', false, true);

    renderComparePanels(region);
    renderSelectedAreaPanel();
  }

  function countUp(elId, target, suffix, forcePlus, isInt){
    const el = document.getElementById(elId);
    const duration = 500;
    const start = performance.now();
    function tick(now){
      const p = Math.min(1, (now-start)/duration);
      const val = target * p;
      let display;
      if(isInt){ display = String(Math.round(val)).padStart(2,'0'); }
      else { display = (val>=0 && (forcePlus||target>=0) ? '+' : '') + val.toFixed(1) + suffix; }
      el.textContent = display;
      if(p<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* =====================================================================
     HOTSPOT DETAIL
  ===================================================================== */
  const detailPanel = document.getElementById('detailPanel');
  function selectHotspot(id){
    try{
      const region = appState.selectedRegion;
      const h = (region.hotspots||[]).find(x=>x.id===id);
      if(!h) return;
      appState.selectedHotspot = h;

      document.querySelectorAll('.hotspot-marker').forEach(g=>{
        g.classList.toggle('selected', g.dataset.id===id);
      });

      currentZoom = 1.7;
      viewport.style.transform = `scale(${currentZoom})`;
      viewport.style.transformOrigin = `${h.pos[0]}px ${h.pos[1]}px`;

      document.getElementById('detailId').textContent = h.id;
      document.getElementById('detailTitle').textContent = h.title;
      document.getElementById('detailChange').textContent = h.changePct.toFixed(1)+'%';
      document.getElementById('detailArea').textContent = h.areaKm2.toFixed(1)+' km²';
      document.getElementById('detailComparison').textContent = appState.beforeYear+' → '+appState.afterYear;
      document.getElementById('detailInterp').textContent =
        h.severity==='significant'
        ? 'The selected area shows a notable decline in vegetation index relative to the comparison period.'
        : 'The selected area shows a moderate change in indicator values relative to the comparison period.';
      const badgeWrap = document.getElementById('detailBadgeWrap');
      badgeWrap.innerHTML = `<span class="detail-badge ${h.severity}">${h.severity==='significant'?'Significant':'Moderate'}</span>`;

      detailPanel.classList.add('open');
    }catch(e){
      console.error(e);
      showToast('Unable to open this change area right now.');
    }
  }
  document.getElementById('detailClose').addEventListener('click', closeDetail);
  function closeDetail(){
    detailPanel.classList.remove('open');
    document.querySelectorAll('.hotspot-marker').forEach(g=> g.classList.remove('selected'));
  }

  /* =====================================================================
     BEFORE / AFTER COMPARISON
  ===================================================================== */
  function renderComparePanels(region){
    const beforeSvg = document.getElementById('compareBefore');
    const afterSvg = document.getElementById('compareAfter');
    document.getElementById('compareRegionName').textContent = region.name;

    function paint(svg, phase){
      svg.innerHTML = '';
      const scaleY = 460/MAP_H;
      const scalePoly = poly => poly.map(p=>[p[0], p[1]*scaleY]);

      const bg = document.createElementNS('http://www.w3.org/2000/svg','rect');
      bg.setAttribute('width','800'); bg.setAttribute('height','460');
      bg.setAttribute('fill','#EAF0E7');
      svg.appendChild(bg);

      const veg = document.createElementNS('http://www.w3.org/2000/svg','polygon');
      veg.setAttribute('points', polyToPoints(scalePoly(region.boundary)));
      veg.setAttribute('fill','var(--vegetation-soft)');
      veg.setAttribute('opacity', phase==='before' ? 0.32 : 0.15);
      svg.appendChild(veg);

      (region.zones||[]).forEach(z=>{
        if(phase==='after' && z.type!=='stable'){
          const p = document.createElementNS('http://www.w3.org/2000/svg','polygon');
          p.setAttribute('points', polyToPoints(scalePoly(z.poly)));
          p.setAttribute('fill', z.type==='significant' ? 'var(--change-significant)' : 'var(--change-moderate)');
          p.setAttribute('opacity','0.30');
          svg.appendChild(p);
        }
      });

      (region.waterBodies||[]).forEach(wb=>{
        const p = document.createElementNS('http://www.w3.org/2000/svg','polygon');
        p.setAttribute('points', polyToPoints(scalePoly(wb)));
        p.setAttribute('fill','var(--water)');
        p.setAttribute('opacity', phase==='before' ? 0.6 : 0.4);
        svg.appendChild(p);
      });

      const boundary = document.createElementNS('http://www.w3.org/2000/svg','polygon');
      boundary.setAttribute('points', polyToPoints(scalePoly(region.boundary)));
      boundary.setAttribute('fill','none');
      boundary.setAttribute('stroke','rgba(53,84,67,0.4)');
      boundary.setAttribute('stroke-dasharray','4 3');
      svg.appendChild(boundary);
    }
    paint(beforeSvg,'before');
    paint(afterSvg,'after');
  }

  document.getElementById('compareToggle').addEventListener('click', ()=>{
    document.getElementById('compareOverlay').classList.add('open');
  });
  document.getElementById('closeCompare').addEventListener('click', ()=>{
    document.getElementById('compareOverlay').classList.remove('open');
  });
  const compareSlider = document.getElementById('compareSlider');
  const sliderHandle = document.getElementById('sliderHandle');
  const compareAfter = document.getElementById('compareAfter');
  compareSlider.addEventListener('input', function(){
    const v = this.value;
    compareAfter.style.clipPath = `inset(0 0 0 ${v}%)`;
    sliderHandle.style.left = v+'%';
  });

  /* =====================================================================
     DATA SOURCES EXPANDER
  ===================================================================== */
  const sourcesExpander = document.getElementById('sourcesExpander');
  sourcesExpander.addEventListener('click', function(){
    this.classList.toggle('open');
    document.getElementById('sourcesBody').classList.toggle('open');
  });

  /* =====================================================================
     REPORT
  ===================================================================== */
  document.getElementById('reportBtn').addEventListener('click', generateReport);
  function generateReport(){
    if(!appState.selectedRegion){
      showToast('Select or draw a monitoring area first.');
      return;
    }
    if(!appState.analysisComplete){
      showToast('Run an analysis before generating a report.');
      return;
    }
    const region = appState.selectedRegion;
    document.getElementById('reportMeta').textContent =
      `Generated ${new Date().toLocaleString()} · Demonstration dataset`;
    document.getElementById('reportRegionTable').innerHTML = `
      <tr><td>Monitoring area</td><td style="text-align:right;">${region.name}</td></tr>
      <tr><td>Type</td><td style="text-align:right;">${region.type}</td></tr>
      <tr><td>Approx. area</td><td style="text-align:right;">${region.area.toLocaleString()} km²</td></tr>
      <tr><td>Baseline</td><td style="text-align:right;">${appState.beforeYear}</td></tr>
      <tr><td>Comparison</td><td style="text-align:right;">${appState.afterYear}</td></tr>
    `;
    const hotspotCount = appState.activeLayers.hotspots ? (region.hotspots||[]).length : 0;
    document.getElementById('reportChangeTable').innerHTML = `
      <tr><td>Vegetation change</td><td style="text-align:right;">${region.vegetationChange.toFixed(1)}%</td></tr>
      <tr><td>Water change</td><td style="text-align:right;">${region.waterChange.toFixed(1)}%</td></tr>
      <tr><td>Built-up change</td><td style="text-align:right;">+${region.builtupChange.toFixed(1)}%</td></tr>
      <tr><td>Areas requiring review</td><td style="text-align:right;">${hotspotCount}</td></tr>
    `;
    document.getElementById('report-overlay').classList.add('open');
  }
  document.getElementById('closeReport').addEventListener('click', ()=>{
    document.getElementById('report-overlay').classList.remove('open');
  });
  document.getElementById('printReport').addEventListener('click', ()=> window.print());

  /* =====================================================================
     INIT
  ===================================================================== */
  enforceYearOrder('before');
  setStatus('ready','SAMPLE DATASET');
  renderSelectedAreaPanel();
})();
