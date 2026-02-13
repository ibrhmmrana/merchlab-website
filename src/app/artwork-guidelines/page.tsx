import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Artwork Guidelines – MerchLab",
  description: "Artwork guidelines, submission requirements, and branding process for MerchLab.",
};

export default function ArtworkGuidelinesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm border p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Artwork Guidelines
          </h1>
          <p className="text-gray-600 mb-8">
            Branding, artwork submission, approval, and display guidelines for MerchLab.
          </p>

          <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Artwork Policy</h2>
              <p className="leading-relaxed">
                The customer hereby indemnifies MerchLab, its directors, officers, agents and affiliates (&quot;MerchLab Indemnitees&quot;) and holds them harmless against any claims, losses, damages, injuries and liabilities (including court costs, legal fees and deductibles under its own insurance policies) from brand/trademark owners arising from the provision of Services/Supply, save where and to the extent such claims, losses, damages, injuries or liabilities arose as a result of any negligent act or omission of MerchLab or the MerchLab employees acting in the course and scope of their employment with MerchLab.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Artwork Guidelines and Process</h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>All artwork should be uploaded onto our website for processing; alternatively, if your MerchLab profile indicates that the artwork can be sent to us, please send it directly to the relevant Account Manager.</li>
                <li>All final layouts should be approved online.</li>
                <li>COD clients are expected to make full payment and credit term clients should ensure that they have sufficient credit available.</li>
                <li>Branding will only commence once the layout is approved and full payment is received.</li>
                <li>It is the responsibility of the customer to ensure that approval has been obtained from the brand/trademark owner before branding of any items.</li>
                <li>Branding lead times are quoted from the day after artwork approval and proof of payment is received, whichever is later.</li>
                <li>For expedited clearing of orders you are encouraged to pay for orders online through the payment portal that can be accessed on our website, or if paying into one of our bank accounts, please use the order number as reference and e-mail your proof of payment to <a href="mailto:info@merchlab.co.za" className="text-blue-600 hover:underline">info@merchlab.co.za</a>.</li>
                <li>All orders and the status of these will be communicated via eMail/WhatsApp; if you have any queries please contact us.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Artwork Submission</h2>
              <p className="leading-relaxed mb-4">
                Only PC format artwork will be accepted. Vector artwork is preferred and fonts need to be converted to curves. Artwork in the following file formats will be acceptable:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>.CDR</li>
                <li>.EPS</li>
                <li>.AI</li>
                <li>.PDF</li>
              </ul>
              <p className="leading-relaxed mb-4 font-medium">Formats we do not accept:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>Word or PowerPoint files (or images saved from them)</li>
                <li>Gif and Jpeg (under 300dpi)</li>
                <li>FreeHand</li>
              </ul>
              <p className="leading-relaxed mb-4">
                Artwork for multicoloured imprints must be sent as a colour separated file, save for in the instance of digital printing. If typesetting is required, clients must include font and size. To avoid font substitutions, all fonts submitted must be converted to &quot;curves&quot;.
              </p>
              <p className="leading-relaxed">
                Artwork not received in the correct format will attract a redrawing fee of R450 excl. VAT and require 24 hour lead-time. All artwork requests, approvals and proof of payments are to be sent to the relevant branch personnel.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Artwork Approval and Applicable Fees</h2>
              <p className="leading-relaxed mb-4">
                All artwork needs to be approved; branding will only commence once artwork has been approved and full payment for the order has been received.
              </p>
              <p className="leading-relaxed mb-4">By approving the artwork:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>You accept the layout as depicted in the artwork.</li>
                <li>You have ensured that the item being branded, colour and size of the item are correct.</li>
                <li>MerchLab will not be held accountable for any spelling or artwork errors on items branded in accordance with the approved artwork.</li>
                <li>Once artwork has been approved, no changes will be accepted.</li>
              </ul>
              <p className="leading-relaxed mb-4">
                Printing colours will be matched as close as possible to pantone colours or swatches supplied; we do not guarantee a 100% colour match. We do not guarantee any print onto metal or ceramics.
              </p>
              <p className="leading-relaxed mb-4">
                Additional fees do not apply to artwork received in the correct format. However, artwork received in the incorrect format will attract a redrawing fee of R200 excluding VAT. This fee will accommodate two further changes to the layouts; thereafter any additional changes will be charged at R100 excluding VAT per change.
              </p>
              <p className="leading-relaxed">
                Branding cancelled after layouts have been generated will be charged at R100 excluding VAT per layout completed.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Display</h2>
              <p className="leading-relaxed mb-4">
                Where skins are available for sale as stand-alone items, MerchLab is able to refit skins onto MerchLab-purchased hardware from our Johannesburg Head Office. Should a client request that MerchLab refit skins, the return of hardware to MerchLab Johannesburg Head Office will be for the client&apos;s account. Once complete, MerchLab will send the items to a MerchLab branch, within South Africa, of the client&apos;s choice. Alternatively, the items can remain at MerchLab Johannesburg for client collection.
              </p>
              <p className="leading-relaxed mb-4">
                Refitting of skins by MerchLab is subject to inspection of the relevant hardware. If the existing hardware is faulty or damaged, MerchLab will not be able to refit skins. If the client is re-skinning hardware themselves it is the client&apos;s responsibility to ensure that the hardware is not faulty or damaged. MerchLab cannot be held liable for skins purchased that cannot be fitted properly due to faulty or damaged hardware.
              </p>
              <p className="leading-relaxed mb-4">
                It is the client&apos;s responsibility to ensure they order the correct skin for the correct display unit. Reskinning is specifically tailored to fit to MerchLab display hardware. MerchLab cannot be held responsible for any skins purchased to fit third-party hardware.
              </p>
              <p className="leading-relaxed mb-4">
                All artwork must be created in CMYK and all pantone colours must be included as a pantone solid coated spot within the print file supplied. Please note failing this will result in no colour matching taking place. Due to the limited colour range of various digital CMYK print methods, not all pantone colours can be achieved. We endeavour to match as closely as possible, but colour variation will take place on different materials like PVC versus Fabric.
              </p>
              <p className="leading-relaxed mb-4">
                Fluorescent and metallic pantones cannot be matched. Only a tonal representation thereof can be achieved.
              </p>
              <p className="leading-relaxed mb-4">
                Overexposure to sunlight will reduce the longevity of the print. We encourage you to take care of the display fabric and remove it from direct sunlight at all opportunities.
              </p>
              <p className="leading-relaxed">
                Display fabrics purchased from MerchLab come with a 3-month limited print fade warranty.
              </p>
            </section>

            <div className="bg-gray-100 border-l-4 border-gray-400 p-4 mt-8">
              <p className="text-sm text-gray-600 italic">
                For questions about artwork or branding, please contact your Account Manager or <a href="mailto:info@merchlab.co.za" className="text-blue-600 hover:underline">info@merchlab.co.za</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
