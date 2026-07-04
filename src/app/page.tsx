import { LandingPageClient } from "@/components/landing/LandingPageClient";
import { getFirstDocPath, languages } from "@/generated/content-index.generated";

export default function HomePage() {
  return <LandingPageClient firstDocPath={getFirstDocPath()} languages={languages} />;
}
