import { collection, addDoc, getDocs, query, where, orderBy, onSnapshot, Timestamp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";
import { db } from "./firebase.js";

// List of available supervisors
const supervisors = [
    "Hani Nazzal",
    "Wadha Labda",
    "Rehab Duwairi",
    "Mohamed Saleh"
];

// Function to count pending requests for each supervisor
async function getSupervisorLoad() {
    try {
        const requestsCollection = collection(db, "requests");
        const pendingQuery = query(requestsCollection, where("response", "==", "Pending"));
        const querySnapshot = await getDocs(pendingQuery);

        // Initialize supervisor load count
        const supervisorLoad = {};
        supervisors.forEach(supervisor => {
            supervisorLoad[supervisor] = 0;
        });

        // Count pending requests for each supervisor
        querySnapshot.forEach((doc) => {
            const requestData = doc.data();
            if (requestData.supervisor && supervisorLoad.hasOwnProperty(requestData.supervisor)) {
                supervisorLoad[requestData.supervisor]++;
            }
        });

        return supervisorLoad;
    } catch (error) {
        console.error("Error fetching supervisor request count:", error);
        return null;
    }
}

// Function to update the supervisor dropdown dynamically
async function updateSupervisorDropdown() {
    const supervisorSelect = document.getElementById("nameSelect");
    supervisorSelect.innerHTML = ""; // Clear previous options

    const supervisorLoad = await getSupervisorLoad();
    if (!supervisorLoad) return;

    // Default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select supervisor name";
    supervisorSelect.appendChild(defaultOption);

    // Sort supervisors by the number of pending requests (ascending order)
    const sortedSupervisors = supervisors.sort((a, b) => supervisorLoad[a] - supervisorLoad[b]);

    // Populate the dropdown with supervisors and their request count
    sortedSupervisors.forEach(supervisor => {
        const option = document.createElement("option");
        option.value = supervisor;
        option.textContent = `Dr. ${supervisor} (${supervisorLoad[supervisor]} requests)`;
        supervisorSelect.appendChild(option);
    });
}

// Store Request Data to Firestore
async function storeRequestData(username, drname, supervisorName, cubicleNumber, patientStatus) {
    try {
        const requestsCollection = collection(db, "requests");
        const pendingQuery = query(
            requestsCollection,
            where("username", "==", username),
            where("response", "==", "Pending")
        );
        
        const pendingSnapshot = await getDocs(pendingQuery);
        if (!pendingSnapshot.empty) {
            alert("You already have a pending request. Please wait for a response.");
            return false;
        }

        await addDoc(requestsCollection, {
            username,
            drname,
            supervisor: supervisorName,
            cubicleNumber,
            patientStatus,
            response: "Pending",
            status: "Awaiting Response",
            timestamp: Timestamp.now(),
            createdAt: Timestamp.now()
        });

        console.log("Request stored successfully");
        return true;
    } catch (error) {
        console.error("Error storing request:", error);
        return false;
    }
}

// Function to create a notification
async function createNotification(userId, message, type) {
    try {
        const notificationsCollection = collection(db, "notifications");
        await addDoc(notificationsCollection, {
            userId,
            message,
            type,
            read: false,
            timestamp: Timestamp.now()
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
}

// Function to listen for real-time updates
function listenForRequestUpdates() {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser || !loggedInUser.username) {
        alert("User not logged in. Please log in first.");
        window.location.href = "index.html"; // Change this if needed
        return;
    }

    const username = loggedInUser.username;
    const requestsCollection = collection(db, "requests");
    const requestsQuery = query(requestsCollection, where("username", "==", username));

    onSnapshot(requestsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
                const requestData = change.doc.data();
                const message = `Your request has been ${requestData.response.toLowerCase()}`;
                createNotification(username, message, "request_update");
            }
        });
    });
}

// Event listener for form submission
document.addEventListener("DOMContentLoaded", async () => {
    const requestButton = document.querySelector(".request-button");
    const form = document.querySelector(".form");

    await updateSupervisorDropdown();

    requestButton.addEventListener("click", async (e) => {
        e.preventDefault();

        const supervisorSelect = document.getElementById("nameSelect");
        const cubicleInput = document.getElementById("textbox1");
        const statusTextarea = document.getElementById("textbox2");

        const supervisorName = supervisorSelect.value;
        const cubicleNumber = cubicleInput.value.trim();
        const patientStatus = statusTextarea.value.trim();

        if (!supervisorName || !cubicleNumber) {
            alert("Please fill in the reqired fields.");
            return;
        }

        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        if (!loggedInUser || !loggedInUser.username || !loggedInUser.name) {
            alert("User not logged in. Please log in first.");
            window.location.href = "index.html"; // Change this if needed
            return;
        }

        const username = loggedInUser.username;
        const drname = loggedInUser.name;

        requestButton.disabled = true;
        requestButton.textContent = "Submitting...";

        const success = await storeRequestData(username, drname, supervisorName, cubicleNumber, patientStatus);

        if (success) {
            alert("Request successfully submitted. Please wait for the supervisor's response.");
            form.reset();
            await updateSupervisorDropdown();
        }

        requestButton.disabled = false;
        requestButton.textContent = "Submit Request";
    });

    listenForRequestUpdates();
});
