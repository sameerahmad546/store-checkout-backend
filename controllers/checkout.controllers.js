import stripe from "stripe";
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

import { prisma } from "../prismaClient.js";
import nodemailer from "nodemailer";
export const createPayment = async (req, res) => {
  const { name, address, email, items } = req.body;

  try {
    let customer = await prisma.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: { name, address, email },
      });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.item.findUnique({
        where: { id: item.id },
      });
      if (product) {
        totalAmount += product.price * item.quantity;
        orderItems.push({
          itemId: product.id,
          quantity: item.quantity,
          price: product.price,
        });
      }
    }

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        totalAmount,
        items: { create: orderItems },
        status: "pending",
      },
    });

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: totalAmount * 100,
      currency: "usd",
      receipt_email: email,
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        status: "created",
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret, orderId: order.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const confirmPayment = async (req, res) => {
  const { orderId, paymentIntentId } = req.body;

  try {
    const paymentIntent = await stripeClient.paymentIntents.retrieve(
      paymentIntentId
    );

    if (paymentIntent.status === "succeeded") {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "completed" },
      });

      const payment = await prisma.payment.update({
        where: { paymentIntentId: paymentIntentId },
        data: { status: "succeeded" },
      });
      console.log(payment, "dsafsa", paymentIntent);

      let transporter = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

      let mailOptions = {
        from: "your_email@gmail.com",
        to: paymentIntent.receipt_email,
        subject: "Order Confirmation",
        text: `Thank you for your purchase! Your order ID is ${orderId}.`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        }
        console.log("Email sent: " + info.response);
      });

      res.json({ message: "Payment successful and order completed." });
    } else {
      res.json({ message: "Payment failed." });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
