import { loadData as loadCloudData, createWorkoutLog, updateWorkoutLog, deleteWorkoutLog } from './cloud.js';

document.addEventListener("DOMContentLoaded", () => {
    // --- STATE MANAGEMENT ---
    let workoutHistory = []; // Each entry will now have a unique 'id' from the database
    let customWorkouts = [];
    let myChart;
    let currentLogIdToEdit = null; // We use the database ID to track which entry to edit/delete

    const defaultWorkouts = ["Legs", "Shoulders", "Chest", "Triceps", "Back", "Biceps", "Abs", "Rest Day"];

    // --- DOM ELEMENT SELECTORS ---
    const dom = {
        themeToggle: document.getElementById("theme-toggle"),
        dashboardView: document.getElementById("dashboard-view"),
        logView: document.getElementById("log-view"),
        viewLogBtn: document.getElementById("view-log-btn-header"),
        backToDashboardBtn: document.getElementById("back-to-dashboard-btn"),
        workoutChoicesContainer: document.getElementById("workout-choices"),
        calendarGrid: document.getElementById("calendar-grid"),
        currentMonthEl: document.getElementById("current-month"),
        prevMonthBtn: document.getElementById("prev-month-btn"),
        nextMonthBtn: document.getElementById("next-month-btn"),
        chartCanvas: document.getElementById('workout-chart').getContext('2d'),
        historyList: document.getElementById('history-list'),
        clearHistoryBtn: document.getElementById('clear-history'),
        modalContainer: document.getElementById('modal-container'),
        editWorkoutsModal: document.getElementById('edit-workouts-modal-container'),
        editLogModal: document.getElementById('edit-log-modal-container'),
        syncBtn: document.getElementById('sync-btn'),
        syncStatus: document.getElementById('sync-status'),
    };

    // --- DATE & TIME HELPERS ---
    let currentDate = new Date();
    const getFormattedDate = (date) => date.toISOString().split('T')[0];
    const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

    // --- DATA PERSISTENCE (CUSTOM WORKOUTS ONLY) ---
    const saveCustomWorkouts = () => localStorage.setItem("customWorkouts", JSON.stringify(customWorkouts));
    const loadCustomWorkouts = () => {
        customWorkouts = JSON.parse(localStorage.getItem("customWorkouts")) || [...defaultWorkouts];
    };

    // --- THEME MANAGEMENT ---
    const applyTheme = (theme) => {
        document.body.classList.toggle("light-mode", theme === 'light');
        dom.themeToggle.checked = theme === 'light';
    };
    const toggleTheme = () => {
        const isLightMode = document.body.classList.toggle("light-mode");
        localStorage.setItem("theme", isLightMode ? 'light' : 'dark');
    };

    // --- VIEW SWITCHING ---
    const showDashboard = () => { dom.dashboardView.classList.remove("hidden"); dom.logView.classList.add("hidden"); };
    const showLogView = () => { dom.dashboardView.classList.add("hidden"); dom.logView.classList.remove("hidden"); renderHistoryList(); };
    
    // --- LOGGING WORKOUTS ---
    const logWorkout = async (workoutName) => {
        const logEntry = { timestamp: Date.now(), workout: workoutName };
        dom.syncStatus.textContent = 'Saving...';
        await createWorkoutLog(logEntry);
        // Reload all data to get the new entry with its server-generated ID
        workoutHistory = await loadCloudData();
        dom.syncStatus.textContent = '';
        updateDashboard();
    };

    // --- RENDERING FUNCTIONS ---
    const renderWorkoutChoices = () => {
        dom.workoutChoicesContainer.innerHTML = "";
        const today = new Date();
        const workoutsLoggedToday = workoutHistory.filter(e => isSameDay(new Date(e.timestamp), today)).map(e => e.workout);
        const isRestDayLogged = workoutsLoggedToday.includes('Rest Day');
        customWorkouts.forEach(workout => {
            const btn = document.createElement("button");
            btn.className = "workout-choice";
            btn.textContent = workout;
            let isDisabled = isRestDayLogged || workoutsLoggedToday.includes(workout) || (workout === 'Rest Day' && workoutsLoggedToday.length > 0);
            if (workout === 'Rest Day') btn.classList.add("rest-day");
            btn.disabled = isDisabled;
            if (isDisabled) btn.classList.add('disabled');
            btn.addEventListener("click", () => logWorkout(workout));
            dom.workoutChoicesContainer.appendChild(btn);
        });
    };
    
    const renderStats = () => {
        const uniqueWorkoutDays = [...new Set(workoutHistory.filter(e => e.workout !== 'Rest Day').map(e => getFormattedDate(new Date(e.timestamp))))].sort((a, b) => new Date(b) - new Date(a));
        let streak = 0;
        if (uniqueWorkoutDays.length > 0) {
            const today = new Date(); const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            if (isSameDay(new Date(uniqueWorkoutDays[0]), today) || isSameDay(new Date(uniqueWorkoutDays[0]), yesterday)) {
                streak = 1;
                for (let i = 0; i < uniqueWorkoutDays.length - 1; i++) {
                    if ((new Date(uniqueWorkoutDays[i]) - new Date(uniqueWorkoutDays[i+1])) / 86400000 === 1) streak++; else break;
                }
            }
        }
        document.getElementById('streak-stat').textContent = streak;

        const thisMonth = new Date().getMonth(); const thisYear = new Date().getFullYear();
        const monthCount = workoutHistory.filter(e => { const d = new Date(e.timestamp); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; }).length;
        document.getElementById('month-stat').textContent = monthCount;

        const counts = workoutHistory.filter(e => e.workout !== 'Rest Day').reduce((acc, e) => { acc[e.workout] = (acc[e.workout] || 0) + 1; return acc; }, {});
        const favorite = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, '-');
        document.getElementById('favorite-stat').textContent = favorite;
    };
    
    const renderRecentActivity = () => {
        const yesterday = new Date(); yesterday.setDate(new Date().getDate() - 1);
        const dayBefore = new Date(); dayBefore.setDate(new Date().getDate() - 2);
        const createHTML = (date) => {
            const workouts = workoutHistory.filter(e => isSameDay(new Date(e.timestamp), date));
            return workouts.length > 0 ? workouts.map(e => `<div class="activity-log-item">${e.workout}</div>`).join('') : '<div class="placeholder">No activity</div>';
        };
        document.getElementById('yesterday-activity').innerHTML = createHTML(yesterday);
        document.getElementById('day-before-yesterday-activity').innerHTML = createHTML(dayBefore);
    };

    const renderCalendar = () => {
        dom.calendarGrid.innerHTML = "";
        const month = currentDate.getMonth(); const year = currentDate.getFullYear();
        dom.currentMonthEl.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
        const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDay; i++) dom.calendarGrid.innerHTML += `<div class="calendar-day other-month"></div>`;
        for (let i = 1; i <= daysInMonth; i++) {
            const day = new Date(year, month, i);
            const dayEl = document.createElement("div"); dayEl.className = "calendar-day"; dayEl.textContent = i;
            if (workoutHistory.some(e => isSameDay(new Date(e.timestamp), day))) {
                dayEl.classList.add("has-workout");
                dayEl.addEventListener('click', () => showDayDetailsModal(day));
            }
            if (isSameDay(day, new Date())) dayEl.classList.add("today");
            dom.calendarGrid.appendChild(dayEl);
        }
    };

    const renderChart = () => {
        if (myChart) myChart.destroy();
        const counts = customWorkouts.filter(w => w !== 'Rest Day').reduce((acc, w) => ({ ...acc, [w]: 0 }), {});
        workoutHistory.forEach(e => { if (counts.hasOwnProperty(e.workout)) counts[e.workout]++; });
        myChart = new Chart(dom.chartCanvas, {
            type: 'doughnut', data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: ['#00bfff', '#2ecc71', '#e74c3c', '#9b59b6', '#f1c40f', '#3498db', '#1abc9c'], borderWidth: 0 }] },
            options: { responsive: true, plugins: { legend: { position: 'top', labels: { color: document.body.classList.contains('light-mode') ? '#212529' : '#e0e0e0' } } } }
        });
    };

    const renderHistoryList = () => {
        dom.historyList.innerHTML = workoutHistory.length ? '' : '<p>No history yet.</p>';
        if (!workoutHistory.length) return;
        const grouped = workoutHistory.reduce((acc, entry) => {
            const date = getFormattedDate(new Date(entry.timestamp));
            if (!acc[date]) acc[date] = []; acc[date].push(entry); return acc;
        }, {});
        Object.keys(grouped).sort((a,b) => new Date(b) - new Date(a)).forEach(dateStr => {
            const card = document.createElement('li'); card.className = 'date-group-card';
            const entriesHTML = grouped[dateStr].sort((a,b) => b.timestamp - a.timestamp).map(entry => `
                <div class="workout-entry" data-id="${entry.id}">
                    <div class="workout-entry-details"><div class="name">${entry.workout}</div><div class="time">${new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div>
                    <div class="history-item-actions"><button class="icon-btn edit-log-btn"><i class="fas fa-pencil-alt"></i></button></div>
                </div>`).join('');
            card.innerHTML = `<h3 class="date-header">${new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>${entriesHTML}`;
            dom.historyList.appendChild(card);
        });
        document.querySelectorAll('.edit-log-btn').forEach(btn => btn.addEventListener('click', e => showEditLogModal(e.currentTarget.closest('.workout-entry').dataset.id)));
    };

    const showModal = (modalEl) => modalEl.classList.add('show');
    const hideModal = (modalEl) => modalEl.classList.remove('show');

    const showDayDetailsModal = (date) => {
        document.getElementById('modal-date').textContent = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
        document.getElementById('modal-list').innerHTML = workoutHistory.filter(e => isSameDay(new Date(e.timestamp), date)).map(e => `<li>${e.workout}</li>`).join('');
        showModal(dom.modalContainer);
    };

    const renderCustomWorkoutsList = () => {
        document.getElementById('custom-workouts-list').innerHTML = customWorkouts.map(w => `<li><span>${w}</span><button class="delete-workout-btn" data-workout="${w}">&times;</button></li>`).join('');
    };

    const showEditLogModal = (id) => {
        currentLogIdToEdit = id;
        const logEntry = workoutHistory.find(e => e.id === id);
        if (!logEntry) return;
        document.getElementById('edit-log-time').textContent = `Logged at ${new Date(logEntry.timestamp).toLocaleString()}`;
        document.getElementById('edit-workout-select').innerHTML = customWorkouts.map(w => `<option value="${w}" ${w === logEntry.workout ? 'selected' : ''}>${w}</option>`).join('');
        showModal(dom.editLogModal);
    };

    const updateDashboard = () => { renderWorkoutChoices(); renderStats(); renderRecentActivity(); renderCalendar(); renderChart(); };

    const init = async () => {
        loadCustomWorkouts();
        applyTheme(localStorage.getItem("theme") || 'dark');
        
        dom.syncStatus.textContent = 'Loading data...'; dom.syncBtn.classList.add('syncing');
        workoutHistory = await loadCloudData();
        dom.syncStatus.textContent = ''; dom.syncBtn.classList.remove('syncing');
        
        updateDashboard();

        dom.themeToggle.addEventListener("change", toggleTheme);
        dom.viewLogBtn.addEventListener("click", showLogView);
        dom.backToDashboardBtn.addEventListener("click", showDashboard);
        dom.prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
        dom.nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
        dom.clearHistoryBtn.addEventListener('click', () => alert("To clear history, please use the 'Database' explorer in your Nhost dashboard."));
        
        document.querySelectorAll('.modal-container').forEach(m => m.addEventListener('click', e => { if (e.target === m || e.target.closest('.close-modal-btn')) hideModal(m); }));

        document.getElementById('edit-workouts-btn').addEventListener('click', () => { renderCustomWorkoutsList(); showModal(dom.editWorkoutsModal); });
        document.getElementById('add-workout-form').addEventListener('submit', e => {
            e.preventDefault(); const input = document.getElementById('new-workout-name');
            const newWorkout = input.value.trim();
            if (newWorkout && !customWorkouts.find(w => w.toLowerCase() === newWorkout.toLowerCase())) {
                customWorkouts.push(newWorkout); saveCustomWorkouts();
                renderCustomWorkoutsList(); renderWorkoutChoices(); input.value = '';
            }
        });
        document.getElementById('custom-workouts-list').addEventListener('click', e => {
            if (e.target.classList.contains('delete-workout-btn')) {
                customWorkouts = customWorkouts.filter(w => w !== e.target.dataset.workout);
                saveCustomWorkouts(); renderCustomWorkoutsList(); renderWorkoutChoices();
            }
        });

        document.getElementById('save-log-change-btn').addEventListener('click', async () => {
            const newWorkout = document.getElementById('edit-workout-select').value;
            const entryIndex = workoutHistory.findIndex(e => e.id === currentLogIdToEdit);
            if (entryIndex > -1) workoutHistory[entryIndex].workout = newWorkout;
            renderHistoryList(); updateDashboard();
            hideModal(dom.editLogModal);
            await updateWorkoutLog(currentLogIdToEdit, newWorkout);
        });
        
        document.getElementById('delete-log-entry-btn').addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this log entry?')) {
                const id = currentLogIdToEdit;
                workoutHistory = workoutHistory.filter(e => e.id !== id);
                renderHistoryList(); updateDashboard();
                hideModal(dom.editLogModal);
                await deleteWorkoutLog(id);
            }
        });

        dom.syncBtn.addEventListener('click', async () => {
            dom.syncStatus.textContent = 'Syncing...'; dom.syncBtn.classList.add('syncing');
            workoutHistory = await loadCloudData();
            updateDashboard();
            dom.syncStatus.textContent = 'Synced!'; dom.syncBtn.classList.remove('syncing');
            setTimeout(() => { dom.syncStatus.textContent = ''; }, 2000);
        });
    };

    init();
});