export const menuItemCardData = {
  noImage: "No Image",
  outOfStock: "OUT OF STOCK",
  stockLabel: "Stock",
  maxLabel: "Max",
  joiner: "\u00b7",
  addonPrefix: "+",
  currency: "\u20b9",
  formatPrice: (value: number | string) => `\u20b9${value}`,
  formatVariant: (name: string, price: number | string) => `${name} \u00b7 \u20b9${price}`,
  formatAddon: (name: string, price: number | string) => `+ ${name} \u00b7 \u20b9${price}`,
  formatStock: (stock: number | string, max: number | string) => `Stock: ${stock} \u00b7 Max ${max}`,
};
