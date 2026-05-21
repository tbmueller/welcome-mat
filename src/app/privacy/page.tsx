import Link from "next/link";

export const metadata = { title: "Privacy Policy — WelcomeMat" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="mb-8 inline-block text-sm text-[var(--accent-11)] hover:underline">
        ← Back
      </Link>

      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-[var(--gray-11)]">Last updated: May 20, 2026</p>

      <p className="mb-6">
        <strong>WelcomeMat</strong> ("we", "our", or "us") operates the WelcomeMat web and mobile
        application. This policy explains what data we collect, how we use it, and your rights.
      </p>

      <Section title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Account information</strong> — your name, email address, and profile photo, obtained from Google when you sign in.</li>
          <li><strong>Trip and flight data</strong> — trip names, base addresses, flight numbers, and travel dates you enter.</li>
          <li><strong>Guest information</strong> — names and email addresses of guests you invite to a trip.</li>
          <li><strong>Usage data</strong> — standard server logs (IP address, browser type, pages visited) retained briefly for debugging.</li>
        </ul>
        <p className="mt-3">
          <strong>What we do not collect</strong> — passwords (Google handles authentication), payment
          information, or precise location beyond the address you provide per trip.
        </p>
      </Section>

      <Section title="How we use it">
        <ul className="list-disc space-y-1 pl-5">
          <li>To operate the app: display trips, look up flight status, calculate travel times.</li>
          <li>To send email invitations to guests you explicitly invite.</li>
          <li>To identify you across sessions.</li>
        </ul>
        <p className="mt-3">We do not sell, rent, or share your data with third parties for advertising.</p>
      </Section>

      <Section title="Third-party services">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--gray-6)] text-left">
                <th className="pb-2 pr-4 font-medium">Service</th>
                <th className="pb-2 pr-4 font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-4)]">
              {[
                ["Google Firebase", "Authentication & database"],
                ["FlightAware AeroAPI", "Flight status lookups"],
                ["Google Maps", "Travel time estimates"],
                ["Resend", "Invitation emails"],
                ["Upstash", "Rate limiting & job queue"],
                ["Vercel", "Hosting & infrastructure"],
              ].map(([name, purpose]) => (
                <tr key={name}>
                  <td className="py-2 pr-4">{name}</td>
                  <td className="py-2">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Data retention">
        <p>
          Your account and trip data are retained until you delete them. You may delete your account
          by contacting us at the address below; we will remove your data within 30 days.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Depending on your jurisdiction you may have the right to access, correct, export, or delete
          your personal data. Contact us to exercise these rights.
        </p>
      </Section>

      <Section title="Children">
        <p>
          WelcomeMat is not directed at children under 13. We do not knowingly collect data from
          children.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update this policy. We&apos;ll note the &ldquo;last updated&rdquo; date above.
          Continued use after changes constitutes acceptance.
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
