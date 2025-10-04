document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
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

    // --- CONFIGURATION ---
    // !!! IMPORTANT: PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE !!!
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyP1IotaSnDSkUEnNffda28bWpbKGjZ_9QS-zWli_tX-7rg4hDkP-2rH8KzuoATpz5JCQ/exec';

    let workoutChart;
    let calendarDate = new Date();
    let workoutHistory = []; // Holds the state of our app's data in memory

    // --- NEW: Google Sheets Integration ---

    // Loads history from the Google Sheet when the app starts
    const loadHistoryFromCloud = async () => {
        // Show a loading indicator if you have one
        console.log("Loading history from cloud...");
        try {
            const response = await fetch(SCRIPT_URL);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const data = await response.json();
            // Ensure data is sorted newest to oldest, as Google Sheets might not guarantee order
            workoutHistory = data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            console.log("History loaded successfully.");
        } catch (error) {
            console.error('Failed to load history from cloud:', error);
            // Fallback to localStorage if cloud fails
            workoutHistory = JSON.parse(localStorage.getItem('workoutHistoryV3')) || [];
            alert("Could not connect to cloud storage. Using local backup. Your data may not be up-to-date.");
        }
    };

    // Saves a single new entry to the Google Sheet
    const saveEntryToCloud = async (entry) => {
        console.log("Saving new entry to cloud:", entry);
        try {
            // We use 'no-cors' mode for simple POST requests to Google Apps Script.
            // This means we won't get a response back, but the data will be sent.
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            });
        } catch (error) {
            console.error('Failed to save entry to cloud:', error);
            alert("Failed to save workout to the cloud. It is saved locally for now.");
        }
    };

    // --- CORE DATA FUNCTIONS (Updated) ---
    // These functions now work with the in-memory `workoutHistory` variable
    const loadHistory = () => workoutHistory;
    const saveHistory = (history) => {
        // This function now updates the in-memory state and the localStorage backup.
        // It does NOT save the entire history to the cloud, to avoid overwriting data.
        workoutHistory = history;
        localStorage.setItem('workoutHistoryV3', JSON.stringify(history));
    };
    
    // Custom workouts and theme are still fine to keep in localStorage
    const getDefaultWorkouts = () => ['Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Abs'];
    const getWorkouts = () => JSON.parse(localStorage.getItem('customWorkouts')) || getDefaultWorkouts();
    const saveWorkouts = (workouts) => localStorage.setItem('customWorkouts', JSON.stringify(workouts));

    // --- VIEW SWITCHING ---
    const showDashboard = () => { dashboardView.classList.remove('hidden'); logView.classList.add('hidden'); };
    const showLogView = () => { dashboardView.classList.add('hidden'); logView.classList.remove('hidden'); };

    // --- RENDER FUNCTIONS (No changes needed in these) ---
    const renderChoices = () => { choicesContainer.innerHTML = ''; [...getWorkouts(), 'Rest Day'].forEach(w => { const btn = document.createElement('button'); btn.className = `workout-choice ${w === 'Rest Day' ? 'rest-day' : ''}`; btn.textContent = w; btn.dataset.workout = w; choicesContainer.appendChild(btn); }); };
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
    const applyTheme = (theme) => { document.body.classList.toggle('light-mode', theme === 'light'); themeToggle.checked = theme === 'light'; localStorage.setItem('theme', theme); if (workoutChart) renderChart(); };
    const calculateStats = () => { const history = loadHistory(); const now = new Date(); const workoutsThisMonth = history.filter(item => { const itemDate = new Date(item.timestamp); return item.workoutName !== 'Rest Day' && itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth(); }).length; monthStat.textContent = workoutsThisMonth; const workoutCounts = history.reduce((acc, item) => { if (item.workoutName !== 'Rest Day') acc[item.workoutName] = (acc[item.workoutName] || 0) + 1; return acc; }, {}); const favorite = Object.keys(workoutCounts).reduce((a, b) => workoutCounts[a] > workoutCounts[b] ? a : b, '-'); favoriteStat.textContent = favorite; let streak = 0; if (history.length > 0) { const uniqueDays = [...new Set(history.map(item => new Date(item.timestamp).toDateString()))]; let today = new Date(); if (uniqueDays.includes(today.toDateString())) { streak = 1; let yesterday = new Date(); yesterday.setDate(today.getDate() - 1); while (uniqueDays.includes(yesterday.toDateString())) { streak++; yesterday.setDate(yesterday.getDate() - 1); } } } streakStat.textContent = streak; };
    const renderRecentActivity = () => { const history = loadHistory(); const yesterday = new Date(Date.now() - 86400000).toDateString(); const dayBeforeYesterday = new Date(Date.now() - 2 * 86400000).toDateString(); const yesterdayWorkouts = history.filter(item => new Date(item.timestamp).toDateString() === yesterday); const dayBeforeYesterdayWorkouts = history.filter(item => new Date(item.timestamp).toDateString() === dayBeforeYesterday); const populateActivityLog = (element, workouts) => { element.innerHTML = ''; if (workouts.length > 0) { workouts.forEach(item => { const div = document.createElement('div'); div.className = 'activity-log-item'; div.textContent = item.workoutName; element.appendChild(div); }); } else { element.innerHTML = `<p class="placeholder">No workouts logged.</p>`; } }; populateActivityLog(yesterdayActivityEl, yesterdayWorkouts); populateActivityLog(dayBeforeYesterdayActivityEl, dayBeforeYesterdayWorkouts); };
    const renderCalendar = () => { const history = loadHistory(); const workoutDays = new Set(history.map(item => new Date(item.timestamp).toDateString())); calendarGrid.innerHTML = ''; const month = calendarDate.getMonth(); const year = calendarDate.getFullYear(); currentMonthEl.textContent = `${calendarDate.toLocaleString('default', { month: 'long' })} ${year}`; const firstDayOfMonth = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); for (let i = 0; i < firstDayOfMonth; i++) { calendarGrid.appendChild(document.createElement('div')); } for (let i = 1; i <= daysInMonth; i++) { const dayEl = document.createElement('div'); dayEl.className = 'calendar-day'; dayEl.textContent = i; const thisDate = new Date(year, month, i); dayEl.dataset.date = thisDate.toDateString(); if (thisDate.toDateString() === new Date().toDateString()) { dayEl.classList.add('today'); } if (workoutDays.has(thisDate.toDateString())) { dayEl.classList.add('has-workout'); } calendarGrid.appendChild(dayEl); } };
    const renderChart = () => { const history = loadHistory(); const workouts = getWorkouts(); const theme = localStorage.getItem('theme') || 'dark'; const textColor = theme === 'light' ? '#333' : '#e0e0e0'; const data = workouts.map(w => history.filter(i => i.workoutName === w).length); if (workoutChart) workoutChart.destroy(); workoutChart = new Chart(chartCanvas, { type: 'bar', data: { labels: workouts, datasets: [{ label: '# of Sessions', data, backgroundColor: 'rgba(0, 191, 255, 0.5)', borderColor: 'rgba(0, 191, 255, 1)', borderWidth: 1 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 } }, x: { ticks: { color: textColor } } } } }); };
    
    // --- MODAL FUNCTIONS (No changes needed) ---
    const showModal = (date) => { const history = loadHistory(); const workoutsOnDate = history.filter(item => new Date(item.timestamp).toDateString() === date.toDateString()); modalDateEl.textContent = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); modalListEl.innerHTML = ''; if (workoutsOnDate.length > 0) { workoutsOnDate.forEach(item => { const li = document.createElement('li'); li.textContent = item.workoutName; modalListEl.appendChild(li); }); } modalContainer.classList.add('show'); };
    const hideModal = () => modalContainer.classList.remove('show');
    const showEditWorkoutsModal = () => { customWorkoutsList.innerHTML = ''; const workouts = getWorkouts(); workouts.forEach(w => { const li = document.createElement('li'); li.innerHTML = `<span>${w}</span><button class="delete-workout-btn" data-workout="${w}">&times;</button>`; customWorkoutsList.appendChild(li); }); editWorkoutsModal.classList.add('show'); };
    const hideEditWorkoutsModal = () => editWorkoutsModal.classList.remove('show');
    const showEditLogModal = (timestamp) => { const logEntry = loadHistory().find(item => item.timestamp === timestamp); if (!logEntry) return; editLogModal.dataset.timestamp = timestamp; editLogTimeEl.textContent = `Logged on: ${new Date(logEntry.timestamp).toLocaleString()}`; editWorkoutSelect.innerHTML = ''; [...getWorkouts(), 'Rest Day'].forEach(w => { const option = document.createElement('option'); option.value = w; option.textContent = w; if (w === logEntry.workoutName) option.selected = true; editWorkoutSelect.appendChild(option); }); editLogModal.classList.add('show'); };
    const hideEditLogModal = () => editLogModal.classList.remove('show');
    
    // --- EDIT/DELETE LOGIC (Updated to work on local state) ---
    // NOTE: These changes will only apply locally for your current session and localStorage backup.
    // Syncing edits/deletes requires a more complex backend script.
    const saveLogChange = () => { const timestamp = editLogModal.dataset.timestamp; const newWorkoutName = editWorkoutSelect.value; let history = loadHistory(); const entryIndex = history.findIndex(item => item.timestamp === timestamp); if (entryIndex > -1) { history[entryIndex].workoutName = newWorkoutName; saveHistory(history); updateUI(); hideEditLogModal(); } };
    const deleteLogEntry = () => { const timestamp = editLogModal.dataset.timestamp; if (confirm('Are you sure you want to delete this entry?')) { let history = loadHistory().filter(item => item.timestamp !== timestamp); saveHistory(history); updateUI(); hideEditLogModal(); } };
    
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
    viewLogBtnHeader.addEventListener('click', showLogView);
    backToDashboardBtn.addEventListener('click', showDashboard);

    // --- EVENT LISTENER FOR LOGGING A WORKOUT (Updated) ---
    choicesContainer.addEventListener('click', e => {
        if (e.target.classList.contains('workout-choice') && !e.target.disabled) {
            const workoutName = e.target.dataset.workout;
            const newEntry = { workoutName, timestamp: new Date().toISOString() };
            
            // 1. Add to our local state immediately for a fast UI update
            workoutHistory.unshift(newEntry); // Add to the beginning of the array
            
            // 2. Update the UI right away
            updateUI();
            
            // 3. Save the new entry to the cloud in the background
            saveEntryToCloud(newEntry);
            
            // 4. Also save the full history to localStorage as a backup
            localStorage.setItem('workoutHistoryV3', JSON.stringify(workoutHistory));
        }
    });

    historyList.addEventListener('click', e => { const editButton = e.target.closest('.edit-log-btn'); if (editButton) showEditLogModal(editButton.dataset.timestamp); });
    clearHistoryBtn.addEventListener('click', () => { if (confirm('Are you sure you want to delete ALL history? This cannot be undone from the cloud.')) { 
        // NOTE: A "clear all" function also requires a more advanced backend script.
        // For now, this just clears the local state.
        saveHistory([]); 
        updateUI(); 
        alert("Local history cleared. Please clear the Google Sheet manually if needed.");
    }});
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

    // --- NEW APP INITIALIZATION ---
    const initializeApp = async () => {
        // Apply theme first, so the loading state looks right
        const savedTheme = localStorage.getItem('theme') || 'dark';
        applyTheme(savedTheme);

        // Wait for data to load from the cloud
        await loadHistoryFromCloud();
        
        // Now that we have data, render the entire UI
        updateUI();
    };

    // Start the application
    initializeApp();
});