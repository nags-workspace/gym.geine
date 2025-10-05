// ===================================================================
// PASTE YOUR API KEY AND YOUR BIN ID IS ALREADY HERE
// ===================================================================
const API_KEY = 'PASTE_YOUR_API_KEY_HERE';
const BIN_ID = '68e2270dae596e708f0692a6';
// ===================================================================

const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const MASTER_KEY_HEADER = { 'X-Master-Key': API_KEY };

/**
 * Fetches the entire workout history array from the bin.
 */
async function loadData() {
    console.log("Loading data from JSONBin.io...");
    try {
        const response = await fetch(`${API_URL}/latest`, { headers: MASTER_KEY_HEADER });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();
        // The data is stored inside a "record" property
        return data.record;
    } catch (error) {
        console.error("Failed to load data:", error);
        alert("Could not load data. Please check your JSONBin.io API Key and Bin ID.");
        return [];
    }
}

/**
 * Saves the entire workout history array to the bin, overwriting it.
 */
async function saveData(historyArray) {
    console.log("Saving data to JSONBin.io...");
    try {
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                ...MASTER_KEY_HEADER,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(historyArray)
        });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to save data:", error);
        alert("Could not save data to the cloud.");
    }
}

// Export the two simple functions.
export { loadData, saveData };