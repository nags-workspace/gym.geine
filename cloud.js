// ===================================================================
// Paste the Web app URL you copied from Google Apps Script deployment
// ===================================================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzXZl7lzNdOnx_PATIDc-v8S-2evF2VYHEvGGbfJhwU_MUocIsG63sKTWBirdwWYdLNLQ/exec";
// ===================================================================


/**
 * Fetches all workout history from the Google Sheet.
 * @returns {Promise<Array>} A promise that resolves to the workout history array.
 */
async function loadData() {
    console.log("Loading data from cloud...");
    try {
        const response = await fetch(WEB_APP_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Convert timestamp from string back to number if needed
        return data.map(row => ({
            ...row,
            timestamp: Number(row.timestamp)
        }));
    } catch (error) {
        console.error("Failed to load data from spreadsheet:", error);
        alert("Could not load data from the cloud. Please check your connection and configuration.");
        return []; // Return an empty array on failure
    }
}

/**
 * Saves a single workout log entry to the Google Sheet.
 * @param {object} logEntry - The workout entry to save (e.g., { timestamp: 123, workout: 'Chest' }).
 * @returns {Promise<object>} A promise that resolves to the server's response.
 */
async function saveData(logEntry) {
    console.log("Saving data to cloud:", logEntry);
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Important for Google Apps Script web apps
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(logEntry)
        });
        
        // Note: Due to 'no-cors' and Google Script redirects, we can't easily read the response.
        // We will assume success if no network error is thrown.
        console.log("Save request sent.");
        return { status: "success" };
        
    } catch (error) {
        console.error("Failed to save data to spreadsheet:", error);
        alert("Could not save your workout to the cloud.");
        return { status: "error", message: error.message };
    }
}

// Export the functions to be used in script.js
export { loadData, saveData };