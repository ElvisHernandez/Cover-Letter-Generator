"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCoverLetter = exports.analyzeResumeOnUpload = exports.saveOpenAiApiKey = exports.onAuthUserCreate = void 0;
const app_1 = require("firebase-admin/app");
const database_1 = require("firebase-admin/database");
const logger = require("firebase-functions/logger");
const auth_1 = require("firebase-functions/v1/auth");
const storage_1 = require("firebase-functions/v1/storage");
const https_1 = require("firebase-functions/v2/https");
const openai_1 = require("openai");
const serviceAccount = require("../private/firebase_service_account.json");
const utils_1 = require("./utils");
const app = (0, app_1.initializeApp)({
    credential: (0, app_1.cert)(serviceAccount),
    databaseURL: "https://cover-letter-generator-8a059-default-rtdb.firebaseio.com"
});
const db = (0, database_1.getDatabase)(app);
exports.helloWorld = (0, https_1.onRequest)((request, response) => {
    logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from firebase!");
});
exports.onAuthUserCreate = (0, auth_1.user)().onCreate((user, ctx) => {
    console.log("In the on auth user create thing");
    return db.ref(`/users/${user.uid}`).set({
        email: user.email,
        uid: user.uid
    });
});
exports.saveOpenAiApiKey = (0, https_1.onRequest)(async (req, res) => {
    const { openaiApiKey, userUid } = req.body;
    console.log("In the saveOpenAiApiKey function");
    console.log(req.body);
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
            const openai = new openai_1.default({
                apiKey: openaiApiKey
            });
            const chatCompletion = await openai.chat.completions.create({
                messages: [{ role: "user", content: "Say this is a test" }],
                model: "gpt-3.5-turbo"
            });
            const encryptedKey = (0, utils_1.encrypt)(openaiApiKey);
            db.ref(`/users/${userUid}`).update({
                encryptedOpenAiKey: encryptedKey
            });
            console.log(chatCompletion.choices);
        }
        catch (e) {
            logger.error(e);
            response.statusCode = 500;
            response.errors.push(e.message);
        }
    }
    res.status(response.statusCode).send(response);
});
exports.analyzeResumeOnUpload = (0, storage_1.object)().onFinalize(async (object) => {
    console.log("In the analyzeResumeOnUpload function");
    console.log(object);
    if (!object.name)
        return;
    try {
        const [_, userUid, resumeFileName] = object.name.split("/");
        const fileText = await (0, utils_1.parseFileText)(app, object);
        const userRef = db.ref(`users/${userUid}`);
        const snapshot = await userRef.once("value");
        const user = snapshot.val();
        const openaiApiKey = (0, utils_1.decrypt)(user.encryptedOpenAiKey);
        const resumeAnalysis = await (0, utils_1.analyzeResumeContent)(fileText, openaiApiKey);
        const parsedAnalysis = (0, utils_1.parseResumeAnalysis)(resumeAnalysis);
        console.log(parsedAnalysis);
        await userRef.update(Object.assign(Object.assign({}, parsedAnalysis), { resumeFileName }));
    }
    catch (e) {
        logger.error(e);
    }
});
exports.createCoverLetter = (0, https_1.onRequest)({
    timeoutSeconds: 540
}, async (req, res) => {
    const { jobDescription, userUid } = req.body;
    console.log("In the createCoverLetter function");
    console.log(jobDescription);
    const response = {
        statusCode: 200,
        errors: []
    };
    console.log("In the createCoverLetter function: ", userUid);
    try {
        const snapshot = await db.ref(`users/${userUid}`).once("value");
        const user = snapshot.val();
        const openaiApiKey = (0, utils_1.decrypt)(user.encryptedOpenAiKey);
        const openai = new openai_1.default({
            apiKey: openaiApiKey
        });
        const styleOpts = ["casual", "formal", "enthusiastic"];
        const emphasisOpts = ["problem-solving", "collaboration", "leadership"];
        const style = styleOpts[1];
        const emphasis = emphasisOpts[2];
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
    
            Introduction - One paragraph, start with "Dear Hiring Manager". Address the companies key needs and introduce me based off the following information: ${user.background}.
            Body - Two paragraphs max, match my experience to the job requirements based off ${user.experience}.
            Conclusion - Thank the hiring manager for their time, express enthusiasm, and leave a call to action like expressing interest in an interview.
            `
                }
            ]
        });
        await db.ref(`users/${userUid}`).update({
            coverLetterLoading: false,
            currentCoverLetter: chatCompletion.choices[0].message.content,
            coverLetterError: false
        });
    }
    catch (e) {
        await db.ref(`users/${userUid}`).update({
            coverLetterLoading: false,
            currentCoverLetter: "",
            coverLetterError: true
        });
        logger.error(e);
        response.errors.push(e.message);
        response.statusCode = 500;
    }
    res.status(response.statusCode).send(response);
});
//# sourceMappingURL=index.js.map