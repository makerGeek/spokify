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
            <h2 className="spotify-heading-lg text-white mb-4">7. DMCA Copyright Policy</h2>
            <p className="mb-4">
              Spokify respects the intellectual property rights of others and expects our users to do the same. 
              We respond to notices of alleged copyright infringement that comply with the Digital Millennium Copyright Act ("DMCA").
            </p>
            
            <h3 className="spotify-heading-md text-white mb-3">Copyright Infringement Notices</h3>
            <p className="mb-4">
              If you believe that content on Spokify infringes your copyright, you may submit a takedown notice. 
              To be effective, your notice must include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Your contact information (name, address, phone, email)</li>
              <li>Description of the copyrighted work you claim is being infringed</li>
              <li>URL or description of the infringing content on our service</li>
              <li>A statement that you have good faith belief the use is not authorized</li>
              <li>A statement that the information is accurate and you're authorized to act</li>
              <li>Your physical or electronic signature</li>
            </ul>
            
            <h3 className="spotify-heading-md text-white mb-3">How to Submit a Takedown Notice</h3>
            <p className="mb-4">
              Submit copyright infringement notices through our <a href="/dmca-takedown" className="text-spotify-green hover:underline">DMCA Takedown Form</a> or 
              email our designated agent at: <span className="text-spotify-green">dmca@spokify.com</span>
            </p>
            
            <h3 className="spotify-heading-md text-white mb-3">Counter-Notifications</h3>
            <p className="mb-4">
              If your content was removed due to a DMCA notice and you believe it was removed in error, 
              you may submit a counter-notification. We will forward valid counter-notifications to the 
              original complainant and may restore the content after 10-14 business days unless they file a lawsuit.
            </p>
            
            <h3 className="spotify-heading-md text-white mb-3">Repeat Infringer Policy</h3>
            <p className="mb-4">
              We may terminate accounts of users who are found to be repeat infringers of copyright. 
              Users who receive multiple valid DMCA takedown notices may have their accounts suspended or terminated.
            </p>
            
            <p className="mb-4">
              <strong>DMCA Agent Contact:</strong><br />
              Spokify Legal Team<br />
              Email: dmca@spokify.com<br />
              We typically respond to valid notices within 2-3 business days.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">8. Privacy</h2>
            <p className="mb-4">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">9. Limitation of Liability</h2>
            <p className="mb-4">
              Spokify shall not be liable for any indirect, incidental, special, consequential, or punitive damages, 
              including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">10. Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify these terms at any time. We will notify users of any material changes 
              via email or through the service.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">11. Contact Information</h2>
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