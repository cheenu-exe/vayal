const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

let selectedRole = "farmer";
let authMode = "signin";
let currentUser = null;
let machinesCache = [];
let bookingsCache = [];
let toastTimer = null;

const roleLabels = {
  farmer: { title: "Farmer", uppercase: "FARMER ACCOUNT", workspace: "FARMER WORKSPACE" },
  machine_owner: { title: "Machinery Owner", uppercase: "MACHINERY OWNER ACCOUNT", workspace: "MACHINERY PARTNER WORKSPACE" }
};
const navItems = {
  farmer: [
    ["farmer-home","⌂","Overview"],
    ["farmer-machines","⌕","Find equipment"],
    ["farmer-book","＋","Book machinery"],
    ["farmer-requests","▤","My requests"]
  ],
  machine_owner: [
    ["owner-home","⌂","Overview"],
    ["owner-machines","▦","My equipment"],
    ["owner-add","＋","Add equipment"],
    ["owner-requests","▤","Booking requests"]
  ]
};
const machineIcons = { Tractor:"🚜", Rotavator:"⚙", Harvester:"🌾", Plough:"⌁", Other:"⚒" };

async function api(url, options = {}) {
  const config = {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  };
  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({ detail: "The server returned an unexpected response." }));
  if (!response.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail) ? detail.map(item => item.msg).join(" ") : (detail || "Request failed.");
    throw new Error(message);
  }
  return data;
}

function showToast(message, isError = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3400);
}

