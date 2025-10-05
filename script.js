// FULL FINAL SCRIPT.JS

import { loadData as loadCloudData, createWorkoutLog, updateWorkoutLog, deleteWorkoutLog } from './cloud.js';

document.addEventListener("DOMContentLoaded", () => {
    // --- STATE MANAGEMENT ---
    let workoutHistory = [];
    let customWorkouts = [];
    let myChart;
    let currentLogTimestampToEdit = null;

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
    const modalContainer = document.getElementById('modal-container');
    const editWorkoutsModal = document.getElementById('edit-workouts-modal-container');
    const editLogModal = document.getElementById('edit-log-modal-container');
    const syncBtn = document.getElementById('sync-btn');
    const syncStatus = document.getElementById('sync-status');

    // --- DATE & TIME HELPERS ---
    let currentDate = new Date();
    const getFormattedDate = (date) => date.toISOString().split('T')[0];
    const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

    // --- DATA PERSISTENCE (CUSTOM WORKOUTS ONLY) ---
    const saveCustomWorkouts = () => localStorage.setItem("customWorkouts", JSON.stringify(customWorkouts));
    const loadCustomWorkouts = () => {
        const workouts = localStorage.getItem("customWorkouts");
        customWorkouts = workouts ? JSON.parse(workouts) : [...defaultWorkouts];
    };

    // --- THEME MANAGEMENT ---
    const applyTheme = (theme) => {
        document.body.classList.toggle("light-mode", theme === 'light');
        themeToggle.checked = theme === 'light';
    };
    const toggleTheme = () => {
        const isLightMode = document.body.classList.toggle("light-mode");
        localStorage.setItem("theme", isLightMode ? 'light' : 'dark');
    };

    // --- VIEW SWITCHING ---
    const showDashboard = () => { dashboardView.classList.remove("hidden"); logView.classList.add("hidden"); };
    const showLogView = () => { dashboardView.classList.add("hidden"); logView.classList.remove("hidden"); renderHistoryList(); };
    
    // --- LOGGING WORKOUTS ---
    const logWorkout = async (workoutName) => {
        const logEntry = { timestamp: Date.now(), workout: workoutName };
        workoutHistory.push(logEntry);
        updateDashboard();
        await createWorkoutLog(logEntry);
    };

    // --- RENDERING FUNCTIONS ---
    const renderWorkoutChoices = () => {
        workoutChoicesContainer.innerHTML = "";
        const today = new Date();
        const workoutsLoggedToday = workoutHistory.filter(entry => isSameDay(new Date(entry.timestamp), today)).map(entry => entry.workout);
        const isRestDayLogged = workoutsLoggedToday.some(w => w.toLowerCase() === 'rest day');

        customWorkouts.forEach(workout => {
            const button = document.createElement("button");
            button.className = "workout-choice";
            button.textContent = workout;
            let isDisabled = false;
            if (isRestDayLogged || workoutsLoggedToday.includes(workout) || (workout.toLowerCase() === 'rest day' && workoutsLoggedToday.length > 0)) {
                isDisabled = true;
            }
            if (workout.toLowerCase() === 'rest day') button.classList.add("rest-day");

            button.disabled = isDisabled;
            if(isDisabled) button.classList.add('disabled');
            button.addEventListener("click", () => logWorkout(workout));
            workoutChoicesContainer.appendChild(button);
        });
    };
    
    const renderStats = () => {
        const streak = (() => {
            if (workoutHistory.length === 0) return 0;
            const uniqueDays = [...new Set(workoutHistory.filter(e => e.workout.toLowerCase() !== 'rest day').map(e => getFormattedDate(new Date(e.timestamp))))].sort((a,b) => new Date(b) - new Date(a));
            if (uniqueDays.length === 0) return 0;
            let currentStreak = 0;
            const today = new Date(); const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            if (isSameDay(new Date(uniqueDays[0]), today) || isSameDay(new Date(uniqueDays[0]), yesterday)) {
                currentStreak = 1;
                for (let i = 0; i < uniqueDays.length - 1; i++) {
                    const diff = (new Date(uniqueDays[i]) - new Date(uniqueDays[i+1])) / (1000 * 60 * 60 * 24);
                    if (diff === 1) currentStreak++; else break;
                }
            }
            return currentStreak;
        })();
        document.getElementById('streak-stat').textContent = streak;

        const thisMonth = new Date().getMonth(); const thisYear = new Date().getFullYear();
        const monthCount = workoutHistory.filter(e => { const d = new Date(e.timestamp); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; }).length;
        document.getElementById('month-stat').textContent = monthCount;

        const favorite = (() => {
            if (workoutHistory.length === 0) return '-';
            const counts = workoutHistory.filter(e => e.workout.toLowerCase() !== 'rest day').reduce((acc, e) => { acc[e.workout] = (acc[e.workout] || 0) + 1; return acc; }, {});
            return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, null) || '-';
        })();
        document.getElementById('favorite-stat').textContent = favorite;
    };
    
    const renderRecentActivity = () => {
        const yesterdayEl = document.getElementById('yesterday-activity');
        const dayBeforeEl = document.getElementById('day-before-yesterday-activity');
        const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1); const dayBefore = new Date(); dayBefore.setDate(today.getDate() - 2);
        
        const createActivityHTML = (date) => {
            const workouts = workoutHistory.filter(e => isSameDay(new Date(e.timestamp), date));
            return workouts.length > 0 ? workouts.map(e => `<div class="activity-log-item">${e.workout}</div>`).join('') : '<div class="placeholder">No activity</div>';
        };
        yesterdayEl.innerHTML = createActivityHTML(yesterday);
        dayBeforeEl.innerHTML = createActivityHTML(dayBefore);
    };

    const renderCalendar = () => {
        calendarGrid.innerHTML = "";
        const month = currentDate.getMonth(); const year = currentDate.getFullYear();
        currentMonthEl.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
        const firstDayOfMonth = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDayOfMonth; i++) calendarGrid.innerHTML += `<div class="calendar-day other-month"></div>`;
        for (let i = 1; i <= daysInMonth; i++) {
            const day = new Date(year, month, i); const dayEl = document.createElement("div");
            dayEl.className = "calendar-day"; dayEl.textContent = i;
            if (workoutHistory.some(e => isSameDay(new Date(e.timestamp), day))) {
                dayEl.classList.add("has-workout");
                dayEl.addEventListener('click', () => showDayDetailsModal(day));
            }
            if (isSameDay(day, new Date())) dayEl.classList.add("today");
            calendarGrid.appendChild(dayEl);
        }
    };

    const renderChart = () => {
        if (myChart) myChart.destroy();
        const counts = customWorkouts.filter(w => w.toLowerCase() !== 'rest day').reduce((acc, w) => ({ ...acc, [w]: 0 }), {});
        workoutHistory.forEach(e => { if (counts.hasOwnProperty(e.workout)) counts[e.workout]++; });
        const isLightMode = document.body.classList.contains('light-mode');
        myChart = new Chart(chartCanvas, {
            type: 'doughnut', data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: ['#00bfff', '#2ecc71', '#e74c3c', '#9b59b6', '#f1c40f', '#3498db', '#1abc9c'], borderWidth: 0 }] },
            options: { responsive: true, plugins: { legend: { position: 'top', labels: { color: isLightMode ? '#212529' : '#e0e0e0' } } } }
        });
    };

    const renderHistoryList = () => {
        historyList.innerHTML = workoutHistory.length === 0 ? '<p>No history yet.</p>' : '';
        if (workoutHistory.length === 0) return;

        const grouped = workoutHistory.reduce((acc, entry) => {
            const date = getFormattedDate(new Date(entry.timestamp));
            if (!acc[date]) acc[date] = [];
            acc[date].push(entry); return acc;
        }, {});

        Object.keys(grouped).sort((a,b) => new Date(b) - new Date(a)).forEach(dateStr => {
            const card = document.createElement('li'); card.className = 'date-group-card';
            const entriesHTML = grouped[dateStr].sort((a,b) => b.timestamp - a.timestamp).map(entry => `
                <div class="workout-entry" data-timestamp="${entry.timestamp}">
                    <div class="workout-entry-details"><div class="name">${entry.workout}</div><div class="time">${new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div>
                    <div class="history-item-actions"><button class="icon-btn edit-log-btn" title="Edit Entry"><i class="fas fa-pencil-alt"></i></button></div>
                </div>`).join('');
            card.innerHTML = `<h3 class="date-header">${new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>${entriesHTML}`;
            historyList.appendChild(card);
        });

        document.querySelectorAll('.edit-log-btn').forEach(btn => btn.addEventListener('click', e => showEditLogModal(parseInt(e.currentTarget.closest('.workout-entry').dataset.timestamp))));
    };

    // --- MODAL HANDLING ---
    const showModal = (modalEl) => modalEl.classList.add('show');
    const hideModal = (modalEl) => modalEl.classList.remove('show');

    const showDayDetailsModal = (date) => {
        const workoutsOnDay = workoutHistory.filter(e => isSameDay(new Date(e.timestamp), date));
        document.getElementById('modal-date').textContent = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
        document.getElementById('modal-list').innerHTML = workoutsOnDay.map(e => `<li>${e.workout}</li>`).join('');
        showModal(modalContainer);
    };

    const renderCustomWorkoutsList = () => {
        const list = document.getElementById('custom-workouts-list');
        list.innerHTML = customWorkouts.map(w => `<li><span>${w}</span><button class="delete-workout-btn" data-workout="${w}">&times;</button></li>`).join('');
    };

    const showEditLogModal = (timestamp) => {
        currentLogTimestampToEdit = timestamp;
        const logEntry = workoutHistory.find(e => e.timestamp === timestamp);
        if (!logEntry) return;
        document.getElementById('edit-log-time').textContent = `Logged at ${new Date(timestamp).toLocaleString()}`;
        document.getElementById('edit-workout-select').innerHTML = customWorkouts.map(w => `<option value="${w}" ${w === logEntry.workout ? 'selected' : ''}>${w}</option>`).join('');
        showModal(editLogModal);
    };

    // --- MASTER UPDATE FUNCTION ---
    const updateDashboard = () => { renderWorkoutChoices(); renderStats(); renderRecentActivity(); renderCalendar(); renderChart(); };

    // --- INITIALIZATION & EVENT LISTENERS ---
    const init = async () => {
        loadCustomWorkouts();
        applyTheme(localStorage.getItem("theme") || 'dark');
        
        syncStatus.textContent = 'Loading data...'; syncBtn.classList.add('syncing');
        workoutHistory = await loadCloudData();
        syncStatus.textContent = ''; syncBtn.classList.remove('syncing');
        
        updateDashboard();

        themeToggle.addEventListener("change", toggleTheme);
        viewLogBtn.addEventListener("click", showLogView);
        backToDashboardBtn.addEventListener("click", showDashboard);
        prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
        nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
        clearHistoryBtn.addEventListener('click', () => alert("To clear history, clear rows in your Google Sheet and click Sync."));
        
        document.querySelectorAll('.modal-container').forEach(modal => {
            modal.addEventListener('click', e => { if (e.target === modal || e.target.classList.contains('close-modal-btn')) hideModal(modal); });
        });

        document.getElementById('edit-workouts-btn').addEventListener('click', () => { renderCustomWorkoutsList(); showModal(editWorkoutsModal); });
        document.getElementById('add-workout-form').addEventListener('submit', e => {
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
        document.getElementById('custom-workouts-list').addEventListener('click', e => {
            if (e.target.classList.contains('delete-workout-btn')) {
                customWorkouts = customWorkouts.filter(w => w !== e.target.dataset.workout);
                saveCustomWorkouts();
                renderCustomWorkoutsList();
                renderWorkoutChoices();
            }
        });

        document.getElementById('save-log-change-btn').addEventListener('click', async () => {
            const newWorkout = document.getElementById('edit-workout-select').value;
            const entryIndex = workoutHistory.findIndex(e => e.timestamp === currentLogTimestampToEdit);
            if (entryIndex > -1) workoutHistory[entryIndex].workout = newWorkout;
            renderHistoryList(); updateDashboard();
            hideModal(editLogModal);
            await updateWorkoutLog(currentLogTimestampToEdit, newWorkout);
        });
        
        document.getElementById('delete-log-entry-btn').addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this log entry?')) {
                const timestamp = currentLogTimestampToEdit;
                workoutHistory = workoutHistory.filter(e => e.timestamp !== timestamp);
                renderHistoryList(); updateDashboard();
                hideModal(editLogModal);
                await deleteWorkoutLog(timestamp);
            }
        });

        syncBtn.addEventListener('click', async () => {
            syncStatus.textContent = 'Syncing...'; syncBtn.classList.add('syncing');
            workoutHistory = await loadCloudData();
            updateDashboard();
            syncStatus.textContent = 'Synced!'; syncBtn.classList.remove('syncing');
            setTimeout(() => { syncStatus.textContent = ''; }, 2000);
        });
    };

    init();
});