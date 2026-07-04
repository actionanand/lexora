import { ButtonLink } from "@/components/ui/ButtonLink";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <h1>Page not found</h1>
      <p>The language or lesson you requested is not available yet.</p>
      <ButtonLink href="/">Return home</ButtonLink>
    </main>
  );
}
