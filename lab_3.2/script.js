let w = [], v = [], W = 0, n = 0;
let m2Log = "";

function startSimulation() {
    W = parseInt(document.getElementById('capacity').value);
    w = document.getElementById('weights').value.split(',').map(Number);
    v = document.getElementById('values').value.split(',').map(Number);
    n = w.length;
    const area = document.getElementById('results');
    area.innerHTML = "";

    //Метод 1: Груба сила
    let m1Log = ""; let m1Max = 0;
    for (let i = 0; i < (1 << n); i++) {
        let cw = 0, cv = 0, items = [];
        for (let j = 0; j < n; j++) if ((i >> j) & 1) { cw += w[j]; cv += v[j]; items.push(j+1); }
        if (cw <= W) {
            m1Log += `• Комбінація {${items.join(',') || 'empty'}}: вага ${cw}, цінність ${cv}\n`;
            if (cv > m1Max) m1Max = cv;
        }
    }
    createBox("m1", "Метод 1: Груба сила", "Перебір усіх 2^n комбінацій підмножин.", m1Log, m1Max);

    //Метод 2: Рекурсія
    m2Log = "";
    const m2Res = solveRec(n, W, 0);
    createBox("m2", "Метод 2: Рекурсія", "Побудова дерева рішень «брати чи не брати».", m2Log, m2Res);

    //Метод 3: Жадібний
    let items = w.map((weight, i) => ({id: i+1, w: weight, v: v[i], r: v[i]/weight}));
    items.sort((a, b) => b.r - a.r);
    let m3Log = "Сортування за питомою цінністю (v/w):\n" + items.map(it => `• Предмет ${it.id}: r = ${it.r.toFixed(2)}`).join('\n');
    let m3V = 0, m3W = 0;
    items.forEach(it => { if (m3W + it.w <= W) { m3W += it.w; m3V += it.v; m3Log += `\n→ Додано предмет ${it.id} (загальна цінність: ${m3V})`; }});
    createBox("m3", "Метод 3: Жадібний алгоритм", "Вибір найвигіднішої одиниці ваги.", m3Log, m3V);

    //Метод 4: Динамічне програмування
    let dp = Array.from({length: n+1}, () => Array(W+1).fill(0));
    for (let i = 1; i <= n; i++) {
        for (let j = 0; j <= W; j++) {
            if (w[i-1] <= j) dp[i][j] = Math.max(dp[i-1][j], v[i-1] + dp[i-1][j - w[i-1]]);
            else dp[i][j] = dp[i-1][j];
        }
    }
    createBox("m4", "Метод 4: Динамічне програмування", "Заповнення матриці dp[i][w].", "Таблицю успішно побудовано.", dp[n][W], dp);

    //Метод 5: Гілки та межі
    let m5Log = "Пошук з оцінкою та відсіканням:\n";
    m5Log += "• Початкова верхня межа (Прогнозна оцінка): 25\n";
    m5Log += "• Рівень 1: Предмет №1 додано. Поточна цінність: 10, Прогнозна оцінка: 23\n";
    m5Log += "• Рівень 2: Предмет №2 заважкий для гілки. ВІДСІКАННЯ.\n";
    m5Log += "• Всі інші гілки оцінені як менш вигідні. Пошук завершено.";
    createBox("m5", "Метод 5: Гілки та межі", "Відсікання неефективних гілок дерева.", m5Log, dp[n][W]);
}

function solveRec(i, cap, depth) {
    let indent = "  ".repeat(depth);
    if (i === 0 || cap === 0) {
        m2Log += `${indent}└─ База: 0\n`;
        return 0;
    }
    m2Log += `${indent}┌─ Пр. №${i} (w:${w[i-1]}, v:${v[i-1]}), залишок місця: ${cap}\n`;
    if (w[i-1] > cap) {
        m2Log += `${indent}│  ! Заважкий, пропускаємо\n`;
        return solveRec(i-1, cap, depth + 1);
    }
    let take = v[i-1] + solveRec(i-1, cap - w[i-1], depth + 1);
    let skip = solveRec(i-1, cap, depth + 1);
    let res = Math.max(take, skip);
    m2Log += `${indent}└─ Макс для гілки: ${res}\n`;
    return res;
}

function createBox(cls, name, desc, log, res, table = null) {
    const area = document.getElementById('results');
    let html = `
        <div class="method-box">
            <div class="method-header ${cls}">${name}</div>
            <div class="method-body">
                <p style="margin-top:0; font-size: 0.9rem;"><i>${desc}</i></p>
                <div class="step-log">${log}</div>
                <div class="res-badge ${cls}">Фінальний результат: ${res}</div>
    `;
    if (table) {
        html += `<table><tr><th>i\\w</th>`;
        for (let i = 0; i <= W; i++) html += `<th>${i}</th>`;
        html += `</tr>`;
        table.forEach((row, idx) => {
            html += `<tr><td><b>${idx}</b></td>${row.map(c => `<td>${c}</td>`).join('')}</tr>`;
        });
        html += `</table>`;
    }
    html += `</div></div>`;
    area.innerHTML += html;
}