const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const MAX_BODY_SIZE = 20 * 1024;
const REGISTRATION_FEE = 300;
const ALLOWED_LOAN_TYPES = new Set(["business", "microfinance", "personal"]);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_SESSION_TTL = 8 * 60 * 60 * 1000;
const adminSessions = new Map();
const database = new Database(path.join(ROOT, "jenga-capital.sqlite"));

database.exec(`
    CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        loan_type TEXT NOT NULL,
        business_name TEXT,
        requested_amount INTEGER NOT NULL,
        loan_purpose TEXT NOT NULL,
        status TEXT NOT NULL,
        registration_fee INTEGER NOT NULL DEFAULT ${REGISTRATION_FEE},
        fee_status TEXT NOT NULL DEFAULT 'unpaid',
        payment_reference TEXT,
        created_at TEXT NOT NULL,
        paid_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_applications_status
        ON applications(status);

    CREATE INDEX IF NOT EXISTS idx_applications_created_at
        ON applications(created_at);
`);

try {
    database.exec("ALTER TABLE applications ADD COLUMN reviewed_at TEXT");
} catch (error) {
    if (!error.message.includes("duplicate column name")) {
        throw error;
    }
}

function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    });
    response.end(JSON.stringify(payload));
}

function sendError(response, statusCode, message) {
    sendJson(response, statusCode, { error: message });
}

function parseCookies(request) {
    return Object.fromEntries(
        (request.headers.cookie || "")
            .split(";")
            .filter(Boolean)
            .map((cookie) => {
                const separator = cookie.indexOf("=");
                return [cookie.slice(0, separator).trim(), decodeURIComponent(cookie.slice(separator + 1).trim())];
            })
    );
}

function getAdminSession(request) {
    const token = parseCookies(request).jenga_admin_session;
    const session = token ? adminSessions.get(token) : null;
    if (!session || session.expiresAt < Date.now()) {
        if (token) adminSessions.delete(token);
        return null;
    }
    session.expiresAt = Date.now() + ADMIN_SESSION_TTL;
    return session;
}

function requireAdmin(request, response) {
    if (!getAdminSession(request)) {
        sendError(response, 401, "Admin login required.");
        return false;
    }
    return true;
}

function setAdminCookie(response, token) {
    response.setHeader("Set-Cookie", `jenga_admin_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ADMIN_SESSION_TTL / 1000}`);
}

function clearAdminCookie(response) {
    response.setHeader("Set-Cookie", "jenga_admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function isQualified(application) {
    return application.requestedAmount >= 1000 && application.requestedAmount <= 1000000;
}

function readBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";
        let bodySize = 0;

        request.on("data", (chunk) => {
            bodySize += chunk.length;
            if (bodySize > MAX_BODY_SIZE) {
                reject(new Error("Request body is too large."));
                request.destroy();
                return;
            }
            body += chunk;
        });
        request.on("end", () => {
            try {
                resolve(JSON.parse(body || "{}"));
            } catch {
                reject(new Error("Invalid request data."));
            }
        });
        request.on("error", reject);
    });
}

function cleanText(value, maxLength) {
    return String(value || "").trim().slice(0, maxLength);
}

