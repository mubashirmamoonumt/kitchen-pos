const fs = require("fs");
const path = require("path");

// Parse the .env file from this directory
function loadEnv(filePath) {
  try {
    return Object.fromEntries(
      fs.readFileSync(filePath, "utf8")
        .split("\n")
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const idx = line.indexOf("=");
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

const env = loadEnv(path.join(__dirname, ".env"));

module.exports = {
  apps: [
    {
      name: "mufaz-api",
      script: "pnpm",
      args: "run start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        ...env,
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
