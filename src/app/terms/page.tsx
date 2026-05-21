import Link from "next/link";

export const metadata = { title: "Terms of Service — WelcomeMat" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="mb-8 inline-block text-sm text-[var(--accent-11)] hover:underline">
        ← Back
      </Link>

      <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-8 text-sm text-[var(--gray-11)]">Last updated: May 20, 2026</p>

      <p className="mb-6">
        By using WelcomeMat you agree to these terms. If you don&apos;t agree, don&apos;t use the app.
      </p>

      <Section title="The service">
        <p>
          WelcomeMat lets trip hosts track guests&apos; inbound and outbound flights and estimate when
          to leave to meet them. It is provided as-is, for personal use.
        </p>
      </Section>

      <Section title="Your account">
        <ul className="list-disc space-y-1 pl-5">
          <li>You must sign in with a valid Google account.</li>
          <li>You are responsible for all activity under your account.</li>
          <li>You may not use the app for any unlawful purpose or to harass others.</li>
        </ul>
      </Section>

      <Section title="Your content">
        <p>
          You own the trip and flight data you enter. By using the app you grant us a limited license
          to store and process that data solely to operate the service. We do not claim ownership of
          your content and will not use it for any other purpose.
        </p>
      </Section>

      <Section title="Invitations">
        <p>
          When you invite a guest by email, you represent that you have a legitimate basis for
          contacting them. Do not use the invitation feature to send unsolicited messages.
        </p>
      </Section>

      <Section title="Third-party data">
        <p>
          Flight status information is sourced from FlightAware. We make no guarantee of its accuracy
          or timeliness. Do not rely solely on WelcomeMat for time-sensitive travel decisions.
        </p>
      </Section>

      <Section title="Availability">
        <p>
          We aim for high availability but make no uptime guarantees. We may modify, suspend, or
          discontinue the service at any time without notice.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, WelcomeMat and its operators are not liable for any
          indirect, incidental, or consequential damages arising from your use of the service,
          including missed pickups or travel disruptions.
        </p>
        <p>
          The service is provided &ldquo;as is&rdquo; without warranties of any kind, express or
          implied, including fitness for a particular purpose.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of the State of California, without regard to
          conflict-of-law principles.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms. The &ldquo;last updated&rdquo; date above will reflect any
          changes. Continued use after changes constitutes acceptance.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions? Email{" "}
          <a href="mailto:welcome-mat-support@googlegroups.com" className="text-[var(--accent-11)] hover:underline">
            welcome-mat-support@googlegroups.com
          </a>.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <div className="space-y-2 text-[var(--gray-12)]">{children}</div>
    </section>
  );
}
