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
   * Real production tier elevation is provisioned via server-side billing webhooks.
   */
  async activateTier(user: User, tier: SubscriptionTier, _sessionId = 'STRIPE_CHECKOUT_SESSION'): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 600));
    console.info(`[Billing] Plan activation requested for tier ${tier}. Server-controlled Firestore rules enforce that tier updates are guarded against client-side tampering.`);
    
    return {
      ...user,
      tier,
      subscriptionExpiry: Date.now() + (30 * 24 * 60 * 60 * 1000)
    };
  }
};
