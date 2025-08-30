import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { DollarSign } from "lucide-react";

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <DollarSign className="text-amber-500" />
          Better Billing
        </>
      ),
    },
    // see https://fumadocs.dev/docs/ui/navigation/links
    links: [],
  };
}