function showScreen(id) {
  ["roleScreen", "authScreen", "appScreen"].forEach(screenId => {
    $("#" + screenId).classList.toggle("hidden", screenId !== id);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openAuth(role) {
  selectedRole = role;
  $("#authRoleLabel").textContent = roleLabels[role].uppercase;
  $("#authTitle").textContent = role === "farmer" ? "Your farm starts here." : "Grow your equipment business.";
  $("#authDescription").textContent = role === "farmer"
    ? "Sign in or create a farmer account to find and book machinery."
    : "Sign in or create an owner account to list equipment and manage requests.";
  setAuthMode("signin");
  $("#authError").textContent = "";
  showScreen("authScreen");
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";
  $("#nameField").classList.toggle("hidden", !isSignup);
  $("#authName").required = isSignup;
  $("#authPassword").autocomplete = isSignup ? "new-password" : "current-password";
  $("#authPassword").minLength = isSignup ? 8 : 1;
  $("#authPassword").placeholder = isSignup ? "At least 8 characters" : "Enter your password";
  $("#showSignin").classList.toggle("active", !isSignup);
  $("#showSignup").classList.toggle("active", isSignup);
  $("#showSignin").setAttribute("aria-selected", String(!isSignup));
  $("#showSignup").setAttribute("aria-selected", String(isSignup));
  $("#authSubmit").innerHTML = isSignup ? 'Create account <span>→</span>' : 'Sign in <span>→</span>';
  $("#authError").textContent = "";
}

function buildNavigation() {
  const nav = $("#sidebarNav");
  const items = navItems[currentUser.role];
  $("#sidebarCaption").textContent = roleLabels[currentUser.role].workspace;
  nav.innerHTML = items.map(item =>
    '<button type="button" class="nav-item" data-go="' + item[0] + '">' +
      '<span class="nav-icon">' + item[1] + '</span><span>' + item[2] + '</span></button>'
  ).join("");
}

function showDashboard(user) {
  currentUser = user;
  $("#userGreeting").textContent = user.full_name;
  $("#accountTypeChip").textContent = roleLabels[user.role].title.toUpperCase();
  $$("[data-user-name]").forEach(node => { node.textContent = user.full_name.split(" ")[0]; });
  $("#farmerDashboard").classList.toggle("hidden", user.role !== "farmer");
  $("#ownerDashboard").classList.toggle("hidden", user.role !== "machine_owner");
  buildNavigation();
  showScreen("appScreen");
  switchPage(user.role === "farmer" ? "farmer-home" : "owner-home");
  if (user.role === "farmer") loadFarmerData();
  else loadOwnerData();
}

function switchPage(pageId) {
  const dashboard = currentUser && currentUser.role === "farmer" ? $("#farmerDashboard") : $("#ownerDashboard");
  dashboard.querySelectorAll(".dashboard-page").forEach(page => {
    page.classList.toggle("active", page.dataset.page === pageId);
  });
  $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.go === pageId));
  if (pageId === "farmer-machines") renderFarmerMachines();
  if (pageId === "farmer-requests") renderFarmerBookings();
  if (pageId === "owner-machines") renderOwnerMachines();
  if (pageId === "owner-requests") renderOwnerBookings();
}

function goTo(pageId) {
  switchPage(pageId);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function escapeHTML(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[char]);
}
function formatMoney(value) {
  return value == null ? "Price on request" : "₹" + Number(value).toLocaleString("en-IN") + ' <small>/ acre</small>';
}
function prettyStatus(status) {
  return String(status || "requested").replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}
function statusPill(status) {
  return '<span class="status-pill ' + escapeHTML(status) + '">' + escapeHTML(prettyStatus(status)) + '</span>';
}
function emptyState(message) {
  return '<div class="empty-state">' + escapeHTML(message) + '</div>';
}

async function loadFarmerData() {
  try {
    const results = await Promise.all([api("/api/machines"), api("/api/bookings")]);
    machinesCache = results[0];
    bookingsCache = results[1];
    renderFarmerMachines();
    renderFarmerBookings();
    $("#farmerTotal").textContent = bookingsCache.length;
    $("#farmerPending").textContent = bookingsCache.filter(item => item.status === "requested").length;
    $("#farmerConfirmed").textContent = bookingsCache.filter(item => item.status === "accepted").length;
    $("#farmerRecent").innerHTML = renderBookingCards(bookingsCache.slice(0, 3), "farmer");
  } catch (error) {
    showToast(error.message, true);
  }
}

function renderFarmerMachines() {
  const grid = $("#farmerMachineGrid");
  if (!grid) return;
  const search = ($("#machineSearch")?.value || "").trim().toLowerCase();
  const type = $("#machineTypeFilter")?.value || "";
  const filtered = machinesCache.filter(machine => {
    const text = [machine.title, machine.machine_type, machine.village, machine.district].join(" ").toLowerCase();
    return (!search || text.includes(search)) && (!type || machine.machine_type === type);
  });
  grid.innerHTML = filtered.length ? filtered.map(machine =>
    '<article class="machine-card">' +
      '<div class="machine-art">' + (machineIcons[machine.machine_type] || "🚜") + '</div>' +
      '<div class="machine-card-body"><h3>' + escapeHTML(machine.title) + '</h3>' +
      '<p>' + escapeHTML(machine.machine_type) + ' · ' + escapeHTML(machine.village) + ', ' + escapeHTML(machine.district) + '</p>' +
      '<p>' + escapeHTML(machine.landmark || machine.description || "Local machinery listing") + '</p>' +
      '<div class="machine-price">' + formatMoney(machine.rate_per_acre) + '</div>' +
      '<button class="button button-dark" type="button" data-book-machine="' + escapeHTML(machine.id) + '">Request this machine →</button></div></article>'
  ).join("") : emptyState("No matching equipment is listed yet. Try a different search or district.");
}

function renderBookingCards(bookings, mode) {
  if (!bookings || !bookings.length) return emptyState(mode === "farmer" ? "You have not submitted any booking requests yet." : "No matching farmer requests yet.");
  return bookings.map(booking => {
    const canCancel = mode === "farmer" && booking.status === "requested";
    const price = booking.estimated_total == null ? "Owner quote pending" : "Estimated total ₹" + Number(booking.estimated_total).toLocaleString("en-IN");
    const actions = canCancel
      ? '<div class="request-actions"><button class="button button-light" type="button" data-cancel-booking="' + escapeHTML(booking.id) + '">Cancel request</button></div>'
      : '<div class="request-actions">' + statusPill(booking.status) + '</div>';
    return '<article class="request-card"><div class="request-main">' +
      '<h3>' + escapeHTML(booking.machine_type) + ' · ' + escapeHTML(booking.acres) + ' acres</h3>' +
      '<p>' + escapeHTML(booking.village) + ', ' + escapeHTML(booking.district) + ' · ' + escapeHTML(booking.booking_date) + '</p>' +
      '<p>' + escapeHTML(price) + (booking.landmark ? ' · Near ' + escapeHTML(booking.landmark) : '') + '</p>' +
      '<p>Reference: ' + escapeHTML(String(booking.id).slice(0, 8).toUpperCase()) + '</p></div>' + actions + '</article>';
  }).join("");
}

function renderFarmerBookings() {
  const html = renderBookingCards(bookingsCache, "farmer");
  $("#farmerBookingList").innerHTML = html;
}

async function submitFarmerBooking(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  values.acres = Number(values.acres);
  values.latitude = values.latitude ? Number(values.latitude) : null;
  values.longitude = values.longitude ? Number(values.longitude) : null;
  values.machine_id = values.machine_id || null;
  const message = $("#farmerBookingMessage");
  message.textContent = "Submitting your request…";
  try {
    const result = await api("/api/bookings", { method: "POST", body: JSON.stringify(values) });
    form.reset();
    $("#selectedMachineId").value = "";
    $("#gpsStatus").textContent = "Or enter your village and landmark.";
    message.textContent = "Request submitted. Reference " + result.id.slice(0, 8).toUpperCase() + ". An owner must accept before it is confirmed.";
    showToast("Your booking request has been submitted.");
    await loadFarmerData();
    goTo("farmer-requests");
  } catch (error) {
    message.textContent = error.message;
  }
}

async function cancelFarmerBooking(id) {
  try {
    await api("/api/bookings/" + encodeURIComponent(id) + "?status=cancelled", { method: "PATCH" });
    showToast("Booking request cancelled.");
    await loadFarmerData();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function loadOwnerData() {
  try {
    const results = await Promise.all([api("/api/my/machines"), api("/api/bookings")]);
    machinesCache = results[0];
    bookingsCache = results[1];
    renderOwnerMachines();
    renderOwnerBookings();
    $("#ownerMachineTotal").textContent = machinesCache.length;
    $("#ownerPending").textContent = bookingsCache.filter(item => item.status === "requested").length;
    $("#ownerAccepted").textContent = bookingsCache.filter(item => item.status === "accepted").length;
    $("#ownerRecent").innerHTML = renderBookingCards(bookingsCache.slice(0, 3), "owner");
  } catch (error) {
    showToast(error.message, true);
  }
}

function renderOwnerMachines() {
  const grid = $("#ownerMachineGrid");
  if (!grid) return;
  grid.innerHTML = machinesCache.length ? machinesCache.map(machine =>
    '<article class="machine-card"><div class="machine-art">' + (machineIcons[machine.machine_type] || "🚜") + '</div>' +
    '<div class="machine-card-body"><h3>' + escapeHTML(machine.title) + '</h3>' +
    '<p>' + escapeHTML(machine.machine_type) + ' · ' + escapeHTML(machine.village) + ', ' + escapeHTML(machine.district) + '</p>' +
    '<div class="machine-price">' + formatMoney(machine.rate_per_acre) + '</div>' +
    '<p>' + (machine.available ? '<span class="status-pill accepted">Available</span>' : '<span class="status-pill cancelled">Unavailable</span>') + '</p>' +
    '<button class="button button-light" type="button" data-toggle-machine="' + escapeHTML(machine.id) + '" data-next-available="' + String(!machine.available) + '">' +
      (machine.available ? "Mark unavailable" : "Mark available") + '</button></div></article>'
  ).join("") : emptyState("You have not listed any machinery yet. Add your first machine to start receiving matching requests.");
}

function renderOwnerBookings() {
  const list = $("#ownerBookingList");
  if (!list) return;
  if (!bookingsCache.length) {
    list.innerHTML = emptyState("No matching requests yet. New requests will appear here when they match your equipment type and district.");
    return;
  }
  list.innerHTML = bookingsCache.map(booking => {
    let actions = statusPill(booking.status);
    if (booking.status === "requested") {
      const matching = machinesCache.filter(machine =>
        machine.available &&
        machine.machine_type.toLowerCase() === booking.machine_type.toLowerCase() &&
        machine.district.toLowerCase() === booking.district.toLowerCase()
      );
      const options = matching.map(machine =>
        '<option value="' + escapeHTML(machine.id) + '"' + (booking.machine_id === machine.id ? " selected" : "") + '>' +
        escapeHTML(machine.title) + ' · ' + escapeHTML(machine.village) + '</option>'
      ).join("");
      actions = '<div class="request-actions"><select aria-label="Choose your machine" data-assign-for="' + escapeHTML(booking.id) + '">' +
        '<option value="">Choose machine</option>' + options + '</select>' +
        '<button class="button button-dark" type="button" data-accept-booking="' + escapeHTML(booking.id) + '">Accept</button>' +
        '<button class="button button-light" type="button" data-reject-booking="' + escapeHTML(booking.id) + '">Decline</button></div>';
    }
    const price = booking.estimated_total == null ? "Quote not set" : "Estimated ₹" + Number(booking.estimated_total).toLocaleString("en-IN");
    return '<article class="request-card"><div class="request-main"><h3>' + escapeHTML(booking.machine_type) +
      ' · ' + escapeHTML(booking.acres) + ' acres</h3><p>Farmer: ' + escapeHTML(booking.farmer_name) + ' · ' +
      escapeHTML(booking.farmer_phone) + '</p><p>' + escapeHTML(booking.village) + ', ' + escapeHTML(booking.district) +
      ' · ' + escapeHTML(booking.booking_date) + '</p><p>' + escapeHTML(booking.landmark || booking.directions || "No field directions provided") +
      ' · ' + escapeHTML(price) + '</p></div>' + actions + '</article>';
  }).join("");
}

async function submitOwnerMachine(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  values.rate_per_acre = Number(values.rate_per_acre);
  const message = $("#ownerMachineMessage");
  message.textContent = "Publishing listing…";
  try {
    await api("/api/machines", { method: "POST", body: JSON.stringify(values) });
    form.reset();
    message.textContent = "Your machinery is now listed.";
    showToast("Equipment listing added.");
    await loadOwnerData();
    goTo("owner-machines");
  } catch (error) {
    message.textContent = error.message;
  }
}

async function acceptOwnerBooking(id) {
  const select = document.querySelector('[data-assign-for="' + CSS.escape(id) + '"]');
  if (!select || !select.value) {
    showToast("Choose one of your matching machines first.", true);
    return;
  }
  try {
    await api("/api/bookings/" + encodeURIComponent(id) + "?status=accepted&machine_id=" + encodeURIComponent(select.value), { method: "PATCH" });
    showToast("Booking accepted.");
    await loadOwnerData();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function rejectOwnerBooking(id) {
  try {
    await api("/api/bookings/" + encodeURIComponent(id) + "?status=rejected", { method: "PATCH" });
    showToast("Request declined.");
    await loadOwnerData();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function toggleMachine(id, available) {
  try {
    await api("/api/machines/" + encodeURIComponent(id) + "/availability?available=" + String(available), { method: "PATCH" });
    showToast(available ? "Machinery marked available." : "Machinery marked unavailable.");
    await loadOwnerData();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function signOut() {
  try { await api("/api/auth/signout", { method: "POST" }); } catch (_) {}
  currentUser = null;
  machinesCache = [];
  bookingsCache = [];
  showScreen("roleScreen");
}

function bindEvents() {
  $$("[data-role]").forEach(button => button.addEventListener("click", () => openAuth(button.dataset.role)));
  $("#backToRoles").addEventListener("click", () => showScreen("roleScreen"));
  $("#showSignin").addEventListener("click", () => setAuthMode("signin"));
  $("#showSignup").addEventListener("click", () => setAuthMode("signup"));
  $("#authForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    values.role = selectedRole;
    $("#authError").textContent = "";
    $("#authSubmit").disabled = true;
    try {
      const endpoint = authMode === "signup" ? "/api/auth/signup" : "/api/auth/signin";
      const result = await api(endpoint, { method: "POST", body: JSON.stringify(values) });
      form.reset();
      showToast(authMode === "signup" ? "Your Vayal account has been created." : "Signed in successfully.");
      showDashboard(result.user);
    } catch (error) {
      $("#authError").textContent = error.message;
    } finally {
      $("#authSubmit").disabled = false;
    }
  });
  $("#signoutButton").addEventListener("click", signOut);
  $("#sidebarNav").addEventListener("click", event => {
    const button = event.target.closest("[data-go]");
    if (button) goTo(button.dataset.go);
  });
  $("#appScreen").addEventListener("click", event => {
    const go = event.target.closest("[data-go]");
    if (go) { goTo(go.dataset.go); return; }
    const book = event.target.closest("[data-book-machine]");
    if (book) {
      const machine = machinesCache.find(item => item.id === book.dataset.bookMachine);
      if (machine) {
        $("#farmerBookingForm").elements.machine_type.value = machine.machine_type;
        $("#selectedMachineId").value = machine.id;
        goTo("farmer-book");
      }
      return;
    }
    const cancel = event.target.closest("[data-cancel-booking]");
    if (cancel) { cancelFarmerBooking(cancel.dataset.cancelBooking); return; }
    const accept = event.target.closest("[data-accept-booking]");
    if (accept) { acceptOwnerBooking(accept.dataset.acceptBooking); return; }
    const reject = event.target.closest("[data-reject-booking]");
    if (reject) { rejectOwnerBooking(reject.dataset.rejectBooking); return; }
    const toggle = event.target.closest("[data-toggle-machine]");
    if (toggle) { toggleMachine(toggle.dataset.toggleMachine, toggle.dataset.nextAvailable === "true"); }
  });
  $("#machineSearch").addEventListener("input", renderFarmerMachines);
  $("#machineTypeFilter").addEventListener("change", renderFarmerMachines);
  $("#farmerBookingForm").addEventListener("submit", submitFarmerBooking);
  $("#ownerMachineForm").addEventListener("submit", submitOwnerMachine);
  $("#gpsButton").addEventListener("click", () => {
    const status = $("#gpsStatus");
    if (!navigator.geolocation) {
      status.textContent = "GPS is not supported by this browser. Enter your village and landmark.";
      return;
    }
    status.textContent = "Getting your location…";
    navigator.geolocation.getCurrentPosition(position => {
      const form = $("#farmerBookingForm");
      form.elements.latitude.value = position.coords.latitude;
      form.elements.longitude.value = position.coords.longitude;
      status.textContent = "Location captured (accuracy about " + Math.round(position.coords.accuracy) + " m). Check that this is your field.";
    }, () => {
      status.textContent = "Could not get GPS. Enter your village, landmark and directions instead.";
    }, { enableHighAccuracy: true, timeout: 12000 });
  });
}

async function restoreSession() {
  try {
    const result = await api("/api/me");
    showDashboard(result.user);
  } catch (_) {
    showScreen("roleScreen");
  }
}

bindEvents();
const minDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
$("#farmerBookingForm").elements.booking_date.min = minDate;
restoreSession();
