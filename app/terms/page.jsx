import Link from 'next/link'
import { Brain } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service — Neuramine',
  description: 'Terms of Service for Neuramine private AI infrastructure platform.',
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

export default function TermsPage() {
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
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Terms of Service</h1>
          <p className="text-white/35 text-sm">Effective date: {EFFECTIVE}</p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using the Neuramine platform (the "Service"), you agree to be bound by these
            Terms of Service ("Terms"). If you are using the Service on behalf of an organisation, you
            represent that you have authority to bind that organisation and these Terms apply to it.
          </p>
          <p>
            If you do not agree to these Terms, do not use the Service.
          </p>
        </Section>

        <Section title="2. Who We Are">
          <p>
            The Service is operated by {COMPANY}, a Canadian corporation located in {LOCATION}.
            You can reach us at <a href={`mailto:${EMAIL}`} className="text-brand hover:underline">{EMAIL}</a>.
          </p>
        </Section>

        <Section title="3. Description of Service">
          <p>
            Neuramine provides a private AI infrastructure platform that lets organisations deploy
            large language models (LLMs), speech-to-text (STT), and text-to-speech (TTS) models on
            cloud GPUs or their own hardware. Features include an OpenAI-compatible API, workspace
            management, team collaboration, compliance tooling, and vector-store integrations.
          </p>
        </Section>

        <Section title="4. Accounts and Access">
          <p>
            Access is granted through Google OAuth or a magic link. You are responsible for maintaining
            the security of your account and for all activity that occurs under it. You must notify us
            immediately at {EMAIL} if you become aware of any unauthorised access.
          </p>
          <p>
            You may not share credentials, resell access, or create accounts on behalf of others
            without their explicit consent.
          </p>
        </Section>

        <Section title="5. Acceptable Use">
          <p>You agree not to use the Service to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Generate content that is unlawful, harmful, threatening, abusive, or defamatory.</li>
            <li>Violate any applicable law or regulation, including export control laws.</li>
            <li>Attempt to circumvent security controls, rate limits, or access restrictions.</li>
            <li>Reverse-engineer, decompile, or extract the platform's source code or model weights hosted by Neuramine.</li>
            <li>Resell or sublicense access to the Service without a written agreement with us.</li>
            <li>Use the Service to develop a competing product that replicates its core functionality.</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate these restrictions,
            with or without prior notice.
          </p>
        </Section>

        <Section title="6. Bring-Your-Own-GPU (BYOG) Workspaces">
          <p>
            If you connect your own hardware to the Service, you are solely responsible for the
            security, maintenance, and legal compliance of that hardware and its network environment.
            Neuramine's control plane routes requests to your hardware but does not store prompt
            or response content for BYOG workspaces.
          </p>
        </Section>

        <Section title="7. Data and Privacy">
          <p>
            Our collection and use of personal data is described in our{' '}
            <Link href="/privacy" className="text-brand hover:underline">Privacy Policy</Link>, which
            is incorporated into these Terms by reference. By using the Service you consent to those
            practices.
          </p>
          <p>
            For cloud GPU workspaces, inference runs on the GPU provider you select (e.g. RunPod,
            Lambda Labs). Your prompts and responses are processed on that provider's infrastructure
            and are not retained by Neuramine's control plane beyond the duration of the request.
          </p>
        </Section>

        <Section title="8. Compliance Features">
          <p>
            Healthcare, finance, and legal customers can enable compliance mode, which activates
            append-only audit logging, AES-256 per-workspace encryption, and extended log retention.
            A Business Associate Agreement (BAA) is available to qualifying healthcare accounts upon
            request. Compliance features are additive — enabling them does not guarantee that your
            specific deployment meets every regulatory requirement. You remain responsible for your
            own compliance obligations.
          </p>
        </Section>

        <Section title="9. Billing and Payments">
          <p>
            Paid plans are billed monthly or consumed via prepaid credits. GPU compute on cloud
            workspaces is billed per-request based on the model and GPU selected. Prices are
            displayed in the platform before you commit a purchase.
          </p>
          <p>
            All fees are non-refundable except where required by applicable law. We reserve the
            right to change pricing with 30 days' advance notice. Continued use after a price
            change constitutes acceptance of the new pricing.
          </p>
          <p>
            Unused credits expire 12 months from the date of purchase unless otherwise stated.
          </p>
        </Section>

        <Section title="10. Intellectual Property">
          <p>
            The Neuramine platform, trademarks, and proprietary technology are owned by {COMPANY}.
            Nothing in these Terms transfers any ownership to you.
          </p>
          <p>
            Open-source model weights deployed through the Service remain subject to their own
            licences (e.g. Meta Llama Community License, Apache 2.0, MIT). You are responsible
            for complying with those licences for your use case.
          </p>
          <p>
            You retain full ownership of all content, data, and fine-tuned models you bring to
            or create within the Service.
          </p>
        </Section>

        <Section title="11. Availability and SLA">
          <p>
            We target high availability but do not guarantee uninterrupted service. Scheduled
            maintenance, third-party GPU provider outages, and force-majeure events may cause
            downtime. Enterprise customers with a signed SLA are entitled to the commitments in
            that agreement; all other customers use the Service on an "as available" basis.
          </p>
        </Section>

        <Section title="12. Disclaimer of Warranties">
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND.
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {COMPANY.toUpperCase()} DISCLAIMS
            ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS
            FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p>
            AI model outputs may be inaccurate, incomplete, or inappropriate. You are solely
            responsible for reviewing and validating any output before acting on it, especially
            in regulated or safety-critical contexts.
          </p>
        </Section>

        <Section title="13. Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {COMPANY.toUpperCase()} SHALL NOT
            BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
            OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY
            LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
          </p>
          <p>
            OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS OR THE
            SERVICE IS LIMITED TO THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS
            PRECEDING THE CLAIM OR (B) CAD $100.
          </p>
        </Section>

        <Section title="14. Indemnification">
          <p>
            You agree to indemnify and hold harmless {COMPANY}, its officers, directors, employees,
            and agents from any claim, damage, loss, or expense (including reasonable legal fees)
            arising from your use of the Service, your violation of these Terms, or your violation
            of any third-party rights.
          </p>
        </Section>

        <Section title="15. Governing Law and Disputes">
          <p>
            These Terms are governed by the laws of the Province of New Brunswick and the federal
            laws of Canada applicable therein, without regard to conflict-of-law principles.
          </p>
          <p>
            Any dispute arising out of these Terms shall first be attempted to be resolved through
            good-faith negotiation. If unresolved after 30 days, disputes shall be submitted to
            binding arbitration in Moncton, NB, under the rules of the Canadian Arbitration
            Association, except that either party may seek injunctive relief in any court of
            competent jurisdiction.
          </p>
        </Section>

        <Section title="16. Changes to These Terms">
          <p>
            We may update these Terms at any time. If we make material changes, we will notify
            you by email or via an in-app notice at least 14 days before the changes take effect.
            Continued use of the Service after the effective date constitutes acceptance. If you
            do not agree to the updated Terms, you must stop using the Service and close your account.
          </p>
        </Section>

        <Section title="17. Contact">
          <p>
            Questions about these Terms? Email us at{' '}
            <a href={`mailto:${EMAIL}`} className="text-brand hover:underline">{EMAIL}</a>.
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
