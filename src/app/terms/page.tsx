import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use – MerchLab",
  description: "Terms of Use for the MerchLab website and services.",
};

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm border p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Terms of Use
          </h1>
          <p className="text-gray-600 mb-8">
            Last updated: 1 April 2019
          </p>

          <div className="prose prose-lg max-w-none text-gray-700">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">About these Terms of Use</h2>
              <p className="leading-relaxed mb-4">
                We are Merch Lab (Pty) Ltd incorporated in South Africa under company registration number Your Registration Number. Our registered office is 4 Rivendell, 16 The Crescent, Morningside, Gauteng, 2196. Our registered VAT number is 4690323557.
              </p>
              <p className="leading-relaxed">
                These Terms of Use apply to the use of this website, regardless of how you access it. Please read these Terms of Use carefully before you proceed. We may, at any time and without notice, terminate your access to or use of this website. If we do so, you do not have the right to bring any claim or claims against us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Consent to Terms of Use</h2>
              <p className="leading-relaxed mb-4">
                By using this website you agree to these Terms of Use. If you do not agree to these Terms of Use, please do not use this website.
              </p>
              <p className="leading-relaxed">
                These Terms of Use were last updated on the date shown at the top. We may change these Terms of Use at any time by posting an updated version on our website, so you may wish to check it before using this website. You may only use this website for lawful purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Copyright notice</h2>
              <p className="leading-relaxed mb-4">
                Unless we expressly state otherwise, the copyright and any other intellectual property rights, including but not limited to design rights, trade marks and patents appearing anywhere on this website remain our property, whether owned by or licensed to us.
              </p>
              <p className="leading-relaxed">
                You may not use any of the material on this website without our prior written permission for your own commercial purposes, whether by reproducing, copying, downloading, printing, linking to, editing, broadcasting, distributing or otherwise. You may use it for your own personal non-commercial use.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Disclaimer</h2>
              <p className="leading-relaxed mb-4">
                Accessing or using this website or its content in any way is done entirely at your own risk. You will be responsible for any loss or damage to any computer, device, software, systems or data resulting directly or indirectly from the use or inability to use this website or its content.
              </p>
              <p className="leading-relaxed mb-4">
                We are under no obligation to provide uninterrupted access to this website. We reserve the right to restrict your access to this website at any time and for any reason.
              </p>
              <p className="leading-relaxed mb-4">
                We do not guarantee that the contents of this website will be free of errors, bugs, worms, trojans or viruses or otherwise make any representations as to the quality or accuracy or completeness of the content available on the website including, but not limited to any price quotes, stock availability data or non-fraudulent representations. You are responsible for maintaining appropriate software on your computer or device to protect you from any such errors, bugs, worms, trojans or viruses.
              </p>
              <p className="leading-relaxed mb-4">
                To the fullest extent permissible by law, we exclude any and all liability to you resulting from your use of the website or connected to these Terms of Use. This exclusion includes but is not limited to any type of damages, loss of data, income or profit or loss or damage to property belonging to you or third parties arising from the use of this website or its contents.
              </p>
              <p className="leading-relaxed">
                Nothing in these Terms of Use is intended to limit our liability to you for death or personal injury resulting from our negligence or that of our employees or agents.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Links to third party websites</h2>
              <p className="leading-relaxed">
                This website may provide links out to websites or other online resources under the control of third parties. Any such links are provided solely for your convenience. We have no control over the contents of these third-party resources. We are not responsible for the contents of any linked websites and do not endorse them in any way.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Links from third party websites</h2>
              <p className="leading-relaxed">
                You can only link to our website with prior written permission from us. We reserve the right to withdraw any such permission at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Privacy policy</h2>
              <p className="leading-relaxed">
                We take your privacy and the protection of your data very seriously. We may gather and/or use certain information about you in accordance with our privacy policy. Please see our{" "}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-800 underline">
                  separate privacy policy
                </Link>{" "}
                for more information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Entire agreement</h2>
              <p className="leading-relaxed">
                These Terms of Use are the entire agreement between us and you, and supersede any and all prior terms, conditions, warranties or representations to the fullest extent permitted by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Applicable law</h2>
              <p className="leading-relaxed">
                This Agreement shall be governed by the law of South Africa and courts of South Africa will have exclusive jurisdiction in relation to these Terms of Use.
              </p>
            </section>

            <div className="bg-gray-100 border-l-4 border-gray-400 p-4 mt-8">
              <p className="text-sm text-gray-600 italic">
                This information is provided for general purposes only and does not constitute legal advice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
