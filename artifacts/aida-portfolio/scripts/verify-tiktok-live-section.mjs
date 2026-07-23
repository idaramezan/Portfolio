import { writeFileSync } from "node:fs";

const targets = await fetch("http://127.0.0.1:9223/json/list").then(
  (response) => response.json(),
);
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No browser page is available.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const request = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});

function command(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const evaluate = async (expression) => {
  const result = await command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error("Browser evaluation failed.");
  return result.result.value;
};

await command("Page.enable");
await command("Runtime.enable");

const viewports = [
  [1600, 1000],
  [1440, 900],
  [1366, 768],
  [1200, 800],
  [1024, 768],
  [768, 1024],
  [430, 932],
  [390, 844],
  [360, 800],
];
const results = [];

for (const [width, height] of viewports) {
  await command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });
  await command("Page.navigate", { url: "http://127.0.0.1:4173/" });
  await delay(700);

  const metrics = await evaluate(`(() => {
    const section = document.querySelector('.home-live-section');
    const gallery = document.querySelector('.home-live-section__artworks');
    const rect = section?.getBoundingClientRect();
    const links = [...(section?.querySelectorAll('a') || [])];
    return {
      viewport: [innerWidth, innerHeight],
      section: rect ? { top: rect.top + scrollY, width: rect.width, height: rect.height } : null,
      primaryStat: section?.querySelector('.home-live-section__proof-value')?.textContent?.trim(),
      artworkCount: section?.querySelectorAll('.home-live-section__piece img').length || 0,
      externalLinksSafe: links.every((link) => link.target === '_blank' && link.rel.includes('noopener') && link.rel.includes('noreferrer')),
      documentOverflow: document.documentElement.scrollWidth > innerWidth,
      galleryOverflowContained: gallery ? gallery.getBoundingClientRect().right <= innerWidth + 1 : false,
      galleryScrollable: gallery ? gallery.scrollWidth > gallery.clientWidth : false,
      heading: section?.querySelector('h2')?.textContent,
    };
  })()`);
  results.push(metrics);

  if ((width === 1440 && height === 900) || (width === 390 && height === 844)) {
    await evaluate(
      `document.querySelector('.home-live-section').scrollIntoView({ block: 'start' })`,
    );
    await delay(350);
    const introScreenshot = await command("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
    });
    writeFileSync(
      `/private/tmp/tiktok-live-intro-${width}x${height}.png`,
      Buffer.from(introScreenshot.data, "base64"),
    );

    await evaluate(
      `document.querySelector('.home-live-section__artworks').scrollIntoView({ block: 'center' })`,
    );
    await delay(500);
    const galleryScreenshot = await command("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
    });
    writeFileSync(
      `/private/tmp/tiktok-live-gallery-${width}x${height}.png`,
      Buffer.from(galleryScreenshot.data, "base64"),
    );
  }
}

socket.close();
console.log(JSON.stringify(results, null, 2));
