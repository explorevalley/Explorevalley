export const deliveryFormData = {
  sectionTitle: "Delivery Details",
  fields: {
    nameLabel: "Name *",
    namePlaceholder: "Enter your name",
    phoneLabel: "Phone *",
    phonePlaceholder: "10-digit mobile number",
    addressLabel: "Delivery Address *",
    addressPlaceholder: "Enter complete delivery address",
    instructionsLabel: "Special Instructions (Optional)",
    instructionsPlaceholder: "E.g., Extra spicy, no onions, etc.",
  },
  priceBreakdown: {
    title: "Price Breakdown",
    subtotal: "Subtotal",
    gst: "GST (5%)",
    total: "Total",
    addMorePrefix: "Add",
    addMoreSuffix: "more to meet minimum order",
  },
  offersTitle: "Offers & Policy",
  coupon: {
    separator: "\u00b7",
    offSuffix: "off",
    minPrefix: "Min",
  },
  errors: {
    nameRequired: "Please enter your name",
    phoneInvalid: "Please enter a valid 10-digit phone number",
    addressInvalid: "Please enter a valid delivery address",
    failedSubmit: "Failed to place order",
    minOrder: (amount: number) => `Minimum order amount is \u20b9${amount}`,
  },
  submit: {
    placing: "Placing Order...",
    place: "Place Order",
  },
};
