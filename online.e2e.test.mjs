import puppeteer from "puppeteer";

const URL = process.env.E2E_BASE_URL || "http://localhost:5173/";

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

async function clickGemChip(page, gemType) {
  const clicked = await page.evaluate((gem) => {
    const gemImages = Array.from(
      document.querySelectorAll(`img[alt="${gem}"]`)
    );
    for (const img of gemImages) {
      const chip = img.parentElement;
      if (chip && getComputedStyle(chip).cursor === "pointer") {
        chip.click();
        return true;
      }
    }
    return false;
  }, gemType);

  if (!clicked) {
    throw new Error(`Unable to click gem chip "${gemType}".`);
  }
  await sleep(100);
}

async function run() {
  const timestamp = Date.now();
  const userA = `alice_${timestamp}`;
  const userB = `bob_${timestamp}`;

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
    }

    await setInputValue(pageA, "input", userA);
    await clickButtonByText(pageA, "Continue");

    await setInputValue(pageB, "input", userB);
    await clickButtonByText(pageB, "Continue");

    await waitForText(pageA, "Create New Room");
    await waitForText(pageB, "Create New Room");

    await clickButtonByText(pageA, "Create New Room");
    await waitForText(pageA, "Room:");
    const roomCode = await getRoomCode(pageA);

    await joinRoom(pageB, roomCode);
    await waitForText(pageA, userB);

    await clickButtonByText(pageA, "Start Game");
    await waitForText(pageA, "Your Turn");
    await waitForText(pageB, `Waiting for ${userA}`);

    await clickGemChip(pageA, "diamond");
    await clickButtonByText(pageA, "Take Gems & End Turn");

    await waitForText(pageB, "Your Turn");
    await waitForText(pageA, `Waiting for ${userB}`);

    await clickButtonByText(pageB, "End Turn");

    await waitForText(pageA, "Your Turn");

    console.log("Online multiplayer e2e passed.");
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error("Online multiplayer e2e failed:", error.message);
  process.exit(1);
});
