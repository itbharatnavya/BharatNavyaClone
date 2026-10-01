import fs from "node:fs/promises";

async function capture(label, width, height) {
  const response = await fetch(`http://localhost:9224/json/new?${encodeURIComponent("http://localhost:3001/login")}`, { method: "PUT" });
  const target = await response.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const waiter = pending.get(message.id);
    pending.delete(message.id);
    message.error ? waiter.reject(message.error) : waiter.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(callId, { resolve, reject });
    socket.send(JSON.stringify({ id: callId, method, params }));
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await send("Page.reload", { ignoreCache: true });
  await new Promise((resolve) => setTimeout(resolve, 1800));
  const metrics = await send("Runtime.evaluate", {
    expression: `(() => {
      const row = document.querySelector('.international-phone-row');
      const country = document.querySelector('.international-phone-country');
      const number = document.querySelector('.international-phone-number input');
      return {
        viewport: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        gridColumns: row ? getComputedStyle(row).gridTemplateColumns : null,
        countryWidth: country?.getBoundingClientRect().width,
        numberWidth: number?.getBoundingClientRect().width,
      };
    })()`,
    returnByValue: true,
  });
  const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await fs.writeFile(`/tmp/bn-phone-${label}-cdp.png`, Buffer.from(shot.data, "base64"));
  socket.close();
  await fetch(`http://localhost:9224/json/close/${target.id}`);
  return metrics.result.value;
}

console.log(JSON.stringify({
  desktop: await capture("desktop", 1440, 900),
  mobile: await capture("mobile", 390, 844),
}, null, 2));
