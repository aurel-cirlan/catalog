/*!
  Catalog GEALAN - autentificare
  Copyright (c) 2026 Aurel Cirlan - https://aurelcirlan.ro
  Toate drepturile rezervate. Copierea, modificarea sau redistribuirea
  acestui cod fara acordul scris al autorului este interzisa.
*/

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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
function isValidPassword(password) {
  return password.length >= 8;
}

// Check if user exists
function userExists(email) {
  const users = getUsers();
  return users.some(user => user.email.toLowerCase() === email.toLowerCase());
}

// Login function
function login(email, password, remember = false) {
  hideMessages();

  // Validate email
  if (!isValidEmail(email)) {
    showError('Email invalid. Introdu un email valid.');
    return false;
  }

  // Validate password
  if (!password) {
    showError('Parola este obligatorie.');
    return false;
  }

  // Check if user exists
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    showError('Utilizatorul nu există. Înregistrează-te pentru a accesa catalogul.');
    return false;
  }

  // Check password
  if (user.password !== password) {
    showError('Parolă incorectă.');
    return false;
  }

  // Check if user is approved
  if (user.status === 'pending') {
    showError('Contul tău este în așteptare de aprobare. Te vom anunța când va fi activ.');
    return false;
  }

  if (user.status === 'rejected') {
    showError('Contul tău a fost respins. Contactează administratorul pentru detalii.');
    return false;
  }

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

// Register function
function register(email, password, confirmPassword) {
  console.log('register function called');
  console.log('Email:', email);
  console.log('Password length:', password ? password.length : 0);
  console.log('Confirm password length:', confirmPassword ? confirmPassword.length : 0);

  hideMessages();

  // Validate email
  if (!isValidEmail(email)) {
    console.log('Email validation failed');
    showError('Email invalid. Introdu un email valid.');
    return false;
  }

  // Validate password
  if (!isValidPassword(password)) {
    console.log('Password validation failed');
    showError('Parola trebuie să aibă minim 8 caractere.');
    return false;
  }

  // Validate confirm password
  if (password !== confirmPassword) {
    console.log('Password mismatch');
    showError('Parolele nu se potrivesc.');
    return false;
  }

  // Check if user already exists
  if (userExists(email)) {
    console.log('User already exists');
    showError('Un utilizator cu acest email există deja.');
    return false;
  }

  console.log('Creating new user');
  // Create new user with pending status
  const newUser = {
    email: email.toLowerCase(),
    password: password,
    status: 'pending', // pending, approved, rejected
    createdAt: new Date().toISOString()
  };

  // Save user
  const users = getUsers();
  users.push(newUser);
  saveUsers(users);

  console.log('User saved successfully with pending status');

  // Show success message
  showSuccess('Cont creat cu succes! Contul tău va fi aprobat manual. Te vom anunța când va fi activ.');

  // Redirect to login after 3 seconds
  setTimeout(() => {
    console.log('Redirecting to login.html');
    window.location.href = 'login.html';
  }, 3000);

  return true;
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