function validateApplication(body) {
    const application = {
        firstName: cleanText(body.firstName, 80),
        lastName: cleanText(body.lastName, 80),
        phone: cleanText(body.phone, 30),
        email: cleanText(body.email, 160).toLowerCase(),
        loanType: cleanText(body.loanType, 30),
        businessName: cleanText(body.businessName, 160),
        requestedAmount: Number(body.requestedAmount),
        loanPurpose: cleanText(body.loanPurpose, 1000),
        consent: body.applicationConsent === "on" || body.applicationConsent === true
    };

    const errors = [];
    if (!application.firstName) errors.push("First name is required.");
    if (!application.lastName) errors.push("Last name is required.");
    if (!/^\+?[0-9 ()-]{7,20}$/.test(application.phone)) errors.push("Enter a valid phone number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email)) errors.push("Enter a valid email address.");
    if (!ALLOWED_LOAN_TYPES.has(application.loanType)) errors.push("Select a valid loan type.");
    if (application.loanType === "business" && !application.businessName) errors.push("Business name is required for a business loan.");
    if (!Number.isSafeInteger(application.requestedAmount) || application.requestedAmount < 1000 || application.requestedAmount > 10000000) {
        errors.push("Requested amount must be between KSh 1,000 and KSh 10,000,000.");
    }
    if (application.loanPurpose.length < 10) errors.push("Loan purpose must be at least 10 characters.");
    if (!application.consent) errors.push("Consent is required before submitting an application.");

    return { application, errors };
}

function serveFile(request, response) {
    const requestPath = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname;
    const requestedPath = requestPath === "/" ? "/index.html" : requestPath;
    const filePath = path.resolve(ROOT, `.${requestedPath}`);
    if (!filePath.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory() || path.basename(filePath) === "server.js") {
        response.writeHead(404);
        response.end("Not found");
        return;
    }
    const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    try {
        if (request.method === "GET" && requestUrl.pathname === "/api/health") {
            sendJson(response, 200, { status: "ok", service: "jenga-capital-api" });
            return;
        }

        if (request.method === "POST" && requestUrl.pathname === "/api/admin/login") {
            if (!ADMIN_PASSWORD) {
                sendError(response, 503, "Admin login is not configured. Set ADMIN_PASSWORD before starting the server.");
                return;
            }
            const body = await readBody(request);
            if (typeof body.password !== "string" || body.password.length === 0 || body.password !== ADMIN_PASSWORD) {
                sendError(response, 401, "Invalid admin password.");
                return;
            }
            const token = crypto.randomBytes(32).toString("hex");
            adminSessions.set(token, { expiresAt: Date.now() + ADMIN_SESSION_TTL });
            setAdminCookie(response, token);
            sendJson(response, 200, { authenticated: true });
            return;
        }

        if (request.method === "POST" && requestUrl.pathname === "/api/admin/logout") {
            const token = parseCookies(request).jenga_admin_session;
            if (token) adminSessions.delete(token);
            clearAdminCookie(response);
            sendJson(response, 200, { authenticated: false });
            return;
        }

        if (request.method === "GET" && requestUrl.pathname === "/api/admin/session") {
            sendJson(response, 200, { authenticated: Boolean(getAdminSession(request)) });
            return;
        }

        if (requestUrl.pathname === "/api/admin/applications") {
            if (!requireAdmin(request, response)) return;

            if (request.method === "GET") {
                const status = requestUrl.searchParams.get("status");
                const allowedStatuses = new Set(["fee_required", "not_qualified", "approved", "rejected"]);
                const applications = status && allowedStatuses.has(status)
                    ? database.prepare("SELECT * FROM applications WHERE status = ? ORDER BY created_at DESC").all(status)
                    : database.prepare("SELECT * FROM applications ORDER BY created_at DESC").all();
                const counts = database.prepare("SELECT status, COUNT(*) AS count FROM applications GROUP BY status").all();
                sendJson(response, 200, {
                    applications,
                    counts: Object.fromEntries(counts.map((item) => [item.status, item.count]))
                });
                return;
            }
        }

        const applicationStatusMatch = requestUrl.pathname.match(/^\/api\/admin\/applications\/([^/]+)\/status$/);
        if (applicationStatusMatch && request.method === "PATCH") {
            if (!requireAdmin(request, response)) return;
            const body = await readBody(request);
            const status = String(body.status || "");
            if (!["approved", "rejected"].includes(status)) {
                sendError(response, 400, "Status must be approved or rejected.");
                return;
            }
            const application = database.prepare("SELECT id, fee_status FROM applications WHERE id = ?").get(applicationStatusMatch[1]);
            if (!application) {
                sendError(response, 404, "Application not found.");
                return;
            }
            if (status === "approved" && application.fee_status !== "paid") {
                sendError(response, 409, "A loan cannot be approved until the KSh 300 registration fee is verified as paid.");
                return;
            }
            database.prepare("UPDATE applications SET status = ?, reviewed_at = datetime('now') WHERE id = ?").run(status, application.id);
            sendJson(response, 200, { id: application.id, status });
            return;
        }

        if (request.method === "POST" && requestUrl.pathname === "/api/applications") {
            const body = await readBody(request);
            const { application, errors } = validateApplication(body);
            if (errors.length) {
                sendJson(response, 400, { error: "Please correct the application.", fields: errors });
                return;
            }
            const id = crypto.randomUUID();
            const qualified = isQualified(application);
            database.prepare(`INSERT INTO applications (id, first_name, last_name, phone, email, loan_type, business_name, requested_amount, loan_purpose, status, registration_fee, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
                id, application.firstName, application.lastName, application.phone, application.email, application.loanType, application.businessName, application.requestedAmount, application.loanPurpose, qualified ? "fee_required" : "not_qualified", REGISTRATION_FEE
            );
            sendJson(response, 201, qualified
                ? { applicationId: id, status: "fee_required", registrationFee: REGISTRATION_FEE }
                : { status: "not_qualified", message: "Your application does not meet the current initial qualification criteria." });
            return;
        }

        if (request.method === "POST" && requestUrl.pathname.match(/^\/api\/applications\/[^/]+\/registration-fee$/)) {
            sendError(response, 503, "Registration fee payments are not configured yet. Connect a verified M-Pesa or card provider before accepting fees.");
            return;
        }

        if (request.method === "GET") {
            serveFile(request, response);
            return;
        }

        sendError(response, 405, "Method not allowed.");
    } catch (error) {
        const statusCode = error.message === "Request body is too large." || error.message === "Invalid request data." ? 400 : 500;
        sendError(response, statusCode, error.message || "The server could not process this request.");
    }
});

server.on("clientError", (error, socket) => socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"));

function shutdown() {
    server.close(() => {
        database.close();
        process.exit(0);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(PORT, () => console.log(`Jenga Capital running at http://localhost:${PORT}`));