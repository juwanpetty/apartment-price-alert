const puppeteer = require("puppeteer-extra");
const nodemailer = require("nodemailer");
const fs = require("fs");

require("dotenv").config();

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// function to initialize Puppeteer
async function initializeBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox", // Required for Heroku
      "--disable-setuid-sandbox", // Required for Heroku
      "--disable-dev-shm-usage", // Prevents Chromium from using /dev/shm
      "--disable-accelerated-2d-canvas", // Disable GPU
      "--no-zygote", // Disable zygote processes
      "--single-process", // Use a single process (Heroku limitation)
      "--disable-gpu", // Disable GPU for headless environments
    ],
  });
  const page = await browser.newPage();
  return { browser, page };
}

// function to extract price from text
function extractPrice(textContent) {
  const priceMatch = textContent.match(/\$\d{1,3}(?:,\d{3})*/); // Matches $ followed by numbers with optional commas
  return priceMatch ? priceMatch[0] : null;
}

// function to read the previous value from a file
function readPreviousValue(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, "utf8").trim();
  }
  return "";
}

// function to save the new value to a file
function saveNewValue(filePath, value) {
  fs.writeFileSync(filePath, value);
}

// function to send email
async function sendEmail(subject, plainTextMessage, htmlMessage) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    bcc: process.env.EMAIL_TO,
    subject: subject,
    text: plainTextMessage,
    html: htmlMessage,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

module.exports = {
  initializeBrowser,
  extractPrice,
  readPreviousValue,
  saveNewValue,
  sendEmail,
};
