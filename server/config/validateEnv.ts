// VALIDATE REQUIRED ENV VARS.
export const validateEnv = (): void => {
  const required = ["PORT", "MONGO_URI", "JWT_SECRET", "NODE_ENV"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    console.error(`Missing env: ${missing.join(", ")}`);
    process.exit(1);
  }

  const validEnvs = ["development", "production", "test"];
  if (!validEnvs.includes(process.env.NODE_ENV!)) {
    console.warn(`Invalid NODE_ENV, using 'development'`);
    process.env.NODE_ENV = "development";
  }

  console.log("Environment validated");
};
