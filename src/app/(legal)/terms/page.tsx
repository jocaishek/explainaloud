import Link from "next/link";
import {
  GOVERNING_JURISDICTION,
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY_NAME,
  MINIMUM_AGE,
  TERMS_EFFECTIVE_DATE,
} from "~/lib/legal";
import { PLAN_RECORDING_MS, PRO_PRICE_USD } from "~/lib/plans";

export const metadata = {
  title: "Terms of Service · Explainaloud",
  description:
    "The agreement between you and Explainaloud covering accounts, subscriptions, acceptable use, and your content.",
};

const freeMinutes = Math.round(PLAN_RECORDING_MS.free / 60_000);
const proMinutes = Math.round(PLAN_RECORDING_MS.pro / 60_000);

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p>
        <strong>Effective {TERMS_EFFECTIVE_DATE}.</strong>
      </p>
      <p>
        These Terms are a binding agreement between you and {LEGAL_ENTITY_NAME}{" "}
        (&ldquo;Explainaloud&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
        covering your use of the Explainaloud website and service (the
        &ldquo;Service&rdquo;). By checking the acceptance box at signup, or by
        using the Service, you agree to them. If you do not agree, do not use
        the Service.
      </p>
      <p>
        Our <Link href="/privacy">Privacy Policy</Link> explains what personal
        information we handle and is incorporated into these Terms by reference.
      </p>

      <h2>1. Who may use Explainaloud</h2>
      <p>
        You must be at least {MINIMUM_AGE} years old to hold an account. If you
        are under the age of majority where you live, you may use the Service
        only with the involvement of a parent or legal guardian, who agrees to
        these Terms on your behalf and is responsible for your use of it.
      </p>
      <p>
        You may not use the Service if you are barred from doing so under
        applicable law, or if we have previously terminated your account for
        breach of these Terms.
      </p>

      <h2>2. Your account</h2>
      <p>
        You are responsible for the credentials used to access your account and
        for everything done through it. Give us accurate information when you
        sign up, keep it current, and tell us promptly at{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> if
        you believe your account has been accessed without your permission.
      </p>
      <p>
        Accounts are personal to you. Do not share, sell, or transfer an account
        to anyone else.
      </p>

      <h2>3. What the Service does — and what it does not</h2>
      <p>
        Explainaloud records you explaining a topic out loud, transcribes what
        you said, and uses automated systems, including third-party artificial
        intelligence models, to score the explanation and identify gaps in it.
      </p>
      <p>
        <strong>
          Scores, feedback, and gap analysis are generated automatically and
          will sometimes be wrong.
        </strong>{" "}
        They are a study aid and nothing more. They are not an assessment of
        your ability, not a substitute for instruction from a qualified teacher,
        and not academic, medical, legal, financial, or professional advice. Do
        not rely on the Service as your only measure of whether you understand
        something.
      </p>
      <p>
        Speech recognition accuracy varies with your microphone, your
        surroundings, your accent, and your speech patterns. We do not warrant
        that any transcript is accurate or complete.
      </p>
      <p>
        You are responsible for complying with the rules of your school,
        university, or institution. Using a study tool may be restricted in some
        academic contexts, and that is between you and your institution.
      </p>

      <h2>4. Plans, billing, and cancellation</h2>
      <p>
        The Service offers a free plan and a paid &ldquo;Pro&rdquo; plan. The
        free plan includes recordings of up to {freeMinutes} minutes and a
        limited number of topics per day. Pro costs{" "}
        <strong>${PRO_PRICE_USD.toFixed(2)} per month</strong>, includes
        recordings of up to {proMinutes} minutes, a higher daily topic limit,
        and unlimited recordings. Current limits are shown on the pricing
        section of our home page and inside the app.
      </p>
      <p>
        Payments are processed by Stripe. We do not receive or store your full
        card number. Your use of Stripe&rsquo;s checkout is additionally subject
        to Stripe&rsquo;s own terms.
      </p>
      <p>
        <strong>Pro is a recurring subscription.</strong> Unless you cancel, it
        renews automatically each month and your payment method is charged the
        then-current price plus any applicable tax. You authorise that recurring
        charge when you subscribe.
      </p>
      <p>
        You may cancel at any time from the billing settings in your account.
        Cancellation takes effect at the end of the billing period you have
        already paid for; you keep Pro features until then. Except where
        required by law, <strong>payments are non-refundable</strong> and we do
        not provide partial refunds for unused time.
      </p>
      <p>
        We may change prices. We will give you notice before a price change
        takes effect for your subscription, and the change will apply only to
        billing periods beginning after that notice. If you do not accept the
        new price, cancel before it takes effect.
      </p>
      <p>
        If a payment fails, we may retry it and may suspend or downgrade Pro
        features until payment succeeds.
      </p>

      <h2>5. Your content</h2>
      <p>
        &ldquo;Your Content&rdquo; means the audio you record, the transcripts
        produced from it, the topics, notes, and source material you add, and
        anything else you submit to the Service.
      </p>
      <p>
        <strong>You keep ownership of Your Content.</strong> You grant us a
        non-exclusive, worldwide, royalty-free licence to host, store, process,
        transmit, and display Your Content, and to send it to the third-party
        processors described in our <Link href="/privacy">Privacy Policy</Link>,
        strictly for the purpose of operating and improving the Service for you.
        This licence exists so we can run the product; it ends when you delete
        the content or your account, except for backups pending deletion on our
        normal cycle.
      </p>
      <p>
        <strong>
          We do not sell Your Content, and we do not use it to train our own or
          any third party&rsquo;s AI models.
        </strong>
      </p>
      <p>
        You are responsible for having the rights to whatever you submit. Do not
        upload material you do not have permission to use, and do not record
        another person&rsquo;s voice without their consent — some jurisdictions
        make that a criminal matter, not merely a breach of these Terms.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          break the law, infringe anyone&rsquo;s rights, or use the Service to
          harass, threaten, or harm anyone;
        </li>
        <li>
          upload malware, or attempt to gain unauthorised access to the Service,
          other accounts, or the systems behind them;
        </li>
        <li>
          probe, scan, overload, or otherwise interfere with the Service or the
          infrastructure it runs on;
        </li>
        <li>
          scrape the Service, or use bots or automated means to create accounts
          or generate activity;
        </li>
        <li>
          circumvent usage limits, rate limits, paywalls, or plan restrictions,
          including by creating multiple accounts to do so;
        </li>
        <li>
          resell, sublicense, or make the Service available to third parties as
          your own;
        </li>
        <li>
          reverse engineer or attempt to extract the source code or underlying
          models of the Service, except to the extent that restriction is
          unenforceable by law.
        </li>
      </ul>

      <h2>7. Availability and changes</h2>
      <p>
        The Service is provided on an evolving basis. We may add, change, or
        remove features, and we may impose or adjust usage limits. We may need
        to suspend the Service for maintenance or for reasons outside our
        control. We do not guarantee any level of uptime.
      </p>
      <p>
        Some features depend on third-party providers. If one of them changes or
        becomes unavailable, the corresponding feature may change or stop
        working.
      </p>

      <h2>8. Suspension and termination</h2>
      <p>
        You may stop using the Service and delete your account at any time. We
        may suspend or terminate your account if you materially breach these
        Terms, if we are required to by law, or if your use poses a risk to the
        Service or to other users. Where it is reasonable and lawful to do so,
        we will give you notice first.
      </p>
      <p>
        If we terminate your paid subscription without cause, we will refund the
        unused portion of the period you have paid for. Sections 5, 9, 10, 11,
        and 12 survive termination.
      </p>

      <h2>9. Disclaimer of warranties</h2>
      <p>
        <strong>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo;, without warranties of any kind, whether express,
          implied, or statutory, including implied warranties of
          merchantability, fitness for a particular purpose, and
          non-infringement.
        </strong>{" "}
        We do not warrant that the Service will be uninterrupted, secure, or
        error-free, or that any score, transcript, or piece of feedback will be
        accurate.
      </p>
      <p>
        Some jurisdictions do not allow the exclusion of certain warranties. In
        those places, the exclusions above apply only to the extent permitted,
        and you may have rights that these Terms cannot take away.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        <strong>
          To the fullest extent permitted by law, Explainaloud will not be
          liable for any indirect, incidental, special, consequential, or
          punitive damages, or for any loss of data, profits, revenue, goodwill,
          or academic or professional opportunity,
        </strong>{" "}
        arising out of or relating to your use of the Service, whether based in
        contract, tort, or any other theory, even if we have been advised of the
        possibility of such damages.
      </p>
      <p>
        <strong>
          Our total aggregate liability for all claims relating to the Service
          is limited to the greater of (a) the amount you paid us in the twelve
          months before the event giving rise to the claim, or (b) US$50.
        </strong>
      </p>
      <p>
        Nothing in these Terms limits liability that cannot be limited by law,
        including liability for fraud, or for death or personal injury caused by
        negligence.
      </p>

      <h2>11. Indemnity</h2>
      <p>
        You agree to indemnify and hold harmless Explainaloud from any claim,
        demand, loss, or expense (including reasonable legal fees) brought by a
        third party and arising from Your Content, your use of the Service, or
        your breach of these Terms or of any law or third-party right.
      </p>

      <h2>12. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of {GOVERNING_JURISDICTION},
        without regard to its conflict-of-laws rules. You and we submit to the
        exclusive jurisdiction of the courts located there, except that either
        party may seek injunctive relief in any court of competent jurisdiction.
      </p>
      <p>
        If you are a consumer resident in a jurisdiction whose law entitles you
        to bring proceedings locally, or grants you protections that cannot be
        waived by agreement, nothing here removes that right.
      </p>
      <p>
        Before filing a claim, please contact us at{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        Most disputes can be resolved that way.
      </p>

      <h2>13. Changes to these Terms</h2>
      <p>
        We may update these Terms. When we do, we will change the effective date
        at the top. If a change is material — for example, one that reduces your
        rights or expands your obligations — we will give you reasonable notice
        by email or in the app before it takes effect. Continuing to use the
        Service after that date means you accept the updated Terms. If you do
        not accept them, stop using the Service and delete your account.
      </p>

      <h2>14. General</h2>
      <p>
        These Terms, together with the Privacy Policy, are the entire agreement
        between you and us about the Service. If any provision is found
        unenforceable, the rest stays in force and the unenforceable part is
        limited to the minimum extent necessary. Our not enforcing a provision
        is not a waiver of it. You may not assign these Terms without our
        consent; we may assign them to a successor in connection with a merger,
        acquisition, or sale of assets.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these Terms:{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}
