document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION & ELEMENTS ---
    const WORKOUTS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Abs'];
    const choicesContainer = document.getElementById('workout-choices');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Stats Elements
    const streakStat = document.getElementById('streak-stat');
    const monthStat = document.getElementById('month-stat');
    const favoriteStat = document.getElementById('favorite-stat');

    // **UPDATED** Recent Activity Elements
    const yesterdayActivityEl = document.getElementById('yesterday-activity');
    const dayBeforeYesterdayActivityEl = document.getElementById('day-before-yesterday-activity');

    // Calendar Elements
    const currentMonthEl = document.getElementById('current-month');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');

    // Modal Elements
    const modalContainer = document.getElementById('modal-container');
    const modalDateEl = document.getElementById('modal-date');
    const modalListEl = document.getElementById('modal-list');
    const closeModalBtn = document.getElementById('close-modal-btn');

    // Chart Element
    const chartCanvas = document.getElementById('workout-chart').getContext('2d');
    let workoutChart;
    let calendarDate = new Date();

    // --- DATA HANDLING ---
    const loadHistory = () => JSON.parse(localStorage.getItem('workoutHistoryV3')) || [];
    const saveHistory = (history) => localStorage.setItem('workoutHistoryV3', JSON.stringify(history));

    // --- THEME HANDLING ---
    const applyTheme = (theme) => {
        document.body.classList.toggle('light-mode', theme === 'light');
        themeToggle.checked = theme === 'light';
        localStorage.setItem('theme', theme);
        if (workoutChart) renderChart();
    };
    
    // --- STATISTICS CALCULATION (No changes needed here) ---
    const calculateStats = () => {
        const history = loadHistory();
        
        // 1. Workouts This Month
        const now = new Date();
        const workoutsThisMonth = history.filter(item => {
            const itemDate = new Date(item.timestamp);
            return item.workoutName !== 'Rest Day' && itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth();
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

    // --- **UPDATED** RECENT ACTIVITY RENDERING ---
    const renderRecentActivity = () => {
        const history = loadHistory();
        // Calculate dates for yesterday and the day before
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const dayBeforeYesterday = new Date(Date.now() - 2 * 86400000).toDateString();
    
        const yesterdayWorkouts = history.filter(item => new Date(item.timestamp).toDateString() === yesterday);
        const dayBeforeYesterdayWorkouts = history.filter(item => new Date(item.timestamp).toDateString() === dayBeforeYesterday);
    
        const populateActivityLog = (element, workouts) => {
            element.innerHTML = '';
            if (workouts.length > 0) {
                workouts.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'activity-log-item';
                    div.textContent = item.workoutName;
                    element.appendChild(div);
                });
            } else {
                element.innerHTML = `<p class="placeholder">No workouts logged.</p>`;
            }
        };
    
        populateActivityLog(yesterdayActivityEl, yesterdayWorkouts);
        populateActivityLog(dayBeforeYesterdayActivityEl, dayBeforeYesterdayWorkouts);
    };

    // --- CALENDAR RENDERING (No changes needed here) ---
    const renderCalendar = () => {
        const history = loadHistory();
        const workoutDays = new Set(history.map(item => new Date(item.timestamp).toDateString()));
        
        calendarGrid.innerHTML = '';
        const month = calendarDate.getMonth();
        const year = calendarDate.getFullYear();
        
        currentMonthEl.textContent = `${calendarDate.toLocaleString('default', { month: 'long' })} ${year}`;
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarGrid.appendChild(document.createElement('div'));
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = i;
            
            const thisDate = new Date(year, month, i);
            dayEl.dataset.date = thisDate.toDateString(); 

            if (thisDate.toDateString() === new Date().toDateString()) {
                dayEl.classList.add('today');
            }
            if (workoutDays.has(thisDate.toDateString())) {
                dayEl.classList.add('has-workout');
            }
            
            calendarGrid.appendChild(dayEl);
        }
    };
    
    // --- CHART RENDERING (No changes needed here) ---
    const renderChart = () => {
        const history = loadHistory();
        const theme = localStorage.getItem('theme') || 'dark';
        const textColor = theme === 'light' ? '#333' : '#e0e0e0';

        const data = WORKOUTS.map(workout => {
            return history.filter(item => item.workoutName === workout).length;
        });

        if (workoutChart) workoutChart.destroy();

        workoutChart = new Chart(chartCanvas, {
            type: 'bar',
            data: {
                labels: WORKOUTS,
                datasets: [{
                    label: '# of Sessions',
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
                    y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 } },
                    x: { ticks: { color: textColor } }
                }
            }
        });
    };
    
    // --- HISTORY LIST RENDERING (No changes needed here) ---
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

    // --- WORKOUT CHOICES RENDERING (No changes needed here) ---
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
    
    // --- MODAL CONTROL (No changes needed here) ---
    const showModal = (date) => {
        const history = loadHistory();
        const workoutsOnDate = history.filter(item => new Date(item.timestamp).toDateString() === date.toDateString());
        
        modalDateEl.textContent = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        modalListEl.innerHTML = '';
    
        if (workoutsOnDate.length > 0) {
            workoutsOnDate.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item.workoutName;
                modalListEl.appendChild(li);
            });
        }
    
        modalContainer.classList.add('show');
    };
    
    const hideModal = () => {
        modalContainer.classList.remove('show');
    };

    // --- MASTER UPDATE FUNCTION (No changes needed here) ---
    const updateUI = () => {
        renderHistory();
        calculateStats();
        renderCalendar();
        renderChart();
        renderRecentActivity();
    };
    
    // --- EVENT LISTENERS (No changes needed here) ---
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
        if (confirm('Are you sure you want to delete all workout history? This cannot be undone.')) {
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

    calendarGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('has-workout')) {
            const dateString = e.target.dataset.date;
            showModal(new Date(dateString));
        }
    });

    closeModalBtn.addEventListener('click', hideModal);
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            hideModal();
        }
    });

    // --- INITIALIZATION ---
    renderChoices();
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    updateUI();
});