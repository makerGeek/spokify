export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen spotify-bg p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="spotify-heading-xl text-white mb-4">Privacy Policy</h1>
          <p className="spotify-text-muted">Last updated: July 20, 2025</p>
        </div>

        <div className="space-y-8 spotify-text-secondary">
          <section>
            <h2 className="spotify-heading-lg text-white mb-4">1. Information We Collect</h2>
            <p className="mb-4">We collect information you provide directly to us, such as:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Account information (email, password)</li>
              <li>Profile information (name, preferences)</li>
              <li>Learning progress and vocabulary data</li>
              <li>Communication with our support team</li>
            </ul>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Personalize your learning experience</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Process transactions and send related information</li>
            </ul>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">3. Information Sharing</h2>
            <p className="mb-4">
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, 
              except as described in this privacy policy.
            </p>
            <p className="mb-4">We may share your information:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>With service providers who assist us in operating our platform</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and safety</li>
              <li>In connection with a business transfer or acquisition</li>
            </ul>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">4. Data Security</h2>
            <p className="mb-4">
              We implement appropriate security measures to protect your personal information against unauthorized access, 
              alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">5. Third-Party Services</h2>
            <p className="mb-4">Our service may contain links to third-party websites or services, including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Authentication providers (Google, Facebook)</li>
              <li>Payment processors (Stripe)</li>
              <li>Analytics services</li>
            </ul>
            <p className="mt-4">
              These third parties have their own privacy policies, and we are not responsible for their practices.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">6. Cookies and Tracking</h2>
            <p className="mb-4">
              We use cookies and similar tracking technologies to collect and use personal information about you. 
              You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">7. Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify inaccurate personal data</li>
              <li>Delete your personal data</li>
              <li>Restrict or object to processing of your data</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">8. Children's Privacy</h2>
            <p className="mb-4">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal 
              information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">9. International Users</h2>
            <p className="mb-4">
              If you are accessing our service from outside the United States, please be aware that your information 
              may be transferred to, stored, and processed in the United States.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">10. Changes to This Policy</h2>
            <p className="mb-4">
              We may update this privacy policy from time to time. We will notify you of any changes by posting 
              the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="spotify-heading-lg text-white mb-4">11. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Privacy Policy, please contact us at privacy@spokify.com.
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