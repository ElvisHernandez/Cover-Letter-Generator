import { auth } from "~context";

const getProdFunctionsHost = () => {
  const functionsHost = process.env.PLASMO_PUBLIC_FUNCTIONS_HOST;
  if (!functionsHost) {
    throw new Error("Production functions host not found");
  }

  return functionsHost;
};

const PROD_FUNCTIONS_PATH = getProdFunctionsHost();
const LOCAL_FUNCTIONS_PATH =
  "http://127.0.0.1:5001/cover-letter-generator-8a059/us-central1";

const FUNCTIONS_PATH =
  process.env.NODE_ENV === "development"
    ? LOCAL_FUNCTIONS_PATH
    : PROD_FUNCTIONS_PATH;

const post = async <T>({
  firebaseFunctionName,
  payload
}: {
  firebaseFunctionName: string;
  payload: object;
}): Promise<T | undefined> => {
  try {
    const idToken = await auth.currentUser?.getIdToken();

    const res = await fetch(`${FUNCTIONS_PATH}/${firebaseFunctionName}`, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + idToken
      },
      body: JSON.stringify(payload)
    });

    return await res.json();
  } catch (e) {
    console.error(e);
  }
};

export default { post };
