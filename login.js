import { getDocs, collection } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";
import { db } from "./firebase.js";

// Select the form and input fields
const form = document.querySelector("#login-form");
const username = document.querySelector('#username');
const password = document.querySelector('#password');

// Add a submit event listener to the form
form.addEventListener("submit", checkInfo);

// Configuration for routes and messages
const CONFIG = {
    ROUTES: {
        STUDENT: './dr home.html',       // Redirect URL for students
        SUPERVISOR: './supervisorHome.html' // Redirect URL for supervisors
    },
    MESSAGES: {
        ERROR_LOGIN: 'Username or password is incorrect', // Error message for incorrect login
        ERROR_TYPE: 'Invalid user type encountered'       // Error message for unrecognized user type
    }
};

// Function to fetch user data from Firestore
async function fetchUsersFromFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, "users")); 
        const users = [];
        querySnapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() }); // Store full user data
        });
        return users;
    } catch (error) {
        console.error("Error fetching users from Firestore:", error);
        throw new Error("Failed to load users");
    }
}

// Function to handle login form submission
async function checkInfo(e) {
    e.preventDefault();

    try {
        const userValue = username.value.trim();
        const passValue = password.value.trim();
        
        const userData = await fetchUsersFromFirestore();
        const user = userData.find(user => user.username === userValue && user.password === passValue);

        if (user) {
            // Save all user information in localStorage
            localStorage.setItem("loggedInUser", JSON.stringify(user));
            
            // Redirect based on user type
            switch (user.type.toLowerCase()) {
                case 'student':
                    window.location.href = CONFIG.ROUTES.STUDENT;
                    break;
                case 'supervisor':
                    window.location.href = CONFIG.ROUTES.SUPERVISOR;
                    break;
                default:
                    alert(CONFIG.MESSAGES.ERROR_TYPE);
            }
        } else {
            alert(CONFIG.MESSAGES.ERROR_LOGIN);
        }
    } catch (error) {
        console.error("Error during login process:", error);
        alert(CONFIG.MESSAGES.ERROR_LOGIN);
    } finally {
        form.reset();
    }
}
