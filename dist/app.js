"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("./app/config"));
const node_cron_1 = __importDefault(require("node-cron"));
const cors_1 = __importDefault(require("cors"));
const router_1 = __importDefault(require("./router"));
// ← import
const metrics_service_1 = require("./utility/metrics.service"); // ← import
const notFound_1 = __importDefault(require("./middleware/notFound"));
const globalErrorHandelar_1 = __importDefault(require("./middleware/globalErrorHandelar"));
const auto_delete_unverified_user_1 = __importDefault(require("./utility/auto_delete_unverified_user"));
const catchError_1 = __importDefault(require("./app/error/catchError"));
const auto_delete_notification_1 = __importDefault(require("./utility/auto_delete_notification"));
const metricsMiddleware_1 = __importDefault(require("./utility/metricsMiddleware"));
const app = (0, express_1.default)();
// ======= Middlewares =======
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)());
// ── Metrics middleware: records every request latency & status ──
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const latency = Date.now() - start;
        const success = res.statusCode < 400;
        metrics_service_1.metricsService.recordRequest(latency, success);
    });
    next();
});
app.use(body_parser_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(config_1.default.file_path, express_1.default.static(path_1.default.join(__dirname, "public")));
// ======= Root Dashboard =======
app.get("/", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amidash — Telemetry & Diagnostics</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --color-bg: #09090b;
            --color-card: rgba(18, 18, 18, 0.7);
            --color-gold: #d4af37;
            --color-gold-glow: rgba(212, 175, 55, 0.3);
            --color-text: #f4f4f5;
            --color-text-muted: #a1a1aa;
            --color-border: rgba(212, 175, 55, 0.12);
            --color-success: #10b981;
            --color-error: #ef4444;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: var(--color-bg);
            background-image:
                radial-gradient(at 0% 0%, rgba(212, 175, 55, 0.04) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(212, 175, 55, 0.02) 0px, transparent 50%);
            color: var(--color-text);
            font-family: 'Inter', sans-serif;
            min-height: 100vh;
            padding: 2.5rem 1.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        header { text-align: center; margin-bottom: 3rem; max-width: 800px; width: 100%; }
        .brand-subtitle {
            font-family: 'Cinzel', serif;
            color: var(--color-gold);
            font-size: 0.95rem;
            letter-spacing: 0.25em;
            text-transform: uppercase;
            margin-bottom: 0.5rem;
        }
        h1 {
            font-family: 'Cinzel', serif;
            font-weight: 600;
            font-size: 2.2rem;
            letter-spacing: 0.05em;
            margin-bottom: 0.75rem;
            background: linear-gradient(135deg, #ffffff 0%, #d4af37 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .status-badge-container { display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1rem; }
        .status-dot {
            width: 8px; height: 8px;
            background-color: var(--color-success);
            border-radius: 50%;
            box-shadow: 0 0 10px var(--color-success);
            animation: pulse 2s infinite;
        }
        .status-text { font-size: 0.85rem; color: var(--color-text-muted); letter-spacing: 0.05em; text-transform: uppercase; }
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; max-width: 1200px; width: 100%; }
        .card {
            background: var(--color-card);
            backdrop-filter: blur(16px);
            border: 1px solid var(--color-border);
            border-radius: 12px;
            padding: 1.75rem;
            box-shadow: 0 4px 30px rgba(0,0,0,0.5);
            transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .card:hover { transform: translateY(-2px); border-color: rgba(212,175,55,0.3); box-shadow: 0 8px 30px rgba(212,175,55,0.08); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
        .card-title { font-family: 'Cinzel', serif; font-size: 1.05rem; letter-spacing: 0.1em; color: var(--color-gold); }
        .card-icon { opacity: 0.8; }
        .metric-value { font-size: 1.8rem; font-weight: 500; margin-bottom: 0.5rem; letter-spacing: -0.02em; }
        .metric-sub { font-size: 0.85rem; color: var(--color-text-muted); }
        .progress-bar-container { width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; margin-top: 1rem; overflow: hidden; }
        .progress-bar { height: 100%; background: linear-gradient(90deg, var(--color-gold) 0%, #f3e5ab 100%); border-radius: 3px; width: 0%; transition: width 1s cubic-bezier(0.4,0,0.2,1); box-shadow: 0 0 8px var(--color-gold-glow); }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 0.75rem; font-size: 0.9rem; }
        .info-row:last-child { margin-bottom: 0; }
        .info-label { color: var(--color-text-muted); }
        .info-value { font-weight: 500; }
        footer { margin-top: 4rem; text-align: center; font-size: 0.8rem; color: var(--color-text-muted); letter-spacing: 0.05em; }
        @keyframes pulse {
            0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16,185,129,0.7); }
            70%  { transform: scale(1);    box-shadow: 0 0 0 10px rgba(16,185,129,0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
        .grid-full-width { grid-column: 1 / -1; }
    </style>
</head>
<body>
    <header>
        <div class="brand-subtitle">Amidash</div>
        <h1>Telemetry &amp; Real-Time Diagnostics</h1>
        <div class="status-badge-container">
            <div class="status-dot"></div>
            <div class="status-text">Server Active &amp; Healthy</div>
        </div>
    </header>

    <main class="dashboard-grid">

        <!-- RAM -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">RAM Allocations</div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon" style="color:var(--color-gold)">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                    <line x1="6" y1="6" x2="6.01" y2="6"></line>
                    <line x1="6" y1="18" x2="6.01" y2="18"></line>
                </svg>
            </div>
            <div class="metric-value" id="ram-val">— GB</div>
            <div class="metric-sub"  id="ram-sub">Loading...</div>
            <div class="progress-bar-container">
                <div class="progress-bar" id="ram-bar"></div>
            </div>
        </div>

        <!-- CPU -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">Processor Load</div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon" style="color:var(--color-gold)">
                    <rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect>
                    <line x1="9"  y1="1"  x2="9"  y2="4"></line><line x1="15" y1="1"  x2="15" y2="4"></line>
                    <line x1="9"  y1="20" x2="9"  y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line>
                    <line x1="20" y1="9"  x2="23" y2="9"></line><line x1="20" y1="15" x2="23" y2="15"></line>
                    <line x1="1"  y1="9"  x2="4"  y2="9"></line><line x1="1"  y1="15" x2="4"  y2="15"></line>
                </svg>
            </div>
            <div class="metric-value" id="cpu-val">—</div>
            <div class="metric-sub"  id="cpu-sub">Loading...</div>
        </div>

        <!-- Storage -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">System Disk</div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon" style="color:var(--color-gold)">
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path>
                </svg>
            </div>
            <div class="metric-value" id="storage-val">— GB</div>
            <div class="metric-sub"  id="storage-sub">Loading...</div>
            <div class="progress-bar-container">
                <div class="progress-bar" id="storage-bar"></div>
            </div>
        </div>

        <!-- API Traffic -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">API Server Traffic</div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon" style="color:var(--color-gold)">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
            </div>
            <div class="info-row">
                <div class="info-label">Hits / Minute</div>
                <div class="info-value" id="hits-min" style="color:var(--color-gold);font-size:1.1rem;">0</div>
            </div>
            <div class="info-row" style="margin-top:1rem;">
                <div class="info-label">Hits / Hour</div>
                <div class="info-value" id="hits-hour" style="color:var(--color-gold);font-size:1.1rem;">0</div>
            </div>
        </div>

        <!-- System & Users -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">System &amp; Users</div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon" style="color:var(--color-gold)">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            </div>
            <div class="info-row">
                <div class="info-label">Total Registered Users</div>
                <div class="info-value" id="users-total">—</div>
            </div>
            <div class="info-row" style="margin-top:1rem;">
                <div class="info-label">Active Verified Users</div>
                <div class="info-value" id="users-active" style="color:var(--color-success)">—</div>
            </div>
        </div>

        <!-- Server Specs -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">Server Specs</div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon" style="color:var(--color-gold)">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                    <line x1="7"  y1="2"  x2="7"  y2="22"></line><line x1="17" y1="2"  x2="17" y2="22"></line>
                    <line x1="2"  y1="12" x2="22" y2="12"></line>
                    <line x1="2"  y1="7"  x2="22" y2="7"></line><line x1="2"  y1="17" x2="22" y2="17"></line>
                </svg>
            </div>
            <div class="info-row">
                <div class="info-label">OS Platform</div>
                <div class="info-value" id="os-platform" style="text-transform:capitalize;">—</div>
            </div>
            <div class="info-row" style="margin-top:1rem;">
                <div class="info-label">Uptime</div>
                <div class="info-value" id="uptime">—</div>
            </div>
        </div>

        <!-- Health Matrix (full width) -->
        <div class="card grid-full-width">
            <div class="card-header">
                <div class="card-title">API Health Matrix</div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon" style="color:var(--color-gold)">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:2rem;text-align:center;margin-top:1rem;">
                <div>
                    <div class="metric-sub">Average Latency</div>
                    <div class="metric-value" id="health-latency" style="color:var(--color-gold);font-size:2.2rem;margin-top:0.5rem;">— ms</div>
                </div>
                <div>
                    <div class="metric-sub">Success Rate</div>
                    <div class="metric-value" id="health-success" style="color:var(--color-success);font-size:2.2rem;margin-top:0.5rem;">—%</div>
                </div>
                <div>
                    <div class="metric-sub">Error Count</div>
                    <div class="metric-value" id="health-errors" style="color:var(--color-error);font-size:2.2rem;margin-top:0.5rem;">—</div>
                </div>
            </div>
        </div>

    </main>

    <footer>⚜️ Powered by Amidash Backend ⚜️</footer>

    <script>
        async function fetchMetrics() {
            try {
                const res = await fetch('/api/v1/monitor/metrics');
                if (!res.ok) return;
                const d = await res.json();

                document.getElementById('ram-val').innerText     = d.ram.usedGB + ' GB';
                document.getElementById('ram-sub').innerText     = d.ram.usedGB + ' GB / ' + d.ram.totalGB + ' GB used';
                document.getElementById('ram-bar').style.width   = d.ram.percent + '%';

                document.getElementById('cpu-val').innerText     = d.cpu.load1m.toFixed(2);
                document.getElementById('cpu-sub').innerText     = d.cpu.model;

                document.getElementById('storage-val').innerText   = d.storage.usedGB + ' GB';
                document.getElementById('storage-sub').innerText   = d.storage.usedGB + ' GB / ' + d.storage.totalGB + ' GB used';
                document.getElementById('storage-bar').style.width = d.storage.percent + '%';

                document.getElementById('hits-min').innerText   = d.traffic.hitsMin;
                document.getElementById('hits-hour').innerText  = d.traffic.hitsHour;

                document.getElementById('users-total').innerText  = d.users.total;
                document.getElementById('users-active').innerText = d.users.active;

                document.getElementById('os-platform').innerText = d.osPlatform;
                document.getElementById('uptime').innerText      = d.uptimeHours + ' hours';

                document.getElementById('health-latency').innerText = d.health.avgLatencyMs + ' ms';
                document.getElementById('health-success').innerText = d.health.successRatePercent + '%';
                document.getElementById('health-errors').innerText  = d.health.errorCount;

            } catch (err) {
                console.error('Failed to fetch diagnostics:', err);
            }
        }

        fetchMetrics();
        setInterval(fetchMetrics, 3000);
    </script>
</body>
</html>`);
});
// ======= Cron Jobs =======
node_cron_1.default.schedule("*/5 * * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, auto_delete_unverified_user_1.default)();
    }
    catch (error) {
        (0, catchError_1.default)(error, "[Cron] Error in subscription expiry cron job:");
    }
}));
node_cron_1.default.schedule("*/30 * * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, auto_delete_notification_1.default)();
    }
    catch (error) {
        (0, catchError_1.default)(error, "[Cron] Error in notification auto delete cron job:");
    }
}));
// ======= API Routes =======
app.use("/api/v1", router_1.default);
app.use("/api/v1/monitor", metricsMiddleware_1.default); // ← metrics endpoint
// ======= 404 & Global Error Handler =======
app.use(notFound_1.default);
app.use(globalErrorHandelar_1.default);
exports.default = app;
