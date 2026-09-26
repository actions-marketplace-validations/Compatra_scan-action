import Stripe from "stripe";

const stripe = new Stripe("sk_test_placeholder");

// GET /v1/customers/{customer}/cards is deprecated by Stripe. No fallback: a failure propagates.
export const savedCards = (customerId) => stripe.customers.listCards(customerId);
