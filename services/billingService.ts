import { SubscriptionTier, User } from '@/types';

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
   * INVARIANT: Subscription tier and expiry are strictly server-controlled fields.
   * Firestore security rules forbid client-side modifications to `tier` and `subscriptionExpiry`.
   * Real production tier elevation must be provisioned via server-side billing webhooks.
   */
  async activateTier(_user: User, _tier: SubscriptionTier, _sessionId = 'STRIPE_CHECKOUT_SESSION'): Promise<User> {
    throw new Error('Payment processing is not yet configured. Please contact support to upgrade your plan.');
  }
};
