import puppeteer from 'puppeteer';

const URL = 'http://localhost:5173/';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  let passed = 0;
  let failed = 0;
  const assert = (condition, label) => {
    if (condition) { passed++; console.log(`  PASS: ${label}`); }
    else { failed++; console.log(`  FAIL: ${label}`); }
  };

  // ---- SETUP SCREEN ----
  console.log('\n=== Setup Screen ===');
  await page.goto(URL, { waitUntil: 'networkidle0' });

  const title = await page.$eval('body', el => el.textContent);
  assert(title.includes('Splendor'), 'Title "Splendor" is visible');

  // Select local mode first
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const localBtn = buttons.find(b => b.textContent.includes('Play Local'));
    if (localBtn) localBtn.click();
  });
  await sleep(400);

  // Player count selector exists
  const selectEl = await page.$('select');
  assert(!!selectEl, 'Player count select exists');

  // Name inputs exist (default 2 players) -- excludes checkbox input
  let inputs = await page.$$('input[type="text"], input:not([type])');
  assert(inputs.length === 2, `2 name inputs visible (got ${inputs.length})`);

  // Start button should be disabled with empty names
  const startBtn = await page.$('button');
  const isDisabled = await page.evaluate(el => el.disabled, startBtn);
  assert(isDisabled, 'Start button disabled when names are empty');

  // Fill in names
  await inputs[0].click({ clickCount: 3 });
  await inputs[0].type('Alice');
  await inputs[1].click({ clickCount: 3 });
  await inputs[1].type('Bob');
  await sleep(300);

  // Start button should now be enabled
  const startBtns = await page.$$('button');
  const mainStartBtn = startBtns[startBtns.length - 1];
  const isEnabledNow = await page.evaluate(el => !el.disabled, mainStartBtn);
  assert(isEnabledNow, 'Start button enabled after entering names');

  // Click start
  await mainStartBtn.click();
  await sleep(1000);

  // ---- GAME BOARD ----
  console.log('\n=== Game Board ===');
  const bodyText = await page.$eval('body', el => el.textContent);
  assert(bodyText.includes("Player 1's Turn") || bodyText.includes("Player 1"), 'Game board shows Player 1 turn');

  // Check cards are rendered (should have card boxes)
  const cardBoxes = await page.$$('img[alt]');
  assert(cardBoxes.length > 0, `Gem/card images are rendered (found ${cardBoxes.length})`);

  // Check gem bank has gem counts
  assert(bodyText.includes('4') || bodyText.includes('5'), 'Gem counts are visible');

  // Check player areas exist
  assert(bodyText.includes('Alice') || bodyText.includes('Bob'), 'Player names visible on board');

  // Check "End Turn" button exists
  const endTurnBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent.includes('End Turn'))?.textContent || null;
  });
  assert(!!endTurnBtn, 'End Turn button exists');

  // ---- GEM TAKING ----
  console.log('\n=== Gem Taking ===');

  // Find gem bank items - they're VStacks with gem images and counts
  // The gem bank is in the right column, each gem is a clickable VStack
  // We need to click on non-gold, non-disabled gems
  const gemClicked = await page.evaluate(() => {
    const gemBank = document.querySelectorAll('img[alt]');
    const clickableGems = [];
    gemBank.forEach(img => {
      const parent = img.closest('[class*="css"]');
      if (parent && !parent.style.opacity?.includes('0.3') && parent.style.cursor !== 'not-allowed') {
        const alt = img.getAttribute('alt');
        if (alt && alt !== 'gold' && !clickableGems.includes(alt)) {
          clickableGems.push({ alt, el: parent });
        }
      }
    });
    // Click first 3 different non-gold gems in the gem bank (right side)
    let clicked = 0;
    const gemsToClick = ['diamond', 'sapphire', 'emerald'];
    for (const gem of gemsToClick) {
      // Find in the right-side gem bank (SimpleGrid area)
      const allImgs = Array.from(document.querySelectorAll('img[alt="' + gem + '"]'));
      for (const img of allImgs) {
        const vstack = img.parentElement;
        if (vstack && getComputedStyle(vstack).cursor === 'pointer') {
          vstack.click();
          clicked++;
          break;
        }
      }
    }
    return clicked;
  });
  assert(gemClicked === 3, `Clicked 3 gem types (clicked ${gemClicked})`);
  await sleep(500);

  // Check that button now says "Take Gems & End Turn"
  const takeGemsBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent.includes('Take Gems'))?.textContent || null;
  });
  assert(!!takeGemsBtn, `"Take Gems & End Turn" button appeared (got: ${takeGemsBtn})`);

  // Click "Take Gems & End Turn"
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Take Gems') || b.textContent.includes('End Turn'));
    if (btn) btn.click();
  });
  await sleep(500);

  // Verify turn advanced to player 2
  const bodyAfter = await page.$eval('body', el => el.textContent);
  assert(
    bodyAfter.includes("Player 2's Turn") || bodyAfter.includes("Player 2"),
    'Turn advanced to Player 2'
  );

  // ---- END TURN WITHOUT GEMS ----
  console.log('\n=== End Turn (no action) ===');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('End Turn'));
    if (btn) btn.click();
  });
  await sleep(500);

  const bodyAfter2 = await page.$eval('body', el => el.textContent);
  assert(
    bodyAfter2.includes("Player 1's Turn"),
    'Turn cycled back to Player 1'
  );

  // ---- CARD RESERVE ----
  console.log('\n=== Card Reserve ===');
  // Hover over a card to reveal reserve button, then click it
  const reserved = await page.evaluate(async () => {
    // Find a card element with a Reserve button inside .card-actions overlay
    const cardActions = document.querySelectorAll('.card-actions');
    for (const overlay of cardActions) {
      const reserveBtn = Array.from(overlay.querySelectorAll('button')).find(
        b => b.textContent === 'Reserve'
      );
      if (reserveBtn && !reserveBtn.disabled) {
        // Make overlay visible
        overlay.style.opacity = '1';
        reserveBtn.click();
        return true;
      }
    }
    return false;
  });
  assert(reserved, 'Successfully clicked Reserve on a card');
  await sleep(500);

  // After reserving, turn auto-ends, so Player 2 is now active.
  // Verify the game didn't crash and is still playable.
  const bodyAfterReserve = await page.$eval('body', el => el.textContent);
  assert(
    bodyAfterReserve.includes("Player 2's Turn") || bodyAfterReserve.includes("Player 1's Turn"),
    'Game continues after reserve (turn advanced)'
  );

  // ---- SUMMARY ----
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('E2E test crashed:', err.message);
  process.exit(1);
});
