export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm border p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Antistatic – Data Deletion Instructions
          </h1>
          <p className="text-gray-600 mb-8">
            If you have used Antistatic and would like to delete your account and associated personal data, please follow the steps below.
          </p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Request data deletion
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Send an email to{" "}
                <a 
                  href="mailto:hello@merchlab.io"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  hello@merchlab.io
                </a>{" "}
                from the same email address you used to sign in to Antistatic and include:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                <li><strong>Subject line:</strong> &quot;Data Deletion Request – Antistatic&quot;</li>
                <li>Your full name</li>
                <li>The email address and/or social accounts you used to sign in (e.g. Facebook, Google)</li>
                <li>A clear statement that you want your Antistatic account and all related personal data deleted</li>
              </ul>
              <div className="bg-gray-100 border-l-4 border-blue-500 p-4 mt-4">
                <p className="text-sm text-gray-700 font-semibold mb-2">Example:</p>
                <p className="text-sm text-gray-700 italic">
                  &quot;I am requesting deletion of my Antistatic account and all associated personal data.
                  <br />
                  <br />
                  Email used to sign in: [your email here].
                  <br />
                  <br />
                  Social login: Facebook.&quot;
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Verification
              </h2>
              <p className="text-gray-700 leading-relaxed">
                For security reasons, we may contact you to verify your identity or ask for additional information (for example, to confirm ownership of the Facebook account linked to Antistatic).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Deletion of your data
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Once verified, we will:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                <li>Permanently delete your Antistatic account</li>
                <li>Remove or anonymise your personal data stored in our databases (profile information, access tokens, settings, logs linked to your identity)</li>
                <li>Revoke our access tokens/permissions associated with your Facebook account</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                We will complete this process within 30 days of receiving your verified request, and we will email you once deletion is complete.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Data we may retain
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Where required by law or for legitimate business purposes (for example, fraud prevention or accounting), we may retain minimal records that cannot be used to identify you personally.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Contact
              </h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about data deletion or privacy, please contact us at:{" "}
                <a 
                  href="mailto:hello@merchlab.io"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  hello@merchlab.io
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

