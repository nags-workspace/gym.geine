import { loadData as loadCloudData, saveData as saveCloudData } from './cloud.js';

document.addEventListener("DOMContentLoaded", () => {
    // --- STATE MANAGEMENT ---
    let workoutHistory = [];
    let customWorkouts = [];
    let myChart;
    // Editing is disabled for the spreadsheet version for simplicity
    // let currentLogTimestampToEdit = null; 

    const defaultWorkouts = ["Legs", "Shoulders", "Chest", "Triceps", "Back", "Biceps", "Abs", "Rest Day"];

    // --- DOM ELEMENT SELECTORS ---
    const themeToggle = document.getElementById("theme-toggle");
    const dashboardView = document.getElementById("dashboard-view");
    const logView = document.getElementById("log-view");
    const viewLogBtn = document.getElementById("view-log-btn-header");
    const backToDashboardBtn = document.getElementById("back-to-dashboard-btn");
    const workoutChoicesContainer = document.getElementById("workout-choices");
    const calendarGrid = document.getElementById("calendar-grid");
    const currentMonthEl = document.getElementById("current-month");
    const prevMonthBtn = document.getElementById("prev-month-btn");
    const nextMonthBtn = document.getElementById("next-month-btn");
    const chartCanvas = document.getElementById('workout-chart').getContext('2d');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history');

    // Modals
    const modalContainer = document.getElementById('modal-container');
    const editWorkoutsModal = document.getElementById('edit-workouts-modal-container');
    const editLogModal = document.getElementById('edit-log-modal-container');
    
    // Sync Elements
    const syncBtn = document.getElementById('sync-btn');
    const syncStatus = document.getElementById('sync-status');


    // --- DATE & TIME HELPERS ---
    let currentDate = new Date();

    const getFormattedDate = (date) => {
        return date.toISOString().split('T')[0];
    };
    
    const isSameDay = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    // --- DATA PERSISTENCE (CUSTOM WORKOUTS ONLY) ---
    const saveCustomWorkouts = () => {
        localStorage.setItem("customWorkouts", JSON.stringify(customWorkouts));
    };

    const loadCustomWorkouts = () => {
        const workouts = localStorage.getItem("customWorkouts");
        customWorkouts = workouts ? JSON.parse(workouts) : [...defaultWorkouts];
        if (customWorkouts.length === 0) {
            customWorkouts = [...defaultWorkouts];
        }
    };

    // --- THEME MANAGEMENT ---
    const applyTheme = (theme) => {
        if (theme === 'light') {
            document.body.classList.add("light-mode");
            themeToggle.checked = true;
        } else {
            document.body.classList.remove("light-mode");
            themeToggle.checked = false;
        }
    };

    const toggleTheme = () => {
        const isLightMode = document.body.classList.toggle("light-mode");
        localStorage.setItem("theme", isLightMode ? 'light' : 'dark');
    };

    // --- VIEW SWITCHING ---
    const showDashboard = () => {
        dashboardView.classList.remove("hidden");
        logView.classList.add("hidden");
    };

    const showLogView = () => {
        dashboardView.classList.add("hidden");
        logView.classList.remove("hidden");
        renderHistoryList();
    };
    
    // --- LOGGING WORKOUTS ---
    const logWorkout = async (workoutName) => {
        const logEntry = { timestamp: Date.now(), workout: workoutName };
        
        // Optimistic UI Update
        workoutHistory.push(logEntry);
        updateDashboard();
        
        // Save to the cloud
        await saveCloudData(logEntry);
    };

    // --- RENDERING FUNCTIONS ---
    const renderWorkoutChoices = () => {
        workoutChoicesContainer.innerHTML = "";
        const today = new Date();
        const workoutsLoggedToday = workoutHistory
            .filter(entry => isSameDay(new Date(entry.timestamp), today))
            .map(entry => entry.workout);

        const isRestDayLogged = workoutsLoggedToday.some(w => w.toLowerCase() === 'rest day');

        customWorkouts.forEach(workout => {
            const button = document.createElement("button");
            button.className = "workout-choice";
            button.textContent = workout;
            
            let isDisabled = false;

            if (isRestDayLogged) {
                isDisabled = true;
            } else {
                if (workout.toLowerCase() === 'rest day') {
                    button.classList.add("rest-day");
                    if (workoutsLoggedToday.length > 0) {
                        isDisabled = true;
                    }
                } else {
                    if (workoutsLoggedToday.includes(workout)) {
                        isDisabled = true;
                    }
                }
            }

            if (isDisabled) {
                button.disabled = true;
                button.classList.add('disabled');
            } else {
                button.addEventListener("click", () => logWorkout(workout));
            }
            
            workoutChoicesContainer.appendChild(button);
        });
    };
    
    const renderStats = () => {
        // Streak
        let streak = 0;
        if (workoutHistory.length > 0) {
            const uniqueDays = [...new Set(workoutHistory
                .filter(e => e && e.workout && e.workout.toLowerCase() !== 'rest day') 
                .map(e => getFormattedDate(new Date(e.timestamp))))]
                .sort((a,b) => new Date(b) - new Date(a));
            
            if (uniqueDays.length > 0) {
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                if (isSameDay(new Date(uniqueDays[0]), today) || isSameDay(new Date(uniqueDays[0]), yesterday)) {
                    streak = 1;
                    for (let i = 0; i < uniqueDays.length - 1; i++) {
                        const currentDay = new Date(uniqueDays[i]);
                        const prevDay = new Date(uniqueDays[i+1]);
                        const diff = (currentDay - prevDay) / (1000 * 60 * 60 * 24);
                        if (diff === 1) {
                            streak++;
                        } else {
                            break;
                        }
                    }
                }
            }
        }
        document.getElementById('streak-stat').textContent = streak;

        // This Month
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const monthCount = workoutHistory.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate.getMonth() === thisMonth && entryDate.getFullYear() === thisYear;
        }).length;
        document.getElementById('month-stat').textContent = monthCount;

        // Favorite
        if (workoutHistory.length > 0) {
            const counts = workoutHistory.reduce((acc, entry) => {
                if(entry && entry.workout && entry.workout.toLowerCase() !== 'rest day'){
                    acc[entry.workout] = (acc[entry.workout] || 0) + 1;
                }
                return acc;
            }, {});
            const favorite = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, null);
            document.getElementById('favorite-stat').textContent = favorite || '-';
        } else {
            document.getElementById('favorite-stat').textContent = '-';
        }
    };
    
    const renderRecentActivity = () => {
        const yesterdayEl = document.getElementById('yesterday-activity');
        const dayBeforeEl = document.getElementById('day-before-yesterday-activity');
        
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const dayBefore = new Date();
        dayBefore.setDate(today.getDate() - 2);

        const yesterdayWorkouts = workoutHistory.filter(e => isSameDay(new Date(e.timestamp), yesterday));
        const dayBeforeWorkouts = workoutHistory.filter(e => isSameDay(new Date(e.timestamp), dayBefore));

        yesterdayEl.innerHTML = yesterdayWorkouts.length > 0
            ? yesterdayWorkouts.map(e => `<div class="activity-log-item">${e.workout}</div>`).join('')
            : '<div class="placeholder">No activity</div>';
            
        dayBeforeEl.innerHTML = dayBeforeWorkouts.length > 0
            ? dayBeforeWorkouts.map(e => `<div class="activity-log-item">${e.workout}</div>`).join('')
            : '<div class="placeholder">No activity</div>';
    };

    const renderCalendar = () => {
        calendarGrid.innerHTML = "";
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();

        currentMonthEl.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarGrid.innerHTML += `<div class="calendar-day other-month"></div>`;
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const day = new Date(year, month, i);
            const dayEl = document.createElement("div");
            dayEl.className = "calendar-day";
            dayEl.textContent = i;
            
            const workoutsOnDay = workoutHistory.filter(e => isSameDay(new Date(e.timestamp), day));

            if (workoutsOnDay.length > 0) {
                dayEl.classList.add("has-workout");
                dayEl.addEventListener('click', () => showDayDetailsModal(day));
            }

            if (isSameDay(day, new Date())) {
                dayEl.classList.add("today");
            }

            calendarGrid.appendChild(dayEl);
        }
    };

    const renderChart = () => {
        if (myChart) {
            myChart.destroy();
        }
        
        const workoutCounts = customWorkouts.reduce((acc, workout) => {
            if(workout.toLowerCase() !== 'rest day'){
               acc[workout] = 0;
            }
            return acc;
        }, {});
        
        workoutHistory.forEach(entry => {
             if (entry && entry.workout && entry.workout.toLowerCase() !== 'rest day' && workoutCounts.hasOwnProperty(entry.workout)) {
                workoutCounts[entry.workout]++;
            }
        });

        const labels = Object.keys(workoutCounts);
        const data = Object.values(workoutCounts);
        
        const isLightMode = document.body.classList.contains('light-mode');
        const textColor = isLightMode ? '#212529' : '#e0e0e0';

        myChart = new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Workout Frequency',
                    data: data,
                    backgroundColor: [
                        '#00bfff', '#2ecc71', '#e74c3c', '#9b59b6', '#f1c40f',
                        '#3498db', '#1abc9c', '#e67e22', '#34495e', '#7f8c8d'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColor
                        }
                    }
                }
            }
        });
    };

    const renderHistoryList = () => {
        historyList.innerHTML = '';
        if (workoutHistory.length === 0) {
            historyList.innerHTML = '<p>No history yet. Go work out!</p>';
            return;
        }

        const groupedByDate = workoutHistory.reduce((acc, entry) => {
            const date = getFormattedDate(new Date(entry.timestamp));
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(entry);
            return acc;
        }, {});

        const sortedDates = Object.keys(groupedByDate).sort((a,b) => new Date(b) - new Date(a));

        sortedDates.forEach(dateStr => {
            const entries = groupedByDate[dateStr];
            const date = new Date(dateStr);
            const formattedDate = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            
            const card = document.createElement('li');
            card.className = 'date-group-card';
            
            let entriesHTML = entries.sort((a,b) => b.timestamp - a.timestamp).map(entry => {
                const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `
                    <div class="workout-entry" data-timestamp="${entry.timestamp}">
                        <div class="workout-entry-details">
                            <div class="name">${entry.workout}</div>
                            <div class="time">${time}</div>
                        </div>
                        <!-- Actions are removed for spreadsheet version -->
                    </div>
                `;
            }).join('');

            card.innerHTML = `<h3 class="date-header">${formattedDate}</h3>${entriesHTML}`;
            historyList.appendChild(card);
        });
    };

    // --- MODAL HANDLING ---
    const showModal = (modalEl) => modalEl.classList.add('show');
    const hideModal = (modalEl) => modalEl.classList.remove('show');

    const showDayDetailsModal = (date) => {
        const workoutsOnDay = workoutHistory.filter(e => isSameDay(new Date(e.timestamp), date));
        document.getElementById('modal-date').textContent = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
        const list = document.getElementById('modal-list');
        list.innerHTML = workoutsOnDay.map(e => `<li>${e.workout}</li>`).join('');
        showModal(modalContainer);
    };

    const renderCustomWorkoutsList = () => {
        const list = document.getElementById('custom-workouts-list');
        list.innerHTML = '';
        customWorkouts.forEach(workout => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${workout}</span>
                <button class="delete-workout-btn" data-workout="${workout}">&times;</button>
            `;
            list.appendChild(li);
        });
    };
    
    // --- MASTER UPDATE FUNCTION ---
    const updateDashboard = () => {
        renderWorkoutChoices();
        renderStats();
        renderRecentActivity();
        renderCalendar();
        renderChart();
    };

    // --- INITIALIZATION & EVENT LISTENERS ---
    const init = async () => {
        // Load custom workouts from localStorage
        loadCustomWorkouts();

        // Load theme from localStorage
        const savedTheme = localStorage.getItem("theme") || 'dark';
        applyTheme(savedTheme);

        // Load main workout history from the cloud
        syncBtn.classList.add('syncing');
        syncStatus.textContent = 'Loading data...';
        workoutHistory = await loadCloudData();
        syncBtn.classList.remove('syncing');
        syncStatus.textContent = '';
        
        // Initial render
        updateDashboard();

        // Setup theme toggling
        themeToggle.addEventListener("change", toggleTheme);

        // Setup view switching
        viewLogBtn.addEventListener("click", showLogView);
        backToDashboardBtn.addEventListener("click", showDashboard);
        
        // Calendar navigation
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
        
        // History clearing - modified for spreadsheet
        clearHistoryBtn.addEventListener('click', () => {
            alert("To clear history, please clear the rows in your Google Sheet manually and then click the sync button or refresh the page.");
        });

        // Modal close buttons
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                hideModal(btn.closest('.modal-container'));
            });
        });
        document.querySelectorAll('.modal-container').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    hideModal(modal);
                }
            });
        });

        // Edit Workouts Modal Logic (uses localStorage)
        document.getElementById('edit-workouts-btn').addEventListener('click', () => {
            renderCustomWorkoutsList();
            showModal(editWorkoutsModal);
        });

        document.getElementById('add-workout-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('new-workout-name');
            const newWorkout = input.value.trim();
            if (newWorkout && !customWorkouts.find(w => w.toLowerCase() === newWorkout.toLowerCase())) {
                customWorkouts.push(newWorkout);
                saveCustomWorkouts();
                renderCustomWorkoutsList();
                renderWorkoutChoices();
                input.value = '';
            }
        });

        document.getElementById('custom-workouts-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-workout-btn')) {
                const workoutToDelete = e.target.dataset.workout;
                customWorkouts = customWorkouts.filter(w => w !== workoutToDelete);
                saveCustomWorkouts();
                renderCustomWorkoutsList();
                renderWorkoutChoices();
            }
        });

        // Sync button now re-fetches from cloud
        syncBtn.addEventListener('click', async () => {
            syncBtn.classList.add('syncing');
            syncStatus.textContent = 'Syncing...';
            
            workoutHistory = await loadCloudData();
            updateDashboard();

            syncBtn.classList.remove('syncing');
            syncStatus.textContent = 'Synced!';
            setTimeout(() => { syncStatus.textContent = ''; }, 2000);
        });
    };

    init();
});