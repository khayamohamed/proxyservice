/** @type {import("@playwright/test").PlaywrightTestConfig} */
module.exports = {
  testDir: "./tests",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "npx http-server . -p 4173",
    port: 4173,
    reuseExistingServer: true,
    timeout: 120000
  }
};

