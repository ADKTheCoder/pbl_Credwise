/* ==========================================================
   GLOBAL CHART REFERENCES
========================================================== */
let utilizationChart = null;
let cardBarChart = null;


/* ==========================================================
   AUTH PROTECTION
========================================================== */
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    initializeListeners();
  }
});


/* ==========================================================
   SIDEBAR TOGGLE
========================================================== */
function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("collapsed");
}


/* ==========================================================
   PAGE SWITCHING
========================================================== */
function switchPage(pageId, element) {

  document.querySelectorAll(".section").forEach(section => {
    section.classList.add("hidden");
  });

  document.getElementById(pageId).classList.remove("hidden");

  document.querySelectorAll(".sidebar li").forEach(li => {
    li.classList.remove("active");
  });

  if (element) element.classList.add("active");
}


/* ==========================================================
   LOGOUT
========================================================== */
function logout() {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
}


/* ==========================================================
   ADD CARD
========================================================== */
function addCard() {

  const name = document.getElementById("cardName").value.trim();
  const limit = Number(document.getElementById("cardLimit").value);
  const outstanding = Number(document.getElementById("cardOutstanding").value);
  const dueDate = document.getElementById("cardDueDate").value;

  if (!name || limit <= 0 || outstanding < 0 || !dueDate) {
    alert("Enter valid card details.");
    return;
  }

  db.collection("cards").add({
    uid: auth.currentUser.uid,
    name,
    limit,
    outstanding,
    dueDate,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  document.getElementById("cardName").value = "";
  document.getElementById("cardLimit").value = "";
  document.getElementById("cardOutstanding").value = "";
  document.getElementById("cardDueDate").value = "";
}


/* ==========================================================
   DELETE CARD
========================================================== */
function deleteCard(docId) {
  if (!confirm("Delete this card?")) return;
  db.collection("cards").doc(docId).delete();
}


/* ==========================================================
   ADD EMI
========================================================== */
function addEmi() {

  const name = document.getElementById("emiName").value.trim();
  const amount = Number(document.getElementById("emiAmount").value);
  const months = Number(document.getElementById("emiMonths").value);
  const interest = Number(document.getElementById("emiInterest").value) || 0;

  if (!name || amount <= 0 || months <= 0) {
    alert("Enter valid EMI details.");
    return;
  }

  db.collection("emis").add({
    uid: auth.currentUser.uid,
    name,
    amount,
    months,
    interest,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  document.getElementById("emiName").value = "";
  document.getElementById("emiAmount").value = "";
  document.getElementById("emiMonths").value = "";
  document.getElementById("emiInterest").value = "";
}


/* ==========================================================
   DELETE EMI
========================================================== */
function deleteEmi(docId) {
  if (!confirm("Delete this EMI?")) return;
  db.collection("emis").doc(docId).delete();
}


/* ==========================================================
   INITIALIZE LISTENERS (No nested stacking)
========================================================== */
function initializeListeners() {

  const userId = auth.currentUser.uid;

  const cardsRef = db.collection("cards").where("uid", "==", userId);
  const emisRef = db.collection("emis").where("uid", "==", userId);

  let cardsData = [];
  let emisData = [];

  cardsRef.onSnapshot(snapshot => {
    cardsData = snapshot.docs;
    processData(cardsData, emisData);
  });

  emisRef.onSnapshot(snapshot => {
    emisData = snapshot.docs;
    processData(cardsData, emisData);
  });
}


/* ==========================================================
   PROCESS DATA
========================================================== */
function processData(cardDocs, emiDocs) {

  let totalLimit = 0;
  let totalOutstanding = 0;
  let totalMonthlyEmi = 0;
  let totalEmiExposure = 0;

  let cardNames = [];
  let cardValues = [];

  const cardList = document.getElementById("cardList");
  const emiList = document.getElementById("emiList");
  const dueList = document.getElementById("dueList");

  cardList.innerHTML = "";
  emiList.innerHTML = "";
  dueList.innerHTML = "";

  const today = new Date();
  let dueArray = [];

  /* =========================
     CARDS
  ========================== */
  cardDocs.forEach(doc => {

    const card = doc.data();
    const docId = doc.id;

    totalLimit += card.limit;
    totalOutstanding += card.outstanding;

    cardNames.push(card.name);
    cardValues.push(card.outstanding);

    cardList.innerHTML += `
      <div class="card-box">
        <strong>${card.name}</strong>
        <p>Limit: ₹${card.limit.toLocaleString()}</p>
        <p>Outstanding: ₹${card.outstanding.toLocaleString()}</p>
        <p>Due: ${card.dueDate}</p>
        <button onclick="deleteCard('${docId}')">Delete</button>
      </div>
    `;

    const dueDate = new Date(card.dueDate);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    dueArray.push({
      name: card.name,
      diff: diffDays,
      date: card.dueDate
    });
  });

  /* Sort due dates */
  dueArray.sort((a, b) => a.diff - b.diff);

  dueArray.forEach(item => {

    let status = "";
    let className = "";

    if (item.diff < 0) {
      status = "Overdue";
      className = "overdue";
    } else {
      status = `${item.diff} day(s) remaining`;
    }

    dueList.innerHTML += `
      <p class="${className}">
        ${item.name} – ${status}
      </p>
    `;
  });

  if (dueArray.length === 0) {
    dueList.innerHTML = "<p>No dues available.</p>";
  }

  /* =========================
     EMIs
  ========================== */
  emiDocs.forEach(doc => {

    const emi = doc.data();
    const docId = doc.id;

    totalMonthlyEmi += emi.amount;
    totalEmiExposure += emi.amount * emi.months;

    emiList.innerHTML += `
      <div class="card-box">
        <strong>${emi.name}</strong>
        <p>Monthly EMI: ₹${emi.amount.toLocaleString()}</p>
        <p>Tenure: ${emi.months} months</p>
        <p>Total Exposure: ₹${(emi.amount * emi.months).toLocaleString()}</p>
        <p>Interest: ${emi.interest || 0}%</p>
        <button onclick="deleteEmi('${docId}')">Delete</button>
      </div>
    `;
  });

  updateDashboard(
    totalLimit,
    totalOutstanding,
    totalMonthlyEmi,
    totalEmiExposure,
    cardNames,
    cardValues
  );
}


/* ==========================================================
   CIBIL MODEL (Balanced + Cleaner)
========================================================== */
function calculateCibil(utilization, exposure) {

  let score = 850;

  score -= utilization * 1.8;
  score -= exposure * 0.0015;

  if (score < 300) score = 300;
  if (score > 900) score = 900;

  return Math.floor(score);
}


/* ==========================================================
   DASHBOARD UPDATE
========================================================== */
function updateDashboard(limit, outstanding, monthlyEmi, exposure, labels, values) {

  const utilization = limit > 0
    ? (outstanding / limit) * 100
    : 0;

  const cibil = calculateCibil(utilization, exposure);

  document.getElementById("totalLimit").innerText =
    "₹" + limit.toLocaleString();

  document.getElementById("totalOutstanding").innerText =
    "₹" + outstanding.toLocaleString();

  document.getElementById("totalEmi").innerText =
    "₹" + monthlyEmi.toLocaleString();

  document.getElementById("utilization").innerText =
    utilization.toFixed(1) + "%";

  const cibilEl = document.getElementById("cibilScore");
  cibilEl.innerText = cibil;

  cibilEl.classList.remove("cibil-green", "cibil-yellow", "cibil-red");

  if (cibil >= 750) {
    cibilEl.classList.add("cibil-green");
  } else if (cibil >= 650) {
    cibilEl.classList.add("cibil-yellow");
  } else {
    cibilEl.classList.add("cibil-red");
  }

  generateAIInsight(utilization, monthlyEmi, exposure);

  renderCharts(limit, outstanding, labels, values);
}


/* ==========================================================
   AI ENGINE
========================================================== */
function generateAIInsight(utilization, monthlyEmi, exposure) {

  let insight;

  if (utilization < 30 && exposure < 400000) {
    insight = "Credit profile is strong and well managed.";
  } else if (utilization < 60) {
    insight = "Moderate credit usage. Reducing outstanding will improve score.";
  } else {
    insight = "High credit stress detected. Immediate correction recommended.";
  }

  if (monthlyEmi > 30000) {
    insight += " EMI burden is significant.";
  }

  document.getElementById("aiInsight").innerText = insight;
}


/* ==========================================================
   CHARTS
========================================================== */
function renderCharts(limit, outstanding, labels, values) {

  if (utilizationChart) utilizationChart.destroy();
  if (cardBarChart) cardBarChart.destroy();

  utilizationChart = new Chart(document.getElementById("utilChart"), {
    type: "doughnut",
    data: {
      labels: ["Used", "Available"],
      datasets: [{
        data: [outstanding, limit - outstanding],
        backgroundColor: ["#ffffff", "#2a2a35"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%"
    }
  });

  cardBarChart = new Chart(document.getElementById("cardChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Outstanding",
        data: values,
        backgroundColor: "#ffffff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}