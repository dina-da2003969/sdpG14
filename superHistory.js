import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";
import { db } from "./firebase.js";

// Function to fetch requests from Firestore
async function fetchRequestHistory(supervisorName) {
    try {
        const requestsCollection = collection(db, "requests"); // Firestore collection name
        const querySnapshot = await getDocs(requestsCollection);

        // Filter requests to show only those where drname matches the logged-in user
        return querySnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((request) => request.supervisor === supervisorName);
    } catch (error) {
        console.error("Error fetching request history:", error);
        return [];
    }
}

// Function to format Firestore timestamp
function formatTimestamp(timestamp) {
    return timestamp ? new Date(timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A";
}

// Function to populate the table with fetched requests
async function populateRequestTable() {
    const tableBody = document.querySelector(".notification-table tbody");
    tableBody.innerHTML = ""; // Clear existing rows

    // Retrieve the logged-in user's name from localStorage
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser || !loggedInUser.name) {
        alert("User not logged in. Please log in first.");
        return;
    }
    const supervisorName = loggedInUser.name;

    // Fetch requests for the logged-in user
    const requests = await fetchRequestHistory(supervisorName);

    // If no requests exist, show a "No requests found" message
    if (requests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="no-data">No requests found</td></tr>`;
        return;
    }

    // Loop through the requests and populate rows
    requests.forEach((request) => {
        const { drname, cubicleNumber, patientStatus, timestamp, response } = request;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${drname || "Unknown"}</td>
            <td>${cubicleNumber || "N/A"}</td>
            <td>${patientStatus || "No details provided"}</td>
            <td>${formatTimestamp(timestamp)}</td>
            <td class="${response === "Accepted" ? "status-accepted" : "status-rejected"}">
                ${response || "Pending"}
            </td>
        `;

        tableBody.appendChild(row);
    });
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

// Populate the table when the page loads
document.addEventListener("DOMContentLoaded", () => {
    populateRequestTable();
    initializeSearch();
});
