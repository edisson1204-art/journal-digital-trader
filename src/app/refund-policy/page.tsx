import { LegalShell, LegalSection } from "@/components/LegalShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy â€” Journal Digital Trader Invest",
  description: "Refund and cancellation policy for Journal Digital Trader Invest subscriptions.",
};

export default function RefundPolicyPage() {
  return (
    <LegalShell title="Refund Policy">

      <LegalSection title="Overview">
        <p>
          Journal Digital Trader Invest offers a monthly subscription at <strong className="text-green-primary">$14.99 USD/month</strong>.
          We believe in being fair and transparent about our refund policy.
        </p>
      </LegalSection>

      <LegalSection title="1. Free Trial / First Month">
        <p>
          If Journal Digital Trader Invest offers a promotional free trial period, charges will begin
          automatically after the trial ends. You may cancel before the trial period ends
          to avoid any charge.
        </p>
      </LegalSection>

      <LegalSection title="2. Monthly Subscriptions">
        <p>
          Monthly subscriptions are billed in advance. Upon cancellation:
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-text-muted">
          <li>Your subscription remains active until the end of the current billing period</li>
          <li>You will not be charged for subsequent months</li>
          <li>We do not provide partial-month refunds</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Eligibility for Refund">
        <p>A refund may be granted in the following circumstances:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-text-muted">
          <li>You were charged in error (duplicate charge, billing error)</li>
          <li>You request a refund within <strong className="text-text-primary">7 days</strong> of your first charge and have not made significant use of the platform</li>
          <li>The service was unavailable for an extended period due to our technical issues</li>
        </ul>
        <p className="mt-3">
          Refund requests are evaluated on a case-by-case basis. We are committed to being
          reasonable and fair.
        </p>
      </LegalSection>

      <LegalSection title="4. How to Request a Refund">
        <p>
          To request a refund, contact us through the Platform or at our support email with:
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-text-muted">
          <li>Your registered email address</li>
          <li>The date of the charge</li>
          <li>The reason for your refund request</li>
        </ul>
        <p className="mt-3">
          We will respond within 3 business days. Approved refunds are processed through
          Stripe and typically appear within 5â€“10 business days depending on your bank.
        </p>
      </LegalSection>

      <LegalSection title="5. Non-Refundable Situations">
        <p>Refunds are generally not provided when:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-text-muted">
          <li>You changed your mind after more than 7 days of use</li>
          <li>You forgot to cancel before the renewal date</li>
          <li>You experienced poor trading results (the Platform is a journal tool, not a profit guarantee)</li>
          <li>You violated the Terms of Service</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Cancellation">
        <p>
          You may cancel your subscription at any time from your account settings or by
          contacting support. Cancellation stops future billing immediately.
          No cancellation fees are charged.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact Us">
        <p>
          Questions about this policy? Contact us through the Platform.
          We are committed to resolving billing issues quickly and fairly.
        </p>
      </LegalSection>

    </LegalShell>
  );
}
