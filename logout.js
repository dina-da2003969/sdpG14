const logoutButton = document.getElementById("logout-button");

logoutButton.addEventListener("click", () => {
    
    // Remove user data from localStorage
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
});
