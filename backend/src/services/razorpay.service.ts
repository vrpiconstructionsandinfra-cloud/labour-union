import Razorpay from "razorpay";
import crypto from "crypto";

export const getRazorpayKeyId = (): string =>
  process.env.RAZORPAY_KEY_ID || "rzp_test_TXAMsrFc6U3u4J";

export const getRazorpayKeySecret = (): string =>
  process.env.RAZORPAY_KEY_SECRET || "pbYf2FsaC5BrNfyjDCcJTCtJ";

export function getRazorpayClient(): Razorpay {
  return new Razorpay({
    key_id: getRazorpayKeyId(),
    key_secret: getRazorpayKeySecret(),
  });
}

export interface CreateOrderInput {
  amount: number; // in paise
  currency?: string;
  receipt?: string;
  notes?: Record<string, string | number>;
}

export async function createRazorpayOrder(input: CreateOrderInput) {
  const { amount, currency = "INR", receipt, notes } = input;

  if (!amount || isNaN(amount) || amount < 100) {
    throw new Error("Amount must be at least 100 paise (₹1.00)");
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.create({
    amount: Math.round(amount),
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
    notes: notes || {},
  });

  return {
    order_id: order.id,
    orderId: order.id,
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    receipt: order.receipt,
    key_id: getRazorpayKeyId(),
    keyId: getRazorpayKeyId(),
    status: order.status,
  };
}

export interface VerifySignatureInput {
  order_id: string;
  payment_id: string;
  signature: string;
}

export function verifyRazorpaySignature(input: VerifySignatureInput): boolean {
  const { order_id, payment_id, signature } = input;
  if (!order_id || !payment_id || !signature) {
    return false;
  }

  const secret = getRazorpayKeySecret();
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${order_id}|${payment_id}`)
    .digest("hex");

  try {
    const expectedBuf = Buffer.from(expectedSignature, "utf-8");
    const receivedBuf = Buffer.from(signature, "utf-8");
    if (expectedBuf.length !== receivedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return expectedSignature === signature;
  }
}
