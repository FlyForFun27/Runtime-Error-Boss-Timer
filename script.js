const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQtRlBFHRViiLrjzmlEvxgI8-1UNwfrJWJU7fsej4eO6dLOEEzozvd_03KmgWhAIZonrzb2QupMcvVK/pub?gid=0&single=true&output=csv";

function tick() {
    const now = new Date();
    // Convert current time to total seconds from midnight
    const nowTotalSec = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    
    // 1. Update Top Clock
    document.getElementById('top-clock').innerText = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    // 2. Update Resets (6:00 AM = 21600 seconds)
    updateResetElement('daily-reset', 21600, nowTotalSec);

    // 3. Update Boss Cards
    document.querySelectorAll('.boss-card').forEach(card => {
        const targetSec = parseInt(card.dataset.targetSec);
        const countdownEl = card.querySelector('.countdown');
        
        const diff = targetSec - nowTotalSec;

        if (diff > 0) {
            // Future: Standard Countdown
            countdownEl.innerText = formatTime(diff);
            card.style.opacity = "1";
        } else if (diff <= 0 && diff > -300) {
            // Spawning: 5 minute window
            countdownEl.innerText = "Spawning: " + formatTime(300 + diff);
            countdownEl.style.color = "var(--accent-color)";
        } else {
            // Past
            countdownEl.innerText = "Spawned";
            card.style.opacity = "0.5";
        }
    });
}

function updateResetElement(id, resetSec, nowSec) {
    let diff = resetSec - nowSec;
    if (diff <= 0) diff += 86400; // Wrap to next day
    document.getElementById(id).innerText = formatTime(diff);
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

// --- Setup & CSV Logic ---
function renderDashboard(data) {
    const grid = document.getElementById('timers-grid');
    grid.innerHTML = '';
    const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
    
    data.filter(row => row.Weekday === today).forEach(boss => {
        const timeParts = boss.TargetTime.split(':');
        const h = parseInt(timeParts);
        const m = parseInt(timeParts);
        const targetTotalSec = (h * 3600) + (m * 60);

        const card = document.createElement('div');
        card.className = 'boss-card';
        card.dataset.targetSec = targetTotalSec;
        card.innerHTML = `
            <div class="boss-name">${boss.BossName}</div>
            <div class="boss-time">${boss.TargetTime}</div>
            <div class="countdown">--</div>
        `;
        grid.appendChild(card);
    });
}

// Initialize
Papa.parse(sheetUrl, {
    download: true,
    header: true,
    complete: (results) => {
        renderDashboard(results.data);
        setInterval(tick, 1000);
        tick();
    }
});
