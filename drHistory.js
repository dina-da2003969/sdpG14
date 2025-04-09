import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";
import { db } from "./firebase.js";

// Function to format date and time
function formatDateTime(timestamp) {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Fetch and display request history for the logged-in user
async function fetchAndDisplayRequestHistory() {
    try {
        const tableBody = document.querySelector(".notification-table tbody");
        
        // Retrieve the logged-in user's data from local storage
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        if (!loggedInUser || !loggedInUser.username) {
            tableBody.innerHTML = `<tr><td colspan="3" class="no-data">Please log in to view your request history</td></tr>`;
            return;
        }

        const username = loggedInUser.username;
        const requestsCollection = collection(db, "requests");

        // Fetch all requests from Firestore
        const querySnapshot = await getDocs(requestsCollection);
        const userRequests = [];

        querySnapshot.forEach((doc) => {
            const requestData = doc.data();
            if (requestData.username === username) {
                userRequests.push({
                    time: formatDateTime(requestData.timestamp),
                    status: requestData.response || "Pending",
                    supervisor: requestData.supervisor || "Not assigned"
                });
            }
        });

        // Clear existing data
        tableBody.innerHTML = "";

        // Show no data message if no requests found
        if (userRequests.length === 0) {
            tableBody.innerHTML = `<tr id="no-data-row"><td colspan="3" class="no-data">No request history found</td></tr>`;
            return;
        }

        // Sort requests by time (most recent first)
        userRequests.sort((a, b) => new Date(b.time) - new Date(a.time));

        // Populate table with user's requests
        userRequests.forEach(request => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${request.time}</td>
                <td class="status-${request.status.toLowerCase()}">${request.status}</td>
                <td>${request.supervisor}</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error fetching user request history:", error);
        const tableBody = document.querySelector(".notification-table tbody");
        tableBody.innerHTML = `<tr><td colspan="3" class="no-data">Error loading request history. Please try again.</td></tr>`;
    }
}

// Function to filter table rows based on search input
function filterTable(searchText) {
    const tableBody = document.querySelector(".notification-table tbody");
    const rows = tableBody.getElementsByTagName("tr");
    const searchLower = searchText.toLowerCase();

    // Skip the no-data row if it's the only row
    if (rows.length === 1 && rows[0].querySelector(".no-data")) {
        return;
    }

    let hasVisibleRows = false;

    for (const row of rows) {
        // Skip the no-data row if it exists
        if (row.querySelector(".no-data")) {
            continue;
        }

        const cells = row.getElementsByTagName("td");
        let rowText = "";
        
        // Concatenate text content of all cells
        for (const cell of cells) {
            rowText += cell.textContent + " ";
        }
        
        rowText = rowText.toLowerCase();
        
        if (rowText.includes(searchLower)) {
            row.style.display = "";
            hasVisibleRows = true;
        } else {
            row.style.display = "none";
        }
    }

    // Show "No results found" if no matching rows
    const noDataRow = document.getElementById("no-data-row");
    if (noDataRow) {
        if (!hasVisibleRows) {
            noDataRow.style.display = "";
            noDataRow.querySelector("td").textContent = "No matching requests found";
        } else {
            noDataRow.style.display = "none";
        }
    }
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById("search-requests");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            filterTable(e.target.value);
        });
    }
}

// Run functions when page loads
document.addEventListener("DOMContentLoaded", () => {
    fetchAndDisplayRequestHistory();
    initializeSearch();
});
