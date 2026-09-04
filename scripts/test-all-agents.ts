import "dotenv/config";
import { runPlanningAgent } from "../src/customer/agents/planning-agent/planning.agent.js";
import { runPurchaseAgent } from "../src/customer/agents/purchase-agent/purchase.agent.js";
import { runCheckoutAgent } from "../src/customer/agents/checkout-agent/checkout.agent.js";
import { runPaymentAgent } from "../src/customer/agents/payment-agent/payment.agent.js";
import { runOrderAgent } from "../src/customer/agents/order-agent/order.agent.js";
import { runSupportAgent } from "../src/customer/agents/support-agent/support.agent.js";
import { runRecommendationAgent } from "../src/customer/agents/recommendation-agent/recommendation.agent.js";

async function main() {
    console.log("==================================================");
    console.log("🧠 Testing Planning Agent...");
    const planningResponse = await runPlanningAgent("I am hosting a birthday party for 20 people under ₹5,000.");
    console.log(planningResponse);

    console.log("\n==================================================");
    console.log("🌟 Testing Recommendation Agent...");
    const recommendationResponse = await runRecommendationAgent("I need a birthday cake and snacks under ₹2,000.");
    console.log(recommendationResponse);

    console.log("\n==================================================");
    console.log("🛍️ Testing Purchase Agent...");
    const purchaseResponse = await runPurchaseAgent("I want to buy 1kg Rice and 2L Oil.");
    console.log(purchaseResponse);

    console.log("\n==================================================");
    console.log("🛒 Testing Checkout Agent...");
    const checkoutResponse = await runCheckoutAgent("Please review my cart and prepare it for checkout.");
    console.log(checkoutResponse);

    console.log("\n==================================================");
    console.log("💳 Testing Payment Agent...");
    const paymentResponse = await runPaymentAgent("Please process my payment of ₹1,130 for my approved checkout.");
    console.log(paymentResponse);

    console.log("\n==================================================");
    console.log("📦 Testing Order Agent...");
    const orderResponse = await runOrderAgent("Create an order for the items I just purchased.");
    console.log(orderResponse);

    console.log("\n==================================================");
    console.log("🆘 Testing Support Agent...");
    const supportResponse = await runSupportAgent("Where is my order? It hasn't arrived yet.");
    console.log(supportResponse);
    console.log("==================================================\n");
}

main().catch(console.error);
