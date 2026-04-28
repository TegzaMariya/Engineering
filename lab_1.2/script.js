let t = 0;
const dt = 0.1;
let timer = null;
let chart;

window.onload = function() {
    const ctx = document.getElementById('motionChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Координата x(t)',
                data: [],
                borderColor: '#0984e3',
                tension: 0.2,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Час, с' } },
                y: { title: { display: true, text: 'X, м' } }
            }
        }
    });
};

function start() {
    if (timer) return;

    const x0 = parseFloat(document.getElementById('x0').value) || 0;
    const v0 = parseFloat(document.getElementById('v0').value) || 0;
    const a = parseFloat(document.getElementById('acc').value) || 0;
    const tmax = parseFloat(document.getElementById('tmax').value) || 0;

    const xMaxCalc = Math.abs(x0) + Math.abs(v0 * tmax) + Math.abs(0.5 * a * tmax * tmax) || 1;

    timer = setInterval(() => {
        if (t <= tmax) {
            let x = x0 + v0 * t + 0.5 * a * t * t;

            let offset = (x / xMaxCalc) * 50; 
            offset = Math.min(Math.max(offset, -50), 50);

            document.getElementById('point').style.transform = `translateX(${offset * 7}px)`; 
            document.getElementById('time').innerText = t.toFixed(1);
            document.getElementById('dist').innerText = x.toFixed(2);

            chart.data.labels.push(t.toFixed(1));
            chart.data.datasets[0].data.push(x);
            chart.update('none');

            t += dt;
        } else {
            stop();
        }
    }, 100);
}

function stop() {
    clearInterval(timer);
    timer = null;
}

function reset() {
    stop();
    t = 0;
    document.getElementById('point').style.transform = `translateX(0)`;
    document.getElementById('time').innerText = "0.0";
    document.getElementById('dist').innerText = "0.00";
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
}