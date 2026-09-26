// A stand-in for the real stripe package so this fixture stays hermetic: same call shape
// (stripe.customers.listCards), real HTTP against STRIPE_BASE (a local server in the tests).
export default class Stripe {
  constructor() {
    this.customers = {
      listCards: async (id) => {
        const res = await fetch(`${process.env.STRIPE_BASE}/v1/customers/${id}/cards`);
        if (!res.ok) throw new Error(`Stripe responded ${res.status}`);
        return (await res.json()).data;
      },
    };
  }
}
