const functions = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { user } = require("firebase-functions/v1/auth");
const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

const crypto = require("crypto");

const OpenAI = require("openai");

// const openai = new OpenAI({
//   apiKey: functions.config().OPENAI.API_KEY
// });

const serviceAccount = require("../private/firebase_service_account.json");

const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL:
    "https://cover-letter-generator-8a059-default-rtdb.firebaseio.com"
});

exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from hello!");
});

exports.onAuthUserCreate = user().onCreate((user, ctx) => {
  console.log("In the on auth user create thing");
  const db = getDatabase(app);

  return db.ref(`/users/${user.uid}`).set({
    email: user.email,
    uid: user.uid
  });
});

exports.saveOpenAiApiKey = onRequest(async (req, res) => {
  const { openaiApiKey, userUid } = req.body;

  //   console.log("In the saveOpenAiApiKey function: ", openaiApiKey);

  //   const encryptedKey = encrypt(openaiApiKey);
  //   const decryptedKey = decrypt(encryptedKey);

  //   console.log("Encrypted key: ", encryptedKey);
  //   console.log("Decryption worked: ", openaiApiKey === decryptedKey);

  const response = {
    statusCode: 200,
    errors: []
  };

  if (!openaiApiKey || typeof openaiApiKey !== "string") {
    const errMsg = "Invalid <openAiApiKey> passed";
    logger.error(errMsg);
    response.errors.push(errMsg);
    response.statusCode = 500;
  }

  if (!userUid || typeof userUid !== "string") {
    const errMsg = "Invalid <userUid> passed";
    logger.error(errMsg);
    response.errors.push(errMsg);
    response.statusCode = 500;
  }

  if (response.statusCode === 200) {
    try {
      const openai = new OpenAI({
        apiKey: openaiApiKey
      });

      const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: "user", content: "Say this is a test" }],
        model: "gpt-3.5-turbo"
      });

      const encryptedKey = encrypt(openaiApiKey);

      const db = getDatabase(app);

      db.ref(`/users/${userUid}`).update({
        encryptedOpenAiKey: encryptedKey
      });

      console.log(chatCompletion.choices);
    } catch (e) {
      logger.error(e);
      response.statusCode = 500;
      response.errors.push(e.message);
    }
  }

  res.status(response.statusCode).send(response);
});

// const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes for AES-256

function encrypt(text) {
  const IV_LENGTH = 16; // For AES, this is always 16
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(functions.config().SECRETS.ENCRYPTION_KEY, "hex"),
    iv
  );
  let encrypted = cipher.update(text);

  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text) {
  let textParts = text.split(":");
  let iv = Buffer.from(textParts.shift(), "hex");
  let encryptedText = Buffer.from(textParts.join(":"), "hex");
  let decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(functions.config().SECRETS.ENCRYPTION_KEY, "hex"),
    iv
  );
  let decrypted = decipher.update(encryptedText);

  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}
