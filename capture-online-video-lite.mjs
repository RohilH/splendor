import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import puppeteer from "puppeteer";

const URL = "http://localhost:5173/";
const FRAMES_DIR = "/opt/cursor/artifacts/online-multiplayer-video-lite-frames";
const VIDEO_PATH = "/opt/cursor/artifacts/online-multiplayer-demo.mp4";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} failed`))));
  });

async function clickButtonByText(page, text) {
  const clicked = await page.evaluate((targetText) => {
    const button = Array.from(document.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes(targetText)
    );
    if (!button) return false;
    button.click();
    return true;
  }, text);
  if (!clicked) throw new Error(`Missing button: ${text}`);
}

async function waitForText(page, text, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const bodyText = await page.$eval("body", (el) => el.textContent || "");
    if (bodyText.includes(text)) return;
    await sleep(250);
  }
  throw new Error(`Timeout waiting for: ${text}`);
}

async function frame(pageA, pageB, index) {
  const frameId = String(index).padStart(3, "0");
  await pageA.screenshot({
    path: path.join(FRAMES_DIR, `a_${frameId}.png`),
    captureBeyondViewport: false,
  });
  await pageB.screenshot({
    path: path.join(FRAMES_DIR, `b_${frameId}.png`),
    captureBeyondViewport: false,
  });
  console.log(`Captured frame ${frameId}`);
}

async function main() {
  await fs.rm(FRAMES_DIR, { recursive: true, force: true });
  await fs.mkdir(FRAMES_DIR, { recursive: true });

  const suffix = Date.now();
  const userA = `lite_alice_${suffix}`;
  const userB = `lite_bob_${suffix}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
    protocolTimeout: 600000,
  });

  const pageA = await browser.newPage();
  const pageB = await browser.newPage();
  await pageA.setViewport({ width: 900, height: 560 });
  await pageB.setViewport({ width: 900, height: 560 });

  try {
    for (const page of [pageA, pageB]) {
      await page.goto(URL, { waitUntil: "networkidle0" });
      await clickButtonByText(page, "Play Online Multiplayer");
    }

    await pageA.type("input", userA);
    await clickButtonByText(pageA, "Continue");
    await waitForText(pageA, "Create New Room");

    await pageB.type("input", userB);
    await clickButtonByText(pageB, "Continue");
    await waitForText(pageB, "Create New Room");

    await clickButtonByText(pageA, "Create New Room");
    await waitForText(pageA, "Room:");
    const roomCode = await pageA.$eval("body", (el) => {
      const match = (el.textContent || "").match(/Room:\s*([A-Z0-9]{6})/);
      return match?.[1] ?? null;
    });
    if (!roomCode) throw new Error("Room code missing");

    await pageB.type('input[placeholder="Enter room code"]', roomCode);
    await clickButtonByText(pageB, "Join Room");
    await waitForText(pageA, userB);

    await clickButtonByText(pageA, "Start Game");
    await waitForText(pageA, "Current turn");
    await waitForText(pageB, "Current turn");
    await frame(pageA, pageB, 0);

    await pageA.evaluate(() => {
      const plusButtons = Array.from(document.querySelectorAll("button")).filter(
        (button) => button.textContent?.trim() === "+"
      );
      plusButtons[0]?.click();
    });
    await clickButtonByText(pageA, "Take Gems");
    await waitForText(pageB, `Current turn: ${userB}`);
    await frame(pageA, pageB, 1);

    await clickButtonByText(pageB, "End Turn");
    await waitForText(pageA, `Current turn: ${userA}`);
    await frame(pageA, pageB, 2);
  } finally {
    await browser.close();
  }

  await run("ffmpeg", [
    "-y",
    "-framerate",
    "1",
    "-i",
    path.join(FRAMES_DIR, "a_%03d.png"),
    "-framerate",
    "1",
    "-i",
    path.join(FRAMES_DIR, "b_%03d.png"),
    "-filter_complex",
    "hstack=inputs=2",
    "-pix_fmt",
    "yuv420p",
    "-c:v",
    "libx264",
    VIDEO_PATH,
  ]);

  console.log(`Lite demo video generated at ${VIDEO_PATH}`);
}

main().catch((error) => {
  console.error("Failed to capture lite video:", error.message);
  process.exit(1);
});
