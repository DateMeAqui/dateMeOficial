import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'

const sqs = new SQSClient({ region: "us-east-2"})
const QUEUE_URL = "https://sqs.us-east-2.amazonaws.com/778826949454/PaymentsQueue.fifo";

export const lambdaHandler = async (event, context) => {
    console.log("Recebendo resultado do pagamento");
    console.log("Event recebido:", JSON.stringify(event));

    try{
      const body = JSON.parse(event.body)
      
      const params = {
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(body),
        MessageGroupId: `${body.reference_id}_mgi_${Math.random(0, 9)}`,
        MessageDeduplicationId: body.id
      };
      const command = new SendMessageCommand(params)
      const res = await sqs.send(command)

      console.log("Mensagem enviada com sucesso:", res);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Mensagem enviada para a fila com sucesso!" })
        };
    } catch (err) {
        console.error("Erro ao enviar para fila:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Erro ao enviar mensagem para fila", error: err.message })
        };
    }
  };
  