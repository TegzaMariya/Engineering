const mainCanvas = document.getElementById('mainCanvas'), ctxMain = mainCanvas.getContext('2d');
const resCanvas = document.getElementById('resCanvas'), ctxRes = resCanvas.getContext('2d');
const tt = document.getElementById('tooltip');

let points = [];
let mode = 'all';
let xMin, yMin, xMax, yMax;
let rxMin, rxMax, ryMin, ryMax;
let lsmCoeffs = { a: 0, b: 0, c: 0 };

let animationProgress = 0;
let animationId = null;

const padding = 50;

const dataSet5 = [{x:1, y:1.4}, {x:2, y:1.9}, {x:3, y:1.5}, {x:4, y:1.1}, {x:5, y:1.6}];
const dataSet10 = Array.from({length:10}, (_,i) => ({x: i+1, y: Number((1.2 + Math.sin(i) * 0.5 + Math.random()*0.3).toFixed(2))}));
const dataSet20 = Array.from({length:20}, (_,i) => ({x: i+1, y: Number((1.5 + Math.cos(i) * 0.6 + Math.random()*0.4).toFixed(2))}));

function init() {
    const dataSelect = document.getElementById('dataSet');
    const modeSelect = document.getElementById('mode');

    function loadSelectedSet() {
        if (dataSelect.value === '5') points = JSON.parse(JSON.stringify(dataSet5));
        else if (dataSelect.value === '10') points = JSON.parse(JSON.stringify(dataSet10));
        else if (dataSelect.value === '20') points = JSON.parse(JSON.stringify(dataSet20));
        
        buildTable();
        triggerAnimation();
    }

    dataSelect.addEventListener('change', loadSelectedSet);
    modeSelect.addEventListener('change', (e) => {
        mode = e.target.value;
        triggerAnimation();
    });

    mainCanvas.addEventListener('mousemove', (e) => handleMouseMove(e, mainCanvas, 'main'));
    resCanvas.addEventListener('mousemove', (e) => handleMouseMove(e, resCanvas, 'res'));
    
    mainCanvas.addEventListener('mouseleave', hideTooltip);
    resCanvas.addEventListener('mouseleave', hideTooltip);

    loadSelectedSet();
}

function buildTable() {
    const tbody = document.getElementById('pointsTableBody');
    tbody.innerHTML = '';
    points.forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td><input type="number" step="0.1" value="${p.x}" data-idx="${idx}" data-axis="x"></td>
            <td><input type="number" step="0.1" value="${p.y}" data-idx="${idx}" data-axis="y"></td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            const axis = e.target.getAttribute('data-axis');
            const val = parseFloat(e.target.value) || 0;
            points[idx][axis] = val;
            
            calculateLSM();
            calculateBounds();
            if(animationId) cancelAnimationFrame(animationId);
            draw();
        });
    });
}

function triggerAnimation() {
    calculateLSM();
    calculateBounds();
    
    if(animationId) cancelAnimationFrame(animationId);
    animationProgress = 0;
    
    function animate() {
        animationProgress += 0.03;
        if (animationProgress > 1) animationProgress = 1;
        
        draw();
        
        if (animationProgress < 1) {
            animationId = requestAnimationFrame(animate);
        }
    }
    animate();
}

function draw() {
    drawMainGraph();
    drawResidualsGraph();
}

function calculateBounds() {
    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);

    xMin = Math.min(...xValues) - 0.5;
    xMax = Math.max(...xValues) + 0.5;
    let minYVal = Math.min(...yValues), maxYVal = Math.max(...yValues);
    let diff = maxYVal - minYVal || 1;
    yMin = Math.max(0, minYVal - diff * 0.2);
    yMax = maxYVal + diff * 0.3;

    rxMin = xMin;
    rxMax = xMax;
    let maxRes = 0;
    points.forEach(p => {
        let r = p.y - (lsmCoeffs.a * p.x**2 + lsmCoeffs.b * p.x + lsmCoeffs.c);
        if (Math.abs(r) > maxRes) maxRes = Math.abs(r);
    });
    maxRes = maxRes === 0 ? 0.5 : maxRes * 1.3;
    ryMin = -maxRes;
    ryMax = maxRes;
}

