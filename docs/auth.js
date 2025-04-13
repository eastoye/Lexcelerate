// auth.js
export function checkLogin() {
  const currentUser = localStorage.getItem('currentUser');
  return currentUser;
}

export function loginUser(username, password) {
  // (Simple demo—replace with real authentication if needed)
  if (username.trim() === "" || password.trim() === "") {
    alert("Please enter both a username and password.");
    return null;
  }
  localStorage.setItem('currentUser', username);
  return username;
}

export function logoutUser() {
  localStorage.removeItem('currentUser');
}
