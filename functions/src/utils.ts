import * as crypto from "crypto";
import * as Sentry from "@sentry/node";
import { NextFunction, Request, Response } from "express";
import { App } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { ObjectMetadata } from "firebase-functions/v1/storage";
import OpenAI from "openai";
import * as pdf from "pdf-parse";

import { ExtendedReq } from ".";

import mammoth = require("mammoth");

const getEncryptionKey = () => {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error("No encryption key was found");
  }

  return encryptionKey;
};

export const parseFileText = async (
  app: App,
  storageObject: ObjectMetadata
) => {
  if (!storageObject.name)
    throw new Error("Object metadata key name undefined");

  const fileRef = await getStorage(app)
    .bucket(storageObject.bucket)
    .file(storageObject.name);

  const fileBuffer = await fileRef.download();

  let fileText: string;

  if (storageObject.name.includes(".pdf")) {
    fileText = (await pdf(fileBuffer[0])).text;
  } else {
    const res = await mammoth.extractRawText({ buffer: fileBuffer[0] });
    fileText = res.value;
  }

  return fileText;
};

export const analyzeResumeContent = async (
  fileText: string,
  openaiApiKey: string
): Promise<string> => {
  const openai = new OpenAI({
    apiKey: openaiApiKey
  });

  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `You are an expert in reviewing resumes for software engineers`
      },
      {
        role: "user",
        content: `Resume content: ${fileText}
      
              1. Summarize in 2-3 sentences my background.
              2. Summarize my key skills.
              3. Summarize my most relevant work experiences/accomplishments.`
      }
    ]
  });

  return chatCompletion.choices[0].message.content ?? "";
};

export const parseResumeAnalysis = (resumeAnalysis: string) => {
  const content = resumeAnalysis.replaceAll("\n", "");
  const backgroundIndexStart = content.indexOf("1. ") + 3;
  const backgroundIndexEnd = content.indexOf("2. ");
  const skillsIndexStart = content.indexOf("2. ") + 3;
  const skillsIndexEnd = content.indexOf("3. ");
  const experienceIndexStart = content.indexOf("3. ") + 3;

  return {
    background: content.slice(backgroundIndexStart, backgroundIndexEnd),
    skills: content.slice(skillsIndexStart, skillsIndexEnd),
    experience: content.slice(experienceIndexStart)
  };
};

export const encrypt = (text: string) => {
  const IV_LENGTH = 16; // For AES, this is always 16
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(getEncryptionKey(), "hex"),
    iv
  );
  let encrypted = cipher.update(text);

  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

export const decrypt = (text: string) => {
  let textParts = text.split(":");
  const shifted = textParts.shift();
  if (!shifted) throw new Error("Error shifting");

  let iv = Buffer.from(shifted, "hex");
  let encryptedText = Buffer.from(textParts.join(":"), "hex");
  let decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(getEncryptionKey(), "hex"),
    iv
  );
  let decrypted = decipher.update(encryptedText);

  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
};

export const httpsOnRequestWrapper = (
  name: string,
  handler: (
    req: Request,
    res: Response,
    next?: NextFunction
  ) => any | Promise<any>
) => {
  return async (req: ExtendedReq, res: Response, next?: NextFunction) => {
    // 1. Start the Sentry transaction
    const transaction = Sentry.startTransaction({
      name,
      op: "functions.https.onRequest"
    });

    // 2. Set the transaction context
    // In this example, we’re sending the uid from Firebase auth
    // You can send any relevant data here that might help with
    // debugging
    Sentry.setContext("Function context", {
      ...(req.body || {}),
      user: req.user,
      function: name,
      op: "functions.https.onRequest"
    });

    try {
      // 3. Try calling the function handler itself
      return await handler(req, res, next);
    } catch (e) {
      // 4. Send any errors to Sentry
      await Sentry.captureException(e);
      await Sentry.flush(1000);

      // Don’t forget to throw them too!

      throw e;
    } finally {
      // 5. Finish the Sentry transaction
      Sentry.configureScope((scope) => scope.clear());
      transaction.finish();
    }
  };
};
