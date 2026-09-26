import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

// GET /v1/customers/{customer}/cards is deprecated by Stripe — this call is intentional,
// it is what action-self-test.yml expects the scan to catch.
export const listCards = (id: string) => stripe.customers.listCards(id);
