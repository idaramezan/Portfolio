const targets = await fetch("http://127.0.0.1:9224/json/list").then(
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
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description || "Evaluation failed",
    );
  return result.result.value;
};
const navigate = async (url) => {
  await command("Page.navigate", { url });
  await delay(700);
};

await command("Page.enable");
await command("Runtime.enable");
await command("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await navigate("http://127.0.0.1:4174/shop/turkiye/prints");

await evaluate(`(() => {
  const product = {
    id: 'pricing-acceptance',
    kind: 'print',
    name: 'Signed Studio Print',
    description: 'Acceptance test print',
    imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="800"%3E%3Crect width="100%25" height="100%25" fill="%231b3a6b"/%3E%3C/svg%3E',
    priceUsdCents: 1000,
    available: true,
    status: 'published',
    maxPerUser: 5,
    inventory: 10,
    dimension: '13 × 18 cm',
    category: 'print',
    slug: 'pricing-acceptance',
    displayOrder: 1,
    printOptions: {
      sizes: [
        { id: '13x18', label: '13 × 18 cm', widthCm: 13, heightCm: 18, additionalPriceUsdCents: 0, available: true, isBaseSize: true, displayOrder: 1 },
        { id: '15x20', label: '15 × 20 cm', widthCm: 15, heightCm: 20, additionalPriceUsdCents: 200, available: true, isBaseSize: false, displayOrder: 2 }
      ],
      framing: { unframedAvailable: true, framedAvailable: true, defaultFinish: 'unframed', frameAdditionalPriceUsdCents: 500 }
    }
  };
  localStorage.setItem('aida-shop-settings-v2', JSON.stringify({
    printProducts: [product],
    whatsapp: { enabled: true, number: '905551234567', greeting: 'Hello Aida,', referencePrefix: 'AR', shippingNote: '' }
  }));
  localStorage.setItem('aida-admin-data-schema-version', '4');
  localStorage.removeItem('basket:turkiye');
  localStorage.setItem('aida-active-shop-region', 'TR');
})()`);
await navigate("http://127.0.0.1:4174/shop/turkiye/prints");

const card = await evaluate(`(() => {
  const article = document.querySelector('article');
  return article?.innerText || '';
})()`);
await evaluate(
  `([...document.querySelectorAll('button')].find((button) => /choose options/i.test(button.textContent || ''))).click()`,
);
await delay(250);

const readModal = () =>
  evaluate(`(() => {
    const modal = document.querySelector('.print-modal');
    const unit = [...modal.querySelectorAll('p')].find((item) => /unit price/i.test(item.textContent || ''))?.parentElement?.innerText || '';
    const summary = [...modal.querySelectorAll('section')].find((item) => /order summary/i.test(item.textContent || ''))?.innerText || '';
    const sizeCards = [...modal.querySelectorAll('input[name="print-size"]')].map((input) => input.closest('label')?.innerText || '');
    const finishCards = [...modal.querySelectorAll('input[name="print-finish"]')].map((input) => input.closest('label')?.innerText || '');
    return { unit, summary, sizeCards, finishCards };
  })()`);

const initial = await readModal();
await evaluate(
  `document.querySelector('input[name="print-size"][value="15x20"]').click()`,
);
await delay(100);
const larger = await readModal();
await evaluate(
  `document.querySelectorAll('input[name="print-finish"]')[1].click()`,
);
await delay(100);
const largerFramed = await readModal();
await evaluate(
  `document.querySelector('input[name="print-size"][value="13x18"]').click()`,
);
await delay(100);
const baseFramed = await readModal();
await evaluate(
  `document.querySelectorAll('input[name="print-finish"]')[0].click()`,
);
await delay(100);
const baseUnframed = await readModal();
await evaluate(
  `document.querySelector('input[name="print-size"][value="15x20"]').click(); document.querySelectorAll('input[name="print-finish"]')[1].click();`,
);
await delay(100);
await evaluate(
  `document.querySelector('button[aria-label="Increase quantity"]').click()`,
);
await delay(100);
const quantityTwo = await readModal();
await evaluate(
  `([...document.querySelectorAll('.print-modal button')].find((button) => /add to basket/i.test(button.textContent || '') && getComputedStyle(button).display !== 'none')).click()`,
);
await delay(300);

const storedBasket = await evaluate(
  `JSON.parse(localStorage.getItem('basket:turkiye') || '[]')`,
);
await navigate("http://127.0.0.1:4174/basket/turkiye");
const basketText = await evaluate(`document.body.innerText`);
const whatsappText = await evaluate(`(() => {
  const link = [...document.querySelectorAll('a')].find((item) => /continue with aida on whatsapp/i.test(item.textContent || ''));
  if (!link?.href) return '';
  return new URL(link.href).searchParams.get('text') || '';
})()`);

await evaluate(`(() => {
  const saved = JSON.parse(localStorage.getItem('aida-shop-settings-v2'));
  const product = saved.printProducts[0];
  product.printOptions.sizes[1].absolutePriceUsdCents = 1200;
  product.printOptions.sizes[1].additionalPriceUsdCents = 9999;
  product.printOptions.framing.absoluteFramePriceUsdCents = 1500;
  product.printOptions.framing.frameAdditionalPriceUsdCents = 9999;
  localStorage.setItem('aida-shop-settings-v2', JSON.stringify(saved));
  localStorage.setItem('aida-admin-data-schema-version', '3');
  localStorage.removeItem('aida-shop-settings-backup-before-print-pricing-v4');
  localStorage.removeItem('aida-print-pricing-migration-report-v4');
})()`);
await navigate("http://127.0.0.1:4174/shop/turkiye/prints");
const migration = await evaluate(`(() => {
  const settings = JSON.parse(localStorage.getItem('aida-shop-settings-v2'));
  return {
    sizeDifference: settings.printProducts[0].printOptions.sizes[1].additionalPriceUsdCents,
    finishDifference: settings.printProducts[0].printOptions.framing.frameAdditionalPriceUsdCents,
    backupExists: Boolean(localStorage.getItem('aida-shop-settings-backup-before-print-pricing-v4')),
    report: JSON.parse(localStorage.getItem('aida-print-pricing-migration-report-v4') || 'null')
  };
})()`);

const report = {
  card,
  initial,
  larger,
  largerFramed,
  baseFramed,
  baseUnframed,
  quantityTwo,
  storedBasket,
  basketText,
  whatsappText,
  migration,
};

const checks = {
  cardStartsAt10: /From\s*\$10\.00/.test(card),
  optionCardsHaveNoPrices: [...initial.sizeCards, ...initial.finishCards].every(
    (text) => !text.includes("$"),
  ),
  initial10: initial.unit.includes("$10.00"),
  larger12: larger.unit.includes("$12.00"),
  largerFramed17: largerFramed.unit.includes("$17.00"),
  baseFramed15: baseFramed.unit.includes("$15.00"),
  baseUnframed10: baseUnframed.unit.includes("$10.00"),
  quantityTwo34:
    quantityTwo.unit.includes("$17.00") &&
    quantityTwo.summary.includes("$34.00"),
  basketConfiguration:
    storedBasket[0]?.selectedSizeId === "15x20" &&
    storedBasket[0]?.selectedFinishId === "framed" &&
    storedBasket[0]?.quantity === 2 &&
    storedBasket[0]?.calculatedUnitPriceUsdCents === 1700 &&
    storedBasket[0]?.calculatedLineTotalUsdCents === 3400,
  basketDisplay:
    basketText.includes("15 × 20 cm") &&
    basketText.includes("Framed") &&
    basketText.includes("$34.00"),
  whatsapp:
    whatsappText.includes("Size: 15 × 20 cm") &&
    whatsappText.includes("Framing: Framed") &&
    whatsappText.includes("Quantity: 2") &&
    whatsappText.includes("Unit price: $17.00") &&
    whatsappText.includes("Line total: $34.00"),
  migration:
    migration.sizeDifference === 200 &&
    migration.finishDifference === 500 &&
    migration.backupExists &&
    Array.isArray(migration.report?.ambiguousProductIds) &&
    migration.report.ambiguousProductIds.length === 0,
};

socket.close();
console.log(JSON.stringify({ checks, report }, null, 2));
if (Object.values(checks).some((value) => !value)) process.exitCode = 1;
