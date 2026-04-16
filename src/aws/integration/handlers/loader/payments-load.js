import { convert } from '../../helpers/utils/convert-data-payment.js';
import { consultSubscription, insertNewPayment } from '../../helpers/database/database.js';

export const lambdaHandler = async (event, context) => {
  console.log("Event recebido:", JSON.stringify(event));

  for (const record of event.Records) {
    try {
      const eventData = JSON.parse(record.body);
      console.log("Payload do SQS:", JSON.stringify(eventData, null, 2));

      const paymentMethodFactory = eventData.qr_codes?.[0]?.expiration_date
        ? "PIX"
        : eventData.charges?.[0]?.payment_method?.type || "DESCONHECIDO";

      console.log("Método de pagamento:", paymentMethodFactory);

      const data = await convert(eventData, paymentMethodFactory);

      const subscription = await consultSubscription(eventData.reference_id)

      const dataFormat = {
        ...data,
        subscriptionId: eventData.reference_id,
        orderId: eventData.id,
        userId: subscription.userId,
        planId: subscription.planId,
      };

      await insertNewPayment(dataFormat);
      console.log("Pagamento inserido com sucesso!");
    } catch (err) {
      console.error("Erro ao processar record:", err);
      throw err; // deixa o Lambda reenfileirar no SQS/DLQ
    }
  }
};