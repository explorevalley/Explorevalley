import { View, Text, ScrollView, Pressable, TextInput, useWindowDimensions, ActivityIndicator } from "react-native";
import { useState, useEffect, useMemo, useRef } from "react";
import type { Restaurant, MenuItem } from "@explorevalley/shared";
import { apiGet, apiPost, trackEvent } from "../lib/api";
import VendorCard from "../components/food/VendorCard";
import MenuItemCard from "../components/food/MenuItemCard";
import CartSummary from "../components/food/CartSummary";
import DeliveryForm from "../components/food/DeliveryForm";
import { getAuthMode } from "../lib/auth";
import { trackOrder } from "../lib/orders";

type Step = "vendors" | "menu" | "checkout" | "success";

function toTitleCase(input: string) {
  return String(input || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function FoodOrderScreen({
  authMode,
  onRequireAuth
}: {
  authMode?: "authenticated" | "none";
  onRequireAuth?: () => void;
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const gridGap = isMobile ? 14 : 18;
  const screenPadding = isMobile ? 14 : 20;
  const vendorColumns = isMobile ? 1 : width >= 1200 ? 3 : 2;
  const vendorCardWidth = isMobile
    ? "100%"
    : Math.max(220, (width - (screenPadding * 2) - (gridGap * (vendorColumns - 1))) / vendorColumns);

  const [step, setStep] = useState<Step>("vendors");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [meta, setMeta] = useState<any>(null);
  const menuCacheRef = useRef<Record<string, MenuItem[]>>({});
  const menuReqRef = useRef(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPlace, setSelectedPlace] = useState<string>("All");
  const [places, setPlaces] = useState<string[]>(["All"]);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [pendingCheckoutData, setPendingCheckoutData] = useState<{
    userName: string;
    phone: string;
    deliveryAddress: string;
    specialInstructions: string;
  } | null>(null);

  useEffect(() => {
    apiGet<any>("/api/meta").then(setMeta).catch(() => setMeta(null));
    (async () => {
      try {
        const p = await apiGet<string[]>("/api/places");
        if (Array.isArray(p) && p.length) setPlaces(p.map((x) => toTitleCase(String(x))));
      } catch {
        // Keep default places list.
      }
    })();
  }, []);

  useEffect(() => {
    if (step !== "vendors") return;
    loadRestaurants(selectedPlace);
  }, [selectedPlace, step]);

  useEffect(() => {
    if (selectedRestaurant) {
      loadMenu(selectedRestaurant.id);
    }
  }, [selectedRestaurant]);

  async function loadRestaurants(place: string) {
    setLoading(true);
    setError(null);
    try {
      const placeQuery = place && place !== "All" ? place : "All";
      const data = await apiGet<Restaurant[]>(`/api/restaurants?place=${encodeURIComponent(placeQuery)}`);
      setRestaurants(data);
    } catch (e: any) {
      setError(e.message || "Failed to load restaurants");
    } finally {
      setLoading(false);
    }
  }

  async function loadMenu(restaurantId: string) {
    const reqId = ++menuReqRef.current;
    setMenuLoading(true);
    setError(null);
    try {
      const cached = menuCacheRef.current[restaurantId];
      const restaurantMenu = cached ?? await apiGet<MenuItem[]>(`/api/menu-items?restaurantId=${encodeURIComponent(restaurantId)}`);
      if (!cached) menuCacheRef.current[restaurantId] = restaurantMenu;
      // Ignore stale responses if user switched vendors quickly.
      if (reqId !== menuReqRef.current) return;
      setMenuItems(restaurantMenu);
    } catch (e: any) {
      if (reqId !== menuReqRef.current) return;
      setError(e.message || "Failed to load menu");
      setMenuItems([]);
    } finally {
      if (reqId === menuReqRef.current) setMenuLoading(false);
    }
  }

  const handleVendorSelect = (vendor: Restaurant) => {
    setMenuItems([]);
    setMenuLoading(true);
    setSelectedRestaurant(vendor);
    setStep("menu");
    setCart({});
    setSelectedCategory("All");
    setSearchQuery("");
    trackEvent({
      type: "vendor_selected",
      category: "preference",
      meta: {
        preferredVendors: [vendor.name],
        cuisinePreferences: vendor.cuisine || []
      }
    });
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      const item = menuItems.find(m => m.id === itemId);
      const maxOrder = item ? Math.min(item.maxPerOrder ?? 99, item.stock ?? 99) : 99;
      const nextQty = Math.max(0, Math.min(quantity, maxOrder));
      if (nextQty === 0) {
        delete newCart[itemId];
      } else {
        newCart[itemId] = nextQty;
      }
      return newCart;
    });
  };

  const cartItems: CartItem[] = useMemo(() => {
    return Object.entries(cart).map(([id, quantity]) => {
      const item = menuItems.find(m => m.id === id);
      return {
        id,
        name: item?.name || "",
        price: item?.price || 0,
        quantity
      };
    }).filter(item => item.quantity > 0);
  }, [cart, menuItems]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cartItems]);

  const foodCoupons = (meta?.coupons || []).filter((c: any) => c.category === "food" || c.category === "all");
  const foodPolicyText = meta?.policies?.food
    ? `Cancellations within ${meta.policies.food.allowCancelMinutes} min. Fee after ₹${meta.policies.food.feeAfter}.`
    : undefined;

  const categories = useMemo(() => {
    const cats = new Set(menuItems.map(item => item.category));
    return ["All", ...Array.from(cats)];
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    let items = menuItems;

    if (selectedCategory !== "All") {
      items = items.filter(item => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }

    return items;
  }, [menuItems, selectedCategory, searchQuery]);

  const filteredRestaurants = useMemo(() => {
    const place = selectedPlace.trim().toLowerCase();
    let out = restaurants;
    if (place && place !== "all") {
      out = out.filter((r) => {
        const location = String(r.location || "").toLowerCase();
        const zones = Array.isArray(r.deliveryZones) ? r.deliveryZones.map((z) => String(z).toLowerCase()) : [];
        return location.includes(place) || zones.some((z) => z.includes(place));
      });
    }
    if (!searchQuery.trim()) return out;
    const query = searchQuery.toLowerCase();
    return out.filter(r =>
      r.name.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      r.cuisine.some(c => c.toLowerCase().includes(query))
    );
  }, [restaurants, searchQuery, selectedPlace]);

  const placeOrder = async (data: { userName: string; phone: string; deliveryAddress: string; specialInstructions: string }) => {
    const restaurantId = selectedRestaurant?.id || "";
    if (!restaurantId) throw new Error("Please select a restaurant.");

    const payload = {
      restaurantId,
      userId: data.phone,
      phone: data.phone,
      deliveryAddress: data.deliveryAddress,
      specialInstructions: data.specialInstructions,
      items: cartItems.map((item) => ({ menuItemId: item.id, quantity: item.quantity, name: item.name }))
    };

    const result: any = await apiPost("/api/orders", payload);
    const id = String(result?.id || result?.orderId || result?.ok?.id || "");
    trackOrder("food", id || "food_order");
    setOrderId(id || null);
    setStep("success");
  };

  const handleCheckout = async (data: { userName: string; phone: string; deliveryAddress: string; specialInstructions: string }) => {
    trackEvent({
      type: "checkout_started",
      category: "transaction",
      name: data.userName,
      phone: data.phone,
      meta: {
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: cartTotal,
        paymentMethod: "pending"
      }
    });
    trackEvent({
      type: "delivery_address",
      category: "location",
      name: data.userName,
      phone: data.phone,
      meta: {
        savedAddresses: [data.deliveryAddress].filter(Boolean)
      }
    });
    if ((authMode || getAuthMode()) !== "authenticated") {
      setPendingCheckoutData(data);
      onRequireAuth?.();
      throw new Error("Please login with Google to continue.");
    }
    setPendingCheckoutData(null);
    await placeOrder(data);
  };

  useEffect(() => {
    if (!pendingCheckoutData) return;
    if ((authMode || getAuthMode()) !== "authenticated") return;
    placeOrder(pendingCheckoutData)
      .then(() => setPendingCheckoutData(null))
      .catch(() => {
        // Keep pending payload so user can retry without retyping.
      });
  }, [authMode, pendingCheckoutData]);

  const handleBackToVendors = () => {
    setStep("vendors");
    setSelectedRestaurant(null);
    setCart({});
    setSearchQuery("");
  };

  const handleOrderMore = () => {
    setStep("vendors");
    setSelectedRestaurant(null);
    setCart({});
    setOrderId(null);
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedPlace("All");
  };

  if (loading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <ActivityIndicator size="large" color="#f4511e" />
        <Text style={{
          color: "#54607a",
          marginTop: 16,
          fontSize: isMobile ? 14 : 16
        }}>
          Loading restaurants...
        </Text>
      </View>
    );
  }

  if (error && restaurants.length === 0) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      }}>
        <Text style={{
          color: "#ff6b6b",
          fontSize: isMobile ? 16 : 18,
          fontWeight: "700",
          marginBottom: 16,
          textAlign: "center"
        }}>
          {error}
        </Text>
        <Pressable
          onPress={() => loadRestaurants(selectedPlace)}
          style={({ hovered }) => ({
            backgroundColor: hovered ? "#d73f11" : "#f4511e",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8
          })}
        >
          {({ hovered }) => (
            <Text style={{
              color: "#fff",
              fontSize: isMobile ? 14 : 16,
              fontWeight: "700"
            }}>
              Retry
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  if (step === "vendors") {
    return (
        <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <ScrollView style={{ flex: 1 }}>
          <View style={{ padding: isMobile ? 14 : 20, gap: isMobile ? 16 : 20 }}>
            <View style={{ backgroundColor: "#0f1a2d", borderRadius: 18, borderWidth: 1, borderColor: "#1d3258", padding: isMobile ? 14 : 18 }}>
              <Text style={{ color: "#eaf2ff", fontSize: 12, letterSpacing: 1.2, marginBottom: 6 }}>EXPLOREVALLEY FOOD</Text>
              <Text style={{
                color: "#fff",
                fontSize: isMobile ? 22 : 28,
                fontWeight: "800",
                marginBottom: isMobile ? 8 : 12
              }}>
                Premium Food Ordering
              </Text>
              <Text style={{
                color: "#9db0d6",
                fontSize: isMobile ? 13 : 15
              }}>
                Curated restaurants, fast delivery, and clear pricing.
              </Text>
            </View>

            <View style={{ gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe3ef", borderRadius: 16, padding: isMobile ? 12 : 14 }}>
              <Text style={{ color: "#5f6b81", fontSize: isMobile ? 13 : 14, fontWeight: "700" }}>
                Select Place
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {places.map((place) => {
                  const active = selectedPlace === place;
                  return (
                    <Pressable
                      key={place}
                      onPress={() => setSelectedPlace(place)}
                      style={{
                        backgroundColor: active ? "#f4511e" : "#f7f9fc",
                        borderWidth: 1,
                        borderColor: active ? "#f4511e" : "#d5deeb",
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 9
                      }}
                    >
                      <Text style={{ color: active ? "#fff" : "#334155", fontWeight: "700" }}>{place}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search restaurants..."
              placeholderTextColor="#96a0b2"
              style={{
                backgroundColor: "#fff",
                color: "#111827",
                paddingHorizontal: 14,
                paddingVertical: isMobile ? 12 : 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#d5deeb",
                fontSize: isMobile ? 14 : 16
              }}
            />

            {!selectedPlace ? (
              <View style={{
                padding: 40,
                alignItems: "center"
              }}>
                <Text style={{
                  color: "#7b8798",
                  fontSize: isMobile ? 14 : 16,
                  textAlign: "center"
                }}>
                  Select Jibhi or Tandi to view restaurants.
                </Text>
              </View>
            ) : filteredRestaurants.length === 0 ? (
              <View style={{
                padding: 40,
                alignItems: "center"
              }}>
                <Text style={{
                  color: "#7b8798",
                  fontSize: isMobile ? 14 : 16,
                  textAlign: "center"
                }}>
                  No restaurants found for {selectedPlace}
                </Text>
              </View>
            ) : (
              <View style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: gridGap
              }}>
                {filteredRestaurants.map(restaurant => (
                  <View
                    key={restaurant.id}
                    style={{
                      width: vendorCardWidth
                    }}
                  >
                    <VendorCard
                      vendor={restaurant}
                      onPress={handleVendorSelect}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (step === "menu") {
    return (
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <View style={{
          backgroundColor: "#ffffff",
          borderBottomWidth: 1,
          borderBottomColor: "#dce3ef",
          padding: isMobile ? 14 : 18,
          gap: isMobile ? 12 : 14
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              onPress={handleBackToVendors}
              style={({ hovered }) => ({
                backgroundColor: hovered ? "#e9eef6" : "#f4f7fb",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#d7dfec"
              })}
            >
              <Text style={{ color: "#374151", fontSize: isMobile ? 16 : 18 }}>←</Text>
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={{
                color: "#111827",
                fontSize: isMobile ? 18 : 20,
                fontWeight: "700"
              }}>
                {selectedRestaurant?.name}
              </Text>
              <Text style={{
                color: "#6b7280",
                fontSize: isMobile ? 12 : 13
              }}>
                ⭐ {selectedRestaurant?.rating} • {selectedRestaurant?.deliveryTime}
              </Text>
              {selectedRestaurant?.deliveryZones?.length ? (
                <Text style={{ color: "#7c8698", fontSize: 11, marginTop: 4 }}>
                  Zones: {selectedRestaurant.deliveryZones.join(", ")}
                </Text>
              ) : null}
              {selectedRestaurant?.openHours && selectedRestaurant?.closingHours ? (
                <Text style={{ color: "#7c8698", fontSize: 11, marginTop: 2 }}>
                  Hours: {selectedRestaurant.openHours}–{selectedRestaurant.closingHours}
                </Text>
              ) : null}
            </View>
          </View>

          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search menu items..."
            placeholderTextColor="#96a0b2"
            style={{
              backgroundColor: "#fff",
              color: "#111827",
              paddingHorizontal: 14,
              paddingVertical: isMobile ? 10 : 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#d5deeb",
              fontSize: isMobile ? 14 : 16
            }}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {categories.map(category => (
                <Pressable
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={{
                    backgroundColor: selectedCategory === category ? "#f4511e" : "#f7f9fc",
                    paddingHorizontal: isMobile ? 14 : 16,
                    paddingVertical: isMobile ? 8 : 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: selectedCategory === category ? "#f4511e" : "#d5deeb"
                  }}
                >
                  <Text style={{
                    color: selectedCategory === category ? "#fff" : "#334155",
                    fontSize: isMobile ? 13 : 14,
                    fontWeight: "700"
                  }}>
                    {toTitleCase(category)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <ScrollView style={{ flex: 1 }}>
          <View style={{
            padding: isMobile ? 14 : 20,
            gap: isMobile ? 12 : 14,
            paddingBottom: 100
          }}>
            {menuLoading ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#f4511e" />
                <Text style={{ color: "#777", marginTop: 10, fontSize: isMobile ? 13 : 14 }}>
                  Loading menu...
                </Text>
              </View>
            ) : filteredMenuItems.length === 0 ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <Text style={{
                  color: "#666",
                  fontSize: isMobile ? 14 : 16,
                  textAlign: "center"
                }}>
                  No items found
                </Text>
              </View>
            ) : (
              filteredMenuItems.map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  quantity={cart[item.id] || 0}
                  onQuantityChange={handleQuantityChange}
                />
              ))
            )}
          </View>
        </ScrollView>

        <CartSummary
          items={cartItems}
          onCheckout={() => setStep("checkout")}
        />
      </View>
    );
  }

  if (step === "checkout") {
    return (
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <ScrollView style={{ flex: 1 }}>
          <View style={{ padding: isMobile ? 14 : 20, gap: isMobile ? 20 : 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Pressable
              onPress={() => setStep("menu")}
              style={({ hovered }) => ({
                backgroundColor: hovered ? "#e9eef6" : "#f4f7fb",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#d7dfec"
              })}
            >
              <Text style={{ color: "#374151", fontSize: isMobile ? 16 : 18 }}>←</Text>
            </Pressable>

            <Text style={{
              color: "#111827",
              fontSize: isMobile ? 20 : 24,
              fontWeight: "800"
            }}>
                Checkout
              </Text>
            </View>

            <View style={{
              backgroundColor: "#ffffff",
              padding: isMobile ? 14 : 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#d5deeb",
              gap: isMobile ? 10 : 12
            }}>
              <Text style={{
                color: "#111827",
                fontSize: isMobile ? 16 : 18,
                fontWeight: "700"
              }}>
                Your Order from {selectedRestaurant?.name}
              </Text>

              {cartItems.map(item => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 8
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#111827", fontSize: isMobile ? 14 : 15 }}>
                      {item.name} × {item.quantity}
                    </Text>
                  </View>
                  <Text style={{
                    color: "#f4511e",
                    fontSize: isMobile ? 14 : 15,
                    fontWeight: "700"
                  }}>
                    ₹{(item.price * item.quantity).toFixed(0)}
                  </Text>
                </View>
              ))}
            </View>

            <DeliveryForm
              onSubmit={handleCheckout}
              cartTotal={cartTotal}
              minimumOrder={selectedRestaurant?.minimumOrder}
              coupons={foodCoupons}
              policyText={foodPolicyText}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (step === "success") {
    return (
      <View style={{
        flex: 1,
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      }}>
        <View style={{
          width: isMobile ? 80 : 100,
          height: isMobile ? 80 : 100,
          borderRadius: (isMobile ? 80 : 100) / 2,
          backgroundColor: "#d7f6de",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24
        }}>
          <Text style={{ fontSize: isMobile ? 40 : 50 }}>✓</Text>
        </View>

        <Text style={{
          color: "#111827",
          fontSize: isMobile ? 22 : 28,
          fontWeight: "800",
          marginBottom: 12,
          textAlign: "center"
        }}>
          Order Placed Successfully!
        </Text>

        <Text style={{
          color: "#667085",
          fontSize: isMobile ? 14 : 16,
          textAlign: "center",
          marginBottom: 8
        }}>
          Your order has been confirmed
        </Text>

        <View style={{
          backgroundColor: "#ffffff",
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#d5deeb",
          marginBottom: 32
        }}>
          <Text style={{
            color: "#f4511e",
            fontSize: isMobile ? 16 : 18,
            fontWeight: "700"
          }}>
            Order ID: {orderId}
          </Text>
        </View>

        <Text style={{
          color: "#54607a",
          fontSize: isMobile ? 13 : 15,
          textAlign: "center",
          marginBottom: 32
        }}>
          Estimated delivery: {selectedRestaurant?.deliveryTime}
        </Text>

        <Pressable
          onPress={handleOrderMore}
          style={({ pressed, hovered }) => [
            {
              backgroundColor: hovered ? "#d73f11" : "#f4511e",
              paddingHorizontal: isMobile ? 28 : 36,
              paddingVertical: isMobile ? 14 : 16,
              borderRadius: 14,
              transform: [{ scale: pressed ? 0.98 : 1 }]
            }
          ]}
        >
          {({ hovered }) => (
            <Text style={{
              color: "#fff",
              fontSize: isMobile ? 16 : 18,
              fontWeight: "800"
            }}>
              Order More Food
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  return null;
}
