// Select elements
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profileRole = document.getElementById("profile-role");
const logoutButton = document.getElementById("logout-button");

// Retrieve user data from localStorage
const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

// Check if user is logged in
if (loggedInUser) {
    profileName.textContent = loggedInUser.name || "Unknown User"; // Default if name is missing
    profileEmail.textContent = loggedInUser.username || "No Email Provided";
    profileRole.textContent = loggedInUser.type || "No Role Assigned";
} else {
    // Redirect to login page if not logged in
    window.location.href = "login.html";
}

// Logout function
logoutButton.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser"); // Clear user data
    window.location.href = "login.html"; // Redirect to login page
});