function toScreen(x, y, type, cv) {
    let w = cv.width - 2 * padding;
    let h = cv.height - 2 * padding;
    let xM = type === 'main' ? xMin : rxMin;
    let xX = type === 'main' ? xMax : rxMax;
    let yM = type === 'main' ? yMin : ryMin;
    let yX = type === 'main' ? yMax : ryMax;

    return {
        px: padding + ((x - xM) / (xX - xM)) * w,
        py: padding + ((yX - y) / (yX - yM)) * h
    };
}

function toMath(px, py, type, cv) {
    let w = cv.width - 2 * padding;
    let h = cv.height - 2 * padding;
    let xM = type === 'main' ? xMin : rxMin;
    let xX = type === 'main' ? xMax : rxMax;
    let yM = type === 'main' ? yMin : ryMin;
    let yX = type === 'main' ? yMax : ryMax;

    return {
        x: xM + ((px - padding) / w) * (xX - xM),
        y: yX - ((py - padding) / h) * (yX - yM)
    };
}

function calculateLSM() {
    let n = points.length;
    let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0, sy = 0, sxy = 0, sx2y = 0;
    points.forEach(p => {
        sx += p.x; sx2 += p.x**2; sx3 += p.x**3; sx4 += p.x**4;
        sy += p.y; sxy += p.x * p.y; sx2y += (p.x**2) * p.y;
    });
    const det3x3 = (a,b,c, d,e,f, g,h,i) => a*(e*i-f*h) - b*(d*i-f*g) + c*(d*h-e*g);
    let D = det3x3(sx4, sx3, sx2, sx3, sx2, sx, sx2, sx, n);
    if (Math.abs(D) < 1e-7) { lsmCoeffs = {a:0, b:0, c:0}; return; }
    lsmCoeffs = {
        a: det3x3(sx2y, sx3, sx2, sxy, sx2, sx, sy, sx, n) / D,
        b: det3x3(sx4, sx2y, sx2, sx3, sxy, sx, sx2, sy, n) / D,
        c: det3x3(sx4, sx3, sx2y, sx3, sx2, sxy, sx2, sx, sy) / D
    };
}

function calculateLagrange(x) {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
        let term = points[i].y;
        for (let j = 0; j < points.length; j++) {
            if (i !== j) term *= (x - points[j].x) / (points[i].x - points[j].x);
        }
        sum += term;
    }
    return sum;
}

function drawGrid(ctx, cv, type) {
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    
    let xM = type === 'main' ? xMin : rxMin;
    let xX = type === 'main' ? xMax : rxMax;
    let yM = type === 'main' ? yMin : ryMin;
    let yX = type === 'main' ? yMax : ryMax;

    for (let i = 0; i <= 10; i++) {
        let cx = xM + i * (xX - xM) / 10;
        let s = toScreen(cx, yM, type, cv);
        ctx.beginPath(); ctx.moveTo(s.px, padding); ctx.lineTo(s.px, cv.height - padding); ctx.stroke();
        ctx.fillText(cx.toFixed(1), s.px - 10, cv.height - padding + 15);

        let cy = yM + i * (yX - yM) / 10;
        let sy = toScreen(xM, cy, type, cv);
        ctx.beginPath(); ctx.moveTo(padding, sy.py); ctx.lineTo(cv.width - padding, sy.py); ctx.stroke();
        ctx.fillText(cy.toFixed(2), padding - 35, sy.py + 4);
    }

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(padding, padding, cv.width - 2*padding, cv.height - 2*padding);
}

