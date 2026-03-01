const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQtRlBFHRViiLrjzmlEvxgI8-1UNwfrJWJU7fsej4eO6dLOEEzozvd_03KmgWhAIZonrzb2QupMcvVK/pub?gid=0&single=true&output=csv";

function tick() {
    const now = new Date();
    // THE MASTER CLOCK: Current seconds since the start of today (0 to 86400)
    const nowSec = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();

    // 1. Digital Clock (Top Left)
    document.getElementById('top-clock').innerText = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    // 2. Daily Reset (6:00 AM = 21600 seconds)
    let dailyDiff = 21600 - nowSec;
    if (dailyDiff <= 0) dailyDiff += 86400; 
    document.getElementById('daily-reset').innerText = formatTime(dailyDiff);

    // 3. Boss Logic
    document.querySelectorAll('.boss-card').forEach(card => {
        const target = parseInt(card.dataset.targetSec, 10);
        const countdownEl = card.querySelector('.countdown');
        const diff = target - nowSec;

        card.classList.remove('dimmed', 'spawning-active');

        if (diff > 0) {
            // FUTURE: Just a simple math subtraction
            countdownEl.innerText = formatTime(diff);
            card.dataset.priority = "1";
        } else if (diff <= 0 && diff > -300) {
            // SPAWNING: The 5-minute (300s) window after the number is hit
            const spawnRemaining = 300 + diff;
            countdownEl.innerText = "Spawning: " + formatTime(spawnRemaining);
            card.classList.add('spawning-active');
            card.dataset.priority = "0";
        } else {
            // PAST: Number was hit more than 5 mins ago
            countdownEl.innerText = "Spawned";
            card.classList.add('dimmed');
            card.dataset.priority = "2";
        }
    });

    // Sort to keep "Spawning" at the top of the columns
    sortCards();
}

function formatTime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const p = (n) => n.toString().padStart(2, '0');
    return h > 0 ? `${h}h ${p(m)}m ${p(sec)}s` : `${p(m)}m ${p(sec)}s`;
}

function renderDashboard(data) {
    const grid = document.getElementById('timers-grid');
    grid.innerHTML = '';
    const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

    // Map your case-sensitive headers
    data.filter(row => row.Weekday === today).forEach(boss => {
        const card = document.createElement('div');
        card.className = 'boss-card';
        
        // Tricking JS: We pull the raw integer directly from your 'TargetSec' column
        card.dataset.targetSec = boss.TargetSec; 

        card.innerHTML = `
            <div class="boss-region">${boss.Region}</div>
            <div class="boss-name">${boss.BossName}</div>
            <div class="boss-time">Scheduled: ${boss.TargetTime}</div>
            <div class="countdown">--:--</div>
        `;
        grid.appendChild(card);
    });
}

function sortCards() {
    const grid = document.getElementById('timers-grid');
    const cards = Array.from(grid.querySelectorAll('.boss-card'));
    
    cards.sort((a, b) => {
        // Sort by priority (0 = Spawning, 1 = Countdown, 2 = Dimmed)
        if (a.dataset.priority !== b.dataset.priority) {
            return a.dataset.priority - b.dataset.priority;
        }
        // Then sort by the TargetSec value
        return a.dataset.targetSec - b.dataset.targetSec;
    });

    cards.forEach(card => grid.appendChild(card));
}

// Start the engine
Papa.parse(sheetUrl, {
    download: true,
    header: true,
    dynamicTyping: true, // Automatically handles TargetSec as a number
    skipEmptyLines: true,
    complete: (results) => {
        renderDashboard(results.data);
        setInterval(tick, 1000);
        tick();
    }
});
