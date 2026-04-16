import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({});

/**
 * Busca um segredo do AWS Secrets Manager
 * @param {string} secretId - Nome ou ARN do segredo
 * @param {string} [keyname] - Chave dentro do JSON armazenado
 * @returns {Promise<string|object>}
 */
export async function get(secretId, keyname = null) {
  console.log(`Buscando secret: ${secretId}`);
  
  const command = new GetSecretValueCommand({
    SecretId: secretId,
  });

  try {
    const response = await client.send(command);
    const secretValue = response.SecretString;
    console.log(` Secret encontrado: ${secretId}`);

    try {
      const parsed = JSON.parse(secretValue);
      if (keyname) {
        return parsed[keyname];
      }
      return parsed;
    } catch (err) {
      // Se não for JSON, retorna a string pura
      return secretValue;
    }
  } catch (error) {
    console.error(` Erro ao buscar secret ${secretId}:`, error);
    throw error;
  }
}