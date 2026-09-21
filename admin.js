const loginView = document.querySelector("#loginView");
const dashboardView = document.querySelector("#dashboardView");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const dashboardMessage = document.querySelector("#dashboardMessage");
const applicationsBody = document.querySelector("#applicationsBody");
const summary = document.querySelector("#summary");
const statusFilter = document.querySelector("#statusFilter");

function showMessage(element, message, isError = true) {
    element.textContent = message;
    element.className = `message ${isError ? "error" : "success"}`;
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);
}

function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character]));
}

function statusLabel(status) {
    return { fee_required: "Awaiting fee", not_qualified: "Not qualified", approved: "Approved", rejected: "Rejected" }[status] || status;
}

function renderSummary(counts) {
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const cards = [
        ["Registered", total, ""],
        ["Awaiting fee", counts.fee_required || 0, "fee_required"],
        ["Approved", counts.approved || 0, "approved"],
        ["Rejected", counts.rejected || 0, "rejected"]
    ];
    summary.innerHTML = cards.map(([label, value, status]) => `<button class="summary-card" type="button" data-status="${status}"><span>${label}</span><strong>${value}</strong></button>`).join("");
    summary.querySelectorAll(".summary-card").forEach((card) => card.addEventListener("click", () => {
        statusFilter.value = card.dataset.status;
        loadApplications();
    }));
}

function renderApplications(applications) {
    if (!applications.length) {
        applicationsBody.innerHTML = '<tr><td class="empty" colspan="7">No applications match this filter.</td></tr>';
        return;
    }
    applicationsBody.innerHTML = applications.map((application) => {
        const canApprove = application.fee_status === "paid" && application.status === "fee_required";
        const action = application.status === "fee_required"
            ? `<button class="table-action approve-action" data-id="${application.id}" ${canApprove ? "" : "disabled"}>Approve</button><button class="table-action reject-action" data-id="${application.id}">Reject</button>`
            : "-";
        return `<tr>
            <td><strong>${escapeHtml(application.first_name)} ${escapeHtml(application.last_name)}</strong><small>${escapeHtml(application.loan_purpose)}</small></td>
            <td>${escapeHtml(application.email)}<small>${escapeHtml(application.phone)}</small></td>
            <td>${escapeHtml(application.loan_type)}${application.business_name ? `<small>${escapeHtml(application.business_name)}</small>` : ""}</td>
            <td>${formatCurrency(application.requested_amount)}</td>
            <td><span class="fee-pill ${application.fee_status}">${escapeHtml(application.fee_status)}</span></td>
            <td><span class="status-pill ${application.status}">${statusLabel(application.status)}</span></td>
            <td>${action}</td>
        </tr>`;
    }).join("");
    applicationsBody.querySelectorAll(".table-action").forEach((button) => button.addEventListener("click", () => updateStatus(button.dataset.id, button.classList.contains("approve-action") ? "approved" : "rejected")));
}

async function loadApplications() {
    dashboardMessage.textContent = "Loading applications...";
    const query = statusFilter.value ? `?status=${encodeURIComponent(statusFilter.value)}` : "";
    try {
        const response = await fetch(`/api/admin/applications${query}`);
        const result = await response.json();
        if (response.status === 401) {
            showDashboard(false);
            return;
        }
        if (!response.ok) throw new Error(result.error || "Could not load applications.");
        renderSummary(result.counts);
        renderApplications(result.applications);
        dashboardMessage.textContent = "";
    } catch (error) {
        showMessage(dashboardMessage, error.message);
    }
}

async function updateStatus(id, status) {
    if (!window.confirm(`Mark this application as ${status}?`)) return;
    const response = await fetch(`/api/admin/applications/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const result = await response.json();
    if (!response.ok) {
        showMessage(dashboardMessage, result.error || "Could not update status.");
        return;
    }
    showMessage(dashboardMessage, `Application marked ${status}.`, false);
    loadApplications();
}

function showDashboard(isAuthenticated) {
    loginView.hidden = isAuthenticated;
    dashboardView.hidden = !isAuthenticated;
    if (isAuthenticated) loadApplications();
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: document.querySelector("#adminPassword").value }) });
    const result = await response.json();
    if (!response.ok) {
        showMessage(loginMessage, result.error || "Login failed.");
        return;
    }
    loginForm.reset();
    showDashboard(true);
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    showDashboard(false);
});
document.querySelector("#refreshButton").addEventListener("click", loadApplications);
statusFilter.addEventListener("change", loadApplications);
document.querySelectorAll(".summary-card").forEach((card) => card.addEventListener("click", loadApplications));

fetch("/api/admin/session").then((response) => response.json()).then((result) => showDashboard(result.authenticated));