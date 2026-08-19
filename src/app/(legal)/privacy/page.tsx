import Link from "next/link";
import {
  DELETION_GRACE_PERIOD_DAYS,
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY_NAME,
  MINIMUM_AGE,
  PRIVACY_EFFECTIVE_DATE,
} from "~/lib/legal";

export const metadata = {
  title: "Privacy Policy · Explainaloud",
  description:
    "What personal information Explainaloud collects, who processes it, how long it is kept, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>
        <strong>Effective {PRIVACY_EFFECTIVE_DATE}.</strong>
      </p>
      <p>
        This policy explains what personal information {LEGAL_ENTITY_NAME}{" "}
        collects when you use the Explainaloud website and service, why we
        collect it, who else processes it, and what you can do about it. It
        forms part of our <Link href="/terms">Terms of Service</Link>.
      </p>

      <h2>1. Information we collect</h2>

      <h3>Information you give us</h3>
      <ul>
        <li>
          <strong>Account details</strong>: your email address, and a password
          if you sign up with one. If you sign in with Google, we receive your
          email address and basic profile details from Google instead; we never
          see your Google password.
        </li>
        <li>
          <strong>Profile details</strong>: your first and last name, your
          username, your date of birth, an optional profile picture, and whether
          you are using Explainaloud as a student or otherwise. We collect date
          of birth to confirm the age requirement in our Terms. Your username
          and date of birth are set once and cannot be changed afterwards.
        </li>
        <li>
          <strong>Your timezone</strong>: the IANA timezone your browser
          reports, such as <code>Europe/London</code>. We use it for one thing:
          working out which calendar day a recording belongs to, so a streak is
          counted in your own days rather than in the server&rsquo;s. It is not
          a location, and we do not derive one from it.
        </li>
        <li>
          <strong>Friends</strong>: who you have sent friend requests to, who
          has sent them to you, and which requests were accepted.
        </li>
        <li>
          <strong>Recording days</strong>: the calendar dates on which you
          recorded, and how many recordings each holds. This is what a streak is
          counted from. It records the date, not the content.
        </li>
        <li>
          <strong>Study content</strong>: the courses and topics you create, any
          source material or notes you add, and the transcripts of your spoken
          explanations together with the scores and gaps generated from them.
        </li>
        <li>
          <strong>Correspondence</strong>: what you send us if you email us.
        </li>
      </ul>

      <h3>Your voice recordings</h3>
      <p>
        When you record an explanation, your browser captures audio and sends it
        to our transcription provider so it can be turned into text.{" "}
        <strong>
          We do not store your audio. It is processed to produce a transcript
          and then discarded. There is no recording archive in your account and
          no audio file to retrieve.
        </strong>{" "}
        The transcript is what we keep.
      </p>
      <p>
        Your browser also uses its own built-in speech recognition to show
        captions live as you speak. On some browsers, including Google Chrome,
        that feature is provided by the browser vendor and may send audio to
        their servers under their own privacy policy, not ours.
      </p>

      <h3>Information collected automatically</h3>
      <ul>
        <li>
          <strong>Authentication cookies</strong>: set so you stay signed in.
          These are strictly necessary for the Service to function.
        </li>
        <li>
          <strong>Usage counters</strong>: how many topics and recordings you
          have used on a given day, so we can apply plan limits.
        </li>
        <li>
          <strong>Server and security logs</strong>: including IP address,
          browser type, and timestamps, kept by our hosting and database
          providers to keep the Service running and to detect abuse.
        </li>
      </ul>
      <p>
        We do not use advertising cookies, and we do not track you across other
        websites.
      </p>

      <h2>2. Why we use it</h2>
      <ul>
        <li>
          <strong>To provide the Service</strong>: creating your account,
          transcribing and scoring your explanations, saving your work, applying
          plan limits.
        </li>
        <li>
          <strong>To take payment</strong>: processing Pro subscriptions and
          keeping your plan status current.
        </li>
        <li>
          <strong>To keep the Service secure</strong>: detecting and preventing
          fraud, abuse, and unauthorised access.
        </li>
        <li>
          <strong>To let people find you and be your friend</strong>: matching a
          username or a name you searched for against other accounts, and
          showing an accepted friend your topic count and your streak.
        </li>
        <li>
          <strong>To communicate with you</strong>: account and transactional
          email such as verification, password resets, and billing notices.
        </li>
        <li>
          <strong>To improve the Service</strong>: understanding, in aggregate,
          which features are used and where things break.
        </li>
      </ul>
      <p>
        Where the law requires a legal basis (for example under the UK and EU
        GDPR), we rely on <strong>performance of a contract</strong> for
        providing and billing the Service, <strong>legitimate interests</strong>{" "}
        for security and product improvement, <strong>consent</strong> for
        microphone access, which you grant in your browser and can revoke at any
        time, and <strong>legal obligation</strong> where we must retain
        records.
      </p>

      <h2>3. What other users can see</h2>
      <p>
        Most of this policy is about us and our providers. This section is about
        other people using Explainaloud, and it is short because the answer is
        short.
      </p>
      <ul>
        <li>
          <strong>
            Any signed-in user can find you by your username, or by your first
            and last name, and can see your profile picture.
          </strong>{" "}
          That is what makes it possible for a friend to add you. Do not use a
          name or a picture you would not want another user to see.
        </li>
        <li>
          <strong>You have a profile page at a stable address</strong>, of the
          form <code>/profiles/your-username</code>. Any signed-in user who has
          that address, or who finds you in search, can open it. It shows your
          name, your username, your picture, the month you joined, and a button
          to send you a friend request. Whether they send one, and whether you
          accept, is each of your decisions.
        </li>
        <li>
          <strong>
            An accepted friend can additionally see two numbers: how many topics
            you have created, and your current streak.
          </strong>{" "}
          Nothing else. Not your topics, not your recordings, not your
          transcripts, not your scores, not your gaps, not your email address,
          and not your date of birth.
        </li>
        <li>
          <strong>
            Nobody, friend or otherwise, can see anything you have said.
          </strong>{" "}
          Your explanations and everything generated from them are visible to
          you alone.
        </li>
        <li>
          <strong>Removing a friend ends the sharing at once</strong>, in both
          directions. So does declining or cancelling a request.
        </li>
      </ul>
      <p>
        <strong>None of this is public to the open web.</strong> Profile pages
        sit behind sign-in, so somebody without an Explainaloud account cannot
        open one, and the pages are marked not to be indexed. Search engines
        cannot reach them.
      </p>

      <h2>4. Who else processes your information</h2>
      <p>
        We use the following providers. They act on our instructions and may
        process your information only to provide their service to us.
      </p>
      <ul>
        <li>
          <strong>Supabase</strong>: database, authentication, and account email
          delivery.
        </li>
        <li>
          <strong>Vercel</strong>: application hosting and delivery.
        </li>
        <li>
          <strong>Groq</strong>: speech-to-text transcription of your
          recordings.
        </li>
        <li>
          <strong>Google (Gemini)</strong>: generating scores, gap analysis, and
          study material from your transcripts and topics.
        </li>
        <li>
          <strong>Tavily</strong>: retrieving supporting web results for a
          topic.
        </li>
        <li>
          <strong>Stripe</strong>: subscription payments. Stripe collects your
          payment details directly;{" "}
          <strong>we never receive or store your full card number.</strong>
        </li>
        <li>
          <strong>Google</strong>: if you choose to sign in with a Google
          account.
        </li>
      </ul>
      <p>
        <strong>
          We do not sell your personal information, we do not share it for
          cross-context behavioural advertising, and we do not permit these
          providers to use your content to train their AI models.
        </strong>
      </p>
      <p>
        We may also disclose information if required by law, to enforce our
        Terms, or in connection with a merger or acquisition, in which case we
        will give you notice before your information becomes subject to a
        different policy.
      </p>

      <h2>5. International transfers</h2>
      <p>
        Our providers operate in the United States and other countries, so your
        information may be processed outside the country you live in. Where we
        transfer personal information out of the UK, the EEA, or another region
        with transfer restrictions, we rely on the safeguards offered by those
        providers, including Standard Contractual Clauses.
      </p>

      <h2>6. How long we keep it</h2>
      <ul>
        <li>
          <strong>Audio</strong>: not retained; discarded once transcribed.
        </li>
        <li>
          <strong>Account and study content</strong>: kept while your account is
          open, so your history stays available to you.
        </li>
        <li>
          <strong>Friendships</strong>: kept until either of you removes the
          friendship or cancels the request, at which point the record is
          deleted rather than marked inactive.
        </li>
        <li>
          <strong>Recording days</strong>: kept while your account is open. A
          streak is worked out from them each time it is shown, so deleting a
          topic does not change your streak, and there is no separate stored
          number to correct.
        </li>
        <li>
          <strong>After deletion</strong>: removed from live systems promptly
          and purged from backups within {DELETION_GRACE_PERIOD_DAYS} days.
        </li>
        <li>
          <strong>Billing records</strong>: retained by us and by Stripe for as
          long as tax and accounting law requires, typically several years, even
          after your account is closed.
        </li>
      </ul>

      <h2>7. Security</h2>
      <p>
        Your data is protected in transit by TLS and at rest by our database
        provider. Access to it is restricted by row-level security rules that
        scope every record to the account that created it, and the columns that
        control your subscription are not writable by your own session.
      </p>
      <p>
        No system is perfectly secure. If a breach affects your personal
        information, we will notify you and any relevant regulator as the law
        requires.
      </p>

      <h2>8. Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access a copy of
        your personal information, correct it, delete it, restrict or object to
        how we use it, receive it in a portable format, and withdraw consent.
        Residents of California, Colorado, Connecticut, Virginia and other US
        states with comprehensive privacy laws have equivalent rights, including
        the right not to be discriminated against for exercising them.
      </p>
      <p>
        You can change your profile details in your account settings at any
        time. For anything else, including deleting your account and its
        content, email{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> from
        the address on the account. We will respond within the period required
        by applicable law, and within 30 days in any case.
      </p>
      <p>
        If you are in the UK or EEA and believe we have not handled your
        information properly, you may complain to your local data protection
        authority.
      </p>

      <h2>9. Children</h2>
      <p>
        Explainaloud is not directed at children under {MINIMUM_AGE}, and we do
        not knowingly collect personal information from them. If you believe a
        child under {MINIMUM_AGE} has given us personal information, email{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> and
        we will delete the account and its data.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this policy. The effective date at the top will change,
        and if the update materially affects how we handle your information we
        will notify you by email or in the app before it takes effect.
      </p>

      <h2>11. Contact</h2>
      <p>
        Privacy questions and requests:{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}
