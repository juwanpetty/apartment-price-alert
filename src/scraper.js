const path = require("path");
const {
  initializeBrowser,
  extractPrice,
  readPreviousValue,
  saveNewValue,
  sendEmail,
} = require("./utilities");

require("dotenv").config();

const url =
  "https://www.elanmadisonyards.com/atlanta/elan-madison-yards/floorplans/one-bedroom-one-bath-716-sf-703161/fp_name/occupancy_type/conventional/";
const elementSelector = "span.fee-transparency-text";
const previousValueFile = path.resolve(__dirname, "lastValue.txt");

// Main function to scrape data and check for changes
async function scrapeAndNotify() {
  const { browser, page } = await initializeBrowser();

  await page.setViewport({ width: 800, height: 600 });

  try {
    await page.goto(url, { timeout: 60000, waitUntil: "domcontentloaded" });

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

    // Read the previous value and compare
    const previousValue = readPreviousValue(previousValueFile);
    if (previousValue !== price) {
      console.log("Price has changed!");

      // Save the new price to the file
      saveNewValue(previousValueFile, price);

      // Send email notification
      const subject = `Elan Price Change Alert! ${price}`;
      const plainTextMessage = `The price has changed to ${price}. You can check it out here: ${url}`;
      const htmlMessage = `The price has changed to <b>${price}</b>. You can check it out <a href="${url}" target="_blank">here</a>.`;
      await sendEmail(subject, plainTextMessage, htmlMessage);
    } else {
      console.log("Price has not changed.");
    }
  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    await browser.close();
  }
}

// Execute the main function
scrapeAndNotify();
