import { NextFunction as Next, Request as Req, Response as Res } from "express";
import { App, cert, initializeApp, ServiceAccount } from "firebase-admin/app";
import { DecodedIdToken, getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import * as logger from "firebase-functions/logger";
import { user } from "firebase-functions/v1/auth";
import { object } from "firebase-functions/v1/storage";
import { onRequest } from "firebase-functions/v2/https";
import OpenAI from "openai";

import {
  analyzeResumeContent,
  decrypt,
  encrypt,
  parseFileText,
  parseResumeAnalysis
} from "./utils";

let app: App;

if (process.env.NODE_ENV !== "production") {
  const serviceAccount = require("../private/firebase_service_account.json");
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
  app = initializeApp({
    credential: cert(serviceAccount as ServiceAccount),
    databaseURL:
      "https://cover-letter-generator-8a059-default-rtdb.firebaseio.com"
  });
} else {
  app = initializeApp({
    databaseURL:
      "https://cover-letter-generator-8a059-default-rtdb.firebaseio.com"
  });
}

const db = getDatabase(app);
const auth = getAuth(app);

interface ExtendedReq extends Req {
  user?: DecodedIdToken;
}

const validateFirebaseIdToken = async (
  req: ExtendedReq,
  res: Res,
  next: Next
) => {
  logger.info("-----------------------------------------------------");
  logger.info("In the validateFirebaseIdToken middleware");
  logger.info(req.headers);
  logger.info("-----------------------------------------------------");
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer ")
  ) {
    console.error(
      "No Firebase ID token was passed as a Bearer token in the Authorization header."
    );
    res.status(403).send("Unauthorized");
    return;
  }

  const idToken = req.headers.authorization.split("Bearer ")[1];
  try {
    const decodedIdToken = await auth.verifyIdToken(idToken);
    req.user = decodedIdToken;
    next();
  } catch (error) {
    console.error("Error while verifying Firebase ID token:", error);
    res.status(403).send("Unauthorized");
  }
};

export const onAuthUserCreate = user().onCreate((user, ctx) => {
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

export const saveOpenAiApiKey = onRequest(
  { timeoutSeconds: 540, cors: true },
  (req, res) => {
    validateFirebaseIdToken(req, res, async () => {
      const { openaiApiKey, userUid } = req.body;

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

          await openai.chat.completions.create({
            messages: [{ role: "user", content: "Say this is a test" }],
            model: "gpt-3.5-turbo"
          });

          const encryptedKey = encrypt(openaiApiKey);

          db.ref(`/users/${userUid}`).update({
            encryptedOpenAiKey: encryptedKey,
            encryptedOpenAiKeyError: false
          });
        } catch (e) {
          db.ref(`/users/${userUid}`).update({
            encryptedOpenAiKeyError: true
          });
          logger.error(e);
          response.statusCode = 500;
          response.errors.push((e as Error).message);
        } finally {
        }
      }

      res.status(response.statusCode).send(response);
    });
  }
);

export const analyzeResumeOnUpload = object().onFinalize(async (object) => {
  if (!object.name) return;
  const [_, userUid, resumeFileName] = object.name.split("/");
  const userRef = db.ref(`users/${userUid}`);

  let resumeError = false;

  try {
    const fileText = await parseFileText(app, object);

    const snapshot = await userRef.once("value");
    const user = snapshot.val();

    const openaiApiKey = decrypt(user.encryptedOpenAiKey);
    const resumeAnalysis = await analyzeResumeContent(fileText, openaiApiKey);
    const parsedAnalysis = parseResumeAnalysis(resumeAnalysis);

    await userRef.update({ ...parsedAnalysis, resumeFileName });
  } catch (e) {
    resumeError = true;
    logger.error(e);
  } finally {
    await userRef.update({
      resumeError,
      resumeLoading: false
    });
  }
});

export const createCoverLetter = onRequest(
  {
    timeoutSeconds: 540,
    cors: true
  },
  (req, res) => {
    validateFirebaseIdToken(req, res, async () => {
      const {
        jobDescription,
        userUid,
        style,
        emphasis
      }: {
        jobDescription: string;
        userUid: string;
        style: "casual" | "formal" | "enthusiastic";
        emphasis: "problemSolving" | "collaboration" | "leadership";
      } = req.body;

      const response: Response = {
        statusCode: 200,
        errors: []
      };

      try {
        const snapshot = await db.ref(`users/${userUid}`).once("value");
        const user = snapshot.val();

        const openaiApiKey = decrypt(user.encryptedOpenAiKey);

        const openai = new OpenAI({
          apiKey: openaiApiKey
        });

        const styleOpts = {
          casual: "casual",
          formal: "formal",
          enthusiastic: "enthusiastic"
        };
        const emphasisOpts = {
          problemSolving: "problem-solving",
          collaboration: "collaboration",
          leadership: "leadership"
        };

        const chosenStyle = styleOpts[style];
        const chosenEmphasis = emphasisOpts[emphasis];

        console.log("--------------------------------------------------------");
        console.log(`style: ${style} | chosen style: ${chosenStyle}`);
        console.log(
          `emphasis: ${emphasis} | chosen emphasis: ${chosenEmphasis}`
        );
        console.log("--------------------------------------------------------");

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
              content: `Write a ${chosenStyle} cover letter that emphasizes ${chosenEmphasis} with the following structure:
    
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
    });
  }
);
