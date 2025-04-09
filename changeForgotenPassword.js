import { getDocs, collection, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";
import { db } from "./firebase.js";

// Function to read login data from Firestore
async function readLoginData() {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        let loginData = [];
        querySnapshot.forEach((doc) => {
            loginData.push({ id: doc.id, ...doc.data() });
        });
        console.log('Read login data from Firestore:', loginData);
        return loginData;
    } catch (error) {
        console.error('Error reading login data from Firestore:', error);
        return [];
    }
}

// Function to write updated login data to Firestore
async function writeLoginData(updatedUser) {
    try {
        const userRef = doc(db, "users", updatedUser.email); // Use updatedUser.email for the doc ID
        await updateDoc(userRef, { password: updatedUser.password });
        console.log('Updated login data in Firestore:', updatedUser);
        return true;
    } catch (error) {
        console.error('Error writing login data to Firestore:', error);
        return false;
    }
}

// Function to validate and change forgotten password
async function validateAndChangePassword(email, newPassword, confirmPassword) {
    console.log('Attempting password change for email:', email);
    
    // Read current login data
    const loginData = await readLoginData();
    if (!loginData || loginData.length === 0) {
        return { success: false, message: 'Unable to access login data' };
    }

    // Find user
    const user = loginData.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (!user) {
        return { success: false, message: 'Email not found' };
    }

    // Verify new passwords match
    if (newPassword !== confirmPassword) {
        return { success: false, message: 'New passwords do not match' };
    }

    // Update password
    user.password = newPassword;

    // Write updated data
    const updateSuccess = await writeLoginData(user);
    if (!updateSuccess) {
        return { success: false, message: 'Failed to update password' };
    }

    return { 
        success: true, 
        message: 'Password updated successfully',
        userType: user.type
    };
}

// Add event listener when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    
    // Add event listener for the Reset button
    const resetButton = document.querySelector('.reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', (e) => {
            e.preventDefault();
            form.reset();
        });
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted');

        const email = document.getElementById('username').value.trim();
        const newPassword = document.getElementById('newPassword').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();

        console.log('Form values:', {
            email,
            newPasswordLength: newPassword.length,
            confirmPasswordLength: confirmPassword.length
        });

        // Basic validation
        if (!email || !newPassword || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }

        const result = await validateAndChangePassword(
            email, 
            newPassword, 
            confirmPassword
        );

        if (result.success) {
            alert(result.message);
            // Redirect based on user type
            if (result.userType === 'student') {
                window.location.href = 'student home.html';
            } else if (result.userType === 'supervisor') {
                window.location.href = 'supervisorHome.html';
            }
        } else {
            alert(result.message);
        }
    });
});
