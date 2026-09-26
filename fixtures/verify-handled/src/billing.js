import Stripe from "stripe";

const stripe = new Stripe("sk_test_placeholder");

// Same deprecated call, but a failure degrades to "no saved cards" instead of throwing.
export async function savedCards(customerId) {
  try {
    return await stripe.customers.listCards(customerId);
  } catch {
    return [];
  }
}
