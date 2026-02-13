import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions – MerchLab",
  description: "Terms and Conditions for the MerchLab website and purchase of products and services.",
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm border p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Terms and Conditions
          </h1>
          <p className="text-gray-600 mb-8">
            Terms of use for www.merchlab.io and purchase of products and services from MerchLab.
          </p>

          <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Terms of Use</h2>
              <p className="leading-relaxed mb-4">
                These Terms and Conditions (&quot;Terms&quot;) govern your use of the website www.merchlab.io (the &quot;Website&quot;) and the purchase of products and services (&quot;Products&quot;) from MerchLab (Pty) Ltd t/a Merchlab (&quot;MerchLab&quot;). By accessing the Website and/or placing an order, you (&quot;Customer&quot;) agree to be bound by these Terms. If you do not agree with these Terms, you should not use the Website or purchase Products from MerchLab.
              </p>
              <p className="leading-relaxed mb-4">
                These Terms apply when you, as a customer, buy any product or service from MerchLab and constitute a valid and binding agreement between you and MerchLab. By purchasing any of our Products or Services, you agree to comply with these Terms without modification. The effect of this clause is that by using the Website or purchasing goods or services from us it will be presumed that you have read and understood these Terms and that you agree to comply with them.
              </p>
              <p className="leading-relaxed">
                Please read these terms carefully and ensure you understand them. Some of these provisions have the effect of limiting your rights in law and conferring obligations on you by virtue of your agreement to these terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">About MerchLab</h2>
              <p className="leading-relaxed">
                MerchLab (Pty) Ltd t/a Merchlab is a company incorporated in South Africa with its registered address at Unit 4 Rivendell, 16 The Crescent Street, Morningside 2196.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Products and Services</h2>
              <p className="leading-relaxed mb-4">
                We have made every effort to ensure that the information on our Products displayed at our facility, in our promotional material, on our website, or any other form of communication to you, is accurate.
              </p>
              <p className="leading-relaxed mb-4">
                While we use our best endeavors to ensure that the image representing the Product, the features, descriptions and specifications pertaining to the Product are correct, the actual product may be subject to variations in appearance as the packaging may differ over time, or colour representation in marketing material may depend on the medium on which the image is displayed.
              </p>
              <p className="leading-relaxed mb-4">
                In the event that we identify an inadvertent and obvious error in the Product description, price, or image, we will not be obliged to provide the affected Product to you. We will correct and notify you of any errors as soon as reasonably practical.
              </p>
              <p className="leading-relaxed mb-4">
                You are responsible to ensure that the Product received by you is the correct Product as selected or ordered. If you have received the incorrect product, you must notify us within 3 business days of you receiving the product to allow us to correct the error.
              </p>
              <p className="leading-relaxed">
                If you are not satisfied with the Product that you purchased, you may return it to us, subject to the returns and refund provisions in these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Modifications to These Terms</h2>
              <p className="leading-relaxed">
                MerchLab reserves the right to modify these Terms at any time. The latest version of these Terms will be posted on the Website. The Customer&apos;s continued use of the Website or purchase of Products after any such modification shall constitute acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
              <p className="leading-relaxed mb-4">
                Welcome to the official website of Merch Lab (PTY) LTD. Throughout this website and in this document, we will refer to ourselves as &quot;the company,&quot; &quot;we,&quot; &quot;us,&quot; and &quot;our.&quot;
              </p>
              <p className="leading-relaxed mb-4">
                These Terms and Conditions govern the use of our website, including the process of ordering, sales, and delivery of goods. By accessing or using this website, you agree to be bound by these Terms and Conditions.
              </p>
              <p className="leading-relaxed">
                Our website provides a convenient platform for online shopping, offering a diverse range of products such as apparel, gifts, headwear, corporate clothing, bags, homewear and display items. These products can also be customized and branded according to your specific requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Registration</h2>
              <p className="leading-relaxed">
                Account registration is not required on MerchLab&apos;s websites.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Restrictions of Website Usage</h2>
              <p className="leading-relaxed mb-4">
                The MerchLab website and its content are protected and may not be displayed, published, copied, printed, posted, or used in any form without proper authorisation.
              </p>
              <p className="leading-relaxed mb-4">
                When promoting products with information from the website, only images specifically marked for promotional use are permitted.
              </p>
              <p className="leading-relaxed mb-4">
                Any use of the website&apos;s intellectual property that misrepresents the user or the website is strictly forbidden.
              </p>
              <p className="leading-relaxed">
                The trademarks, logos, and service marks on the website are the property of MerchLab or their respective owners. Unauthorised use of any trademarks or logos from this site is prohibited unless prior written consent from MerchLab has been obtained.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Order Placement</h2>
              <p className="leading-relaxed mb-4">
                Orders may be placed through the Website or via MerchLab&apos;s designated WhatsApp channel. We do not accept orders through any other communication channels.
              </p>
              <p className="leading-relaxed mb-4">
                All orders are subject to acceptance by MerchLab. MerchLab reserves the right to accept or reject any order for any reason. Our acceptance relies on factors including product availability, accurate information provided (including pricing), and successful payment or authorization. An order shall be deemed accepted upon dispatch of a confirmation notice by MerchLab.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Website purchases</h3>
              <p className="leading-relaxed mb-4">
                If another person has used your account to purchase any Product without your consent, you must notify us within 24 hours. You will be required to enter your private personal information each time you visit our online ordering site.
              </p>
              <p className="leading-relaxed mb-4">By submitting an order online, you:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>Confirm that you are over the age of 18 and have the legal capacity to enter into a transaction with us;</li>
                <li>Confirm that, in order to fulfil your order, we will share your Personal Information with third parties such as your bank and our contracted courier service, only to the extent necessary; and</li>
                <li>Agree to us investigating any order and confirming any information provided by you in order to prevent fraud.</li>
              </ul>
              <p className="leading-relaxed mb-4">
                Your contract of sale with us is only complete once we have accepted and dispatched your order. You will receive a notification from us once your order has been processed and accepted.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Special Order</h3>
              <p className="leading-relaxed mb-4">
                Special orders will require (100%) full payment prior to being processed. We reserve the right to apply a cancellation fee of up to 15% of the value of merchandise not branded, however for branded merchandise zero refund will be applicable.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Limited Stock Availability</h3>
              <p className="leading-relaxed mb-4">
                Please be aware that the availability of our products is limited. While we strive to promptly update our website with current stock levels, we cannot always guarantee availability. If any item becomes unavailable after an order is placed, we will notify you and provide a refund.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Price Changes</h3>
              <p className="leading-relaxed mb-4">
                Prices shown on our website are subject to change without prior notice. MerchLab retains the right to modify prices for goods or services offered. Any price adjustments will be communicated through written notice.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Estimated Time of Arrival (ETA)</h3>
              <p className="leading-relaxed mb-4">
                Although we regularly update ETA dates for our stock, unforeseen delays in supplier, shipping, or customs processes may occur. Therefore, the accuracy of these dates cannot be guaranteed. Lead times do not include weekends, South African public holidays, or MerchLab&apos;s annual shutdown period.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Branding Requests</h3>
              <p className="leading-relaxed">
                In-house branding services are exclusively available for products procured from MerchLab. These services are subject to additional charges over and above the product purchase price. Full payment for both the product purchase price and branding service charges is required before the commencement of the branding process. Please note that the embroidery branding method is not available to Jade Tier customers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Payment</h2>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Accepted Payment Methods</h3>
              <p className="leading-relaxed mb-4">
                Our company accepts payments via MasterCard, Visa, and Debit cards. Please note that we do not accept American Express, Diners cards, or cash. Orders will only be dispatched once the payment is confirmed in our account.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">International Payments</h3>
              <p className="leading-relaxed mb-4">
                Transactions from foreign banks may require a processing period of 4 to 7 business days. Orders linked to these transactions will be dispatched upon validation of payment in our account.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Approved Credit Facilities</h3>
              <p className="leading-relaxed">
                In cases where credit facilities are extended by us, refer to your credit application document for an overview of the respective terms and conditions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Delivery and Courier Services</h2>
              <p className="leading-relaxed mb-4">
                A delivery fee may apply to each order. Delivery is handled by a third-party courier, so the delivery process is not entirely under our control. Delivery dates are estimates, and you will be informed of any unavailability or delays in products or services during order processing.
              </p>
              <p className="leading-relaxed mb-4">
                It is your responsibility to ensure that the personal information provided, including the delivery address, is accurate; we are not responsible for deliveries to incorrect addresses.
              </p>
              <p className="leading-relaxed mb-4">
                Upon delivery, you will receive the courier company&apos;s waybill. For verification, the person accepting delivery must present identification. Anyone accepting delivery at the specified address is presumed authorized to do so. You or your authorized representative must sign and print your or their name on a duplicate copy of the waybill to confirm receipt.
              </p>
              <p className="leading-relaxed mb-4">
                If no one is present at the delivery address at the time of delivery, the driver will return the products to our facility. The courier company will attempt to arrange redelivery, and MerchLab reserves the right to charge an additional delivery fee if required.
              </p>
              <p className="leading-relaxed">
                Report any missing or damaged products within 24 hours. MerchLab, having outsourced deliveries, cannot be held liable for any damage or loss due to the courier&apos;s acts or omissions, to the extent permitted by law.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Collection</h3>
              <p className="leading-relaxed mb-4">
                Local Orders: Place an order online and arrange delivery within 2-3 working days. VIP Orders: Place an order online and collect it within 2-3 working days. Africa Orders: Place an order online and collect it within 2-3 working days; it is the customer&apos;s responsibility to claim Value Added Taxes (VAT) at the respective borders.
              </p>
              <p className="leading-relaxed mb-4">
                If an order is not collected within three weeks after the first notification, we reserve the right to cancel the order and refund the purchase price minus applicable storage fees. For customized or special orders, we may retain the full purchase price.
              </p>
              <p className="leading-relaxed mb-4">
                Products may only be picked up with valid proof of identity and the order number. Accepted forms of identification include a South African ID, South African driver&apos;s license, or passport.
              </p>
              <p className="leading-relaxed">
                Orders must be collected in full; partial collections are not allowed unless in exceptional cases. Ensure that your vehicle is adequately equipped to accommodate the full order. MerchLab reserves the right to refuse loading any product onto your vehicle if deemed unsafe.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cancellations, Returns &amp; Repairs</h2>
              <p className="leading-relaxed mb-4">
                We want you to be happy with your purchase. We will refund or exchange most goods if you return them within 5 working days after the order has been delivered, provided it is in its original packaging and condition, including all attachments, accessories and documentation and it is unused.
              </p>
              <p className="leading-relaxed mb-4">
                Goods that show a manufacturing defect within the first 6 months of purchase will be repaired, replaced or a credit provided, subject to the below terms.
              </p>
              <p className="leading-relaxed mb-4">The following Products cannot be returned:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>Items that have been customised according to your specifications;</li>
                <li>Items that are clearly personalised, altered or branded;</li>
                <li>Items damaged by lightning or any other act of nature;</li>
                <li>Items not used in terms of the Product&apos;s user manual; and</li>
                <li>Discontinued, sale and clearance items.</li>
              </ul>
              <p className="leading-relaxed mb-4">
                You may be responsible to pay for the cost of returning the products. If you return a defective product that meets these requirements, we will gladly replace, refund or repair the Product of your choice. We reserve the right to send Products for technical evaluation prior to replacing, refunding or repairing such Products and to provide you with feedback within 10 working days of receipt of the returned goods and to act accordingly.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Order Cancellation and Damages</h3>
              <p className="leading-relaxed mb-4">
                Once an order is confirmed, it becomes a binding contract and cannot be cancelled. Any damages or shortages must be reported within forty-eight (48) hours of collection or delivery.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Cancellation Policy</h3>
              <p className="leading-relaxed mb-4">
                All sales made through this website are final. Orders cannot be canceled or modified once placed and payment is received. By completing a purchase, you acknowledge and agree to this no-cancellation policy. Please review your order carefully before submission to ensure all details are accurate and complete.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Faulty Goods and Returns</h3>
              <p className="leading-relaxed mb-4">
                If a product supplied by MerchLab is found to be defective or covered under warranty, you must notify us within forty-eight (48) hours of receipt to ensure eligibility for return or replacement. Failure to do so may affect your eligibility. After the 6 months&apos; statutory warranty has expired, some products have an extended warranty as stated in the product brochure, subject to the manufacturer&apos;s terms.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Repair Returns</h3>
              <p className="leading-relaxed mb-4">
                Before repair work, a cost estimate will be provided to the customer for approval. Repaired items not collected within thirty to ninety days (30 to 90 days) after completion may be sold by the company to recover costs.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Returns Approval</h3>
              <p className="leading-relaxed">
                Written approval from the company management is mandatory for returning collected stock. Returns will only be accepted with the accompanying invoice/s. A 15% handling and administrative fee applies to approved returns of collected stock. No future orders will be processed unless prior cancellation fees have been settled.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Warranties</h2>
              <p className="leading-relaxed mb-4">
                Warranty coverage is available for new goods through MerchLab-specific warranties or original manufacturer&apos;s warranties; however, certain goods exempt from product warranties may have latent defects, for which MerchLab is not responsible.
              </p>
              <p className="leading-relaxed mb-4">
                MerchLab does not warrant that the goods are suitable for any specific purpose. Our liability is limited to repairing or replacing faulty goods or issuing a credit of equivalent value. In case of returned goods with no fault found, all associated costs will be passed on to the customer.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Intellectual Property</h2>
              <p className="leading-relaxed mb-4">
                By accessing this website, users are granted a limited, non-exclusive license to access and use the content provided for personal, non-commercial purposes. Users must not use, reproduce, modify, or distribute the content without prior written consent from MerchLab, except as expressly permitted.
              </p>
              <p className="leading-relaxed mb-4">
                Some content on this website may be sourced from third parties. MerchLab does not claim ownership over such content. The trademarks, logos, and service marks displayed are the property of MerchLab or their respective owners. Users are strictly prohibited from using any trademarks or logos without prior written consent.
              </p>
              <p className="leading-relaxed">
                By submitting any content (text, images, videos, or other materials), users grant MerchLab the right to use, reproduce, modify, and adapt the submissions for fulfilling order requests. MerchLab will not claim ownership of users&apos; intellectual property and will not use it for any other purpose without explicit consent. Users are responsible for ensuring that their submissions do not infringe upon any third-party rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Disclaimer</h2>
              <p className="leading-relaxed mb-4">
                Your utilisation of the Website is undertaken entirely at your own risk, and you shall bear sole responsibility for any loss or risk arising from such utilisation or reliance on the information provided on the Website.
              </p>
              <p className="leading-relaxed mb-4">
                Whilst we endeavour to ensure the accuracy and completeness of the content on the Website, we provide no guarantee as to its quality, timeliness, operation, integrity, availability, or functionality. We hereby disclaim any liability for any direct, indirect, or consequential damage, loss, or liability arising from your access or use of the Website and its content, unless otherwise mandated by applicable law.
              </p>
              <p className="leading-relaxed mb-4">
                The Website and all information provided therein are provided &quot;as is&quot; without any warranty, whether express or implied. Any views or statements presented on the Website shall not necessarily reflect our views or statements. We make no warranty that the information or files available on the Website are free from viruses or any other harmful data or code unless arising from our gross negligence or wilful misconduct.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
              <p className="leading-relaxed mb-4">
                MerchLab shall not assume any liability for any direct, indirect, incidental, special, or consequential damages resulting from your use of the Website, inability to use the Website, or any unlawful activity on the Website or linked third-party websites.
              </p>
              <p className="leading-relaxed">
                By using the Website, you agree to indemnify and hold MerchLab harmless against any loss, claim, or damage arising from your use of the Website or any linked third-party websites.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Privacy Policy Summary</h2>
              <p className="leading-relaxed mb-4">
                Our Privacy Policy outlines how our website safeguards the privacy of its users in compliance with applicable data protection laws. During the interaction between you and MerchLab, we may collect and process your personal information (as defined in POPIA). We will only collect and process personal information for specified purposes such as order processing, customer inquiries, enhancing user experience, and legal compliance. Further information can be found in our{" "}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-800 underline">Privacy Policy</Link>.
              </p>
              <p className="leading-relaxed mb-4">
                We will not disclose or sell users&apos; personal information to any third parties without explicit consent, except as required by law or to fulfil contractual obligations. We implement appropriate security measures to protect users&apos; personal information.
              </p>
              <p className="leading-relaxed mb-4">
                Users have the right to access, correct, or delete their personal information. These rights can be exercised by contacting our designated data protection officer via email, support@merchlab.io.
              </p>
              <p className="leading-relaxed">
                Our website may use cookies or similar technologies to improve user experience. Users can manage or disable cookies through their browser settings. By using our website, users acknowledge and consent to the collection, processing, and storage of their personal information as described in our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Force Majeure</h2>
              <p className="leading-relaxed mb-4">
                If either Party is prevented or restricted directly or indirectly from carrying out all or any of its obligations under this Agreement because of strike, lock-out, fire, explosion, floods, riot, war, accident, act of God, embargo, legislation, shortage of or a breakdown in transportation facilities, civil commotion, unrest or disturbances, cessation of labour, government interference or control, or any other cause or contingency beyond the control of that Party, the Party so affected shall be relieved of its obligations hereunder during the period that such event and its consequences continue but only to the extent so prevented and shall not be liable for any delay or failure in the performance of any obligations hereunder or loss or damages which the other Party may suffer due to or resulting from such delay or failure, provided always that written notice shall forthwith be given of any such inability to perform by the affected Party.
              </p>
              <p className="leading-relaxed">
                Any Party invoking force majeure shall, upon the termination of such event, forthwith give written notice thereof to the other Party. Should such force majeure continue for more than 90 days then the Party who shall not have invoked the force majeure shall be entitled forthwith to cancel this Agreement in respect of any obligations still to be performed hereunder.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Governing Law</h2>
              <p className="leading-relaxed mb-4">
                These terms and conditions shall be governed and interpreted by the laws of the Republic of South Africa including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Electronic Communications and Transactions Act (ECTA) 2002</li>
                <li>Consumer Protection Act (CPA) 2008</li>
                <li>Companies Act 2008</li>
                <li>National Credit Act 2005</li>
                <li>Consumer Protection Regulations (CPRs)</li>
                <li>Protection of Personal Information Act (POPIA) 2013</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Arbitration</h2>
              <p className="leading-relaxed">
                Any disputes arising from or related to this agreement shall be resolved through arbitration. The Rules of the Arbitration Foundation of Southern Africa will govern the arbitration process, with the arbitrator(s) appointed by the Foundation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Severability</h2>
              <p className="leading-relaxed">
                If any clause or term of this Agreement is deemed invalid, unenforceable, or illegal by a court of competent jurisdiction, the remaining terms and provisions of this Agreement shall remain in full force and effect, unless the invalidity, unenforceability, or illegality fundamentally affects the essence of this Agreement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Domicilium and Notices</h2>
              <p className="leading-relaxed mb-4">
                Correspondence between the parties shall be sent to the following address:
              </p>
              <p className="leading-relaxed mb-4 font-medium">
                Merch Lab (Pty) Ltd<br />
                4 Rivendell, 16 The Crescent,<br />
                Morningside, 2196<br />
                South Africa
              </p>
              <p className="leading-relaxed mb-4">
                Notices shall be considered received: if delivered in person during the recipient&apos;s regular business hours at their address, at the time of delivery; if sent via email to the recipient&apos;s provided email address, on the same day as sending. A written notice or communication received by a party shall be considered sufficient even if it was not sent or delivered to their chosen address.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">General</h2>
              <p className="leading-relaxed mb-4">
                This Agreement represents the entire understanding between the parties, superseding any prior agreements or representations, whether written, oral, or implied. Neither party is bound by any terms, representations, or promises that are not explicitly recorded in this Agreement.
              </p>
              <p className="leading-relaxed mb-4">
                No changes or cancellations of this Agreement shall be valid unless in writing and signed by or on behalf of both parties. No leniency or tolerance granted by either party shall be considered a waiver of any rights. This Agreement does not create a partnership, joint venture, agency, or employment relationship between the parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Annexure</h2>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Sample Policy</h3>
              <p className="leading-relaxed mb-4">
                We recognize that samples are important for making informed decisions. While we do not provide samples directly, you have the option to order single unbranded or branded items as separate orders for your review. Please note that branded items cannot be returned. If you are not satisfied with unbranded items, you can return them before placing larger branded orders.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Branding – Artwork Policy</h3>
              <p className="leading-relaxed mb-4">
                The customer hereby indemnifies MerchLab, its directors, officers, agents and affiliates and holds them harmless against any claims, losses, damages, injuries and liabilities from brand/trademark owners arising from the provision of Services/Supply, save where and to the extent such claims arose as a result of any negligent act or omission of MerchLab or its employees acting in the course and scope of their employment.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Artwork Guidelines and Process</h3>
              <p className="leading-relaxed mb-4">
                All artwork should be uploaded onto our website for processing, or if your MerchLab profile indicates that the artwork can be sent to us, please send it directly to the relevant Account Manager. All final layouts should be approved online. COD clients are expected to make full payment and credit term clients should ensure that they have sufficient credit available. Branding will only commence once the layout is approved and full payment is received. It is the responsibility of the customer to ensure that approval has been obtained from the brand/trademark owner before branding of any items. Branding lead times are quoted from the day after artwork approval and proof of payment is received, whichever is later.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Artwork Submission</h3>
              <p className="leading-relaxed mb-4">
                Only PC format artwork will be accepted; vector artwork is preferred and fonts need to be converted to curves/outlines. Acceptable formats: .CDR, .EPS, .AI, .PDF. We do not accept: Word or PowerPoint files (or images saved from them), Gif and Jpeg (under 300dpi), FreeHand. Artwork for multicoloured imprints must be sent as a colour separated file, save for digital printing. If typesetting is required, clients must include font and size. Artwork not received in the correct format will attract a redrawing fee of R450 excl. VAT and require 24 hour lead-time.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Artwork Approval and Applicable Fees</h3>
              <p className="leading-relaxed mb-4">
                All artwork needs to be approved; branding will only commence once artwork has been approved and full payment for the order has been received. By approving the artwork you accept the layout as depicted; you have ensured that the item being branded, colour and size of the item are correct. MerchLab will not be held accountable for any spelling or artwork errors on items branded in accordance with the approved artwork. Once artwork has been approved, no changes will be accepted. Printing colours will be matched as close as possible to pantone colours or swatches supplied; we do not guarantee a 100% colour match. We do not guarantee any print onto metal or ceramics. Additional fees: artwork received in the incorrect format will attract a redrawing fee of R200 excluding VAT (accommodating two further changes; thereafter R100 excl. VAT per change). Branding cancelled after layouts have been generated will be charged at R100 excluding VAT per layout completed.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Display</h3>
              <p className="leading-relaxed mb-4">
                Where skins are available for sale as stand-alone items, MerchLab is able to refit skins onto MerchLab-purchased hardware from our Johannesburg Head Office. Return of hardware to MerchLab Johannesburg will be for the client&apos;s account. Refitting is subject to inspection; if existing hardware is faulty or damaged, MerchLab will not be able to refit skins. Display fabrics purchased from MerchLab come with a 3-month limited print fade warranty.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Display Repair Policy</h3>
              <p className="leading-relaxed mb-4">
                Display hardware purchased from MerchLab comes with a 3-year limited mechanical repair warranty. The warranty excludes display hardware that has been mishandled, abused or not used for its intended purpose. Hardware under warranty that requires repair must be returned to MerchLab Johannesburg at the client&apos;s own expense.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Workwear Policy</h3>
              <p className="leading-relaxed mb-4">
                Manufacture of workwear products will only commence when the order is received and, for COD clients, full payment is received. Once a sales order is generated your order may not be cancelled or changed. Conti suit sets are sold according to industry standard (pants 2 sizes smaller than the jacket). We will not accept returns on unbranded or branded workwear items that have had tape specially applied.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Disclaimers and Information</h3>
              <p className="leading-relaxed">
                Lead-times may need to be extended for large quantities. Branding orders cannot be cancelled after payment and approval have been received. A tolerance of up to 2% is allowed for rejects. MerchLab is not liable for damages or shortages of stock that has been collected or delivered if not reported within 24 hours. MerchLab cannot accept returns on incorrectly branded items where artwork has been approved by the customer. Colours of actual products may vary slightly from those shown. Product images may differ slightly from actual items. E&amp;OE.
              </p>
            </section>

            <div className="bg-gray-100 border-l-4 border-gray-400 p-4 mt-8">
              <p className="text-sm text-gray-600 italic">
                This document is provided for information purposes and does not constitute legal advice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
