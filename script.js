// Replace this with your Google Sheets Published CSV link later!
const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQtRlBFHRViiLrjzmlEvxgI8-1UNwfrJWJU7fsej4eO6dLOEEzozvd_03KmgWhAIZonrzb2QupMcvVK/pubhtml?gid=0&single=true"; 

document.addEventListener("DOMContentLoaded", () => {
    // For now, let's use some dummy data so you can see the design working
    const dummyData = [
        { Region: "Dawncrest", BossName: "Forest of Wisdom", Weekday: "Sunday", TargetTime: "05:38" },
        { Region: "Dawncrest", BossName: "Earthbreaker Mountains", Weekday: "Sunday", TargetTime: "08:36" },
        { Region: "Worldboss", BossName: "Realmwalker Plateau", Weekday: "Sunday", TargetTime: "14:55" }
    ];

    buildDashboard(dummyData);
});

function buildDashboard(data) {
    const grid = document.getElementById('timers-grid');
    
    // Group the data by Region
    const regions = [...new Set(data.map(row => row.Region))];

    regions.forEach(region => {
        // Create the Column wrapper
        const col = document.createElement('div');
        col.className = 'region-column';
        col.innerHTML = `<h3>${region}</h3>`;

        // Filter bosses for this specific region
        const regionBosses = data.filter(row => row.Region === region);
        
        // Build a card for each boss
        regionBosses.forEach(boss => {
            const card = document.createElement('div');
            card.className = 'boss-card';
            
            // This injects the HTML structure for the card
            card.innerHTML = `
                <p class="boss-name">${boss.BossName}</p>
                <p class="boss-time">Time: ${boss.TargetTime}</p>
                <div class="countdown">--h --m --s</div>
            `;
            col.appendChild(card);
        });

        grid.appendChild(col);
    });
}
