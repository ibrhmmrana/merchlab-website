import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PAIA Manual – MerchLab",
  description: "Promotion of Access to Information Manual for MerchLab (Pty) Ltd in accordance with PAIA.",
};

export default function PAiaManualPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm border p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            PAIA Manual
          </h1>
          <p className="text-gray-600 mb-2">
            Prepared in terms of section 51 of the Promotion of Access to Information Act 2 of 2000 (as amended)
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Date of compilation: 12/12/2025 · Date of revision: 01/23/2026
          </p>

          <div className="prose prose-lg max-w-none text-gray-700">
            <p className="leading-relaxed mb-8">
              This Manual has been prepared in accordance with Section 51 of the Promotion of Access to Information Act No. 2 of 2000 (PAIA) for MerchLab. The Act enforces Section 32 of the South African Constitution (1996), granting the right of access to information. Section 51 mandates that all private entities provide a publicly accessible Manual outlining the process for requesting access to their records.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Purpose of the PAIA manual</h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Provide requesters with access to MerchLab&apos;s records under specific conditions.</li>
                <li>Foster transparency and accountability by making information accessible, allowing individuals and organisations to exercise and protect their rights.</li>
                <li>Implement the Promotion of Access to Information Act, No. 2 of 2000 (PAIA), which enforces the constitutional right to access information.</li>
                <li>Fulfil the requirements of Section 51 of PAIA, which mandates private bodies to compile a manual detailing their records, contact information, and the process for requesting access to those records.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Contact details for access to information</h2>
              <p className="mb-4">
                2.1 The Information Officer of MerchLab (Pty) Ltd is responsible for handling requests for access to records. If necessary, the Information Officer may appoint Deputy Information Officers, as permitted by Section 17 of PAIA and Section 56 of POPIA, to enhance accessibility for record requesters and ensure compliance with the obligations outlined in Section 55 of POPIA. All information requests under this Act must be directed to the Information Officer.
              </p>
              <p className="mb-4">
                2.2 The Information Officer is responsible for: the facilitation of any request for access to information; providing adequate notice and feedback to the requester of the information; determining whether to grant a request for access to a complete/full record or only part of a record; ensuring that access to a record, where so granted, is provided timeously and in the correct format; reviewing the policy for accuracy and communicating any amendments.
              </p>
              <div className="border-l-4 border-blue-500 pl-4 my-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Information Officer</h3>
                <p>Name: Anita Mitchell</p>
                <p>Email: <a href="mailto:anita@merchlab.io" className="text-blue-600 hover:underline">anita@merchlab.io</a></p>
              </div>
              <p className="mb-2">The Deputy Information Officer is responsible for duties delegated by the Information Officer.</p>
              <div className="border-l-4 border-blue-500 pl-4 my-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Deputy Information Officer</h3>
                <p>Name: Cassim Motala</p>
                <p>Email: <a href="mailto:cassim@merchlab.io" className="text-blue-600 hover:underline">cassim@merchlab.io</a></p>
              </div>
              <div className="border-l-4 border-gray-300 pl-4 my-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">MerchLab Head Office</h3>
                <p>16 The Crescent Street</p>
                <p>Unit 4 Rivendell</p>
                <p>Morningside, 2196</p>
                <p className="mt-2">Postal: 16 The Crescent Street, Unit 4 Rivendell, Morningside, 2196</p>
                <p>Phone: +27 76 618 7461</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How to access &apos;The Guide&apos;</h2>
              <p className="mb-4">
                The Information Regulator, in accordance with Section 10(1) of PAIA (as amended), has updated and made available a revised Guide on how to use PAIA. This Guide is designed to be easily understood and accessible to anyone wishing to exercise rights under PAIA and POPIA. It is available in all official languages and in braille.
              </p>
              <p className="mb-4">The Guide contains a description of, inter alia:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>the objects of PAIA and POPIA;</li>
                <li>the postal and street address, phone and fax number and, if available, electronic mail address of every Deputy Information Officer of every private body designated in terms of section 17(1) of PAIA, and section 56 of POPIA;</li>
                <li>the manner and form of a request for access to a record of a private body contemplated in section 50;</li>
                <li>the assistance available from the Information Regulator in terms of PAIA and POPIA;</li>
                <li>all remedies in law available regarding an act or failure to act in respect of a right or duty conferred or imposed by PAIA and POPIA, including the manner of lodging an internal appeal; a complaint to the Information Regulator; an application with a court against a decision by the Information Regulator; and an application with a court against a decision on internal appeal or a decision by the Information Regulator or a decision of the head of a private body;</li>
                <li>the provisions of section 51 of PAIA requiring a private body, respectively, to compile a manual, and how to obtain access to a manual;</li>
                <li>the provisions of section 52 of PAIA providing for the voluntary disclosure of categories of records by a private body;</li>
                <li>the notices issued in terms of section 22 and 54 of PAIA regarding fees to be paid in relation to requests for access; and the regulations made in terms of section 92 of PAIA.</li>
              </ul>
              <p className="mb-4">The Guide can be accessed on the Information Regulator&apos;s website or obtained from the Information Regulator&apos;s offices during normal working hours. Additionally, you can request a copy from MerchLab from the Information Officer.</p>
              <div className="border-l-4 border-gray-300 pl-4 my-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Information Regulator contact details</h3>
                <p>Main Office: Ext 15, Peace St, Westlake, Johannesburg, 1609</p>
                <p>Postal: The Information Regulator (South Africa), JD House 27 Stiemens Street, Braamfontein, Johannesburg, 2001</p>
                <p>Phone: +27 (0) 10 023 5200</p>
                <p>Postal: P.O. Box 31533, Braamfontein, Johannesburg 2017</p>
                <p>Email: <a href="mailto:enquiries@inforegulator.org.za" className="text-blue-600 hover:underline">enquiries@inforegulator.org.za</a></p>
                <p>Website: <a href="https://inforegulator.org.za/media/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://inforegulator.org.za/media/</a></p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Records held by MerchLab in accordance with legislation</h2>
              <p className="mb-4">
                MerchLab holds information in accordance with the following legislation, but is not limited to:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>Basic Conditions of Employment Act 75 of 1997;</li>
                <li>Broad-Based Black Economic Empowerment Act 53 of 2003;</li>
                <li>Companies Act 71 of 2008;</li>
                <li>Compensation for Occupational Injuries and Diseases Act 130 of 1993;</li>
                <li>Electronic Communications and Transaction Act 25 of 2002;</li>
                <li>Employment Equity Act 55 of 1998;</li>
                <li>Income Tax Act 58 of 1962;</li>
                <li>Labour Relations Act 66 of 1995;</li>
                <li>Occupational Health and Safety Act 85 of 1993;</li>
                <li>Pension Funds Act 24 of 1956;</li>
                <li>Skills Development Levies Act 9 of 1999;</li>
                <li>Skills Development Act 9 of 1999;</li>
                <li>Unemployment Insurance Act 63 of 2001; and</li>
                <li>Value Added Tax Act 89 of 1991.</li>
              </ul>
              <p>Records kept under the above legislation may, in some instances, be publicly accessible without the need for a formal PAIA request, provided the information is of a public nature.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. How to request access to records</h2>
              <p className="mb-4">
                The Act grants requesters access to records of a private body if such records are necessary for exercising or protecting their rights. Requests under the Act must follow the prescribed procedures and fees established by the Minister, which are periodically updated. The applicable forms and tariffs are detailed in the Act. The Information Regulator has revised the PAIA Guide, as mandated by Section 10(1) of PAIA, which was originally compiled by the SAHRC. This Guide serves to inform individuals wishing to exercise their rights under PAIA and POPIA, specifically assisting data subjects in accessing their personal information under Section 23 of POPIA.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">5.1 Request for access to a record</h3>
              <p className="mb-4">To request access to a record, complete Form 02 (available via the Information Regulator). Please ensure that the completed form:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>Contains enough information for the Information Officer to identify you, the requested records, and the form of access required.</li>
                <li>Specifies your email address, postal address, or fax number.</li>
                <li>Describes the right you seek to exercise or protect.</li>
                <li>Explains why you need the requested record to exercise or protect that right.</li>
                <li>Indicates any other method by which you would like to be informed of our decision, aside from written communication.</li>
                <li>Provides proof of the capacity in which you are making the request if you are doing so on behalf of someone else (we will determine if this proof is satisfactory).</li>
              </ul>
              <p className="mb-4">If you do not use the standard form, we may: reject the request due to a lack of procedural compliance; refuse it if you do not provide sufficient information; or relay it. We strive to keep all data in our possession secure and up to date.</p>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">5.2 Categories of requestors</h3>
              <p className="mb-4">The capacity under which a requester submits a request for records determines the category they fall into. The following is a non-exhaustive list: a data subject requesting information about themselves; a representative making a request on behalf of one or more data subjects; a third-party requesting information about a data subject; a public body requesting information in the public interest.</p>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">5.3 Prescribed Fees</h3>
              <p className="mb-4">
                When submitting a request for access to information, a request fee is required by law. The prescribed fees are outlined in the Fee Schedule, which can be accessed in the PAIA Guide (Annexure B). If a request is granted and the time required to locate and prepare the record for disclosure exceeds the prescribed hours, an additional access fee may apply. All requests submitted under PAIA will be carefully evaluated. If access to records is approved, the method of access will be determined unless a specific format for receiving the information has been requested. The publication of this manual does not grant any rights to access information records, except as provided under PAIA.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Processing of personal information</h2>
              <p className="mb-4">
                Chapter 3 of POPIA outlines the minimum conditions for the lawful processing of personal information, which may only be deviated from under specific exclusions provided in the Act. MerchLab processes personal information in compliance with POPIA. According to our Privacy Policy, we ensure adherence to all processing conditions at the time personal information is handled. MerchLab processes the personal information of individuals and juristic persons.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">6.1 MerchLab processes personal information for several reasons, including:</h3>
              <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>Conducting business operations.</li>
                <li>Providing requested goods.</li>
                <li>Managing client relationships.</li>
                <li>Resolving disputes.</li>
                <li>Establishing and maintaining supplier relationships.</li>
                <li>Managing contracts, orders, deliveries, invoices, and accounting.</li>
                <li>Sending quotations and invoices.</li>
                <li>Carrying out general human resource and finance functions, including legal obligations.</li>
                <li>Facilitating recruitment.</li>
                <li>Overseeing procurement processes.</li>
                <li>Ensuring safety and security.</li>
                <li>Supporting the proper functioning of our website, including content display, interface personalisation, and security against misuse.</li>
              </ul>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">6.2 Categories of Data Subjects and Types of Personal Information Processed</h3>
              <p className="mb-4">
                MerchLab processes personal information related to various individuals and entities, including employees, clients, service providers, and visitors to its premises. These visitors may include potential clients, job candidates and participants in events such as product launches and VIP customer functions. The types of personal information processed by MerchLab, covering both individuals and legal entities are outlined in the company&apos;s Privacy Policy. Records related to credit (e.g., account applications), product information, terms and conditions, customer details, and account statements are automatically available to MerchLab&apos;s account and Merch Store customers. These records can be accessed without a formal request under PAIA, provided positive identification is presented. Account and Merch Store customers may obtain these records by contacting the Company.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">6.3 Categories of recipients of personal information</h3>
              <p className="mb-2">The following categories of recipients, who have a legitimate need to access and process personal information for operational purposes, may receive personal information:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Registered credit bureaus, the South African Credit and Risk Reporting Association, and organisations representing credit bureaus.</li>
                <li>Regulatory authorities, government bodies, industry ombudsmen, and both local and international tax authorities.</li>
                <li>Law enforcement, fraud prevention agencies and audit bodies.</li>
                <li>Financial institutions and payment processing providers.</li>
                <li>MerchLab employees who are authorised to receive the information.</li>
                <li>South African Qualifications Authority.</li>
                <li>MerchLab subsidiary companies.</li>
                <li>Individuals or entities to whom we cede our rights or delegate authority.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Schedule of records</h2>
              <p className="mb-4">
                The following categories of MerchLab&apos;s records accessible without the need to submit a request under PAIA are categorized as Information in the public domain and include: B-BBEE certificate; Public statements and communications; Product Information; Media Releases. Format: Electronic copy. Availability: email <a href="mailto:hello@merchlab.io" className="text-blue-600 hover:underline">hello@merchlab.io</a> or visit <a href="https://www.merchlab.io" className="text-blue-600 hover:underline">www.merchlab.io</a>.
              </p>
              <p className="mb-4">In accordance with Section 51(1)(e) of PAIA, MerchLab is required to retain certain records under the categories tabled below. Access requests will be assessed on a case-by-case basis in line with the provisions of PAIA.</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Financial Records:</strong> Annual financial statements, Tax Records, Asset Register, Management Accounts, Audit reports, Banking Records, General correspondence.</li>
                <li><strong>Marketing Records / Customer Information:</strong> Product Brochures, Owner Manuals, Field Records, Performance Records, Product Sales Records, Marketing Strategies, Customer Database.</li>
                <li><strong>Statutory Records:</strong> Company registration documents, Shareholder records, Directors&apos; details.</li>
                <li><strong>Employee Records:</strong> Employee contracts and records, Payroll Information, Pension and provident fund records, Health and safety records, Disciplinary Records.</li>
                <li><strong>Operational Records:</strong> Contracts and Agreements, Customer-related Records, Licenses and Permits, Insurance Policies, Internal Policies and Procedures, Codes of Conduct, Disciplinary records, Internal governance policies.</li>
                <li><strong>Environmental and Corporate Social Responsibility Records:</strong> Environmental impact assessments (EIA), Corporate Social Responsibility (CSR) reports.</li>
                <li><strong>Company Records:</strong> Memorandum and Articles of Association, Documents of Incorporation, Necessary certificates in terms of the Companies Act 71 of 2008.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Grounds of refusal of access</h2>
              <p className="mb-4">
                Chapter 4 of the Act provides circumstances under which a request for access to records may/must be refused by MerchLab, which include: mandatory protection of privacy of a third party who is a natural person; mandatory protection of commercial information of a third party; mandatory protection of certain confidential information of a third party; mandatory protection of the safety of data subjects, and protection of property; mandatory protection of records privileged from production in legal proceedings; mandatory protection of research information of a third party, and protection of research information of MerchLab.
              </p>
              <p>
                The requester will be notified in writing whether their request has been approved or denied within 30 calendar days after receipt by MerchLab of the completed Request for Access Form. Should any record of MerchLab requested not be found or not exist, MerchLab will, by way of affidavit, notify the requester that it is not possible to give access to that particular record. All requests for access to information should be made as per the procedure set out in this manual.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Remedies available on refusal of access</h2>
              <p className="mb-4">
                If a request for information is denied by the Deputy Information Officer, the applicant may appeal to the Information Officer by sending an email directly to them. The email should include the reason for the appeal. The decision made by the Information Officer will be final.
              </p>
              <p className="mb-4">
                If a request for information is denied and the requester is dissatisfied with the response, they must seek external remedies. In accordance with PAIA, if the requester or a third party disagrees with the Information Officer&apos;s decision to withhold information, they may apply to a court for relief within 180 days of receiving the decision. Alternatively, the matter may be referred to the Information Regulator (Form 05).
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">9.1 Records that cannot be found or do not exist</h3>
              <p>If MerchLab has taken all reasonable steps to find a record and it is believed that the record either does not exist or cannot be found, the requester will be notified by way of an affidavit or affirmation. This will include the steps that were taken to try to locate the record.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Planned Transborder flows of personal information</h2>
              <p>MerchLab may, at times, transfer personal information outside of South Africa to various countries. However, we will only do so if those countries have privacy laws comparable to South Africa&apos;s or if the recipients can ensure the protection of personal information to the same standard that we uphold.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Third party information</h2>
              <p className="mb-4">
                If access is requested to a record that contains information about a third party, MerchLab is obliged to attempt to contact this third party to inform them of the request as soon as reasonably possible and within 30 days of receiving the request. This enables the third party the opportunity of responding by either consenting to the access or by providing reasons why the access should be denied which must be made in writing to the Information Officer within 30 days of being informed.
              </p>
              <p>Once a third-party has furnished reasons for the granting or denial of access, the Information Officer or their deputy will consider these reasons in determining whether access should be granted, or not, and must do so within 30 days after the third-party/s has been notified, unless a complaint has been lodged. The third-party must be notified of the final decision made.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Data security</h2>
              <p className="mb-4">
                MerchLab implements reasonable, appropriate, and adequate technical and organisational measures to ensure the security of personal information, protecting it against unauthorised or unlawful processing, accidental loss, destruction, damage, alteration, disclosure, or unauthorised access. MerchLab regularly reviews its security controls and processes to maintain the safety of personal information.
              </p>
              <p>However, if there are reasonable grounds to believe that personal information has been accessed or acquired by unauthorised individuals, MerchLab will notify the Regulator and the affected data subject. This notification will not occur if the Regulator or a public body responsible for investigating offenses advises that notifying the data subject would hinder a criminal investigation.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Publication and revision history</h2>
              <p className="mb-4">
                This Manual will be updated regularly in accordance with amended regulations. The latest version is available on the MerchLab website at <a href="https://www.merchlab.io" className="text-blue-600 hover:underline">www.merchlab.io</a>. Alternatively, you can request a copy from the Information Officer using the details in section 2.
              </p>
              <div className="border-l-4 border-gray-300 pl-4">
                <p><strong>Document Name:</strong> PAIA Manual</p>
                <p><strong>Document Number:</strong> ML-PAIA</p>
                <p><strong>Original published date:</strong> 23 January 2026</p>
                <p><strong>Next Revision date:</strong> January 2028</p>
              </div>
            </section>

            <div className="bg-gray-100 border-l-4 border-gray-400 p-4 mt-8">
              <p className="text-sm text-gray-600 italic">
                This Manual is prepared for compliance with the Promotion of Access to Information Act and does not constitute legal advice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
