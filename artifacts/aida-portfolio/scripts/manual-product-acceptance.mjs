const pages = await fetch("http://localhost:9222/json/list").then((response) =>
  response.json(),
);
const target = pages.find((page) => page.type === "page");
if (!target) throw new Error("No Chrome page target found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 0;
const pending = new Map();
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id) return;
  const handler = pending.get(message.id);
  if (handler) {
    pending.delete(message.id);
    handler(message);
  }
};
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

function command(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, (message) =>
      message.error
        ? reject(new Error(message.error.message))
        : resolve(message),
    );
  });
}

const wait = (milliseconds = 500) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
async function navigate(path) {
  await command("Page.navigate", { url: `http://localhost:4174${path}` });
  await wait(900);
}
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.result.exceptionDetails)
    throw new Error(result.result.exceptionDetails.text);
  return result.result.result.value;
}

const setField = (label, value) => `(() => {
  const label = [...document.querySelectorAll('label')].find((node) => node.textContent.trim().startsWith(${JSON.stringify(label)}));
  const field = label?.querySelector('input, textarea, select');
  if (!field) throw new Error('Field not found: ${label}');
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value').set;
  setter.call(field, ${JSON.stringify(value)});
  field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  return field.value;
})()`;
const clickButton = (text) => `(() => {
  const button = [...document.querySelectorAll('button')].find((node) => node.textContent.trim().includes(${JSON.stringify(text)}));
  if (!button) throw new Error('Button not found: ${text}');
  button.click();
  return true;
})()`;
const readStored = (collection, id) => `(() => {
  const settings = JSON.parse(localStorage.getItem('aida-shop-settings-v2'));
  const product = settings.${collection}.find((entry) => entry.id === ${JSON.stringify(id)});
  return product && { id: product.id, name: product.name, description: product.description, priceUsdCents: product.priceUsdCents, status: product.status, imageUrl: product.imageUrl, printOptions: product.printOptions };
})()`;

await command("Page.enable");
await command("Runtime.enable");

const results = {};

await navigate("/admin/originals/quiet-studio");
await evaluate(setField("Product title", "Quiet Studio Revised"));
await evaluate(setField("Short description", "Revised original description."));
await evaluate(setField("Price", "135"));
await evaluate(setField("Status", "sold_out"));
await evaluate(clickButton("Update product"));
await wait(500);
results.originalSaved = await evaluate(
  readStored("originalProducts", "quiet-studio"),
);
await navigate("/admin/originals/quiet-studio");
results.originalReloaded = await evaluate(`(() => ({
  title: [...document.querySelectorAll('label')].find((node) => node.textContent.trim().startsWith('Product title'))?.querySelector('input')?.value,
  price: [...document.querySelectorAll('label')].find((node) => node.textContent.trim().startsWith('Price'))?.querySelector('input')?.value,
  status: [...document.querySelectorAll('label')].find((node) => node.textContent.trim().startsWith('Status'))?.querySelector('select')?.value
}))()`);
await navigate("/shop/turkiye/originals");
results.originalStorefrontSoldOut = await evaluate(`(() => {
  const card = [...document.querySelectorAll('article')].find((node) => node.textContent.includes('Quiet Studio Revised'));
  return Boolean(card && card.textContent.includes('SOLD OUT') && card.querySelector('button[disabled]'));
})()`);

for (const status of ["archived", "draft"]) {
  await navigate("/admin/originals/quiet-studio");
  await evaluate(setField("Status", status));
  await evaluate(clickButton("Update product"));
  await wait(400);
  await navigate("/shop/turkiye/originals");
  results[`original_${status}_hidden`] = !(await evaluate(
    `document.body.textContent.includes('Quiet Studio Revised')`,
  ));
}

await navigate("/admin/prints/print-1");
const originalPrintOptions = await evaluate(
  readStored("printProducts", "print-1"),
);
await evaluate(setField("Status", "sold_out"));
await evaluate(clickButton("Update product"));
await wait(500);
await navigate("/admin/prints/print-1");
results.printReloadedStatus = await evaluate(
  `[...document.querySelectorAll('label')].find((node) => node.textContent.trim().startsWith('Status'))?.querySelector('select')?.value`,
);
results.printOptionsPreserved =
  JSON.stringify(
    (await evaluate(readStored("printProducts", "print-1"))).printOptions,
  ) === JSON.stringify(originalPrintOptions.printOptions);
await navigate("/shop/turkiye/prints");
results.printStorefrontSoldOut = await evaluate(`(() => {
  const card = [...document.querySelectorAll('article')].find((node) => node.textContent.includes('Signed Studio Print'));
  return Boolean(card && card.textContent.includes('SOLD OUT') && card.textContent.includes('View artwork') && card.querySelector('img.opacity-65'));
})()`);

for (const status of ["archived", "draft"]) {
  await navigate("/admin/prints/print-1");
  await evaluate(setField("Status", status));
  await evaluate(clickButton("Update product"));
  await wait(400);
  await navigate("/shop/turkiye/prints");
  results[`print_${status}_hidden`] = !(await evaluate(
    `document.body.textContent.includes('Signed Studio Print')`,
  ));
}

console.log(JSON.stringify(results, null, 2));
if (
  !results.originalSaved ||
  results.originalSaved.name !== "Quiet Studio Revised" ||
  results.originalSaved.priceUsdCents !== 13500 ||
  results.originalSaved.status !== "sold_out" ||
  results.originalReloaded.title !== "Quiet Studio Revised" ||
  results.originalReloaded.price !== "135" ||
  results.originalReloaded.status !== "sold_out" ||
  !results.originalStorefrontSoldOut ||
  !results.original_archived_hidden ||
  !results.original_draft_hidden ||
  results.printReloadedStatus !== "sold_out" ||
  !results.printOptionsPreserved ||
  !results.printStorefrontSoldOut ||
  !results.print_archived_hidden ||
  !results.print_draft_hidden
) {
  process.exitCode = 1;
}
socket.close();
