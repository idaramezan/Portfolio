import { writeFileSync } from "node:fs";

const targets = await fetch("http://127.0.0.1:9222/json/list").then((response) =>
  response.json(),
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
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
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
await command("Page.navigate", {
  url: "http://127.0.0.1:4174/shop/turkiye/prints",
});
await delay(1200);

const opened = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) =>
    /choose option/i.test(item.textContent || '')
  );
  if (!button) return false;
  button.click();
  return true;
})()`);
if (!opened) throw new Error("Could not find a print configuration trigger.");
await delay(600);

const results = [];
for (const [width, height] of [
  [1366, 768],
  [1440, 900],
  [390, 844],
]) {
  await command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await delay(250);

  const metrics = await evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const media = document.querySelector('.print-modal__media');
    const content = document.querySelector('.print-modal__content');
    const image = media?.querySelector('img');
    const close = document.querySelectorAll('[aria-label="Close product options"]');
    const primaryAction = [...document.querySelectorAll('.print-modal button')]
      .find((button) => /add to basket/i.test(button.textContent || '') && getComputedStyle(button).display !== 'none');
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return { x: value.x, y: value.y, width: value.width, height: value.height, bottom: value.bottom, right: value.right };
    };
    const style = dialog ? getComputedStyle(dialog) : null;
    return {
      viewport: { width: innerWidth, height: innerHeight },
      dialog: rect(dialog),
      media: rect(media),
      image: rect(image),
      content: rect(content),
      action: rect(primaryAction),
      closeCount: close.length,
      display: style?.display,
      columns: style?.gridTemplateColumns,
      dialogOverflow: style?.overflowY,
      contentOverflow: content ? getComputedStyle(content).overflowY : null,
      contentScrollable: Boolean(content && content.scrollHeight > content.clientHeight),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  })()`);

  const screenshot = await command("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  const path = `/private/tmp/print-modal-${width}x${height}.png`;
  writeFileSync(path, Buffer.from(screenshot.data, "base64"));
  results.push({ ...metrics, screenshot: path });
}

socket.close();
console.log(JSON.stringify(results, null, 2));
