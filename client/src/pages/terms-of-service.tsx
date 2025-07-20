export default function TermsOfService() {
  return (
    <div className="min-h-screen spotify-bg p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="spotify-heading-xl text-white mb-4">Terms of Service</h1>
          <p className="spotify-text-muted">Last updated: July 20, 2025</p>
        </div>

        <div className="space-y-8 spotify-text-secondary">
          <section>
            <h2 className="spotify-heading-lg text-white mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing and using Spokify, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">2. Service Description</h2>
            <p className="mb-4">
              Spokify is a language learning platform that uses music to help users learn new languages. We provide interactive 
              lyrics, translations, and vocabulary building tools.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">3. User Accounts</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms</li>
            </ul>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">4. Acceptable Use</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use the service for any illegal or unauthorized purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Transmit any worms, viruses, or harmful code</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Share your account credentials with others</li>
            </ul>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">5. Subscription and Payments</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Premium subscriptions are billed monthly</li>
              <li>All fees are non-refundable unless required by law</li>
              <li>We reserve the right to change subscription prices with 30 days notice</li>
              <li>You can cancel your subscription at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">6. Intellectual Property</h2>
            <p className="mb-4">
              All content on Spokify, including but not limited to text, graphics, logos, and software, is the property 
              of Spokify or its content suppliers and is protected by copyright and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">7. Privacy</h2>
            <p className="mb-4">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">8. Limitation of Liability</h2>
            <p className="mb-4">
              Spokify shall not be liable for any indirect, incidental, special, consequential, or punitive damages, 
              including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">9. Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify these terms at any time. We will notify users of any material changes 
              via email or through the service.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">10. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms of Service, please contact us at support@spokify.com.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-spotify-border">
          <button 
            onClick={() => window.close()}
            className="spotify-btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}