const { MongoClient } = require("mongodb");
const nodemailer = require("nodemailer");
require("dotenv").config();

// MongoDB client setup
const client = new MongoClient(process.env.MONGODB_URI);
const dbName = "apartment_scraper";
const collectionName = "prices";

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// function to extract price from text
function extractPrice(textContent) {
  const priceMatch = textContent.match(/\$\d{1,3}(?:,\d{3})*/); // Matches $ followed by numbers with optional commas
  return priceMatch ? priceMatch[0] : null;
}

// function to read the previous price from MongoDB
async function readPreviousValue() {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const record = await collection.findOne({ key: "lastValue" });
    return record ? record.value : "";
  } finally {
    await client.close();
  }
}

// function to save the new price to MongoDB
async function saveNewValue(value) {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    await collection.updateOne(
      { key: "lastValue" },
      { $set: { key: "lastValue", value } },
      { upsert: true }
    );
    console.log(`Saved new value to MongoDB: ${value}`);
  } finally {
    await client.close();
  }
}

// function to fetch email recipients from MongoDB
async function getRecipients() {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("recipients");

    const recipients = await collection.find({}).toArray();
    return recipients.map((recipient) => recipient.email); // Return an array of email addresses
  } catch (err) {
    console.error("Error fetching recipients:", err.message);
    return [];
  } finally {
    await client.close();
  }
}

// function to send email
async function sendEmail(subject, plainTextMessage, htmlMessage) {
  // Fetch recipients from MongoDB
  const recipients = await getRecipients();
  if (recipients.length === 0) {
    console.log("No recipients found, skipping email.");
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipients,
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
  extractPrice,
  readPreviousValue,
  saveNewValue,
  sendEmail,
};
