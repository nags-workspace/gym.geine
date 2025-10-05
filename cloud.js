// ===================================================================
// PASTE THE SAME WEB APP URL YOU USED BEFORE
// ===================================================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzXZl7lzNdOnx_PATIDc-v8S-2evF2VYHEvGGbfJhwU_MUocIsG63sKTWBirdwWYdLNLQ/exec";
// ===================================================================


/**
 * Fetches all workout history from the Google Sheet.
 */
async function loadData() {
    try {
        const response = await fetch(WEB_APP_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.map(row => ({ ...row, timestamp: Number(row.timestamp) }));
    } catch (error) {
        console.error("Failed to load data:", error);
        return [];
    }
}

/**
 * Sends a generic request to the Google Sheet API.
 * @param {string} action - The command to execute ('create', 'update', 'delete').
 * @param {object} data - The payload for the action.
 */
async function sendRequest(action, data) {
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action, data }),
            headers: { 'Content-Type': 'application/json' },
        });
        return await response.json();
    } catch (error) {
        console.error(`Failed to ${action} data:`, error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Saves a new workout log entry.
 */
function createWorkoutLog(logEntry) {
    return sendRequest('create', logEntry);
}

/**
 * Updates an existing workout log entry.
 */
function updateWorkoutLog(timestamp, newWorkout) {
    return sendRequest('update', { timestamp, newWorkout });
}

/**
 * Deletes a workout log entry.
 */
function deleteWorkoutLog(timestamp) {
    return sendRequest('delete', { timestamp });
}

export { loadData, createWorkoutLog, updateWorkoutLog, deleteWorkoutLog };