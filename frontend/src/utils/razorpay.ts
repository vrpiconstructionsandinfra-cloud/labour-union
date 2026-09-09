/**
 * Razorpay Standard Web Checkout Client
 */

export interface CreateOrderResponse {
  success: boolean;
  order_id: string;
  orderId: string;
  amount: number;
  currency: string;
  key_id: string;
  keyId: string;
  receipt?: string;
  message?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  order_id?: string;
  payment_id?: string;
}

export interface RazorpayCheckoutOptions {
  amount: number; // in paise (e.g. 100 paise = 1 INR) or in INR if isINR: true
  isINR?: boolean;
  currency?: string;
  name?: string;
  description?: string;
  receipt?: string;
  notes?: Record<string, string | number>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  themeColor?: string;
  onSuccess?: (verifyRes: VerifyPaymentResponse, rawResponse: any) => void;
  onFailure?: (error: Error | any) => void;
  onDismiss?: () => void;
}

/**
 * Dynamically loads the Razorpay checkout.js script if not present
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Creates Razorpay Order on the Backend (POST /api/create-order)
 */
export const createRazorpayOrder = async (params: {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string | number>;
}): Promise<CreateOrderResponse> => {
  const res = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to create Razorpay order');
  }
  return data;
};

/**
 * Verifies Razorpay Signature on Backend (POST /api/verify-payment)
 */
export const verifyRazorpayPayment = async (params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<VerifyPaymentResponse> => {
  const res = await fetch('/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Payment signature verification failed');
  }
  return data;
};

/**
 * Standard Web Checkout Flow:
 * 1. Creates order via Backend
 * 2. Opens Razorpay Modal
 * 3. Verifies signature on backend upon payment completion
 */
export const initiateRazorpayCheckout = async (
  options: RazorpayCheckoutOptions
): Promise<VerifyPaymentResponse> => {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !(window as any).Razorpay) {
    throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
  }

  // Calculate amount in paise
  const amountInPaise = options.isINR
    ? Math.round(options.amount * 100)
    : Math.round(options.amount);

  if (amountInPaise < 100) {
    throw new Error('Minimum payment amount must be at least ₹1.00 (100 paise)');
  }

  // Step 1: Create Order
  const orderData = await createRazorpayOrder({
    amount: amountInPaise,
    currency: options.currency || 'INR',
    receipt: options.receipt,
    notes: options.notes,
  });

  const keyId =
    (import.meta as any).env?.VITE_RAZORPAY_KEY_ID ||
    orderData.key_id ||
    orderData.keyId ||
    'rzp_test_TXAMsrFc6U3u4J';

  // Step 2: Open Modal & Step 3: Verify Signature
  return new Promise((resolve, reject) => {
    const razorpayOptions: any = {
      key: keyId,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: options.name || 'Labor Union Management',
      description: options.description || 'Standard Web Checkout',
      order_id: orderData.order_id || orderData.orderId,
      prefill: options.prefill || {},
      notes: options.notes || {},
      theme: {
        color: options.themeColor || '#2563EB',
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          // Verify on backend
          const verifyRes = await verifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          if (options.onSuccess) {
            options.onSuccess(verifyRes, response);
          }
          resolve(verifyRes);
        } catch (verifyErr: any) {
          if (options.onFailure) {
            options.onFailure(verifyErr);
          }
          reject(verifyErr);
        }
      },
      modal: {
        ondismiss: () => {
          if (options.onDismiss) {
            options.onDismiss();
          }
          reject(new Error('Payment cancelled by user'));
        },
      },
    };

    const rzp = new (window as any).Razorpay(razorpayOptions);

    rzp.on('payment.failed', (resp: any) => {
      const err = new Error(
        resp.error?.description || resp.error?.reason || 'Payment failed'
      );
      if (options.onFailure) {
        options.onFailure(err);
      }
      reject(err);
    });

    rzp.open();
  });
};
