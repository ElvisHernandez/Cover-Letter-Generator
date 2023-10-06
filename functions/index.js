const functions = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { user } = require("firebase-functions/v1/auth");
const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getStorage } = require("firebase-admin/storage");
const { object } = require("firebase-functions/v1/storage");
const pdf = require("pdf-parse");
const utils = require("./utils");

const crypto = require("crypto");

const OpenAI = require("openai");

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

exports.analyzeResumeOnUpload = object().onFinalize(async (object) => {
  console.log("In the analyzeResumeOnUpload function");
  console.log(object);

  try {
    const [_, userUid, resumeFileName] = object.name.split("/");
    const fileText = await utils.parsedFileText(app, object);

    const db = getDatabase(app);

    const userRef = db.ref(`users/${userUid}`);
    const snapshot = await userRef.once("value");
    const user = snapshot.val();

    const openaiApiKey = decrypt(user.encryptedOpenAiKey);
    const resumeAnalysis = await utils.analyzeResumeContent(
      fileText,
      openaiApiKey
    );
    const parsedAnalysis = utils.parseResumeAnalysis(resumeAnalysis);

    console.log(parsedAnalysis);

    // const fs = require("fs");
    // const path = require("path");

    // console.log("The chat completion ", chatCompletion.choices[0].message);

    // fs.writeFileSync(
    //   path.resolve(__dirname, "gpt-response.json"),
    //   JSON.stringify(chatCompletion)
    // );
    await userRef.update({ ...parsedAnalysis, resumeFileName });
  } catch (e) {
    logger.error(e);
  }
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
