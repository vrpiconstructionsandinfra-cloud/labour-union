import os from "os";

/**
 * Gets the host machine's primary local network IPv4 address (e.g. 192.168.1.15).
 * Allows smartphones and mobile devices connected to the same Wi-Fi network to access email links.
 */
export function getLocalIpAddress(): string {
  // If a custom non-localhost FRONTEND_URL is defined, use it
  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes("localhost")) {
    return process.env.FRONTEND_URL;
  }

  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (!iface) continue;
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === "IPv4" && alias.address !== "127.0.0.1" && !alias.internal) {
        return `http://${alias.address}:5173`;
      }
    }
  }

  return process.env.FRONTEND_URL || "http://localhost:5173";
}
