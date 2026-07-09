import { LandingPageClient } from "@/components/landing/LandingPageClient";
import { languages } from "@/generated/content-index.generated";

export default function HomePage() {
  return <LandingPageClient firstDocPath="/docs/studio/" languages={languages} />;
}
