"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsService = void 0;
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
class MetricsService {
    constructor() {
        this.requestTimestamps = [];
        this.totalLatency = 0;
        this.totalRequests = 0;
        this.successRequests = 0;
        this.errorRequests = 0;
    }
    recordRequest(latency, success) {
        const now = Date.now();
        this.requestTimestamps.push(now);
        this.totalRequests++;
        this.totalLatency += latency;
        if (success) {
            this.successRequests++;
        }
        else {
            this.errorRequests++;
        }
        // Keep only last 1 hour of timestamps
        const oneHourAgo = now - 60 * 60 * 1000;
        this.requestTimestamps = this.requestTimestamps.filter((t) => t > oneHourAgo);
    }
    getMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            const hitsMin = this.requestTimestamps.filter((t) => t > now - 60 * 1000).length;
            const hitsHour = this.requestTimestamps.filter((t) => t > now - 60 * 60 * 1000).length;
            // RAM
            const totalMemBytes = os.totalmem();
            const freeMemBytes = os.freemem();
            const usedMemBytes = totalMemBytes - freeMemBytes;
            const totalMemGB = +(totalMemBytes / (1024 ** 3)).toFixed(2);
            const usedMemGB = +(usedMemBytes / (1024 ** 3)).toFixed(2);
            // CPU
            const cpus = os.cpus();
            const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : "Unknown CPU";
            const cpuLoad = +os.loadavg()[0].toFixed(2);
            // Storage
            let totalStorageGB = 50.0;
            let usedStorageGB = 10.0;
            try {
                const stats = fs.statfsSync(".");
                const totalBytes = stats.blocks * stats.bsize;
                const freeBytes = stats.bfree * stats.bsize;
                totalStorageGB = +(totalBytes / (1024 ** 3)).toFixed(2);
                usedStorageGB = +((totalBytes - freeBytes) / (1024 ** 3)).toFixed(2);
            }
            catch (_) { }
            // Health
            const avgLatency = this.totalRequests > 0
                ? Math.round(this.totalLatency / this.totalRequests)
                : 0;
            const successRate = this.totalRequests > 0
                ? +((this.successRequests / this.totalRequests) * 100).toFixed(2)
                : 100;
            return {
                uptimeHours: +(process.uptime() / 3600).toFixed(2),
                osPlatform: os.platform(),
                ram: {
                    usedGB: usedMemGB,
                    totalGB: totalMemGB,
                    percent: +((usedMemBytes / totalMemBytes) * 100).toFixed(1),
                },
                cpu: {
                    model: cpuModel,
                    load1m: cpuLoad,
                },
                storage: {
                    usedGB: usedStorageGB,
                    totalGB: totalStorageGB,
                    percent: +((usedStorageGB / totalStorageGB) * 100).toFixed(1),
                },
                traffic: { hitsMin, hitsHour },
                users: { total: 0, active: 0 }, // hook up your DB here if needed
                health: {
                    avgLatencyMs: avgLatency,
                    successRatePercent: successRate,
                    errorCount: this.errorRequests,
                },
            };
        });
    }
}
// Singleton — shared across the whole app
exports.metricsService = new MetricsService();
