import Link from 'next/link'
import { Brain } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy — Neuramine',
  description: 'Privacy Policy for Neuramine private AI infrastructure platform.',
}

const EFFECTIVE = 'March 25, 2025'
const COMPANY   = 'Neuramine Systems Inc.'
const EMAIL     = 'hello@neuramine.io'
const LOCATION  = 'Moncton, NB, Canada'

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
      <div className="text-white/55 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <Brain size={16} className="text-white" />
            </div>
            <span className="font-semibold text-white text-lg tracking-tight">Neuramine</span>
          </Link>
          <Link href="/" className="text-white/50 hover:text-white text-sm transition-colors">
            ← Back to home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-5 pt-32 pb-24">
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Privacy Policy</h1>
          <p className="text-white/35 text-sm">Effective date: {EFFECTIVE}</p>
        </div>

        <Section title="1. Who We Are">
          <p>
            {COMPANY} ("Neuramine", "we", "our", "us") operates the Neuramine private AI
            infrastructure platform (the "Service"). We are located in {LOCATION}.
            For privacy inquiries, contact us at{' '}
            <a href={`mailto:${EMAIL}`} className="text-brand hover:underline">{EMAIL}</a>.
          </p>
          <p>
            This policy explains what personal information we collect, why we collect it, how we
            use and protect it, and your rights under applicable Canadian privacy law (PIPEDA and
            provincial equivalents).
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p><strong className="text-white/75">Account information</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Email address (required to create an account via Google OAuth or magic link).</li>
            <li>Google profile name and profile picture if you use Google OAuth.</li>
            <li>Organisation name and team member emails you invite to a workspace.</li>
          </ul>

          <p><strong className="text-white/75">Usage and billing data</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Request counts, model selections, GPU tier, and workspace configuration.</li>
            <li>Payment method details (processed and stored by our payment provider — we do not store raw card numbers).</li>
            <li>Platform-level logs: API request timestamps, response latencies, error codes.</li>
          </ul>

          <p><strong className="text-white/75">Inference content (prompts and responses)</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-white/75">Cloud GPU workspaces:</strong> Prompts and responses
              are processed on the third-party GPU provider you select and are not stored by
              Neuramine's control plane beyond the duration of the request. Compliance mode
              customers who enable audit logging explicitly opt in to encrypted, append-only
              storage of request/response pairs.
            </li>
            <li>
              <strong className="text-white/75">BYOG workspaces:</strong> Inference runs entirely
              on your hardware. Neuramine handles routing only; prompt and response content never
              transits our servers.
            </li>
          </ul>

          <p><strong className="text-white/75">Technical information</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>IP address, browser type, and operating system for security and fraud prevention.</li>
            <li>Cookies and local storage used for session management (no third-party advertising cookies).</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc pl-5 space-y-1">
            <li>To create and manage your account and workspaces.</li>
            <li>To process payments and send billing receipts.</li>
            <li>To route API requests to the correct GPU infrastructure.</li>
            <li>To monitor platform health, diagnose errors, and improve reliability.</li>
            <li>To send transactional emails (magic links, billing notices, security alerts).</li>
            <li>To send product updates and announcements — you can unsubscribe at any time.</li>
            <li>To comply with legal obligations and enforce our Terms of Service.</li>
          </ul>
          <p>
            We do not sell, rent, or trade your personal information to third parties. We do not
            use your data to train AI models.
          </p>
        </Section>

        <Section title="4. Legal Bases for Processing">
          <p>
            We process your personal information on the following grounds:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-white/75">Contract performance</strong> — to provide the Service you signed up for.</li>
            <li><strong className="text-white/75">Legitimate interests</strong> — security monitoring, fraud prevention, and platform reliability.</li>
            <li><strong className="text-white/75">Consent</strong> — marketing communications and optional compliance audit logging. Consent can be withdrawn at any time.</li>
            <li><strong className="text-white/75">Legal obligation</strong> — where required by applicable law.</li>
          </ul>
        </Section>

        <Section title="5. Data Sharing and Third Parties">
          <p>We share data only as necessary to operate the Service:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-white/75">GPU providers (RunPod, Lambda Labs, Vast.ai):</strong> Receive
              inference requests routed by Neuramine. Subject to their own data processing agreements.
            </li>
            <li>
              <strong className="text-white/75">Payment processor:</strong> Processes card transactions on our
              behalf under PCI-DSS compliance. We receive only a tokenised reference.
            </li>
            <li>
              <strong className="text-white/75">Cloud infrastructure (AWS):</strong> Hosts Neuramine's control
              plane, key management (KMS), and optional audit log storage.
            </li>
            <li>
              <strong className="text-white/75">Analytics (Vercel Analytics):</strong> Privacy-friendly,
              cookieless page-view analytics. No personal data is shared.
            </li>
          </ul>
          <p>
            We require all sub-processors to handle data according to standards at least as
            protective as this policy. We do not share data with advertisers or data brokers.
          </p>
        </Section>

        <Section title="6. Data Residency and International Transfers">
          <p>
            Neuramine's control plane is hosted in Canada (AWS ca-central-1 by default). Enterprise
            customers can request data residency in specific regions. If data is processed outside
            Canada (e.g. on a GPU provider in the US), it is subject to appropriate transfer
            safeguards including contractual clauses consistent with PIPEDA requirements.
          </p>
        </Section>

        <Section title="7. Data Retention">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-white/75">Account data:</strong> Retained while your account is active and for 90 days after deletion, then permanently removed.</li>
            <li><strong className="text-white/75">Billing records:</strong> Retained for 7 years as required by Canadian tax law.</li>
            <li><strong className="text-white/75">Platform logs (latency, errors):</strong> Retained for 90 days.</li>
            <li><strong className="text-white/75">Compliance audit logs (opt-in):</strong> Retained for 6 years (HIPAA default) or as configured by the enterprise customer.</li>
            <li><strong className="text-white/75">Inference content:</strong> Not retained by Neuramine's control plane beyond the request lifecycle, unless compliance audit logging is explicitly enabled.</li>
          </ul>
        </Section>

        <Section title="8. Security">
          <p>
            We apply industry-standard security measures including:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>AES-256 encryption at rest per workspace, managed via AWS KMS.</li>
            <li>TLS 1.3 for all data in transit.</li>
            <li>Passwordless authentication — no credential database to breach.</li>
            <li>Per-workspace data isolation: separate PostgreSQL schemas and Qdrant collections.</li>
            <li>Regular security reviews and penetration testing.</li>
          </ul>
          <p>
            No system is completely secure. If you discover a vulnerability, please disclose it
            responsibly to <a href={`mailto:${EMAIL}`} className="text-brand hover:underline">{EMAIL}</a>.
          </p>
        </Section>

        <Section title="9. Cookies">
          <p>
            We use only essential cookies required for authentication and session management. We
            do not use tracking, advertising, or third-party analytics cookies. You can disable
            cookies in your browser, but this will prevent you from logging in.
          </p>
        </Section>

        <Section title="10. Your Rights">
          <p>
            Under PIPEDA (and applicable provincial laws), you have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-white/75">Access</strong> — request a copy of the personal information we hold about you.</li>
            <li><strong className="text-white/75">Correction</strong> — ask us to correct inaccurate or incomplete information.</li>
            <li><strong className="text-white/75">Withdrawal of consent</strong> — withdraw consent for non-essential processing (e.g. marketing emails) at any time.</li>
            <li><strong className="text-white/75">Deletion</strong> — request deletion of your account and associated personal data, subject to legal retention obligations.</li>
            <li><strong className="text-white/75">Complaint</strong> — file a complaint with the Office of the Privacy Commissioner of Canada (OPC) if you believe we have mishandled your data.</li>
          </ul>
          <p>
            To exercise any of these rights, email us at{' '}
            <a href={`mailto:${EMAIL}`} className="text-brand hover:underline">{EMAIL}</a>.
            We will respond within 30 days.
          </p>
        </Section>

        <Section title="11. Children's Privacy">
          <p>
            The Service is not directed at individuals under the age of 16. We do not knowingly
            collect personal information from children. If you believe a child has provided us
            with personal information, contact us immediately and we will delete it.
          </p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>
            We may update this policy from time to time. If we make material changes, we will
            notify you by email or via an in-app notice at least 14 days before the changes
            take effect. The effective date at the top of this page will always reflect the
            current version.
          </p>
        </Section>

        <Section title="13. Contact and Complaints">
          <p>
            Privacy questions or requests: <a href={`mailto:${EMAIL}`} className="text-brand hover:underline">{EMAIL}</a>
          </p>
          <p>
            If we cannot resolve your concern, you may contact the Office of the Privacy
            Commissioner of Canada at <span className="text-white/70">priv.gc.ca</span> or
            call 1-800-282-1376.
          </p>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand rounded-md flex items-center justify-center">
              <Brain size={12} className="text-white" />
            </div>
            <span className="text-white/40 text-sm">{COMPANY}, {LOCATION}</span>
          </div>
          <div className="flex items-center gap-5 text-white/30 text-sm">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <a href={`mailto:${EMAIL}`} className="hover:text-white/60 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
