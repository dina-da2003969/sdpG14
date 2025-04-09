import {
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";
import { db } from "./firebase.js";

let isInitialLoad = true;

// Function to fetch requests for the logged-in supervisor
async function fetchSupervisorRequests(supervisorName) {
  try {
    const requestsCollection = collection(db, "requests");
    const querySnapshot = await getDocs(requestsCollection);

    // Filter requests that match the logged-in supervisor's name and are pending
    const filteredRequests = [];
    querySnapshot.forEach((doc) => {
      const requestData = doc.data();
      if (
        requestData.supervisor === supervisorName &&
        requestData.response === "Pending"
      ) {
        filteredRequests.push({ id: doc.id, ...requestData });
      }
    });

    return filteredRequests;
  } catch (error) {
    console.error("Error fetching requests:", error);
    return [];
  }
}

// Function to store request history
async function storeRequestHistory(requestData, response) {
  try {
    const historyCollection = collection(db, "requestHistory");
    await addDoc(historyCollection, {
      ...requestData,
      response: response,
      responseTime: Timestamp.now(),
      respondedBy: JSON.parse(localStorage.getItem("loggedInUser")).name,
    });
    console.log("Request history stored successfully");
  } catch (error) {
    console.error("Error storing request history:", error);
  }
}

// Function to create a notification
async function createNotification(userId, message, type) {
  try {
    const notificationsCollection = collection(db, "notifications");
    await addDoc(notificationsCollection, {
      userId: userId,
      message: message,
      type: type,
      read: false,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

// Function to format time
function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Function to update notification UI
function updateNotificationUI(notifications) {
  const notificationList = document.getElementById("notificationList");
  const notificationCount = document.getElementById("notificationCount");

  // Update notification count
  const unreadCount = notifications.filter((n) => !n.read).length;
  notificationCount.textContent = unreadCount;
  notificationCount.style.display = unreadCount > 0 ? "block" : "none";

  // Clear existing notifications
  notificationList.innerHTML = "";

  // Sort notifications by timestamp (newest first)
  notifications.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

  // Add notifications to the list
  notifications.forEach((notification) => {
    const notificationElement = document.createElement("div");
    notificationElement.className = `notification-item ${
      notification.read ? "" : "unread"
    }`;
    notificationElement.innerHTML = `
            <p class="notification-message">${notification.message}</p>
            <p class="notification-time">${formatTime(
              notification.timestamp
            )}</p>
        `;
    // Add click handler to redirect to notifications page
    notificationElement.addEventListener("click", () => {
      window.location.href = "supervisorHome.html";
    });
    notificationList.appendChild(notificationElement);
  });
}

// Function to update request response in Firestore
async function updateRequestStatus(requestId, response, requestData) {
  try {
    const requestDoc = doc(db, "requests", requestId);
    await updateDoc(requestDoc, {
      response: response,
      responseTime: Timestamp.now(),
      status: response === "Accepted" ? "Pending Visit" : "Declined",
    });

    // Store in request history
    await storeRequestHistory(requestData, response);

    // Create notification for the doctor
    const message = `Your request has been ${response.toLowerCase()}.`;
    await createNotification(requestData.username, message, "request_response");

    populateRequestsTable(); // Refresh table after update
  } catch (error) {
    console.error("Error updating request:", error);
    alert("Failed to update the request. Please try again.");
  }
}

// Function to format Firestore timestamp into a readable time
function formatTimestamp(timestamp) {
  if (!timestamp || !timestamp.toDate) return "--:--";
  const date = timestamp.toDate();
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Function to populate the request table
async function populateRequestsTable() {
  const tableBody = document.querySelector(".notification-table tbody");
  tableBody.innerHTML = ""; // Clear existing rows

  // Retrieve logged-in supervisor's name from localStorage
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!loggedInUser || !loggedInUser.name) {
    alert("Supervisor not logged in. Please log in first.");
    window.location.href = "login.html";
    return;
  }
  const supervisorName = loggedInUser.name;

  const requests = await fetchSupervisorRequests(supervisorName);

  // Check if there are requests
  if (requests.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `<td colspan="5" class="no-data">No pending requests found</td>`;
    tableBody.appendChild(emptyRow);
    return;
  }

  // Sort requests by timestamp (newest first)
  requests.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

  // Populate the table with requests
  requests.forEach((request) => {
    const { id, drname, cubicleNumber, patientStatus, timestamp } = request;

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${drname || "Unknown"}</td>
            <td>${cubicleNumber || "N/A"}</td>
            <td>${patientStatus || "N/A"}</td>
            <td>${formatTimestamp(timestamp)}</td>
            <td>
                <div class="button-group">
                    <button class="accept-button" data-id="${id}">Accept</button>
                    <button class="decline-button" data-id="${id}">Decline</button>
                </div>
            </td>
        `;

    tableBody.appendChild(row);
  });

  // Add event listeners to accept and decline buttons
  document
    .querySelectorAll(".accept-button, .decline-button")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const requestId = button.dataset.id;
        const response = button.classList.contains("accept-button")
          ? "Accepted"
          : "Declined";

        // Find the request data
        const request = requests.find((r) => r.id === requestId);
        if (request) {
          // Disable both buttons in the row to prevent double-clicks
          const buttonGroup = button.parentElement;
          buttonGroup
            .querySelectorAll("button")
            .forEach((btn) => (btn.disabled = true));

          await updateRequestStatus(requestId, response, request);
        }
      });
    });
}

// Function to listen for real-time updates
function listenForRequestUpdates() {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!loggedInUser || !loggedInUser.name) {
    alert("Supervisor not logged in. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  const supervisorName = loggedInUser.name;

  // Listen for new requests
  const requestsCollection = collection(db, "requests");
  const requestsQuery = query(
    requestsCollection,
    where("supervisor", "==", supervisorName),
    where("response", "==", "Pending")
  );

  onSnapshot(requestsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const requestData = change.doc.data();
        const message = `New request from Dr. ${requestData.drname}`;
        createNotification(supervisorName, message, "new_request");
      }
    });
  });

  // Listen for notifications
  const notificationsCollection = collection(db, "notifications");
  const notificationsQuery = query(
    notificationsCollection,
    where("userId", "==", supervisorName),
    orderBy("timestamp", "desc")
  );

  onSnapshot(notificationsQuery, (snapshot) => {
    const notifications = [];
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    updateNotificationUI(notifications);
  });
}

// Set up real-time updates
let updateInterval;

function startRealTimeUpdates() {
  // Clear any existing interval
  if (updateInterval) clearInterval(updateInterval);

  // Update the table every 30 seconds
  updateInterval = setInterval(() => {
    populateRequestsTable();
  }, 30000);
}

// Initialize notification functionality
document.addEventListener("DOMContentLoaded", () => {
  // Set up notification dropdown toggle
  const notificationIcon = document.getElementById("notificationIcon");
  const notificationDropdown = document.getElementById("notificationDropdown");

  notificationIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    notificationDropdown.classList.toggle("show");
  });

  document.addEventListener("click", (e) => {
    if (!notificationDropdown.contains(e.target)) {
      notificationDropdown.classList.remove("show");
    }
  });

  // Set up mark all as read functionality
  const markAllReadButton = document.getElementById("markAllRead");
  markAllReadButton.addEventListener("click", async () => {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser || !loggedInUser.name) return;

    const notificationsCollection = collection(db, "notifications");
    const q = query(
      notificationsCollection,
      where("userId", "==", loggedInUser.name),
      where("read", "==", false)
    );

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (doc) => {
      await updateDoc(doc.ref, { read: true });
    });
  });

  populateRequestsTable();
  startRealTimeUpdates();
  listenForRequestUpdates();
});

// Clean up when leaving the page
window.addEventListener("beforeunload", () => {
  if (updateInterval) clearInterval(updateInterval);
});
