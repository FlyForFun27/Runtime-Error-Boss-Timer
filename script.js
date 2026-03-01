const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQtRlBFHRViiLrjzmlEvxgI8-1UNwfrJWJU7fsej4eO6dLOEEzozvd_03KmgWhAIZonrzb2QupMcvVK/pub?gid=0&single=true&output=csv";

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. LOAD SAVED PREFERENCES (Color & Toggle) ---
    const savedColor = localStorage.getItem('neoTimerThemeColor');
    if (savedColor) {
        document.documentElement.style.setProperty('--accent-color', savedColor);
    }

    const timerToggle = document.getElementById('timer-toggle');
    const savedToggle = localStorage.getItem('neoTimerToggleState');
    if (timerToggle) {
        // Restore previous toggle state if it exists
        if (savedToggle !== null) {
            timerToggle.checked = savedToggle === 'true';
        }
        // Save state whenever it changes
        timerToggle.addEventListener('change', (e) => {
            localStorage.setItem('neoTimerToggleState', e.target.checked);
            updateTimers();
        });
    }

    // --- 2. COLOR PICKER LOGIC ---
    const colorDots = document.querySelectorAll('.color-dot');
    colorDots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            const selectedColor = e.target.getAttribute('data-color');
            document.documentElement.style.setProperty('--accent-color', selectedColor);
            localStorage.setItem('neoTimerThemeColor', selectedColor);
        });
    });

    // --- 3. FETCH DATA ---
    Papa.parse(sheetUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            buildDashboard(results.data);
            setInterval(updateTimers, 1000);
            updateTimers(); 
        }
    });

    // --- 4. START TOP CLOCKS ---
    setInterval(updateTopClock, 1000);
    updateTopClock();

    setInterval(updateResetTimers, 1000);
    updateResetTimers();
});

