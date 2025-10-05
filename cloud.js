import { NhostClient } from 'https://cdn.jsdelivr.net/npm/@nhost/nhost-js/+esm'

// ===================================================================
// YOUR SPECIFIC PROJECT INFO FOR NHOST v4
// ===================================================================
const NHOST_SUBDOMAIN = 'selzxrsfvcgyshuwvlrn'; 
const NHOST_REGION = 'ap-south-1';
// ===================================================================

// Initialize the Nhost client using the new v4 method
const nhost = new NhostClient({
  subdomain: NHOST_SUBDOMAIN,
  region: NHOST_REGION
});

/**
 * Fetches all workout history from the Nhost database.
 */
async function loadData() {
    console.log("Loading data from Nhost...");
    const { data, error } = await nhost.graphql.request(`
        query {
            workouts(order_by: {timestamp: desc}) {
                id
                timestamp
                workout
            }
        }
    `);

    if (error) {
        console.error('Error loading data:', error);
        alert("Could not load data from the cloud. Please check your Nhost permissions and URL.");
        return [];
    }
    // The timestamp comes back as a string, so we convert it to a number
    return data.workouts.map(item => ({...item, timestamp: Number(item.timestamp)}));
}

/**
 * Saves a new workout log entry.
 */
async function createWorkoutLog(logEntry) {
    const { data, error } = await nhost.graphql.request(`
        mutation ($timestamp: bigint!, $workout: String!) {
            insert_workouts_one(object: {timestamp: $timestamp, workout: $workout}) {
                id
            }
        }
    `, {
        timestamp: logEntry.timestamp,
        workout: logEntry.workout
    });

    if (error) console.error('Error creating log:', error);
    return { data, error };
}

/**
 * Updates an existing workout log entry using its unique ID.
 */
async function updateWorkoutLog(id, newWorkout) {
    const { data, error } = await nhost.graphql.request(`
        mutation ($id: uuid!, $workout: String!) {
            update_workouts_by_pk(pk_columns: {id: $id}, _set: {workout: $workout}) {
                id
            }
        }
    `, {
        id: id,
        workout: newWorkout
    });

    if (error) console.error('Error updating log:', error);
    return { data, error };
}

/**
 * Deletes a workout log entry using its unique ID.
 */
async function deleteWorkoutLog(id) {
    const { data, error } = await nhost.graphql.request(`
        mutation ($id: uuid!) {
            delete_workouts_by_pk(id: $id) {
                id
            }
        }
    `, {
        id: id
    });

    if (error) console.error('Error deleting log:', error);
    return { data, error };
}

export { loadData, createWorkoutLog, updateWorkoutLog, deleteWorkoutLog };