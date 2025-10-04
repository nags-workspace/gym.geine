// Replace your entire script.js with this final, complete version.

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTS ---
    // (All element references are the same as the previous version)

    // --- VIEW SWITCHING ---
    // (showDashboard and showLogView functions are the same)

    // --- CORE LOGIC & RENDER FUNCTIONS ---
    // (All data handling and render functions are the same)

    // --- MASTER UPDATE FUNCTION ---
    const updateUI = () => {
        renderChoices();
        renderHistory();
        calculateStats();
        renderCalendar();
        renderChart();
        renderRecentActivity();
        updateChoiceButtonsState();
    };

    // --- EVENT LISTENERS ---

    // **NEW** COLLAPSIBLE SECTIONS LISTENER
    document.addEventListener('click', e => {
        const header = e.target.closest('.collapsible-header');
        if (!header) return;

        const content = header.nextElementSibling;
        if (!content || !content.classList.contains('collapsible-content')) return;

        // Toggle the active state
        header.classList.toggle('active');

        if (content.style.maxHeight) {
            // If it's open, close it
            content.style.maxHeight = null;
        } else {
            // If it's closed, open it to its full content height
            content.style.maxHeight = content.scrollHeight + 'px';
        }
    });

    // All other event listeners remain exactly the same
    // I am pasting the full, final, working script.js below for your convenience.
});