function updateTopClock() {
    const now = new Date();
    document.getElementById('top-clock').innerText = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function updateResetTimers() {
    const now = new Date();

    // --- Daily Reset (Every day at 6:00 AM Local) ---
    const dailyReset = new Date();
    dailyReset.setHours(6, 0, 0, 0);
    
    // If it is past 6:00 AM, aim for tomorrow
    if (now >= dailyReset) {
        dailyReset.setDate(dailyReset.getDate() + 1);
    }
    
    const dDiff = dailyReset - now;
    const dH = Math.floor(dDiff / (1000 * 60 * 60));
    const dM = Math.floor((dDiff % (1000 * 60 * 60)) / (1000 * 60));
    const dS = Math.floor((dDiff % (1000 * 60)) / 1000);
    
    document.getElementById('daily-reset').innerText = 
        `${dH}h ${dM.toString().padStart(2, '0')}m ${dS.toString().padStart(2, '0')}s`;

    // --- Weekly Reset (Every Wednesday at 6:00 AM Local) ---
    const weeklyReset = new Date();
    weeklyReset.setHours(6, 0, 0, 0);
    
    let daysUntilWed = (3 - weeklyReset.getDay() + 7) % 7;
    // If it's Wednesday but past 6:00 AM, aim for next week
    if (daysUntilWed === 0 && now >= weeklyReset) {
        daysUntilWed = 7;
    }
    weeklyReset.setDate(weeklyReset.getDate() + daysUntilWed);
    
    const wDiff = weeklyReset - now;
    const wD = Math.floor(wDiff / (1000 * 60 * 60 * 24));
    const wH = Math.floor((wDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const wM = Math.floor((wDiff % (1000 * 60 * 60)) / (1000 * 60));
    const wS = Math.floor((wDiff % (1000 * 60)) / 1000);

    const daysStr = wD > 0 ? `${wD}d ` : '';
    document.getElementById('weekly-reset').innerText = 
        `${daysStr}${wH}h ${wM.toString().padStart(2, '0')}m ${wS.toString().padStart(2, '0')}s`;
}

function buildDashboard(data) {
    const grid = document.getElementById('timers-grid');
    grid.innerHTML = ''; 
    const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
    const todaysData = data.filter(row => row.Weekday === today);
    const activeRegions = [...new Set(todaysData.map(row => row.Region))];

    activeRegions.forEach(region => {
        const col = document.createElement('div');
        col.className = 'region-column';
        col.innerHTML = `<h3>${region.toUpperCase()}</h3><div class="card-container"></div>`;
        
        const container = col.querySelector('.card-container');
        const regionBosses = todaysData.filter(row => row.Region === region);
        
        regionBosses.forEach(boss => {
            const card = document.createElement('div');
            card.className = 'boss-card';
            
            const fullTime = boss.TargetTime; // Expecting "HH:MM:SS"
            card.dataset.target = fullTime; 
            
            // Trim down to "HH:MM" for clean UI display
            const displayTime = fullTime.length >= 5 ? fullTime.substring(0, 5) : fullTime;

            if (region.toLowerCase() === 'monarch') {
                card.classList.add('monarch-card');
                card.innerHTML = `
                    <p class="boss-name">${boss.BossName}</p>
                    <p class="time-since-kill">Time since kill: <span class="kill-timer" data-time="${fullTime}">--</span></p>
                    <div class="countdown-wrapper">
                        <div class="estimated-label">ESTIMATED SPAWN IN</div>
                        <div class="countdown" data-time="${fullTime}">--</div>
                    </div>`;
            } else {
                card.innerHTML = `
                    <p class="boss-name">${boss.BossName}</p>
                    <p class="boss-time">Time: ${displayTime}</p>
                    <div class="countdown-wrapper"><div class="countdown" data-time="${fullTime}">--</div></div>`;
            }
            container.appendChild(card);
        });

        // --- Monarch Dropdown Inject ---
        if (region.toLowerCase() === 'monarch') {
            const details = document.createElement('details');
            details.className = 'monarch-dropdown';
            
            let listHTML = '';
            
            const allMonarchBosses = data.filter(row => row.Region && row.Region.toLowerCase() === 'monarch');
            const daysOfWeek = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7 };
            
            allMonarchBosses.sort((a, b) => {
                if (daysOfWeek[a.Weekday] !== daysOfWeek[b.Weekday]) {
                    return daysOfWeek[a.Weekday] - daysOfWeek[b.Weekday];
                }
                return a.TargetTime.localeCompare(b.TargetTime);
            });
            
            allMonarchBosses.forEach(b => {
                const dropDisplayTime = b.TargetTime.length >= 5 ? b.TargetTime.substring(0, 5) : b.TargetTime;
                listHTML += `<li><strong>${b.Weekday}, ${b.BossName}</strong> <span>${dropDisplayTime}</span></li>`;
            });

            details.innerHTML = `
                <summary>View All Logged Times</summary>
                <ul>${listHTML}</ul>
            `;
            col.appendChild(details); 
        }

        grid.appendChild(col);
    });
}

function updateTimers() {
    const now = new Date(); 
    const isTimerOn = document.getElementById('timer-toggle').checked;

    document.querySelectorAll('.boss-card').forEach(card => {
        const isMonarch = card.classList.contains('monarch-card');
        const countdownEl = card.querySelector('.countdown');
        const targetTimeStr = card.dataset.target;

        // --- BULLETPROOF TIME PARSING ---
        const t = parseTimeStr(targetTimeStr);
        const targetDate = new Date();
        
        if (USE_UTC_TIME) {
            targetDate.setUTCHours(t.h, t.m, t.s, 0);
        } else {
            targetDate.setHours(t.h, t.m, t.s, 0); // THIS IS THE CRITICAL LINE
        }

        card.classList.remove('dimmed');
        countdownEl.classList.remove('spawning');

        if (isMonarch) {
            const killTimerEl = card.querySelector('.kill-timer');
            let diffKill = now - targetDate;
            killTimerEl.innerText = formatDuration(diffKill >= 0 ? diffKill : 0);

            const spawnDate = new Date(targetDate.getTime() + (2.5 * 60 * 60 * 1000));
            const diffSpawn = spawnDate - now;

            if (diffSpawn > 0) {
                countdownEl.innerText = formatDuration(diffSpawn);
                card.dataset.priority = "1"; // Upcoming
            } else {
                countdownEl.innerText = `In Window`;
                countdownEl.classList.add('spawning');
                card.dataset.priority = "0"; // Highest priority
            }
        } else {
            const diffMs = targetDate - now;
            const displayTimeStr = targetTimeStr.length >= 5 ? targetTimeStr.substring(0, 5) : targetTimeStr;

            if (diffMs > 0) {
                countdownEl.innerText = isTimerOn ? formatDuration(diffMs) : `Announcement at: ${displayTimeStr}`;
                card.dataset.priority = "1"; // Upcoming
            } else if (diffMs <= 0 && diffMs > -300000) { 
                countdownEl.innerText = `Spawning in: ${formatDuration(300000 + diffMs)}`;
                countdownEl.classList.add('spawning');
                card.dataset.priority = "0"; // Highest Priority
            } else {
                countdownEl.innerText = `Spawned`;
                card.classList.add('dimmed');
                card.dataset.priority = "2"; // Drops to bottom
            }
        }
    });

    // --- SORTING LOGIC ---
    document.querySelectorAll('.card-container').forEach(container => {
        const cards = Array.from(container.children);
        cards.sort((a, b) => {
            if (a.dataset.priority !== b.dataset.priority) {
                return a.dataset.priority - b.dataset.priority;
            }
            return a.dataset.target.localeCompare(b.dataset.target);
        });
        cards.forEach(card => container.appendChild(card));
    });
}

function formatDuration(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return h > 0 
        ? `${h}h ${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s` 
        : `${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`;
}
