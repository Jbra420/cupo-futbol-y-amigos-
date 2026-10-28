export const verifyProduction = process.env.CUPO_VERIFY_PRODUCTION === "1";
export const e2ePort = verifyProduction ? 3100 : 3000;
export const e2eBaseURL = `http://127.0.0.1:${e2ePort}`;
