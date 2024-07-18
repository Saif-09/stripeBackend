import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import bodyParser from 'body-parser';

dotenv.config();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();

// Use JSON parser for other routes
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Stripe requires the raw body to construct the event
app.post("/stripe", bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(err);
        return res.status(400).json({ message: err.message });
    }

    // Event when a payment is initiated
    if (event.type === "payment_intent.created") {
        console.log(`${event.data.object.metadata.name} initiated payment!`);
    }
    // Event when a payment is succeeded
    if (event.type === "payment_intent.succeeded") {
        console.log(`${event.data.object.metadata.name} succeeded payment!`);
        // fulfilment
    }
    res.json({ ok: true });
});

app.post("/pay", async (req, res) => {
    try {
        const { name, amount } = req.body;
        if (!name) return res.status(400).json({ message: "Please enter a name" });
        if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ message: "Please enter a valid amount" });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Amount should be in the smallest currency unit
            currency: "INR",
            payment_method_types: ["card"],
            metadata: { name },
        });
        const clientSecret = paymentIntent.client_secret;
        res.json({ message: "Payment initiated", clientSecret });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});