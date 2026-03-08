import express from "express";
import cors from "cors";
import { MercadoPagoConfig, Payment } from "mercadopago";
import nodemailer from "nodemailer";
import QRCode from "qrcode";

const app = express();
app.use(cors());
app.use(express.json());

// Use seu ACCESS TOKEN
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});


app.post("/create-payment", async (req, res) => {
  try {

    const { title, email } = req.body;

    const payment = new Payment(client);

    const response = await payment.create({
      body: {
        transaction_amount: 10.00,
        description: title || "Ingresso",
        payment_method_id: "pix",

        payer: {
          email: email
        },

        metadata: {
          email: email,
          event: title
        }
      }
    });

    const data = response.point_of_interaction.transaction_data;

    return res.json({
      qr_base64: data.qr_code_base64,
      copy_and_paste: data.qr_code,
      amount: 10.00
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar pagamento" });
  }
});

app.post("/webhook", async (req, res) => {

  try {

    const paymentId = req.body.data.id;

    const payment = new Payment(client);
    const result = await payment.get({ id: paymentId });

    if(result.status === "approved"){

      const email = result.metadata.email;
      const event = result.metadata.event;

      await sendTicketEmail(email, event);

      console.log("Ingresso enviado para:", email);

    }

    res.sendStatus(200);

  } catch (error) {

    console.error("Erro webhook:", error);
    res.sendStatus(500);

  }

});



async function sendTicketEmail(email, event){

  const ticketId = Math.random().toString(36).substring(2,10);

  const qrCode = await QRCode.toDataURL(ticketId);

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
    subject: "Seu ingresso - " + event,

    html: `
      <h2>🎟️ Seu ingresso</h2>

      <p><b>Evento:</b> ${event}</p>
      <p><b>Código:</b> ${ticketId}</p>

      <p>Apresente este QR Code na entrada:</p>

      <img src="${qrCode}" width="200"/>

      <p>Obrigado pela compra!</p>
    `
  });

}

app.listen(3001, () => console.log("✅ Servidor rodando na porta 3001"));
