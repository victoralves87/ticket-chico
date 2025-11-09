import express from "express";
import cors from "cors";
import { MercadoPagoConfig, Payment } from "mercadopago";

const app = express();
app.use(cors());
app.use(express.json());

// Use seu ACCESS TOKEN
const client = new MercadoPagoConfig({
  accessToken: "APP_USR-1732774976826819-110910-30c771ffc8cb20e6caf412baf47408ee-452444709"
});

app.post("/create-payment", async (req, res) => {
  try {

    const payment = new Payment(client);

    const response = await payment.create({
      body: {
        transaction_amount: 10.00,
        description: req.body.title || "Ingresso",
        payment_method_id: "pix",
        payer: {
          email: "email-do-cliente@test.com"
        }
      }
    });

    // Agora SIM existe `point_of_interaction.transaction_data`
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

app.listen(3001, () => console.log("✅ Servidor rodando na porta 3001"));