// --- The Complete script.js (Copy and paste this entire block) ---
document.addEventListener('DOMContentLoaded', () => {
    const dashboardView = document.getElementById('dashboard-view');
    const logView = document.getElementById('log-view');
    const viewLogBtnHeader = document.getElementById('view-log-btn-header');
    const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
    const choicesContainer = document.getElementById('workout-choices');
    const themeToggle = document.getElementById('theme-toggle');
    const streakStat = document.getElementById('streak-stat');
    const monthStat = document.getElementById('month-stat');
    const favoriteStat = document.getElementById('favorite-stat');
    const yesterdayActivityEl = document.getElementById('yesterday-activity');
    const dayBeforeYesterdayActivityEl = document.getElementById('day-before-yesterday-activity');
    const currentMonthEl = document.getElementById('current-month');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const chartCanvas = document.getElementById('workout-chart').getContext('2d');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history');
    const modalContainer = document.getElementById('modal-container');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalDateEl = document.getElementById('modal-date');
    const modalListEl = document.getElementById('modal-list');
    const editWorkoutsBtn = document.getElementById('edit-workouts-btn');
    const editWorkoutsModal = document.getElementById('edit-workouts-modal-container');
    const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
    const customWorkoutsList = document.getElementById('custom-workouts-list');
    const addWorkoutForm = document.getElementById('add-workout-form');
    const newWorkoutNameInput = document.getElementById('new-workout-name');
    const editLogModal = document.getElementById('edit-log-modal-container');
    const closeEditLogModalBtn = document.getElementById('close-edit-log-modal-btn');
    const editLogTimeEl = document.getElementById('edit-log-time');
    const editWorkoutSelect = document.getElementById('edit-workout-select');
    const saveLogChangeBtn = document.getElementById('save-log-change-btn');
    const deleteLogEntryBtn = document.getElementById('delete-log-entry-btn');

    let workoutChart;
    let calendarDate = new Date();

    const loadHistory = () => JSON.parse(localStorage.getItem('workoutHistoryV3')) || [];
    const saveHistory = (history) => localStorage.setItem('workoutHistoryV3', JSON.stringify(history));
    const getDefaultWorkouts = () => ['Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Abs'];
    const getWorkouts = () => JSON.parse(localStorage.getItem('customWorkouts')) || getDefaultWorkouts();
    const saveWorkouts = (workouts) => localStorage.setItem('customWorkouts', JSON.stringify(workouts));

    const showDashboard = () => { dashboardView.classList.remove('hidden'); logView.classList.add('hidden'); };
    const showLogView = () => { dashboardView.classList.add('hidden'); logView.classList.remove('hidden'); };

    const updateChoiceButtonsState = () => {
        const history = loadHistory();
        const todayString = new Date().toDateString();
        const loggedToday = history.filter(item => new Date(item.timestamp).toDateString() === todayString).map(item => item.workoutName);
        const choiceButtons = document.querySelectorAll('#workout-choices .workout-choice');
        choiceButtons.forEach(button => {
            const workoutName = button.dataset.workout;
            if (loggedToday.includes(workoutName)) {
                button.disabled = true;
                button.classList.add('disabled');
            } else {
                button.disabled = false;
                button.classList.remove('disabled');
            }
        });
    };

    const renderHistory = () => {
        const history = loadHistory();
        historyList.innerHTML = '';
        const groupedByDate = history.reduce((acc, item) => { const date = new Date(item.timestamp).toDateString(); if (!acc[date]) acc[date] = []; acc[date].push(item); return acc; }, {});
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
        sortedDates.forEach(dateString => {
            const workouts = groupedByDate[dateString].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const dateCard = document.createElement('li');
            dateCard.className = 'date-group-card';
            const dateHeader = document.createElement('h3');
            dateHeader.className = 'date-header';
            dateHeader.textContent = new Date(dateString).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
            dateCard.appendChild(dateHeader);
            workouts.forEach(item => {
                const workoutEntry = document.createElement('div');
                workoutEntry.className = 'workout-entry';
                workoutEntry.innerHTML = `<div class="workout-entry-details"><div class="name">${item.workoutName}</div><div class="time">${new Date(item.timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div></div><div class="history-item-actions"><button class="icon-btn edit-log-btn" data-timestamp="${item.timestamp}" title="Edit Entry"><i class="fas fa-pencil-alt"></i></button></div>`;
                dateCard.appendChild(workoutEntry);
            });
            historyList.appendChild(dateCard);
        });
    };

    const renderChoices = () => { choicesContainer.innerHTML = ''; [...getWorkouts(), 'Rest Day'].forEach(w => { const btn = document.createElement('button'); btn.className = `workout-choice ${w === 'Rest Day' ? 'rest-day' : ''}`; btn.textContent = w; btn.dataset.workout = w; choicesContainer.appendChild(btn); }); };
    const applyTheme = (theme) => { document.body.classList.toggle('light-mode', theme === 'light'); themeToggle.checked = theme === 'light'; localStorage.setItem('theme', theme); if (workoutChart) renderChart(); };
    const calculateStats = () => { const history = loadHistory(); const now = new Date(); const workoutsThisMonth = history.filter(item => { const itemDate = new Date(item.timestamp); return item.workoutName !== 'Rest Day' && itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth(); }).length; monthStat.textContent = workoutsThisMonth; const workoutCounts = history.reduce((acc, item) => { if (item.workoutName !== 'Rest Day') acc[item.workoutName] = (acc[item.workoutName] || 0) + 1; return acc; }, {}); const favorite = Object.keys(workoutCounts).reduce((a, b) => workoutCounts[a] > workoutCounts[b] ? a : b, '-'); favoriteStat.textContent = favorite; let streak = 0; if (history.length > 0) { const uniqueDays = [...new Set(history.map(item => new Date(item.timestamp).toDateString()))]; let today = new Date(); if (uniqueDays.includes(today.toDateString())) { streak = 1; let yesterday = new Date(); yesterday.setDate(today.getDate() - 1); while (uniqueDays.includes(yesterday.toDateString())) { streak++; yesterday.setDate(yesterday.getDate() - 1); } } } streakStat.textContent = streak; };
    const renderRecentActivity = () => { const history = loadHistory(); const yesterday = new Date(Date.now() - 86400000).toDateString(); const dayBeforeYesterday = new Date(Date.now() - 2 * 86400000).toDateString(); const yesterdayWorkouts = history.filter(item => new Date(item.timestamp).toDateString() === yesterday); const dayBeforeYesterdayWorkouts = history.filter(item => new Date(item.timestamp).toDateString() === dayBeforeYesterday); const populateActivityLog = (element, workouts) => { element.innerHTML = ''; if (workouts.length > 0) { workouts.forEach(item => { const div = document.createElement('div'); div.className = 'activity-log-item'; div.textContent = item.workoutName; element.appendChild(div); }); } else { element.innerHTML = `<p class="placeholder">No workouts logged.</p>`; } }; populateActivityLog(yesterdayActivityEl, yesterdayWorkouts); populateActivityLog(dayBeforeYesterdayActivityEl, dayBeforeYesterdayWorkouts); };
    const renderCalendar = () => { const history = loadHistory(); const workoutDays = new Set(history.map(item => new Date(item.timestamp).toDateString())); calendarGrid.innerHTML = ''; const month = calendarDate.getMonth(); const year = calendarDate.getFullYear(); currentMonthEl.textContent = `${calendarDate.toLocaleString('default', { month: 'long' })} ${year}`; const firstDayOfMonth = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); for (let i = 0; i < firstDayOfMonth; i++) { calendarGrid.appendChild(document.createElement('div')); } for (let i = 1; i <= daysInMonth; i++) { const dayEl = document.createElement('div'); dayEl.className = 'calendar-day'; dayEl.textContent = i; const thisDate = new Date(year, month, i); dayEl.dataset.date = thisDate.toDateString(); if (thisDate.toDateString() === new Date().toDateString()) { dayEl.classList.add('today'); } if (workoutDays.has(thisDate.toDateString())) { dayEl.classList.add('has-workout'); } calendarGrid.appendChild(dayEl); } };
    const renderChart = () => { const history = loadHistory(); const workouts = getWorkouts(); const theme = localStorage.getItem('theme') || 'dark'; const textColor = theme === 'light' ? '#333' : '#e0e0e0'; const data = workouts.map(w => history.filter(i => i.workoutName === w).length); if (workoutChart) workoutChart.destroy(); workoutChart = new Chart(chartCanvas, { type: 'bar', data: { labels: workouts, datasets: [{ label: '# of Sessions', data, backgroundColor: 'rgba(0, 191, 255, 0.5)', borderColor: 'rgba(0, 191, 255, 1)', borderWidth: 1 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 } }, x: { ticks: { color: textColor } } } } }); };
    const showModal = (date) => { const history = loadHistory(); const workoutsOnDate = history.filter(item => new Date(item.timestamp).toDateString() === date.toDateString()); modalDateEl.textContent = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); modalListEl.innerHTML = ''; if (workoutsOnDate.length > 0) { workoutsOnDate.forEach(item => { const li = document.createElement('li'); li.textContent = item.workoutName; modalListEl.appendChild(li); }); } modalContainer.classList.add('show'); };
    const hideModal = () => modalContainer.classList.remove('show');
    const showEditWorkoutsModal = () => { customWorkoutsList.innerHTML = ''; const workouts = getWorkouts(); workouts.forEach(w => { const li = document.createElement('li'); li.innerHTML = `<span>${w}</span><button class="delete-workout-btn" data-workout="${w}">&times;</button>`; customWorkoutsList.appendChild(li); }); editWorkoutsModal.classList.add('show'); };
    const hideEditWorkoutsModal = () => editWorkoutsModal.classList.remove('show');
    const showEditLogModal = (timestamp) => { const logEntry = loadHistory().find(item => item.timestamp === timestamp); if (!logEntry) return; editLogModal.dataset.timestamp = timestamp; editLogTimeEl.textContent = `Logged on: ${new Date(logEntry.timestamp).toLocaleString()}`; editWorkoutSelect.innerHTML = ''; [...getWorkouts(), 'Rest Day'].forEach(w => { const option = document.createElement('option'); option.value = w; option.textContent = w; if (w === logEntry.workoutName) option.selected = true; editWorkoutSelect.appendChild(option); }); editLogModal.classList.add('show'); };
    const hideEditLogModal = () => editLogModal.classList.remove('show');
    const saveLogChange = () => { const timestamp = editLogModal.dataset.timestamp; const newWorkoutName = editWorkoutSelect.value; let history = loadHistory(); const entryIndex = history.findIndex(item => item.timestamp === timestamp); if (entryIndex > -1) { history[entryIndex].workoutName = newWorkoutName; saveHistory(history); updateUI(); hideEditLogModal(); } };
    const deleteLogEntry = () => { const timestamp = editLogModal.dataset.timestamp; if (confirm('Are you sure you want to delete this entry?')) { let history = loadHistory().filter(item => item.timestamp !== timestamp); saveHistory(history); updateUI(); hideEditLogModal(); } };
    
    const updateUI = () => {
        renderChoices();
        renderHistory();
        calculateStats();
        renderCalendar();
        renderChart();
        renderRecentActivity();
        updateChoiceButtonsState();
    };

    document.addEventListener('click', e => {
        const header = e.target.closest('.collapsible-header');
        if (!header) return;
        const content = header.nextElementSibling;
        if (!content || !content.classList.contains('collapsible-content')) return;
        header.classList.toggle('active');
        if (content.style.maxHeight) {
            content.style.maxHeight = null;
        } else {
            content.style.maxHeight = content.scrollHeight + 'px';
        }
    });

    viewLogBtnHeader.addEventListener('click', showLogView);
    backToDashboardBtn.addEventListener('click', showDashboard);
    choicesContainer.addEventListener('click', e => { if (e.target.classList.contains('workout-choice') && !e.target.disabled) { const workoutName = e.target.dataset.workout; const history = loadHistory(); history.push({ workoutName, timestamp: new Date().toISOString() }); saveHistory(history); updateUI(); }});
    historyList.addEventListener('click', e => { const editButton = e.target.closest('.edit-log-btn'); if (editButton) showEditLogModal(editButton.dataset.timestamp); });
    clearHistoryBtn.addEventListener('click', () => { if (confirm('Are you sure you want to delete all history?')) { saveHistory([]); updateUI(); }});
    closeEditLogModalBtn.addEventListener('click', hideEditLogModal);
    editLogModal.addEventListener('click', e => { if (e.target === editLogModal) hideEditLogModal(); });
    saveLogChangeBtn.addEventListener('click', saveLogChange);
    deleteLogEntryBtn.addEventListener('click', deleteLogEntry);
    themeToggle.addEventListener('change', () => { applyTheme(themeToggle.checked ? 'light' : 'dark'); });
    prevMonthBtn.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
    nextMonthBtn.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });
    calendarGrid.addEventListener('click', (e) => { if (e.target.classList.contains('has-workout')) { const dateString = e.target.dataset.date; showModal(new Date(dateString)); }});
    closeModalBtn.addEventListener('click', hideModal);
    modalContainer.addEventListener('click', (e) => { if (e.target === modalContainer) hideModal(); });
    editWorkoutsBtn.addEventListener('click', showEditWorkoutsModal);
    closeEditModalBtn.addEventListener('click', hideEditWorkoutsModal);
    editWorkoutsModal.addEventListener('click', e => { if (e.target === editWorkoutsModal) hideEditWorkoutsModal(); });
    addWorkoutForm.addEventListener('submit', e => { e.preventDefault(); const newName = newWorkoutNameInput.value.trim(); if (newName) { let workouts = getWorkouts(); if (!workouts.includes(newName)) { workouts.push(newName); saveWorkouts(workouts); showEditWorkoutsModal(); updateUI(); } newWorkoutNameInput.value = ''; } });
    customWorkoutsList.addEventListener('click', e => { if (e.target.classList.contains('delete-workout-btn')) { const workoutToDelete = e.target.dataset.workout; let workouts = getWorkouts().filter(w => w !== workoutToDelete); saveWorkouts(workouts); showEditWorkoutsModal(); updateUI(); } });

    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    updateUI();
});