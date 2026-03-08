import puppeteer from "puppeteer";

const URL = "http://localhost:5173/";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function clickButtonByText(page, buttonText) {
  const clicked = await page.evaluate((text) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const button = buttons.find((candidate) =>
      candidate.textContent?.trim().includes(text)
    );
    if (!button) {
      return false;
    }
    button.click();
    return true;
  }, buttonText);

  if (!clicked) {
    throw new Error(`Unable to find button "${buttonText}"`);
  }
}

async function setInputValue(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.type(selector, value);
}

async function waitForText(page, expectedText, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const bodyText = await page.$eval("body", (el) => el.textContent || "");
    if (bodyText.includes(expectedText)) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`Timeout waiting for text: ${expectedText}`);
}

async function getRoomCode(page) {
  const bodyText = await page.$eval("body", (el) => el.textContent || "");
  const match = bodyText.match(/Room:\s*([A-Z0-9]{6})/);
  if (!match) {
    throw new Error("Room code not found in page text");
  }
  return match[1];
}

async function joinRoom(page, roomCode) {
  await page.waitForSelector('input[placeholder="Enter room code"]');
  const input = await page.$('input[placeholder="Enter room code"]');
  if (!input) {
    throw new Error("Room code input not found");
  }
  await input.click({ clickCount: 3 });
  await input.type(roomCode);
  await clickButtonByText(page, "Join Room");
}

async function clickPlusButton(page, buttonIndex = 0) {
  const clicked = await page.evaluate((index) => {
    const plusButtons = Array.from(document.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "+"
    );
    const target = plusButtons[index];
    if (!target || target.hasAttribute("disabled")) {
      return false;
    }
    target.click();
    return true;
  }, buttonIndex);

  if (!clicked) {
    throw new Error("Unable to click gem increment button.");
  }
  await sleep(100);
}

async function run() {
  const timestamp = Date.now();
  const userA = `alice_${timestamp}`;
  const userB = `bob_${timestamp}`;
  const password = "password123";

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
    protocolTimeout: 240000,
  });

  const pageA = await browser.newPage();
  const pageB = await browser.newPage();

  try {
    for (const page of [pageA, pageB]) {
      await page.goto(URL, { waitUntil: "networkidle0" });
      await clickButtonByText(page, "Play Online Multiplayer");
      await clickButtonByText(page, "Register");
    }

    await setInputValue(pageA, 'input:not([type="password"])', userA);
    await setInputValue(pageA, 'input[type="password"]', password);
    await clickButtonByText(pageA, "Create Account");

    await setInputValue(pageB, 'input:not([type="password"])', userB);
    await setInputValue(pageB, 'input[type="password"]', password);
    await clickButtonByText(pageB, "Create Account");

    await waitForText(pageA, "Create New Room");
    await waitForText(pageB, "Create New Room");

    await clickButtonByText(pageA, "Create New Room");
    await waitForText(pageA, "Room:");
    const roomCode = await getRoomCode(pageA);

    await joinRoom(pageB, roomCode);
    await waitForText(pageA, userB);

    await clickButtonByText(pageA, "Start Game");
    await waitForText(pageA, "Current turn");
    await waitForText(pageB, "Current turn");

    await waitForText(pageA, `Current turn: ${userA}`);

    await clickPlusButton(pageA, 0);
    await clickButtonByText(pageA, "Take Gems");

    await waitForText(pageB, `Current turn: ${userB}`);

    await clickButtonByText(pageB, "End Turn");

    await waitForText(pageA, `Current turn: ${userA}`);

    console.log("Online multiplayer e2e passed.");
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error("Online multiplayer e2e failed:", error.message);
  process.exit(1);
});
