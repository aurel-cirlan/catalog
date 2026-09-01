/*!
  Catalog GEALAN - autentificare
  Copyright (c) 2026 Aurel Cirlan - https://aurelcirlan.ro
  Toate drepturile rezervate. Copierea, modificarea sau redistribuirea
  acestui cod fara acordul scris al autorului este interzisa.
*/

console.log('=== AUTH.JS LOADED ===');

// localStorage keys
const USERS_KEY = 'catalog_users';
const CURRENT_USER_KEY = 'catalog_current_user';
const SESSION_KEY = 'catalog_session';

// Helper functions for localStorage
function getUsers() {
  try {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

// Hardcoded users (max 10)
const HARDCODED_USERS = [
  // Admin account
  { email: 'admin@catalog.ro', password: 'admin123', isAdmin: true },
  // User accounts (max 9 additional users)
  { email: 'user1@catalog.ro', password: 'user123', isAdmin: false },
  { email: 'user2@catalog.ro', password: 'user123', isAdmin: false },
  { email: 'user3@catalog.ro', password: 'user123', isAdmin: false },
  { email: 'user4@catalog.ro', password: 'user123', isAdmin: false },
  { email: 'user5@catalog.ro', password: 'user123', isAdmin: false },
  { email: 'user6@catalog.ro', password: 'user123', isAdmin: false },
  { email: 'user7@catalog.ro', password: 'user123', isAdmin: false },
  { email: 'user8@catalog.ro', password: 'user123', isAdmin: false },
  { email: 'user9@catalog.ro', password: 'user123', isAdmin: false },
  { email: 'user10@catalog.ro', password: 'user123', isAdmin: false },
];

const MAX_USERS = 10;

console.log('=== AUTH.JS HARDCODED_USERS ===');
console.log('HARDCODED_USERS:', HARDCODED_USERS);
console.log('=== END HARDCODED_USERS ===');

function getCurrentUser() {
  try {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

function setCurrentUser(user) {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error setting current user:', error);
  }
}

function clearCurrentUser() {
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch (error) {
    console.error('Error clearing current user:', error);
  }
}

function isUserLoggedIn() {
  return getCurrentUser() !== null;
}

// Check if this is the protected domain
function isProtectedDomain() {
  return window.location.hostname === 'app.catalog.aurelcirlan.ro';
}

// Show error message
function showError(message) {
  const errorDiv = document.getElementById('error');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.hidden = false;
  }
}

// Show success message
function showSuccess(message) {
  const successDiv = document.getElementById('success');
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.hidden = false;
  }
}

// Hide messages
function hideMessages() {
  const errorDiv = document.getElementById('error');
  const successDiv = document.getElementById('success');
  if (errorDiv) errorDiv.hidden = true;
  if (successDiv) successDiv.hidden = true;
}

// Validate email format
function isValidEmail(email) {
  console.log('isValidEmail called with:', email);
  // Simplified validation - just check if it has @ and .
  const isValid = email && email.includes('@') && email.includes('.');
  console.log('Email validation result:', isValid);
  return isValid;
}

// Validate password strength
function isValidPassword(password) {
  return password.length >= 8;
}

// Check if user exists
function userExists(email) {
  console.log('userExists called with:', email);
  const users = getUsers();
  console.log('Current users:', users);
  const exists = users.some(user => user.email.toLowerCase() === email.toLowerCase());
  console.log('User exists result:', exists);
  return exists;
}

// Login function
function login(email, password, remember = false) {
  console.log('Login function called');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Hardcoded users:', HARDCODED_USERS);

  hideMessages();

  // Validate email
  if (!isValidEmail(email)) {
    console.log('Email validation failed');
    showError('Email invalid. Introdu un email valid.');
    return false;
  }

  // Validate password
  if (!password) {
    console.log('Password validation failed');
    showError('Parola este obligatorie.');
    return false;
  }

  // Check if user exists in hardcoded users
  const user = HARDCODED_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  console.log('Found user:', user);

  if (!user) {
    console.log('User not found in HARDCODED_USERS');
    showError('Utilizatorul nu există. Contactează administratorul pentru acces.');
    return false;
  }

  // Check password
  if (user.password !== password) {
    console.log('Password mismatch');
    showError('Parolă incorectă.');
    return false;
  }

  console.log('Login successful');
  // Set current user
  setCurrentUser(user);

  // Remember me option
  if (remember) {
    localStorage.setItem(SESSION_KEY, 'true');
  } else {
    localStorage.removeItem(SESSION_KEY);
  }

  // Redirect to index.html
  window.location.href = 'index.html';

  return true;
}

// Register function (disabled - no registration allowed)
function register(email, password, confirmPassword) {
  hideMessages();
  showError('Înregistrarea nu este permisă. Contactează administratorul pentru acces.');
  return false;
}

// Logout function
function logout() {
  clearCurrentUser();
  localStorage.removeItem(SESSION_KEY);
  window.location.href = 'login.html';
}

// Check authentication on page load
function checkAuth() {
  // Debug log
  console.log('checkAuth called');
  console.log('Current URL:', window.location.href);
  console.log('Current Path:', window.location.pathname);
  console.log('isAuthPage:', window.isAuthPage);
  console.log('isProtectedDomain:', isProtectedDomain());
  console.log('isUserLoggedIn:', isUserLoggedIn());

  // Skip auth check if this is an auth page (login/register)
  if (window.isAuthPage) {
    console.log('Skipping auth check - isAuthPage is true');
    return;
  }

  // Skip auth check if not on protected domain
  if (!isProtectedDomain()) {
    console.log('Skipping auth check - not on protected domain');
    return;
  }

  // Check if user is logged in
  if (!isUserLoggedIn()) {
    console.log('User not logged in - redirecting to register.html');
    // Redirect to register page (first thing to see)
    window.location.href = 'register.html';
  } else {
    console.log('User is logged in - no redirect');
  }
}

// Login form handler
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;

    login(email, password, remember);
  });
}

// Register form handler
if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    register(email, password, confirmPassword);
  });
}

// Don't run auth check automatically - will be called from index.html only
// document.addEventListener('DOMContentLoaded', function() {
//   checkAuth();
// });
