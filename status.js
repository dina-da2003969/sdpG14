import { collection, getDocs, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";
import { db } from "./firebase.js";

// Function to fetch the latest request for the logged-in user
async function fetchLatestUserRequest() {
    try {
        // Retrieve the logged-in user's data from local storage
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        if (!loggedInUser || !loggedInUser.username) {
            alert("User not logged in. Please log in first.");
            return null;
        }

        const username = loggedInUser.username;
        const requestsCollection = collection(db, "requests"); // Firestore collection

        // Fetch all requests
        const querySnapshot = await getDocs(requestsCollection);
        let latestRequest = null;

        querySnapshot.forEach((doc) => {
            const requestData = doc.data();
            if (requestData.username === username) {
                if (!latestRequest || requestData.timestamp > latestRequest.timestamp) {
                    latestRequest = { id: doc.id, ...requestData };
                }
            }
        });

        return latestRequest;
    } catch (error) {
        console.error("Error fetching latest request:", error);
        return null;
    }
}

// Function to check if a request has expired
function isRequestExpired(timestamp) {
    if (!timestamp || !timestamp.toDate) return false;
    
    const requestTime = timestamp.toDate();
    const currentTime = new Date();

    const differenceInMinutes = (currentTime - requestTime) / 60000; // Convert milliseconds to minutes
    return differenceInMinutes >= 240; // Expire after 60 minutes
}

// Function to update request response to "Expired"
async function expireRequest(requestId) {
    try {
        const requestDoc = doc(db, "requests", requestId);
        await updateDoc(requestDoc, { response: "Expired" });
        console.log(`Request ID ${requestId} has been marked as Expired.`);
    } catch (error) {
        console.error("Error expiring request:", error);
    }
}

// Function to delete a request by ID
async function cancelRequest(requestId) {
    try {
        const requestDoc = doc(db, "requests", requestId);
        await deleteDoc(requestDoc);

        alert(`Request with ID: ${requestId} has been canceled.`);
        populateRequestTable(); // Refresh table after deletion
    } catch (error) {
        console.error("Error canceling request:", error);
        alert("Failed to cancel the request. Please try again.");
    }
}

// Function to populate the table with the latest request
async function populateRequestTable() {
    const tableBody = document.querySelector(".notification-table tbody");
    tableBody.innerHTML = ""; // Clear existing rows

    const latestRequest = await fetchLatestUserRequest();

    if (!latestRequest) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `<td colspan="5" class="no-data">No requests found</td>`;
        tableBody.appendChild(emptyRow);
        return;
    }

    const { id, supervisor, response, timestamp } = latestRequest;

    // Check if the request is expired
    if (isRequestExpired(timestamp) && response === "Pending") {
        await expireRequest(id);
    }

    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${id}</td>
        <td>${supervisor || "Unknown"}</td>
        <td>${response === "Pending" && isRequestExpired(timestamp) ? "Expired" : response}</td>
        <td>
            <div class="button-group">
                <button class="decline-button" data-id="${id}">Cancel</button>
            </div>
        </td>
    `;

    tableBody.appendChild(row);

    // Add event listener to "Cancel" button
    document.querySelector(".decline-button").addEventListener("click", () => {
        if (confirm(`Are you sure you want to cancel request ID: ${id}?`)) {
            cancelRequest(id);
        }
    });
}

// Populate the table when the page loads
document.addEventListener("DOMContentLoaded", () => {
    populateRequestTable();
});
