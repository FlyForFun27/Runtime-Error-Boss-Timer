const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQtRlBFHRViiLrjzmlEvxgI8-1UNwfrJWJU7fsej4eO6dLOEEzozvd_03KmgWhAIZonrzb2QupMcvVK/pub?gid=0&single=true&output=csv";

// --- THE DATA PARSER ---
function getSecondsFromMidnight(dateObj) {
    return (dateObj.getHours() * 3600) + (dateObj.getMinutes() * 60) + dateObj.getSeconds();
}

function parseCsvTimeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = String(timeStr).split(':');
    const h = parseInt(parts, 10) || 0;
    const m = parseInt(parts, 10) || 0;
    // We strictly ignore any 3rd part (seconds) if it exists in the CSV 
    // to ensure every timer targets the exact :00 mark.
    return (h * 3600) + (m * 60); 
}

function formatDuration(totalSeconds) {
    const absSec = Math.floor(Math.abs(totalSeconds));
    const h = Math.floor(absSec / 3600);
    const m = Math.floor((absSec % 3600) / 60);
    const s = absSec % 60;
    
    const timePart = `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    return h > 0 ? `${h}h ${timePart}` : timePart;
}

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    // Theme logic
    const savedColor = localStorage.getItem('neoTimerThemeColor') || '#4a90e2';
    document.documentElement.style.setProperty('--accent-color', savedColor);

    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            const color = e.target.getAttribute('data-color');
            document.documentElement.style.setProperty('--accent-color', color);
            localStorage.setItem('neoTimerThemeColor', color);
        });
    });

    // CSV Loading
    Papa.parse(sheetUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            renderDashboard(results.data);
            setInterval(tick, 1000);
            tick();
        }
    });
});

// --- MASTER TIMER LOOP ---
function tick() {
    const now = new Date();
    const nowSec = getSecondsFromMidnight(now);

    updateTopClock(now);
    updateResets(nowSec);
    updateBossTimers(nowSec);
}

function updateTopClock(now) {
    document.getElementById('top-clock').innerText = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function updateResets(nowSec) {
    const resetTimeSec = 6 * 3600; // 6:00 AM

    // Daily 6am Reset
    let dailyDiff = resetTimeSec - nowSec;
    if (dailyDiff <= 0) dailyDiff += 86400; // If past 6am today, target 6am tomorrow
    document.getElementById('daily-reset').innerText = formatDuration(dailyDiff);

    // Weekly Wednesday 6am Reset
    const now = new Date();
    const day = now.getDay(); 
    let daysUntilWed = (3 - day + 7) % 7;
    // If it's Wednesday but past 6am, move to next Wednesday
    if (daysUntilWed === 0 && nowSec >= resetTimeSec) daysUntilWed = 7;
    
    const totalWeeklySec = (daysUntilWed * 86400) + (resetTimeSec - nowSec);
    const d = Math.floor(totalWeeklySec / 86400);
    const remainder = totalWeeklySec % 86400;
    document.getElementById('weekly-reset').innerText = `${d > 0 ? d + 'd ' : ''}${formatDuration(remainder)}`;
}

function renderDashboard(data) {
    const grid = document.getElementById('timers-grid');
    grid.innerHTML = '';
    
    const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
    const todaysBosses = data.filter(row => row.Weekday === today);
    const regions = [...new Set(todaysBosses.map(row => row.Region))];

    regions.forEach(region => {
        const col = document.createElement('div');
        col.className = 'region-column';
        col.innerHTML = `<h3>${region.toUpperCase()}</h3><div class="card-container"></div>`;
        const container = col.querySelector('.card-container');

        todaysBosses.filter(row => row.Region === region).forEach(boss => {
            const card = document.createElement('div');
            card.className = 'boss-card';
            // Store target seconds as an attribute for the loop to use
            card.dataset.targetSec = parseCsvTimeToSeconds(boss.TargetTime);
            card.dataset.region = region.toLowerCase();
            
            card.innerHTML = `
                <p class="boss-name">${boss.BossName}</p>
                <p class="boss-info">Time: ${boss.TargetTime}</p>
                <div class="countdown-wrapper">
                    <div class="countdown">--</div>
                </div>
            `;
            container.appendChild(card);
        });
        grid.appendChild(col);
    });
}

function updateBossTimers(nowSec) {
    document.querySelectorAll('.boss-card').forEach(card => {
        const targetSec = parseInt(card.dataset.targetSec, 10);
        const countdownEl = card.querySelector('.countdown');
        const diff = targetSec - nowSec;
        
        card.classList.remove('dimmed');
        countdownEl.classList.remove('spawning');

        if (diff > 0) {
            // Future Boss: Regular Countdown
            countdownEl.innerText = formatDuration(diff);
            card.dataset.priority = "1";
        } else if (diff <= 0 && diff > -300) {
            // Spawning: 5-minute (300s) window after the target time
            const spawnRemaining = 300 + diff;
            countdownEl.innerText = `Spawning: ${formatDuration(spawnRemaining)}`;
            countdownEl.classList.add('spawning');
            card.dataset.priority = "0";
        } else {
            // Past: Simple "Spawned" state
            countdownEl.innerText = "SPAWNED";
            card.classList.add('dimmed');
            card.dataset.priority = "2";
        }
    });

    // Sort by priority (Spawning first, then Countdown, then Dimmed)
    document.querySelectorAll('.card-container').forEach(container => {
        const cards = Array.from(container.children);
        cards.sort((a, b) => {
            if (a.dataset.priority !== b.dataset.priority) return a.dataset.priority - b.dataset.priority;
            return a.dataset.targetSec - b.dataset.targetSec;
        });
        cards.forEach(c => container.appendChild(c));
    });
}
