import * as parameters from "./parameters.js";
import * as secrets from "./secrets.js";

/**
 * Obtém valor da env var ou busca em SSM/Secrets Manager se for especial.
 * 
 * @param {string} key - Nome da env var
 * @param {string|null} defaultValue - Valor default caso não exista
 * @returns {Promise<string|null>}
 */
export async function get(key, defaultValue = null) {
  let result = process.env[key] ?? defaultValue;

  if (result && result.startsWith("parameters://")) {
    const tmp = result.split("://")[1];
    return await parameters.get(tmp);
  }

  if (result && result.startsWith("secrets://")) {
    const tmp = result.split("://")[1].split("?");
    const secretName = tmp[0];
    const secretKey = tmp[1] || null;
    return await secrets.get(secretName, secretKey);
  }

  return result;
}