import pkg from 'pg';
import crypto from "crypto";
import {loadConfig} from '../config/settings.js'

const { Pool } = pkg;

let pool;

export async function getPool() {
  if (!pool) {
    const { DATABASE_HOST, DATABASE_NAME, DATABASE_PASSWORD, DATABASE_PORT, DATABASE_USERNAME } = await loadConfig();

    pool = new Pool({
      user: DATABASE_USERNAME,
      host: DATABASE_HOST,
      database: DATABASE_NAME,
      password: DATABASE_PASSWORD,
      port: DATABASE_PORT,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

// Buscar assinatura
export async function consultSubscription(id) {
  const client = await (await getPool()).connect(); // faltava await
  try {
    const query = {
      text: 'SELECT * FROM subscriptions WHERE id = $1',
      values: [id]
    };
    const result = await client.query(query);
    return result.rows[0];
  } finally {
    client.release(); // sempre liberar
  }
}

//@ts-check
/**@typedef {import('./types').InsertPayment} */
 /** 
 * interface novo pagamento
 * @param {InsertPayment} data 
 */

// Inserir pagamento
export async function insertNewPayment(data) {
  const client = await (await getPool()).connect(); // faltava await
  try {
    const query = {
      text: `
        INSERT INTO payments(
          id, amount, currency, status, "paymentDetails", "paymentMethod",
          "orderId", "chargesId", "subscriptionId", "userId", "planId"
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `,
      values: [
        crypto.randomUUID(),
        data.amount,
        data.currency,
        data.status,
        data.paymentDetails,
        data.paymentMethod,
        data.orderId,
        data.chargesId,
        data.subscriptionId,
        data.userId,
        data.planId,
      ]
    };

    await client.query(query);
    console.log("Pagamento salvo com sucesso!");
  } catch (err) {
    console.error("Erro ao inserir pagamento:", err);
    throw err;
  } finally {
    client.release(); // libera a conexão de volta pro pool
  }
}