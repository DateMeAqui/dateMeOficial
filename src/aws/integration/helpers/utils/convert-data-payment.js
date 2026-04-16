export async function convert(data, paymentMethod) {
    let formatData = {};

    switch (paymentMethod) {
        case 'BOLETO':
            formatData = {
                amount: Number(data.charges[0]?.amount?.value ?? 0),
                paymentMethod: data.charges[0]?.payment_method?.type ?? "UNKNOWN",
                paymentDetails: JSON.stringify(data),
                currency: data.charges[0]?.amount?.currency ?? "BRL",
                chargesId: data.charges[0]?.id ?? null,
                status: data.charges[0]?.status ?? "UNKNOWN",
            };
            break;

        case 'PIX':
            formatData = {
                amount: Number(data.qr_codes[0]?.amount?.value ?? 0),
                paymentMethod: "PIX",
                paymentDetails: JSON.stringify(data),
                currency: "BRL",
                chargesId: data.qr_codes[0]?.id ?? null,
                status: "WAITING",
            };
            break;

        case 'CREDIT_CARD':
            formatData = {
                amount: Number(data.charges[0]?.amount?.value ?? 0),
                paymentMethod: data.charges[0]?.payment_method?.type ?? "UNKNOWN",
                paymentDetails: JSON.stringify(data),
                currency: data.charges[0]?.amount?.currency ?? "BRL",
                chargesId: data.charges[0]?.id ?? null,
                status: data.charges[0]?.status ?? "UNKNOWN",
            };
            break;

        default:
            throw new Error(`Método de pagamento não suportado: ${paymentMethod}`);
    }

    return formatData;
}
