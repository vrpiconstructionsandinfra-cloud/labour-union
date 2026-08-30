"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyFacesWithDeepFace = verifyFacesWithDeepFace;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
async function verifyFacesWithDeepFace(checkInPhoto, checkOutPhoto) {
    return new Promise((resolve) => {
        const tempDir = os_1.default.tmpdir();
        const tempInputPath = path_1.default.join(tempDir, `verify_input_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.json`);
        const scriptPath = path_1.default.join(__dirname, "..", "scripts", "verify_faces.py");
        const payload = JSON.stringify({ checkInPhoto, checkOutPhoto });
        fs_1.default.writeFileSync(tempInputPath, payload, "utf8");
        const pythonProcess = (0, child_process_1.spawn)("python", [scriptPath, tempInputPath]);
        let stdoutData = "";
        let stderrData = "";
        pythonProcess.stdout.on("data", (data) => {
            stdoutData += data.toString();
        });
        pythonProcess.stderr.on("data", (data) => {
            stderrData += data.toString();
        });
        pythonProcess.on("close", (code) => {
            // Clean up temp file
            if (fs_1.default.existsSync(tempInputPath)) {
                try {
                    fs_1.default.unlinkSync(tempInputPath);
                }
                catch (e) { }
            }
            if (code !== 0 && !stdoutData.trim()) {
                return resolve({
                    success: false,
                    verified: false,
                    message: `DeepFace Python process exited with code ${code}: ${stderrData.trim() || 'Unknown error'}`,
                    error: stderrData.trim()
                });
            }
            try {
                const result = JSON.parse(stdoutData.trim());
                return resolve({
                    success: result.success !== false,
                    verified: Boolean(result.verified),
                    distance: result.distance,
                    threshold: result.threshold,
                    matchPercentage: result.matchPercentage ?? (result.verified ? 95 : 20),
                    model: result.model || "VGG-Face",
                    message: result.message || (result.verified ? "✅ DeepFace: Faces match verified" : "❌ DeepFace: Faces do not match"),
                    error: result.error
                });
            }
            catch (err) {
                return resolve({
                    success: false,
                    verified: false,
                    message: `Failed to parse DeepFace verification output: ${err.message}`,
                    error: stdoutData || stderrData
                });
            }
        });
        pythonProcess.on("error", (err) => {
            if (fs_1.default.existsSync(tempInputPath)) {
                try {
                    fs_1.default.unlinkSync(tempInputPath);
                }
                catch (e) { }
            }
            return resolve({
                success: false,
                verified: false,
                message: `Failed to launch Python DeepFace process: ${err.message}`,
                error: err.message
            });
        });
    });
}
