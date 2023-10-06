const { onRequest } = require("firebase-functions/v2/https");
const {} = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const { user } = require("firebase-functions/v1/auth");
const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { object } = require("firebase-functions/v1/storage");
const utils = require("./utils");

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

      const encryptedKey = utils.encrypt(openaiApiKey);

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

    const openaiApiKey = utils.decrypt(user.encryptedOpenAiKey);
    const resumeAnalysis = await utils.analyzeResumeContent(
      fileText,
      openaiApiKey
    );
    const parsedAnalysis = utils.parseResumeAnalysis(resumeAnalysis);

    console.log(parsedAnalysis);
    await userRef.update({ ...parsedAnalysis, resumeFileName });
  } catch (e) {
    logger.error(e);
  }
});

exports.createCoverLetter = onRequest(
  {
    timeoutSeconds: 540
  },
  async (req, res) => {
    const { jobDescription, userUid } = req.body;

    console.log("In the createCoverLetter function");
    console.log(jobDescription);

    const response = {
      statusCode: 200,
      coverLetter: "",
      errors: []
    };

    try {
      const db = getDatabase(app);

      const snapshot = await db.ref(`users/${userUid}`).once("value");
      const user = snapshot.val();

      const openaiApiKey = utils.decrypt(user.encryptedOpenAiKey);

      const openai = new OpenAI({
        apiKey: openaiApiKey
      });

      const styleOpts = ["casual", "formal", "enthusiastic"];
      const emphasisOpts = ["problem-solving", "collaboration", "leadership"];

      const style = styleOpts[1];
      const emphasis = emphasisOpts[2];

      const messages = [
        {
          role: "system",
          content: `You are an expert at crafting cover letters for software engineers. You are to understand the key requirements of this job description ${jobDescription}`
        },
        {
          role: "user",
          content: `Write a ${style} cover letter that emphasizes ${emphasis} with the following structure:

        Introduction - One paragraph, start with "Dear Hiring Manager". Address the companies key needs and introduce me based off the following information: ${user.background}.
        Body - Two paragraphs max, match my experience to the job requirements based off ${user.experience}.
        Conclusion - Thank the hiring manager for their time, express enthusiasm, and leave a call to action like expressing interest in an interview.
        `
        }
      ];

      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 1.1
      });

      response.coverLetter = chatCompletion.choices[0].message.content;

      const fs = require("fs");
      const path = require("path");

      fs.writeFileSync(
        path.resolve(__dirname, "gpt-response.json"),
        JSON.stringify({ chatCompletion })
      );
    } catch (e) {
      logger.error(e);
      response.errors(e.message);
      response.statusCode = 500;
    }

    res.status(response.statusCode).send(response);
  }
);
