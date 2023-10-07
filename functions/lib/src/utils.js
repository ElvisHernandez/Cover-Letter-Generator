"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrypt = exports.encrypt = exports.parseResumeAnalysis = exports.analyzeResumeContent = exports.parseFileText = void 0;
const crypto = require("crypto");
const storage_1 = require("firebase-admin/storage");
const functions = require("firebase-functions");
const openai_1 = require("openai");
const pdf = require("pdf-parse");
const parseFileText = async (app, storageObject) => {
    if (!storageObject.name)
        throw new Error("Object metadata key name undefined");
    const fileRef = await (0, storage_1.getStorage)(app)
        .bucket(storageObject.bucket)
        .file(storageObject.name);
    const fileBuffer = await fileRef.download();
    const { text: fileText } = await pdf(fileBuffer[0]);
    return fileText;
};
exports.parseFileText = parseFileText;
const analyzeResumeContent = async (fileText, openaiApiKey) => {
    var _a;
    const openai = new openai_1.default({
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
    return (_a = chatCompletion.choices[0].message.content) !== null && _a !== void 0 ? _a : "";
};
exports.analyzeResumeContent = analyzeResumeContent;
const parseResumeAnalysis = (resumeAnalysis) => {
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
exports.parseResumeAnalysis = parseResumeAnalysis;
const encrypt = (text) => {
    const IV_LENGTH = 16; // For AES, this is always 16
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(functions.config().SECRETS.ENCRYPTION_KEY, "hex"), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
};
exports.encrypt = encrypt;
const decrypt = (text) => {
    let textParts = text.split(":");
    const shifted = textParts.shift();
    if (!shifted)
        throw new Error("Error shifting");
    let iv = Buffer.from(shifted, "hex");
    let encryptedText = Buffer.from(textParts.join(":"), "hex");
    let decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(functions.config().SECRETS.ENCRYPTION_KEY, "hex"), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};
exports.decrypt = decrypt;
//# sourceMappingURL=utils.js.map