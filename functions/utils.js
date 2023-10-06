const { getStorage } = require("firebase-admin/storage");
const pdf = require("pdf-parse");
const OpenAI = require("openai");

const internals = {};

internals.parsedFileText = async (app, storageObject) => {
  const fileRef = await getStorage(app)
    .bucket(storageObject.bucket)
    .file(storageObject.name);

  const fileBuffer = await fileRef.download();
  const { text: fileText } = await pdf(fileBuffer[0]);

  return fileText;
};

internals.analyzeResumeContent = async (fileText, openaiApiKey) => {
  const openai = new OpenAI({
    apiKey: openaiApiKey
  });

  const messages = [
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
  ];

  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages
  });

  return chatCompletion.choices[0].message.content;
};

internals.parseResumeAnalysis = (resumeAnalysis) => {
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

module.exports = internals;
