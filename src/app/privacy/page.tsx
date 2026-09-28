import { LegalShell, LegalSection } from "@/components/LegalShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Journal Digital Trader Invest",
  description: "How Journal Digital Trader Invest collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">

      <LegalSection title="1. Information We Collect">
        <p>We collect the following types of information:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-text-muted">
          <li><strong className="text-text-secondary">Account data:</strong> name, email address, password (hashed)</li>
          <li><strong className="text-text-secondary">Trading journal data:</strong> trades you manually enter (symbol, date, P&L, notes, tags)</li>
          <li><strong className="text-text-secondary">Usage data:</strong> features used, session length, page views</li>
          <li><strong className="text-text-secondary">Payment data:</strong> processed securely by Stripe — we never see your card details</li>
          <li><strong className="text-text-secondary">Technical data:</strong> IP address, browser type, device type</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How We Use Your Information">
        <p>We use your data to:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-text-muted">
          <li>Provide, maintain, and improve the Platform</li>
          <li>Process your subscription and billing</li>
          <li>Generate your personal analytics and AI insights (your data stays yours)</li>
          <li>Send transactional emails (receipts, account alerts)</li>
          <li>Respond to support requests</li>
          <li>Ensure security and prevent fraud</li>
        </ul>
        <p className="mt-3 font-semibold text-text-primary">
          We do NOT sell your personal data or your trading data to third parties.
        </p>
        <p className="mt-1">
          We do NOT share your individual trading performance with marketing analytics tools.
        </p>
      </LegalSection>

      <LegalSection title="3. Your Trading Data">
        <p>
          Your trading journal entries, analytics, and performance data belong to you.
          We use this data solely to provide the service (display your charts, generate AI insights, etc.).
          We do not use individual trading data for advertising or sell it to data brokers.
        </p>
        <p className="mt-2">
          You may export or delete your data at any time by contacting support or through
          account settings (feature coming soon).
        </p>
      </LegalSection>

      <LegalSection title="4. Data Storage and Security">
        <p>
          Your data is stored on encrypted servers. We use industry-standard security measures
          including TLS/SSL encryption in transit and encryption at rest.
        </p>
        <p className="mt-2">
          While we take security seriously, no system is 100% secure. We recommend using a
          strong, unique password for your account.
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies and Tracking">
        <p>
          We use minimal cookies required for authentication and session management.
          We do not use invasive advertising cookies. We may use privacy-respecting analytics
          (e.g., Plausible or equivalent) to understand platform usage at an aggregate level.
        </p>
      </LegalSection>

      <LegalSection title="6. Third-Party Services">
        <p>We use the following trusted third-party services:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-text-muted">
          <li><strong className="text-text-secondary">Stripe</strong> — payment processing</li>
          <li><strong className="text-text-secondary">Cloud hosting provider</strong> — data storage</li>
          <li><strong className="text-text-secondary">Email provider</strong> — transactional emails</li>
        </ul>
        <p className="mt-2">
          Each third-party provider is bound by their own privacy policies and data processing agreements.
        </p>
      </LegalSection>

      <LegalSection title="7. Data Retention">
        <p>
          We retain your data for as long as your account is active. If you cancel your subscription,
          we retain your data for 90 days to allow reactivation, then delete it unless required by law.
        </p>
      </LegalSection>

      <LegalSection title="8. Your Rights">
        <p>You have the right to:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-text-muted">
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Export your trading journal data</li>
          <li>Opt out of non-essential communications</li>
        </ul>
        <p className="mt-2">To exercise these rights, contact us through the Platform.</p>
      </LegalSection>

      <LegalSection title="9. Children's Privacy">
        <p>
          Journal Digital Trader Invest is not directed at persons under the age of 18.
          We do not knowingly collect data from minors.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to This Policy">
        <p>
          We may update this Privacy Policy periodically. We will notify you of significant
          changes via email. The &quot;last updated&quot; date at the top of this page reflects
          the most recent version.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          For privacy-related questions or to exercise your data rights, contact us through
          the Platform or at the email address listed on our contact page.
        </p>
      </LegalSection>

    </LegalShell>
  );
}
