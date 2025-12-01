const API_BASE_URL = 'http://localhost:3000/api';

// Check if user is already logged in
if (sessionStorage.getItem('currentUser')) {
    window.location.href = 'index.html';
}

// Setup form event listeners
document.getElementById('login-form').addEventListener('submit', handleLogin);
document.getElementById('signup-form').addEventListener('submit', handleSignup);

function showSignup(event) {
    event.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
    clearError();
}

function showLogin(event) {
    event.preventDefault();
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    clearError();
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showError('Please enter both email and password');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.user) {
            // Store user info in session
            sessionStorage.setItem('currentUser', JSON.stringify(data.user));
            // Redirect to dashboard
            window.location.href = 'index.html';
        } else {
            showError(data.message || 'Invalid email or password');
        }
    } catch (error) {
        showError('Connection error. Please make sure the server is running.');
        console.error('Login error:', error);
    }
}

async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-password-confirm').value;
    
    if (!name || !email || !password || !confirmPassword) {
        showError('Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
        showError('Password must be at least 8 characters and contain uppercase, lowercase, and number');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.user) {
            // Store user info in session
            sessionStorage.setItem('currentUser', JSON.stringify(data.user));
            // Redirect to dashboard
            window.location.href = 'index.html';
        } else {
            showError(data.message || 'Failed to create account. Email may already be in use.');
        }
    } catch (error) {
        showError('Connection error. Please make sure the server is running.');
        console.error('Signup error:', error);
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

function clearError() {
    const errorDiv = document.getElementById('error-message');
    errorDiv.classList.remove('show');
}
