import type { Verdict } from "@/lib/types";

export interface ExampleTeardown {
  slug: string;
  idea: string;
  verdict: Verdict;
  confidence: number;
  reasoning: string;
  category: string;
}

export const EXAMPLE_TEARDOWNS: ExampleTeardown[] = [
  {
    slug: "example-restaurant-waitlist",
    idea: "An app that lets restaurants share their real-time waitlist so nearby people can see wait times and join remotely.",
    verdict: "VALIDATE FIRST",
    confidence: 71,
    reasoning:
      "Strong demand signal but crowded market — Yelp Waitlist, OpenTable, and Resy already own most restaurant relationships. The moat must come from the consumer side (viral loop) or the hyper-local angle, neither of which is proven yet.",
    category: "B2C · Consumer",
  },
  {
    slug: "example-contract-management",
    idea: "A contract management tool built specifically for freelancers: auto-fills from prior contracts, tracks payment due dates, and sends reminder emails automatically.",
    verdict: "BUILD IT",
    confidence: 84,
    reasoning:
      "Underserved niche with clear pain, low technical complexity, and a natural subscription model. The freelancer market is large and growing. Bonsai and HoneyBook are generalists — a specialized contract-first tool has a real wedge.",
    category: "B2B SaaS · Freelancers",
  },
  {
    slug: "example-soil-sensor",
    idea: "A wireless soil moisture and nutrient sensor for home gardeners that syncs to a mobile app and gives AI-powered watering recommendations.",
    verdict: "AVOID",
    confidence: 78,
    reasoning:
      "Hardware unit economics are brutal at the home gardener price point (<$50). Three well-funded competitors (Xiaomi, Gardena, PlantLink) have exited or pivoted. The AI layer doesn't create defensibility when the sensor data is commodity.",
    category: "Hardware · Consumer IoT",
  },
];
