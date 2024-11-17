const puppeteer = require("puppeteer-core");
const {
  extractPrice,
  readPreviousValue,
  saveNewValue,
  sendEmail,
} = require("./utilities");

require("dotenv").config();

const SBR_WS_ENDPOINT = `wss://${process.env.AUTH}@brd.superproxy.io:9222`;

const url =
  "https://www.elanmadisonyards.com/atlanta/elan-madison-yards/floorplans/one-bedroom-one-bath-716-sf-703161/fp_name/occupancy_type/conventional/";
const elementSelector = "span.fee-transparency-text";

async function main() {
  console.log("Connecting to Scraping Browser...");
  const browser = await puppeteer.connect({
    browserWSEndpoint: SBR_WS_ENDPOINT,
  });

  try {
    console.log("Connected! Navigating...");
    const page = await browser.newPage();

    await page.goto(url, { timeout: 2 * 60 * 1000 });

    console.log("Taking screenshot to page.png");
    await page.screenshot({ path: "screenshot.png", fullPage: true });

    console.log("Navigated! Scraping page content...");

    // Wait for the element and extract data
    await page.waitForSelector(elementSelector);
    const textContent = await page.$eval(
      elementSelector,
      (el) => el.textContent
    );
    console.log("Full text content:", textContent);

    // Extract the price from the text content
    const price = extractPrice(textContent);
    if (!price) {
      console.error("Price not found in textContent.");
      return;
    }
    console.log("Extracted price:", price);

    // Read the previous value from MongoDB and compare
    const previousValue = await readPreviousValue();
    if (previousValue !== price) {
      console.log("Price has changed!");

      // Save the new price to MongoDB
      await saveNewValue(price);

      // Send email notification
      const subject = `Elan Price Change Alert! ${price}`;
      const plainTextMessage = `The price has changed to ${price}. You can check it out here: ${url}`;
      const htmlMessage = `The price has changed to <b>${price}</b>. You can check it out <a href="${url}" target="_blank">here</a>.`;
      await sendEmail(subject, plainTextMessage, htmlMessage);
    } else {
      console.log("Price has not changed.");
    }

    // Note 1: If no captcha was found it will return not_detected status after detectTimeout
    // Note 2: Once a CAPTCHA is solved, if there is a form to submit, it will be submitted by default
    const client = await page.target().createCDPSession();
    const { status } = await client.send("Captcha.solve", {
      detectTimeout: 30 * 1000,
    });
    console.log(`Captcha solve status: ${status}`);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
