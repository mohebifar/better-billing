import { loader } from "fumadocs-core/source";
import { icons } from "lucide-react";
import { createElement } from "react";
import { SiFastify, SiHono, SiNodedotjs } from "react-icons/si";
import { TbBrandNextjs, TbBrandSolidjs, TbBrandSvelte } from "react-icons/tb";

import { docs } from "@/.source";

// See https://fumadocs.vercel.app/docs/headless/source-api for more info
export const source = loader({
  // it assigns a URL to your pages
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),

  icon(icon) {
    if (!icon) {
      // You may set a default icon
      return;
    }

    if (icon in icons)
      return createElement(icons[icon as keyof typeof icons], {
        className: "w-4 h-4",
      });

    switch (icon) {
      case "Nextjs":
        return createElement(TbBrandNextjs, {
          className: "w-4 h-4",
        });
      case "SolidStart":
        return createElement(TbBrandSolidjs, {
          className: "w-4 h-4",
        });
      case "Sveltekit":
        return createElement(TbBrandSvelte, {
          className: "w-4 h-4",
        });
      case "Hono":
        return createElement(SiHono, {
          className: "w-4 h-4",
        });
      case "Fastify":
        return createElement(SiFastify, {
          className: "w-4 h-4",
        });
      case "Nodejs":
        return createElement(SiNodedotjs, {
          className: "w-4 h-4",
        });
      default:
        return null;
    }
  },
});
