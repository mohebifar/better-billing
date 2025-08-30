import { describe, expect, it } from "vitest";
import { findPlanByItem } from "~/plugins/stripe/utils";

describe("utils", () => {
  describe("findPlanByItem", () => {
    const mockSubscriptionPlans = {
      monthly: [
        {
          planName: "basic-monthly",
          items: [{ price: "price_monthly_basic", quantity: 1 }],
        },
        {
          planName: "premium-monthly",
          items: [
            { price: "price_monthly_premium", quantity: 1 },
            { price: "price_addon_monthly", quantity: 2 },
          ],
        },
      ],
      yearly: [
        {
          planName: "basic-yearly",
          items: [{ price: "price_yearly_basic", quantity: 1 }],
        },
        {
          planName: "enterprise-yearly",
          items: [
            {
              price_data: {
                currency: "usd",
                unit_amount: 50000,
                recurring: { interval: "year" as const },
                product: "prod_enterprise",
              },
              quantity: 1,
            },
          ],
        },
      ],
    };

    it("should find plan by price ID in monthly cadence", () => {
      const stripeItem = {
        price: "price_monthly_basic",
      };

      const planMatch = findPlanByItem(stripeItem, mockSubscriptionPlans);

      expect(planMatch).toBeDefined();
      expect(planMatch?.planName).toBe("basic-monthly");
      expect(planMatch?.cadence).toBe("monthly");
    });

    it("should find plan by price ID in yearly cadence", () => {
      const stripeItem = {
        price: "price_yearly_basic",
      };

      const planMatch = findPlanByItem(stripeItem, mockSubscriptionPlans);

      expect(planMatch).toBeDefined();
      expect(planMatch?.planName).toBe("basic-yearly");
      expect(planMatch?.cadence).toBe("yearly");
    });

    it("should find plan with multiple items by matching any item", () => {
      const stripeItem = {
        price: "price_addon_monthly",
      };

      const planMatch = findPlanByItem(stripeItem, mockSubscriptionPlans);

      expect(planMatch).toBeDefined();
      expect(planMatch?.planName).toBe("premium-monthly");
      expect(planMatch?.cadence).toBe("monthly");
    });

    it("should find plan by price_data match", () => {
      const stripeItem = {
        price_data: {
          currency: "usd",
          unit_amount: 50000,
          recurring: { interval: "year" as const },
          product: "prod_enterprise",
        },
        quantity: 1,
      };

      const planMatch = findPlanByItem(stripeItem, mockSubscriptionPlans);

      expect(planMatch).toBeDefined();
      expect(planMatch?.planName).toBe("enterprise-yearly");
      expect(planMatch?.cadence).toBe("yearly");
    });

    it("should return null when no matching plan is found", () => {
      const stripeItem = {
        price: "price_nonexistent",
      };

      const planMatch = findPlanByItem(stripeItem, mockSubscriptionPlans);

      expect(planMatch).toBeNull();
    });

    it("should return null when subscription plans are empty", () => {
      const stripeItem = {
        price: "price_123",
      };

      const emptyPlans = {
        monthly: [],
        yearly: [],
      };

      const planMatch = findPlanByItem(stripeItem, emptyPlans);

      expect(planMatch).toBeNull();
    });

    it("should match by metadata when price IDs are not available", () => {
      const subscriptionPlans = {
        monthly: [
          {
            planName: "metadata-plan",
            items: [
              {
                quantity: 1,
                metadata: { plan_type: "custom", tier: "gold" },
              },
            ],
          },
        ],
        yearly: [],
      };

      const stripeItem = {
        quantity: 1,
        metadata: { plan_type: "custom", tier: "gold" },
      };

      const planMatch = findPlanByItem(stripeItem, subscriptionPlans);

      expect(planMatch).toBeDefined();
      expect(planMatch?.planName).toBe("metadata-plan");
      expect(planMatch?.cadence).toBe("monthly");
    });

    it("should not match when metadata differs", () => {
      const subscriptionPlans = {
        monthly: [
          {
            planName: "metadata-plan",
            items: [
              {
                quantity: 1,
                metadata: { plan_type: "custom", tier: "gold" },
              },
            ],
          },
        ],
        yearly: [],
      };

      const stripeItem = {
        quantity: 1,
        metadata: { plan_type: "custom", tier: "silver" },
      };

      const planMatch = findPlanByItem(stripeItem, subscriptionPlans);

      expect(planMatch).toBeNull();
    });

    it("should not match when quantity differs", () => {
      const subscriptionPlans = {
        monthly: [
          {
            planName: "quantity-plan",
            items: [
              {
                quantity: 2,
                metadata: { plan_type: "seats" },
              },
            ],
          },
        ],
        yearly: [],
      };

      const stripeItem = {
        quantity: 1,
        metadata: { plan_type: "seats" },
      };

      const planMatch = findPlanByItem(stripeItem, subscriptionPlans);

      expect(planMatch).toBeNull();
    });

    it("should handle price_data with different currencies", () => {
      const subscriptionPlans = {
        monthly: [],
        yearly: [
          {
            planName: "eur-plan",
            items: [
              {
                price_data: {
                  currency: "eur",
                  unit_amount: 45000,
                  recurring: { interval: "year" as const },
                  product: "prod_eur",
                },
                quantity: 1,
              },
            ],
          },
        ],
      };

      const stripeItem = {
        price_data: {
          currency: "usd",
          unit_amount: 45000,
          recurring: { interval: "year" as const },
          product: "prod_eur",
        },
        quantity: 1,
      };

      const planMatch = findPlanByItem(stripeItem, subscriptionPlans);

      expect(planMatch).toBeNull();
    });

    it("should handle price_data with different intervals", () => {
      const subscriptionPlans = {
        monthly: [],
        yearly: [
          {
            planName: "monthly-interval-plan",
            items: [
              {
                price_data: {
                  currency: "usd",
                  unit_amount: 5000,
                  recurring: { interval: "month" as const },
                  product: "prod_test",
                },
                quantity: 1,
              },
            ],
          },
        ],
      };

      const stripeItem = {
        price_data: {
          currency: "usd",
          unit_amount: 5000,
          recurring: { interval: "year" as const },
          product: "prod_test",
        },
        quantity: 1,
      };

      const planMatch = findPlanByItem(stripeItem, subscriptionPlans);

      expect(planMatch).toBeNull();
    });

    it("should handle price_data with interval_count", () => {
      const subscriptionPlans = {
        monthly: [
          {
            planName: "quarterly-plan",
            items: [
              {
                price_data: {
                  currency: "usd",
                  unit_amount: 15000,
                  recurring: { interval: "month" as const, interval_count: 3 },
                  product: "prod_quarterly",
                },
                quantity: 1,
              },
            ],
          },
        ],
        yearly: [],
      };

      const stripeItem = {
        price_data: {
          currency: "usd",
          unit_amount: 15000,
          recurring: { interval: "month" as const, interval_count: 3 },
          product: "prod_quarterly",
        },
        quantity: 1,
      };

      const planMatch = findPlanByItem(stripeItem, subscriptionPlans);

      expect(planMatch).toBeDefined();
      expect(planMatch?.planName).toBe("quarterly-plan");
      expect(planMatch?.cadence).toBe("monthly");
    });

    it("should prioritize price ID over other matching criteria", () => {
      const subscriptionPlans = {
        monthly: [
          {
            planName: "price-id-plan",
            items: [
              {
                price: "price_specific",
                quantity: 5,
                metadata: { different: "data" },
              },
            ],
          },
          {
            planName: "metadata-plan",
            items: [
              {
                quantity: 1,
                metadata: { matching: "metadata" },
              },
            ],
          },
        ],
        yearly: [],
      };

      const stripeItem = {
        price: "price_specific",
        quantity: 1,
        metadata: { matching: "metadata" },
      };

      const planMatch = findPlanByItem(stripeItem, subscriptionPlans);

      expect(planMatch).toBeDefined();
      expect(planMatch?.planName).toBe("price-id-plan");
      expect(planMatch?.cadence).toBe("monthly");
    });
  });
});
