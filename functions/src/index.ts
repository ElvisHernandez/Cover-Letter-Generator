import { cert, initializeApp, ServiceAccount } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import * as logger from "firebase-functions/logger";
import { user } from "firebase-functions/v1/auth";
import { object } from "firebase-functions/v1/storage";
import { onRequest } from "firebase-functions/v2/https";
import OpenAI from "openai";

import * as serviceAccount from "../private/firebase_service_account.json";
import {
  analyzeResumeContent,
  decrypt,
  encrypt,
  parseFileText,
  parseResumeAnalysis
} from "./utils";

const app = initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
  databaseURL:
    "https://cover-letter-generator-8a059-default-rtdb.firebaseio.com"
});

const db = getDatabase(app);

exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from firebase!");
});

export const onAuthUserCreate = user().onCreate((user, ctx) => {
  console.log("In the on auth user create thing");

  return db.ref(`/users/${user.uid}`).set({
    email: user.email,
    uid: user.uid
  });
});

type Response = {
  statusCode: number;
  errors: string[];
  data?: object;
};

export const saveOpenAiApiKey = onRequest(async (req, res) => {
  const { openaiApiKey, userUid } = req.body;

  console.log("In the saveOpenAiApiKey function");
  console.log(req.body);

  const response: Response = {
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

      db.ref(`/users/${userUid}`).update({
        encryptedOpenAiKey: encryptedKey
      });

      console.log(chatCompletion.choices);
    } catch (e) {
      logger.error(e);
      response.statusCode = 500;
      response.errors.push((e as Error).message);
    }
  }

  res.status(response.statusCode).send(response);
});

export const analyzeResumeOnUpload = object().onFinalize(async (object) => {
  console.log("In the analyzeResumeOnUpload function");
  console.log(object);

  if (!object.name) return;

  try {
    const [_, userUid, resumeFileName] = object.name.split("/");
    const fileText = await parseFileText(app, object);

    const userRef = db.ref(`users/${userUid}`);
    const snapshot = await userRef.once("value");
    const user = snapshot.val();

    const openaiApiKey = decrypt(user.encryptedOpenAiKey);
    const resumeAnalysis = await analyzeResumeContent(fileText, openaiApiKey);
    const parsedAnalysis = parseResumeAnalysis(resumeAnalysis);

    console.log(parsedAnalysis);
    await userRef.update({ ...parsedAnalysis, resumeFileName });
  } catch (e) {
    logger.error(e);
  }
});

export const createCoverLetter = onRequest(
  {
    timeoutSeconds: 540
  },
  async (req, res) => {
    const { jobDescription, userUid } = req.body;

    console.log("In the createCoverLetter function");
    console.log(jobDescription);

    const response: Response = {
      statusCode: 200,
      errors: []
    };

    console.log("In the createCoverLetter function: ", userUid);

    try {
      const snapshot = await db.ref(`users/${userUid}`).once("value");
      const user = snapshot.val();

      const openaiApiKey = decrypt(user.encryptedOpenAiKey);

      const openai = new OpenAI({
        apiKey: openaiApiKey
      });

      const styleOpts = ["casual", "formal", "enthusiastic"];
      const emphasisOpts = ["problem-solving", "collaboration", "leadership"];

      const style = styleOpts[2];
      const emphasis = emphasisOpts[0];

      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        temperature: 1.1,
        messages: [
          {
            role: "system",
            content: `You are an expert at crafting personalized cover letters for software engineers. You are to understand the key requirements of this job description ${jobDescription}`
          },
          {
            role: "user",
            content: `Write a ${style} cover letter that emphasizes ${emphasis} with the following structure:

            Greeting: Start with Dear [Company name] team,
    
            Introduction:
                - Begin with a captivating opener that grabs the reader's attention.
                - Mention the specific role you're applying for.
                - Briefly touch upon how your background and skills make you a suitable candidate.

            Body: 
                - Show that you've researched the company by discussing aspects of their products, culture, or mission that resonate with you.
                - Highlight how your skills and values align with the company's needs and culture based off this experience ${user.experience}.

            Conclusion - Thank the hiring manager for their time, express enthusiasm, and leave a call to action like expressing interest in an interview.

            Limit the cover letter to a max of 300 words.
            `
          }
        ]
      });

      await db.ref(`users/${userUid}`).update({
        coverLetterLoading: false,
        currentCoverLetter: chatCompletion.choices[0].message.content,
        coverLetterError: false
      });
    } catch (e) {
      await db.ref(`users/${userUid}`).update({
        coverLetterLoading: false,
        currentCoverLetter: "",
        coverLetterError: true
      });
      logger.error(e);
      response.errors.push((e as Error).message);
      response.statusCode = 500;
    }

    res.status(response.statusCode).send(response);
  }
);
