import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-04-10" as any,
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature") as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';
    // Use an internal admin token to update user via Strapi API
    const adminToken = process.env.STRAPI_ADMIN_TOKEN;

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Retrieve userId from client_reference_id
        const userId = session.client_reference_id;
        
        if (userId && adminToken) {
           // Provide credits (e.g. 1000) and update plan to Pro
           await fetch(`${apiUrl}/api/users/${userId}`, {
             method: 'PUT',
             headers: { 
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${adminToken}`
             },
             body: JSON.stringify({
               plan: 'pro',
               available_credits: 1000,
               stripe_customer_id: session.customer as string,
               billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
             })
           });
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