function drawMainGraph() {
    ctxMain.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    drawGrid(ctxMain, mainCanvas, 'main');

    const fLSM = (x) => lsmCoeffs.a * x**2 + lsmCoeffs.b * x + lsmCoeffs.c;
    let currentMaxXPx = padding + (mainCanvas.width - 2 * padding) * animationProgress;

    ctxMain.save();
    ctxMain.beginPath();
    ctxMain.rect(padding, padding, mainCanvas.width - 2 * padding, mainCanvas.height - 2 * padding);
    ctxMain.clip();

    if (mode === 'all' || mode === 'lagrange') {
        ctxMain.strokeStyle = varColor('--primary');
        ctxMain.lineWidth = 2;
        ctxMain.beginPath();
        let first = true;
        for (let px = padding; px <= currentMaxXPx; px++) {
            let m = toMath(px, 0, 'main', mainCanvas);
            let s = toScreen(m.x, calculateLagrange(m.x), 'main', mainCanvas);
            if (first) { ctxMain.moveTo(s.px, s.py); first = false; }
            else ctxMain.lineTo(s.px, s.py);
        }
        ctxMain.stroke();
    }

    if (mode === 'all' || mode === 'lsm') {
        ctxMain.strokeStyle = varColor('--accent-lsm');
        ctxMain.lineWidth = 2;
        ctxMain.beginPath();
        let first = true;
        for (let px = padding; px <= currentMaxXPx; px++) {
            let m = toMath(px, 0, 'main', mainCanvas);
            let s = toScreen(m.x, fLSM(m.x), 'main', mainCanvas);
            if (first) { ctxMain.moveTo(s.px, s.py); first = false; }
            else ctxMain.lineTo(s.px, s.py);
        }
        ctxMain.stroke();
    }

    ctxMain.restore();

    points.forEach(p => {
        let sP = toScreen(p.x, p.y, 'main', mainCanvas);
        if (sP.px <= currentMaxXPx) {
            let sL = toScreen(p.x, fLSM(p.x), 'main', mainCanvas);

            ctxMain.strokeStyle = '#10b981';
            ctxMain.lineWidth = 1;
            ctxMain.setLineDash([3, 3]);
            ctxMain.beginPath(); ctxMain.moveTo(sP.px, sP.py); ctxMain.lineTo(sL.px, sL.py); ctxMain.stroke();
            ctxMain.setLineDash([]);

            ctxMain.fillStyle = '#0f172a';
            ctxMain.beginPath(); ctxMain.arc(sP.px, sP.py, 5, 0, 7); ctxMain.fill();
        }
    });
}

function drawResidualsGraph() {
    ctxRes.clearRect(0, 0, resCanvas.width, resCanvas.height);
    drawGrid(ctxRes, resCanvas, 'res');

    let zero = toScreen(rxMin, 0, 'res', resCanvas);
    ctxRes.strokeStyle = '#64748b';
    ctxRes.lineWidth = 1.5;
    ctxRes.beginPath(); ctxRes.moveTo(padding, zero.py); ctxRes.lineTo(resCanvas.width - padding, zero.py); ctxRes.stroke();

    points.forEach(p => {
        let yL = lsmCoeffs.a * p.x**2 + lsmCoeffs.b * p.x + lsmCoeffs.c;
        let fullResidual = p.y - yL;
        let currentResidual = fullResidual * animationProgress;
        
        let sRes = toScreen(p.x, currentResidual, 'res', resCanvas);
        let sZero = toScreen(p.x, 0, 'res', resCanvas);

        ctxRes.strokeStyle = varColor('--accent-res');
        ctxRes.lineWidth = 1.5;
        ctxRes.setLineDash([3, 3]);
        ctxRes.beginPath(); ctxRes.moveTo(sRes.px, sZero.py); ctxRes.lineTo(sRes.px, sRes.py); ctxRes.stroke();
        ctxRes.setLineDash([]);

        ctxRes.fillStyle = varColor('--accent-res');
        ctxRes.beginPath(); ctxRes.arc(sRes.px, sRes.py, 4, 0, 7); ctxRes.fill();
    });
}

function handleMouseMove(e, cv, type) {
    if(animationProgress < 1) return;
    const rect = cv.getBoundingClientRect();
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;

    let active = null;
    points.forEach(p => {
        let s = type === 'main' 
            ? toScreen(p.x, p.y, 'main', cv)
            : toScreen(p.x, p.y - (lsmCoeffs.a * p.x**2 + lsmCoeffs.b * p.x + lsmCoeffs.c), 'res', cv);
        
        if (Math.hypot(mX - s.px, mY - s.py) < 8) active = p;
    });

    if (active) {
        let yL = lsmCoeffs.a * active.x**2 + lsmCoeffs.b * active.x + lsmCoeffs.c;
        let r = active.y - yL;
        
        tt.style.display = 'block';
        tt.style.left = (e.pageX + 15) + 'px';
        tt.style.top = (e.pageY + 15) + 'px';
        tt.innerHTML = `
            <strong>Вузол X:</strong> ${active.x}<br/>
            <strong>Експер. Y:</strong> ${active.y.toFixed(2)}<br/>
            <strong>МНК Парабола Y:</strong> ${yL.toFixed(3)}<br/>
            <strong>Залишок rᵢ:</strong> ${r.toFixed(4)}<br/>
            <strong>Лагранж Y:</strong> ${calculateLagrange(active.x).toFixed(3)}
        `;
    } else {
        tt.style.display = 'none';
    }
}

function hideTooltip() { tt.style.display = 'none'; }
function varColor(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

window.onload = init;