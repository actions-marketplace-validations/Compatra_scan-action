import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export const getCharge = (id: string) => stripe.charges.retrieve(id);
export const createCustomer = (email: string) => stripe.customers.create({ email });
