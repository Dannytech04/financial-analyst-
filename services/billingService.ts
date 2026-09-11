import { SubscriptionTier, User } from '@/types';
import { auth } from './firebase';

export interface PlanConfig {
  id: SubscriptionTier;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  color: string;
}

export const SUBSCRIPTION_PLANS: PlanConfig[] = [
  {
    id: SubscriptionTier.PRO,
    name: "Alpha Pro",
    monthlyPrice: 29,
    yearlyPrice: 280,
    features: [
      "50 AI Chart Visions / mo",
      "20 Advanced Audits / mo",
      "Quant Lab (Backtesting)",
      "Standard Report Export",
      "Priority Gemini Support"
    ],
    color: "violet"
  },
  {
    id: SubscriptionTier.ELITE,
    name: "Elite Institutional",
    monthlyPrice: 99,
    yearlyPrice: 950,
    features: [
      "Unlimited AI Chart Visions",
      "Unlimited Strategic Audits",
      "Proprietary Signal Mapping",
      "Institutional Risk Models",
      "Direct API Channel Access",
      "Custom Macro Intelligence"
    ],
    color: "pink"
  }
];

export const billingService = {
  /**
   * Initializes a Paystack transaction by calling the server.
   * Returns the authorization URL to redirect the user to Paystack's checkout.
   */
  async initializePayment(tier: SubscriptionTier, cycle: 'monthly' | 'yearly'): Promise<{ authorizationUrl: string; reference: string }> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Authentication required to upgrade your plan.');
    }

    const token = await currentUser.getIdToken();
    const response = await fetch('/api/payment/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        tier,
        cycle,
        email: currentUser.email,
        callbackUrl: `${window.location.origin}/billing`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error || 'Failed to initialize payment. Please try again.');
    }

    return response.json();
  },

  /**
   * Verifies a Paystack transaction after the user returns from checkout.
   * The server verifies with Paystack and activates the subscription in Firestore.
   */
  async verifyPayment(reference: string): Promise<{ uid: string; tier: SubscriptionTier; status: string; subscriptionExpiry: number }> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Authentication required to verify payment.');
    }

    const token = await currentUser.getIdToken();
    const response = await fetch(`/api/payment/verify?reference=${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error || 'Payment verification failed. Please contact support.');
    }

    return response.json();
  },

  /**
   * Cancels the current subscription, downgrading to FREE.
   */
  async cancelSubscription(): Promise<{ status: string; tier: SubscriptionTier }> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Authentication required to cancel subscription.');
    }

    const token = await currentUser.getIdToken();
    const response = await fetch('/api/payment/cancel', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error || 'Failed to cancel subscription. Please try again.');
    }

    return response.json();
  },
};
