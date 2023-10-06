const PROD_FUNCTIONS_PATH = "";
const LOCAL_FUNCTIONS_PATH =
  "http://127.0.0.1:5001/cover-letter-generator-8a059/us-central1";

const FUNCTIONS_PATH =
  process.env.NODE_ENV === "development"
    ? LOCAL_FUNCTIONS_PATH
    : PROD_FUNCTIONS_PATH;

const post = async ({ firebaseFunctionName, payload }) => {
  try {
    const res = await fetch(`${FUNCTIONS_PATH}/${firebaseFunctionName}`, {
      method: "post",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return await res.json();
  } catch (e) {
    console.error(e);
  }
};

export default { post };
