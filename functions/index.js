const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { user } = require("firebase-functions/v1/auth");
const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

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
    email: user.email
  });
});
