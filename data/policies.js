import { businessSettings } from "@/data/businessSettings";

export const policyLastUpdated = "July 19, 2026";

export const policyContact = {
  businessName: businessSettings.name,
  address: businessSettings.address || "[BUSINESS ADDRESS TO BE CONFIRMED]",
  supportEmail: businessSettings.supportEmail,
  phoneNumber: "+91 7435984499",
  jurisdiction: "Navsari, Gujarat, India"
};

const contactLine = `For help, contact ${policyContact.businessName} at ${policyContact.supportEmail} or ${policyContact.phoneNumber}.`;

export const policyLinks = [
  { title: "Terms & Conditions", href: "/terms-and-conditions" },
  { title: "Privacy Policy", href: "/privacy-policy" },
  { title: "Shipping Policy", href: "/shipping-policy" },
  { title: "Return & Refund Policy", href: "/return-refund-policy" },
  { title: "Cancellation Policy", href: "/cancellation-policy" },
  { title: "Contact Us", href: "/contact-us" }
];

export const policies = {
  terms: {
    title: "Terms & Conditions",
    description: "Read the terms that apply when browsing, ordering from, or creating an account with Karari Beauty.",
    sections: [
      {
        heading: "About Karari Beauty",
        body: [
          `${policyContact.businessName} offers boutique gifts, jewellery, cosmetics and festive collections from Vansda.`,
          `Business address: ${policyContact.address}.`
        ]
      },
      {
        heading: "Acceptance Of Terms",
        body: [
          "By using this website, creating an account, placing an order request, or completing a payment, you agree to these terms and the related policies linked on this page."
        ]
      },
      {
        heading: "Eligibility And Account Responsibilities",
        body: [
          "You must provide accurate contact, billing and delivery details when using the website.",
          "You are responsible for keeping your account access private and for informing us if you suspect unauthorized activity."
        ]
      },
      {
        heading: "Products, Images And Availability",
        body: [
          "Product details, images, prices and availability are provided as accurately as possible, but minor colour, finish, packaging and size variations may occur.",
          "Some festive, jewellery, beauty and gifting items may be available in limited quantities. An order is accepted only after Karari Beauty confirms availability and payment, where applicable."
        ]
      },
      {
        heading: "Pricing, Taxes And Payments",
        body: [
          "Prices may change without prior notice. Taxes, delivery charges or other applicable charges are displayed during checkout before payment wherever they apply.",
          "Online payments are processed by the payment gateway. Karari Beauty does not ask customers to share card PINs, OTPs or banking passwords."
        ]
      },
      {
        heading: "Orders And Order Acceptance",
        body: [
          "Submitting an order request does not guarantee acceptance. Karari Beauty may confirm, reject or cancel an order based on stock, serviceability, pricing, payment status or customer information.",
          "For pay-after-confirmation orders, Karari Beauty will confirm availability, delivery charges and payment details before the customer completes payment."
        ]
      },
      {
        heading: "Cancellation, Shipping, Returns And Refunds",
        body: [
          "Cancellation requests are handled under the Cancellation Policy.",
          "Shipping timelines and charges are handled under the Shipping Policy.",
          "Returns, exchanges and refunds are handled under the Return & Refund Policy."
        ]
      },
      {
        heading: "Product Care And Hygiene Restrictions",
        body: [
          "For hygiene and safety reasons, used cosmetics, beauty products, worn fashion items, personalized products, customized jewellery, damaged products caused by customer handling and final-sale items may not be eligible for return unless defective or incorrectly delivered."
        ]
      },
      {
        heading: "Website Use And Intellectual Property",
        body: [
          "Website content, product images, branding, text and layout are owned by or licensed to Karari Beauty and may not be copied or misused.",
          "Customers must not use the website for fraudulent activity, abuse, unauthorized access, scraping, spamming or unlawful purposes."
        ]
      },
      {
        heading: "Limitation Of Liability And Force Majeure",
        body: [
          "Karari Beauty is not responsible for delays or failures caused by events outside reasonable control, including courier disruption, natural events, payment gateway downtime, customs delays or government restrictions.",
          "Nothing in these terms limits customer rights that cannot be excluded under applicable law."
        ]
      },
      {
        heading: "Governing Law And Jurisdiction",
        body: [
          "These terms shall be governed by the laws of India. Subject to applicable consumer protection laws, the courts located in Navsari, Gujarat shall have jurisdiction over disputes connected with Karari Beauty."
        ]
      },
      { heading: "Contact", body: [contactLine] }
    ]
  },
  privacy: {
    title: "Privacy Policy",
    description: "Learn how Karari Beauty collects, uses and protects customer information.",
    sections: [
      {
        heading: "Information We Collect",
        body: [
          "We may collect your name, email address, phone number, delivery address, account details, order details, payment-related status, customer support messages and website usage information.",
          "Payment card, UPI or banking details are processed by the payment gateway. Karari Beauty should not directly store full card details unless a future approved system specifically requires it."
        ]
      },
      {
        heading: "How We Use Information",
        body: [
          "We use customer information to process orders, arrange delivery, provide customer support, manage accounts, prevent fraud, improve the website and share important order updates."
        ]
      },
      {
        heading: "Cookies And Analytics",
        body: [
          "The website may use cookies or similar technologies to improve browsing, remember preferences, support checkout and understand website performance."
        ]
      },
      {
        heading: "Service Providers",
        body: [
          "We may share necessary information with trusted service providers such as delivery partners, payment gateways, hosting providers and support tools only for business purposes."
        ]
      },
      {
        heading: "Data Retention And Security",
        body: [
          "We keep customer information only as long as needed for order, legal, support, accounting or security purposes.",
          "We use reasonable security measures, but no website or online transfer can be guaranteed to be completely secure."
        ]
      },
      {
        heading: "Customer Choices",
        body: [
          "Customers may request correction, account deletion or information about their account by contacting support. Some information may need to be retained where required for order records, legal compliance or dispute handling."
        ]
      },
      {
        heading: "Children's Privacy",
        body: [
          "The website is intended for customers who can lawfully make purchases or use it with appropriate parental or guardian involvement."
        ]
      },
      {
        heading: "Policy Updates",
        body: [
          "We may update this policy when business processes, legal requirements or website features change. The latest version will be posted on this page."
        ]
      },
      { heading: "Contact", body: [contactLine] }
    ]
  },
  shipping: {
    title: "Shipping Policy",
    description: "Review estimated processing, delivery timelines and shipping fee rules for Karari Beauty orders.",
    sections: [
      {
        heading: "Serviceable Locations",
        body: [
          "Karari Beauty accepts orders based on product availability, destination serviceability and courier availability.",
          "International orders may be handled as inquiries or confirmed orders depending on destination, product type and courier conditions."
        ]
      },
      {
        heading: "Processing And Delivery Estimates",
        body: [
          "Within Gujarat: orders are generally processed and delivered within 2-3 business days, depending on product availability and delivery location.",
          "Outside Gujarat, within India: orders may take approximately 4-5 business days, depending on the destination, courier availability and order type.",
          "International orders: orders may take approximately 10-15 business days depending on the destination, order type, customs clearance and international courier conditions.",
          "These are estimated timelines and are not guaranteed delivery dates."
        ]
      },
      {
        heading: "Shipping Fees",
        body: [
          "Shipping fees are applicable and must be displayed to the customer at checkout before payment.",
          "Karari Beauty does not currently publish a flat shipping charge or free-shipping threshold unless it is shown during checkout."
        ]
      },
      {
        heading: "Tracking, Delays And Delivery Attempts",
        body: [
          "Tracking details may be shared when available from the courier partner.",
          "Delivery may be delayed due to stock checks, festive rush, courier limitations, incorrect address, weather, local restrictions or other conditions outside Karari Beauty's control.",
          "Customers must provide accurate address and contact details. Failed delivery attempts or incorrect information may cause delays or extra charges."
        ]
      },
      {
        heading: "Damaged Packages",
        body: [
          "If a package appears damaged at delivery, contact Karari Beauty as soon as possible with order details and clear photos or video so the issue can be reviewed."
        ]
      },
      {
        heading: "International Charges",
        body: [
          "For international orders, customs duties, import taxes or local charges may be payable separately by the customer where applicable."
        ]
      },
      { heading: "Contact", body: [contactLine] }
    ]
  },
  returns: {
    title: "Return & Refund Policy",
    description: "Understand return eligibility, exchange handling and refund timelines for Karari Beauty orders.",
    sections: [
      {
        heading: "Return Request Window",
        body: [
          "Customers must raise a return request within 4 calendar days of delivery."
        ]
      },
      {
        heading: "Return Eligibility",
        body: [
          "Eligible products must be unused, undamaged, complete and returned with original packaging, tags, labels, accessories and invoice or order details where applicable.",
          "Returns may be reviewed before approval. Karari Beauty may request photos, videos or additional details to verify the issue."
        ]
      },
      {
        heading: "Damaged, Defective Or Incorrect Items",
        body: [
          "If you receive a damaged, defective or incorrect item, contact support within the return request window with order details and clear photos or video."
        ]
      },
      {
        heading: "Non-Returnable Items",
        body: [
          "Used products, opened or used hygiene-sensitive beauty products, personalized products, customized jewellery, final-sale products and products damaged by customer handling may not be eligible for return unless defective or incorrectly delivered."
        ]
      },
      {
        heading: "Exchange Process",
        body: [
          "Approved exchanges depend on product availability. If the requested replacement is unavailable, Karari Beauty may offer another suitable resolution."
        ]
      },
      {
        heading: "Refund Processing",
        body: [
          "Approved refunds will be initiated within 3-4 business days.",
          "The final time for the amount to appear may depend on the customer's bank or payment provider.",
          "Shipping charges, customs duties, import taxes or local charges may be non-refundable unless required by applicable law or specifically approved by Karari Beauty."
        ]
      },
      { heading: "Contact", body: [contactLine] }
    ]
  },
  cancellation: {
    title: "Cancellation Policy",
    description: "Read when customers can request cancellation and when Karari Beauty may cancel an order.",
    sections: [
      {
        heading: "Customer Cancellation",
        body: [
          "Customers may request cancellation only before the order has been confirmed, packed or dispatched.",
          "Once the order is packed or dispatched, cancellation may not be possible."
        ]
      },
      {
        heading: "Prepaid Orders And COD Orders",
        body: [
          "For prepaid orders approved for cancellation, refund handling follows the Return & Refund Policy.",
          "Cash on Delivery order cancellation requests must be made before confirmation, packing or dispatch."
        ]
      },
      {
        heading: "Seller Cancellation",
        body: [
          "Karari Beauty may cancel an order because of stock unavailability, incorrect pricing, incomplete customer information, failed payment, suspected fraudulent activity or serviceability limitations."
        ]
      },
      {
        heading: "How To Request Cancellation",
        body: [
          `Contact ${policyContact.supportEmail} or ${policyContact.phoneNumber} with your order details as early as possible.`
        ]
      }
    ]
  },
  contact: {
    title: "Contact Us",
    description: "Get support for Karari Beauty orders, products, delivery and account questions.",
    sections: [
      {
        heading: "Customer Support",
        body: [
          `Email: ${policyContact.supportEmail}`,
          `Customer care: ${policyContact.phoneNumber}`,
          `Business address: ${policyContact.address}`
        ]
      },
      {
        heading: "Support Topics",
        body: [
          "You can contact us for product questions, order support, shipping updates, return requests, cancellation requests and payment-related order support."
        ]
      },
      {
        heading: "Business Jurisdiction",
        body: [
          `Karari Beauty operates from ${policyContact.jurisdiction}.`
        ]
      }
    ]
  }
};
