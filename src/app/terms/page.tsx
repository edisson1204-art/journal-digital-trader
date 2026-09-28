import { LegalShell, LegalSection } from "@/components/LegalShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service â€” Journal Digital Trader Invest",
  description: "Terms of Service for Journal Digital Trader Invest subscription platform.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service">

      <LegalSection title="1. Acceptance of Terms">
        <p>
          By accessing or using Journal Digital Trader Invest (&quot;the Platform&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;),
          you agree to be bound by these Terms of Service. If you do not agree to these terms,
          do not use the Platform.
        </p>
      </LegalSection>

      <LegalSection title="2. Description of Service">
        <p>
          Journal Digital Trader Invest is a software-as-a-service (SaaS) platform providing:
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-text-muted">
          <li>Trading journal and record-keeping tools</li>
          <li>Analytics and performance statistics</li>
          <li>Risk management calculators</li>
          <li>Strategy simulation and backtesting tools</li>
          <li>AI-powered trading mentorship based on your own data</li>
          <li>Psychology and discipline tracking</li>
          <li>Funded account monitoring</li>
        </ul>
        <p className="mt-3">
          Journal Digital Trader Invest is an educational and decision-support tool. It is{" "}
          <strong className="text-text-primary">not a broker</strong>,{" "}
          <strong className="text-text-primary">not a financial advisor</strong>, and does not execute
          trades on your behalf.
        </p>
      </LegalSection>

      <LegalSection title="3. Subscription and Billing">
        <p>
          The Platform is offered as a monthly subscription at <strong className="text-green-primary">$14.99 USD/month</strong>.
          Subscriptions are billed monthly in advance. You may cancel at any time and retain access
          until the end of your current billing period.
        </p>
        <p>
          Payments are processed securely via <strong className="text-text-primary">Stripe</strong>.
          Journal Digital Trader Invest does not store your payment card data.
        </p>
      </LegalSection>

      <LegalSection title="4. Refund Policy">
        <p>
          Subscription fees are generally non-refundable except as required by applicable law or as
          described in our{" "}
          <a href="/refund-policy" className="text-green-primary hover:underline">Refund Policy</a>.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable Use">
        <p>You agree not to:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-text-muted">
          <li>Reverse engineer, decompile, or disassemble any part of the Platform</li>
          <li>Use the Platform to engage in illegal activities</li>
          <li>Share your account credentials with third parties</li>
          <li>Attempt to gain unauthorized access to any part of the Platform</li>
          <li>Use the Platform in a way that damages, disables, or impairs our servers</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Intellectual Property">
        <p>
          All content, features, and functionality of the Platform â€” including software, text,
          graphics, logos, and designs â€” are the exclusive property of Journal Digital Trader Invest and
          are protected by copyright and other intellectual property laws.
        </p>
        <p>
          Your trading data and journal entries remain your property. You grant us a limited
          license to process and store your data solely to provide the service.
        </p>
      </LegalSection>

      <LegalSection title="7. Disclaimer of Warranties">
        <p>
          The Platform is provided &quot;as is&quot; without warranties of any kind. We do not warrant
          that the Platform will be error-free, uninterrupted, or meet your specific requirements.
        </p>
        <p className="font-semibold text-yellow-warn mt-2">
          âš ï¸ Past trading performance does not guarantee future results. Backtesting and simulation
          results are hypothetical and subject to inherent limitations.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Journal Digital Trader Invest shall not be liable for
          any indirect, incidental, special, consequential, or punitive damages, including but not
          limited to loss of profits, trading losses, data loss, or goodwill, arising from your
          use of the Platform.
        </p>
      </LegalSection>

      <LegalSection title="9. Governing Law">
        <p>
          These Terms shall be governed by and construed in accordance with applicable laws.
          Any disputes shall be resolved in the competent courts of the jurisdiction of the
          service provider.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to Terms">
        <p>
          We reserve the right to update these Terms at any time. We will notify subscribers
          via email of material changes. Continued use of the Platform after changes constitutes
          acceptance of the updated Terms.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          Questions about these Terms? Contact us through the Platform or at the email address
          listed on our contact page.
        </p>
      </LegalSection>

    </LegalShell>
  );
}
