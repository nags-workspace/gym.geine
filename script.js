document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION & ELEMENTS ---
    const WORKOUTS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps'];
    const choicesContainer = document.getElementById('workout-choices');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Stats Elements
    const streakStat = document.getElementById('streak-stat');
    const monthStat = document.getElementById('month-stat');
    const favoriteStat = document.getElementById('favorite-stat');

    // Calendar Elements
    const currentMonthEl = document.getElementById('current-month');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');

    // Chart Element
    const chartCanvas = document.getElementById('workout-chart').getContext('2d');
    let workoutChart;
    let calendarDate = new Date();

    // --- DATA HANDLING ---
    const loadHistory = () => JSON.parse(localStorage.getItem('workoutHistoryV2')) || [];
    const saveHistory = (history) => localStorage.setItem('workoutHistoryV2', JSON.stringify(history));

    // --- THEME HANDLING ---
    const applyTheme = (theme) => {
        document.body.classList.toggle('light-mode', theme === 'light');
        themeToggle.checked = theme === 'light';
        localStorage.setItem('theme', theme);
        // Re-render chart with correct colors
        if (workoutChart) renderChart();
    };
    
    // --- STATISTICS CALCULATION ---
    const calculateStats = () => {
        const history = loadHistory();
        
        // 1. Workouts This Month
        const now = new Date();
        const workoutsThisMonth = history.filter(item => {
            const itemDate = new Date(item.timestamp);
            return itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth();
        }).length;
        monthStat.textContent = workoutsThisMonth;

        // 2. Favorite Workout
        const workoutCounts = history.reduce((acc, item) => {
            if (item.workoutName !== 'Rest Day') {
                acc[item.workoutName] = (acc[item.workoutName] || 0) + 1;
            }
            return acc;
        }, {});
        const favorite = Object.keys(workoutCounts).reduce((a, b) => workoutCounts[a] > workoutCounts[b] ? a : b, '-');
        favoriteStat.textContent = favorite;
        
        // 3. Streak
        let streak = 0;
        if (history.length > 0) {
            const uniqueDays = [...new Set(history.map(item => new Date(item.timestamp).toDateString()))];
            let today = new Date();
            if (uniqueDays.includes(today.toDateString())) {
                streak = 1;
                let yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                while (uniqueDays.includes(yesterday.toDateString())) {
                    streak++;
                    yesterday.setDate(yesterday.getDate() - 1);
                }
            }
        }
        streakStat.textContent = streak;
    };

    // --- CALENDAR RENDERING ---
    const renderCalendar = () => {
        const history = loadHistory();
        const workoutDays = new Set(history.map(item => new Date(item.timestamp).toDateString()));
        
        calendarGrid.innerHTML = '';
        const month = calendarDate.getMonth();
        const year = calendarDate.getFullYear();
        
        currentMonthEl.textContent = `${calendarDate.toLocaleString('default', { month: 'long' })} ${year}`;
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Create days
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarGrid.appendChild(document.createElement('div'));
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = i;
            
            const thisDate = new Date(year, month, i);
            if (thisDate.toDateString() === new Date().toDateString()) {
                dayEl.classList.add('today');
            }
            if (workoutDays.has(thisDate.toDateString())) {
                dayEl.classList.add('has-workout');
            }
            
            calendarGrid.appendChild(dayEl);
        }
    };
    
    // --- CHART RENDERING ---
    const renderChart = () => {
        const history = loadHistory();
        const theme = localStorage.getItem('theme') || 'dark';
        const textColor = theme === 'light' ? '#333' : '#e0e0e0';

        const data = WORKOUTS.map(workout => {
            return history.filter(item => item.workoutName === workout).length;
        });

        if (workoutChart) {
            workoutChart.destroy();
        }

        workoutChart = new Chart(chartCanvas, {
            type: 'bar',
            data: {
                labels: WORKOUTS,
                datasets: [{
                    label: '# of Workouts',
                    data: data,
                    backgroundColor: 'rgba(0, 191, 255, 0.5)',
                    borderColor: 'rgba(0, 191, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: textColor, stepSize: 1 }
                    },
                    x: {
                        ticks: { color: textColor }
                    }
                }
            }
        });
    };
    
    // --- MAIN RENDER FUNCTIONS ---
    const renderHistory = () => {
        const history = loadHistory();
        historyList.innerHTML = '';
        history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        history.forEach(item => {
            const li = document.createElement('li');
            li.className = `history-item ${item.workoutName.replace(' ', '-').toLowerCase()}`;
            li.innerHTML = `
                <span class="history-item-name">${item.workoutName}</span>
                <span class="history-item-time">${new Date(item.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
            `;
            historyList.appendChild(li);
        });
    };

    const renderChoices = () => {
        choicesContainer.innerHTML = '';
        const allChoices = [...WORKOUTS, 'Rest Day'];
        allChoices.forEach(workout => {
            const button = document.createElement('button');
            button.className = `workout-choice ${workout === 'Rest Day' ? 'rest-day' : ''}`;
            button.textContent = workout;
            button.dataset.workout = workout;
            choicesContainer.appendChild(button);
        });
    };
    
    // --- MASTER UPDATE FUNCTION ---
    const updateUI = () => {
        renderHistory();
        calculateStats();
        renderCalendar();
        renderChart();
    };
    
    // --- EVENT LISTENERS ---
    choicesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('workout-choice')) {
            const workoutName = e.target.dataset.workout;
            const history = loadHistory();
            history.push({ workoutName, timestamp: new Date().toISOString() });
            saveHistory(history);
            updateUI();
        }
    });

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all workout history?')) {
            saveHistory([]);
            updateUI();
        }
    });

    themeToggle.addEventListener('change', () => {
        applyTheme(themeToggle.checked ? 'light' : 'dark');
    });
    
    prevMonthBtn.addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
    });

    // --- INITIALIZATION ---
    renderChoices();
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    updateUI();
});