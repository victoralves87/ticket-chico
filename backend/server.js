import express from "express";
import cors from "cors";
import { MercadoPagoConfig, Payment } from "mercadopago";
import nodemailer from "nodemailer";

const app = express();
app.use(cors());
app.use(express.json());

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});


// CRIAR PAGAMENTO PIX
app.post("/create-payment", async (req, res) => {

  try {

    const { title, email, price } = req.body;

    const amount = Number(price) || 1.00;

    const payment = new Payment(client);

    const response = await payment.create({
      body: {

        transaction_amount: amount,

        description: title || "Ingresso",

        payment_method_id: "pix",

        payer: {
          email: email
        },

        metadata: {
          email: email,
          event: title,
          price: amount
        }

      }
    });

    const data = response.point_of_interaction.transaction_data;

    return res.json({
      qr_base64: data.qr_code_base64,
      copy_and_paste: data.qr_code,
      amount: amount
    });

  } catch (error) {

    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar pagamento" });

  }

});



// WEBHOOK MERCADO PAGO
app.post("/webhook", async (req, res) => {

  try {

    const paymentId = req.body?.data?.id;

    if (!paymentId) return res.sendStatus(200);

    const payment = new Payment(client);

    const result = await payment.get({ id: paymentId });

    if (result.status === "approved") {

      const email = result.metadata?.email;
      const event = result.metadata?.event;
      const price = result.metadata?.price;

      await sendTicketEmail(email, event, price);

      console.log("📧 Email de ingresso enviado para:", email);

    }

    res.sendStatus(200);

  } catch (error) {

    console.error("Erro webhook:", error);

    // webhook nunca deve retornar erro
    res.sendStatus(200);

  }

});



// ENVIAR EMAIL SIMPLES
async function sendTicketEmail(email, event, price) {

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({

    from: `"Ingressos" <${process.env.EMAIL_USER}>`,

    to: email,

    subject: "Ingresso comprado",

    html: `
      <h2>✅ Ingresso comprado com sucesso</h2>

      <p><b>Evento:</b> ${event}</p>

      <p><b>Valor pago:</b> R$ ${price}</p>

      <p>Seu ingresso foi comprado com sucesso.</p>

      <p>Guarde este e-mail como comprovante.</p>
    `
  });

}


app.listen(3001, () => {
  console.log("✅ Servidor rodando na porta 3001");
});