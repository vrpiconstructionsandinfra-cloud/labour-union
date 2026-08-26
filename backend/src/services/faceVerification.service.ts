import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

export interface FaceVerificationResult {
  success: boolean;
  verified: boolean;
  distance?: number;
  threshold?: number;
  matchPercentage?: number;
  model?: string;
  message: string;
  error?: string;
}

export async function verifyFacesWithDeepFace(
  checkInPhoto: string,
  checkOutPhoto: string
): Promise<FaceVerificationResult> {
  return new Promise((resolve) => {
    const tempDir = os.tmpdir();
    const tempInputPath = path.join(tempDir, `verify_input_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.json`);
    const scriptPath = path.join(__dirname, "..", "scripts", "verify_faces.py");

    const payload = JSON.stringify({ checkInPhoto, checkOutPhoto });
    fs.writeFileSync(tempInputPath, payload, "utf8");

    const pythonProcess = spawn("python", [scriptPath, tempInputPath]);

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
      if (fs.existsSync(tempInputPath)) {
        try {
          fs.unlinkSync(tempInputPath);
        } catch (e) {}
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
      } catch (err: any) {
        return resolve({
          success: false,
          verified: false,
          message: `Failed to parse DeepFace verification output: ${err.message}`,
          error: stdoutData || stderrData
        });
      }
    });

    pythonProcess.on("error", (err) => {
      if (fs.existsSync(tempInputPath)) {
        try {
          fs.unlinkSync(tempInputPath);
        } catch (e) {}
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
