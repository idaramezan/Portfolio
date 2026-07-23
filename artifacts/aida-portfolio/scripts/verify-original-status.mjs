const targets = await fetch("http://127.0.0.1:9223/json/list").then((response) =>
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
  const request = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});
const command = (method, params = {}) => {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};
const evaluate = async (expression) => {
  const result = await command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error("Browser evaluation failed");
  return result.result.value;
};
const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const navigate = async (path) => {
  await command("Page.navigate", { url: `http://127.0.0.1:4173${path}` });
  await delay(650);
};

await command("Page.enable");
await command("Runtime.enable");
await navigate("/");
await evaluate(`sessionStorage.setItem("aida-admin-authenticated", "true")`);

const results = [];
for (const status of ["available", "sold", "draft", "archived"]) {
  await navigate("/admin/originals/quiet-studio");
  const submitted = await evaluate(`(() => {
    const select = [...document.querySelectorAll("select")].find((element) =>
      [...element.options].some((option) => option.value === "sold"),
    );
    if (!select) return { error: "Status select missing" };
    select.value = ${JSON.stringify(status)};
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const button = [...document.querySelectorAll("button")].find((element) =>
      element.textContent.includes("Update original"),
    );
    if (!button) return { error: "Update button missing" };
    button.click();
    return { selected: select.value };
  })()`);
  await delay(250);
  await navigate("/admin/originals/quiet-studio");
  const refreshed = await evaluate(`(() => {
    const select = [...document.querySelectorAll("select")].find((element) =>
      [...element.options].some((option) => option.value === "sold"),
    );
    return select?.value || null;
  })()`);
  await navigate("/shop/turkiye/originals");
  const publicState = await evaluate(`(() => {
    const card = [...document.querySelectorAll("article")].find((element) =>
      element.textContent.includes("Quiet Studio"),
    );
    return {
      visible: Boolean(card),
      purchasable: Boolean(card && [...card.querySelectorAll("button")].some(
        (button) => /add to collection/i.test(button.textContent),
      )),
      sold: Boolean(card && /sold/i.test(card.textContent)),
    };
  })()`);
  results.push({ status, submitted, refreshed, publicState });
}

socket.close();
console.log(JSON.stringify(results, null, 2));
