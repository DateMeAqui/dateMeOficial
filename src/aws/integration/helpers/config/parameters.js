import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});

/**
 * Busca valor no SSM Parameter Store
 */
export async function get(key) {
  console.log(`Buscando no SSM: ${key}`);
  
  const command = new GetParameterCommand({
    Name: key,
    WithDecryption: true,
  });

  try {
    const response = await ssm.send(command);
    console.log(`SSM encontrado: ${key}`);
    return response.Parameter.Value;
  } catch (error) {
    console.error(` Erro ao buscar parameter ${key}:`, error);
    throw error;
  }
}

/**
 * Extrai a parte do parâmetro após "parameters://"
 */
export function getValue(key) {
  const tmp = key.split("://")[1];
  return get(tmp);
}