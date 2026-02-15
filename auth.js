/* ==========================================================
   DOM REFERENCES (Safe Access)
========================================================== */

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const messageBox = document.getElementById("authMessage");
const loginButton = document.getElementById("loginBtn");


/* ==========================================================
   HELPER: SHOW STATUS MESSAGE
========================================================== */
function showMessage(text, type = "error") {

  if (!messageBox) return;

  messageBox.innerText = text;

  if (type === "error") {
    messageBox.style.color = "#ff6b6b";
  } else {
    messageBox.style.color = "#8fffaf";
  }
}


/* ==========================================================
   HELPER: BUTTON LOADING STATE
========================================================== */
function setLoading(state) {

  if (!loginButton) return;

  if (state) {
    loginButton.disabled = true;
    loginButton.innerText = "Processing...";
    loginButton.style.opacity = "0.6";
  } else {
    loginButton.disabled = false;
    loginButton.innerText = "Login";
    loginButton.style.opacity = "1";
  }
}


/* ==========================================================
   REGISTER USER
========================================================== */
function register() {

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage("Email and password are required.");
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters.");
    return;
  }

  setLoading(true);

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      showMessage("Account created successfully.", "success");
      window.location.href = "dashboard.html";
    })
    .catch(error => {
      showMessage(formatFirebaseError(error.code));
      setLoading(false);
    });
}


/* ==========================================================
   LOGIN USER
========================================================== */
function login() {

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage("Email and password are required.");
    return;
  }

  setLoading(true);

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = "dashboard.html";
    })
    .catch(error => {
      showMessage(formatFirebaseError(error.code));
      setLoading(false);
    });
}


/* ==========================================================
   FORMAT FIREBASE ERRORS (Cleaner UX)
========================================================== */
function formatFirebaseError(code) {

  switch (code) {
    case "auth/user-not-found":
      return "No account found with this email.";

    case "auth/wrong-password":
      return "Incorrect password.";

    case "auth/email-already-in-use":
      return "Email already registered.";

    case "auth/invalid-email":
      return "Invalid email address.";

    default:
      return "Authentication failed. Please try again.";
  }
}


/* ==========================================================
   ENTER KEY SUPPORT
========================================================== */
if (passwordInput) {
  passwordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      login();
    }
  });
}


/* ==========================================================
   AUTH STATE PROTECTION
========================================================== */
auth.onAuthStateChanged(user => {

  const currentPage = window.location.pathname;

  // Logged in but still on login page
  if (user && currentPage.includes("index")) {
    window.location.href = "dashboard.html";
  }

  // Not logged in but trying dashboard
  if (!user && currentPage.includes("dashboard")) {
    window.location.href = "index.html";
  }

});