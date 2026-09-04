import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

const RazorpayCtor: any = (Razorpay as any).default || Razorpay;

export const razorpay = new RazorpayCtor({
  key_id: process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_API_KEY || "rzp_test_dummy",
  key_secret: process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_API_SECRET || "dummy_secret",
});

export default razorpay;
