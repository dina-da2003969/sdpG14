import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";
import { db } from "./firebase.js";

// Function to format timestamp
function formatDateTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    };
    return date.toLocaleString(undefined, options);
}

// Function to update notification read status
async function updateNotificationStatus(notificationId, read) {
    try {
        const notificationRef = doc(db, "notifications", notificationId);
        await updateDoc(notificationRef, { read: read });
    } catch (error) {
        console.error("Error updating notification status:", error);
    }
}

// Function to create notification element
function createNotificationElement(notification) {
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
    notificationElement.setAttribute('data-id', notification.id);

    notificationElement.innerHTML = `
        <div class="notification-content">
            <div class="notification-header">
                <span class="notification-time">${formatDateTime(notification.timestamp)}</span>
                <button class="toggle-read-btn">
                    ${notification.read ? 'Mark as Unread' : 'Mark as Read'}
                </button>
            </div>
            <p class="notification-message">${notification.message}</p>
        </div>
    `;

    // Add click handler for navigation
    notificationElement.addEventListener('click', (e) => {
        // Don't navigate if clicking the toggle read button
        if (!e.target.classList.contains('toggle-read-btn')) {
            const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
            if (loggedInUser && loggedInUser.role === "supervisor") {
                window.location.href = 'supervisorHome.html';
            }
        }
    });

    // Add click handler for toggle read button
    const toggleReadBtn = notificationElement.querySelector('.toggle-read-btn');
    toggleReadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateNotificationStatus(notification.id, !notification.read);
    });

    return notificationElement;
}

// Function to update notifications UI
function updateNotificationsUI(notifications, filter = 'all') {
    const container = document.getElementById('notificationsContainer');
    container.innerHTML = '';

    let filteredNotifications = notifications;
    if (filter === 'read') {
        filteredNotifications = notifications.filter(n => n.read);
    } else if (filter === 'unread') {
        filteredNotifications = notifications.filter(n => !n.read);
    }

    if (filteredNotifications.length === 0) {
        container.innerHTML = '<p class="no-notifications">No notifications found</p>';
        return;
    }

    filteredNotifications.forEach(notification => {
        const element = createNotificationElement(notification);
        container.appendChild(element);
    });
}

// Function to mark all notifications as read
async function markAllAsRead(userId) {
    try {
        const notificationsCollection = collection(db, "notifications");
        const q = query(
            notificationsCollection, 
            where("userId", "==", userId),
            where("read", "==", false)
        );

        const querySnapshot = await getDocs(q);
        const updatePromises = querySnapshot.docs.map(doc => 
            updateDoc(doc.ref, { read: true })
        );
        await Promise.all(updatePromises);
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
    }
}

// Initialize notifications page
document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser || !loggedInUser.username) {
        alert("Please log in to view notifications");
        window.location.href = "login.html";
        return;
    }

    const userId = loggedInUser.username;

    // Set up notifications listener
    const notificationsCollection = collection(db, "notifications");
    const notificationsQuery = query(
        notificationsCollection,
        where("userId", "==", userId),
        orderBy("timestamp", "desc")
    );

    // Listen for real-time updates
    onSnapshot(notificationsQuery, (snapshot) => {
        const notifications = [];
        snapshot.forEach((doc) => {
            notifications.push({ id: doc.id, ...doc.data() });
        });
        
        const filterSelect = document.getElementById('filterNotifications');
        updateNotificationsUI(notifications, filterSelect.value);
        
        // Update notification count
        const unreadCount = notifications.filter(n => !n.read).length;
        const notificationCount = document.getElementById('notificationCount');
        notificationCount.textContent = unreadCount;
        notificationCount.style.display = unreadCount > 0 ? 'block' : 'none';
    });

    // Set up filter change handler
    const filterSelect = document.getElementById('filterNotifications');
    filterSelect.addEventListener('change', (e) => {
        const notificationsContainer = document.getElementById('notificationsContainer');
        const notifications = Array.from(notificationsContainer.children)
            .map(el => ({
                id: el.getAttribute('data-id'),
                read: el.classList.contains('read'),
                message: el.querySelector('.notification-message').textContent,
                timestamp: el.querySelector('.notification-time').textContent
            }));
        updateNotificationsUI(notifications, e.target.value);
    });

    // Set up mark all as read button
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    markAllReadBtn.addEventListener('click', () => markAllAsRead(userId));
});
