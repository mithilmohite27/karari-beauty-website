import { writeFile } from "node:fs/promises";

const widths = [320, 375, 430];
const debuggerPort = 9223;

async function createPage() {
  const response = await fetch(`http://127.0.0.1:${debuggerPort}/json/new?http://127.0.0.1:3001/sign-in`, {
    method: "PUT"
  });
  if (!response.ok) throw new Error(`Unable to create Chrome page: ${response.status}`);
  return response.json();
}

async function runViewport(width) {
  const page = await createPage();
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let messageId = 0;

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    if (!payload.id || !pending.has(payload.id)) return;
    const request = pending.get(payload.id);
    pending.delete(payload.id);
    if (payload.error) request.reject(new Error(payload.error.message));
    else request.resolve(payload.result);
  });

  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: width,
    screenHeight: 900
  });
  await send("Page.enable");
  await send("Page.navigate", { url: "http://127.0.0.1:3001/sign-in" });
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const metrics = await send("Runtime.evaluate", {
    expression: `JSON.stringify({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      artworkHeight: document.querySelector("aside")?.getBoundingClientRect().height,
      headingTop: document.querySelector("h1")?.getBoundingClientRect().top
    })`,
    returnByValue: true
  });
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });

  await writeFile(`auth-${width}-emulated.png`, Buffer.from(screenshot.data, "base64"));
  socket.close();
  return JSON.parse(metrics.result.value);
}

const results = {};
for (const width of widths) results[width] = await runViewport(width);
console.log(JSON.stringify(results, null, 2));
