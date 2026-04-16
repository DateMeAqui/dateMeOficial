import { get as getEnv } from "./envvars.js";

export async function loadConfig() {
  return {
    DATABASE_HOST: await getEnv("DATABASE_HOST"),
    DATABASE_USERNAME: await getEnv("DATABASE_USERNAME"),
    DATABASE_PASSWORD: await getEnv("DATABASE_PASSWORD"),
    DATABASE_PORT: await getEnv("DATABASE_PORT"),
    DATABASE_NAME: await getEnv("DATABASE_NAME"),
    PAYMENTS_QUEUE_URL: await getEnv("PAYMENTS_QUEUE_URL"),
    
  };
}