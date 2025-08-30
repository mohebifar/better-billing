import type { Stripe } from "stripe";
import type { StripeSubscriptionByCadence } from "./index";

interface PlanMatch<PlanName extends string> {
  planName: PlanName;
  cadence: "monthly" | "yearly";
}

type StripeSubscriptionItem =
  | Stripe.SubscriptionItem
  | Stripe.SubscriptionCreateParams.Item;

export function findPlanByItem<PlanName extends string>(
  targetItem: StripeSubscriptionItem,
  subscriptionPlans: StripeSubscriptionByCadence<PlanName>
): PlanMatch<PlanName> | null {
  const cadences = Object.keys(subscriptionPlans) as Array<
    "monthly" | "yearly"
  >;

  for (const cadence of cadences) {
    const plans = subscriptionPlans[cadence];

    for (const plan of plans) {
      // Check if any item in the plan matches the target item
      const matchingItem = plan.items.find((item) =>
        isItemMatch(item, targetItem)
      );

      if (matchingItem) {
        return {
          planName: plan.planName,
          cadence,
        };
      }
    }
  }

  return null;
}

/**
 * Determines if two Stripe subscription items are considered a match.
 * This function compares the most relevant properties that identify an item.
 */
function isItemMatch(
  item1: StripeSubscriptionItem,
  item2: StripeSubscriptionItem
): boolean {
  // Primary match: price ID (most specific identifier)
  if (item1.price && item2.price) {
    return item1.price === item2.price;
  }

  // Secondary match: price_data comparison (for inline prices)
  if (
    "price_data" in item1 &&
    "price_data" in item2 &&
    item1.price_data &&
    item2.price_data
  ) {
    return isPriceDataMatch(item1.price_data, item2.price_data);
  }

  // Don't match items with different primary identifiers
  // (one has price, the other has price_data)
  if ((item1.price && !item2.price) || (!item1.price && item2.price)) {
    return false;
  }

  if (
    ("price_data" in item1 && item1.price_data && !("price_data" in item2)) ||
    ("price_data" in item2 && item2.price_data && !("price_data" in item1))
  ) {
    return false;
  }

  // Fallback: compare other identifying properties
  return (
    item1.quantity === item2.quantity &&
    JSON.stringify(item1.metadata || {}) ===
      JSON.stringify(item2.metadata || {})
  );
}

/**
 * Compares two price_data objects for equality.
 */
function isPriceDataMatch(
  priceData1: Stripe.SubscriptionCreateParams.Item.PriceData,
  priceData2: Stripe.SubscriptionCreateParams.Item.PriceData
): boolean {
  return (
    priceData1.currency === priceData2.currency &&
    priceData1.unit_amount === priceData2.unit_amount &&
    priceData1.recurring?.interval === priceData2.recurring?.interval &&
    priceData1.recurring?.interval_count ===
      priceData2.recurring?.interval_count &&
    priceData1.product === priceData2.product
  );
}
