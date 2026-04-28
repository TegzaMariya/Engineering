let chart;
let animationId;

function startSimulation() {
    cancelAnimationFrame(animationId);

    const v0 = parseFloat(document.getElementById('v0').value) || 0;
    const angle = parseFloat(document.getElementById('angle').value) || 0;
    const g = parseFloat(document.getElementById('g').value) || 9.81;

    const rad = angle * Math.PI / 180;

    const tFlight = (2 * v0 * Math.sin(rad)) / g;
    const hMax = (v0**2 * Math.sin(rad)**2) / (2*g);
    const L = (v0**2 * Math.sin(2*rad)) / g;

    document.getElementById('results').innerHTML = `
        Час польоту: ${tFlight.toFixed(2)} c<br>
        Дальність: ${L.toFixed(2)} м<br>
        Максимальна висота: ${hMax.toFixed(2)} м
    `;

    if (chart) chart.destroy();

    chart = new Chart(document.getElementById('chart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderWidth: 2,
                tension: 0.35,
                pointRadius: 4
            }]
        },
        options: {
            animation: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    title: { display: true, text: 'X (м)' }
                },
                y: {
                    title: { display: true, text: 'Y (м)' }
                }
            }
        }
    });

    let t = 0;
    const dt = 0.05;

    function animate() {
        if (t > tFlight) return;

        let x = v0 * Math.cos(rad) * t;
        let y = v0 * Math.sin(rad) * t - (g * t * t) / 2;

        if (y >= 0) {
            chart.data.labels.push(Math.round(x));
            chart.data.datasets[0].data.push(y);
            chart.update();
        }

        t += dt;
        animationId = requestAnimationFrame(animate);
    }

    animate();
}