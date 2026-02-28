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
import { ds, foodOrderScreenColors, styles } from "../styles/FoodOrderScreen.styles";
import { foodOrderScreenData as t } from "../staticData/foodOrderScreen.staticData";

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

  const [step, setStep] = useState<Step>(t.steps.vendors as Step);
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
  const [selectedCategory, setSelectedCategory] = useState(t.defaults.all);
  const [selectedPlace, setSelectedPlace] = useState<string>(t.defaults.all);
  const [places, setPlaces] = useState<string[]>(t.defaults.places);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [pendingCheckoutData, setPendingCheckoutData] = useState<{
    userName: string;
    phone: string;
    deliveryAddress: string;
    specialInstructions: string;
  } | null>(null);

  useEffect(() => {
    apiGet<any>(t.api.meta).then(setMeta).catch(() => setMeta(null));
    (async () => {
      try {
        const p = await apiGet<string[]>(t.api.places);
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
      const placeQuery = place && place !== t.defaults.all ? place : t.defaults.all;
      const data = await apiGet<Restaurant[]>(t.api.restaurants(placeQuery));
      setRestaurants(data);
    } catch (e: any) {
      setError(e.message || t.errors.loadRestaurants);
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
      const restaurantMenu = cached ?? await apiGet<MenuItem[]>(t.api.menuItems(restaurantId));
      if (!cached) menuCacheRef.current[restaurantId] = restaurantMenu;
      // Ignore stale responses if user switched vendors quickly.
      if (reqId !== menuReqRef.current) return;
      setMenuItems(restaurantMenu);
    } catch (e: any) {
      if (reqId !== menuReqRef.current) return;
      setError(e.message || t.errors.loadMenu);
      setMenuItems([]);
    } finally {
      if (reqId === menuReqRef.current) setMenuLoading(false);
    }
  }

  const handleVendorSelect = (vendor: Restaurant) => {
    setMenuItems([]);
    setMenuLoading(true);
    setSelectedRestaurant(vendor);
    setStep(t.steps.menu as Step);
    setCart({});
    setSelectedCategory(t.defaults.all);
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
    ? t.policy.cancellation(meta.policies.food.allowCancelMinutes, meta.policies.food.feeAfter)
    : undefined;

  const categories = useMemo(() => {
    const cats = new Set(menuItems.map(item => item.category));
    return [t.defaults.all, ...Array.from(cats)];
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    let items = menuItems;

      if (selectedCategory !== t.defaults.all) {
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
    if (place && place !== t.defaults.all.toLowerCase()) {
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
    if (!restaurantId) throw new Error(t.errors.selectRestaurant);

    const payload = {
      restaurantId,
      userId: data.phone,
      phone: data.phone,
      deliveryAddress: data.deliveryAddress,
      specialInstructions: data.specialInstructions,
      items: cartItems.map((item) => ({ menuItemId: item.id, quantity: item.quantity, name: item.name }))
    };

    const result: any = await apiPost(t.api.orders, payload);
    const id = String(result?.id || result?.orderId || result?.ok?.id || "");
    trackOrder("food", id || "food_order");
    setOrderId(id || null);
    setStep(t.steps.success as Step);
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
      throw new Error(t.errors.loginRequired);
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
    setStep(t.steps.vendors as Step);
    setSelectedRestaurant(null);
    setCart({});
    setSearchQuery("");
  };

  const handleOrderMore = () => {
    setStep(t.steps.vendors as Step);
    setSelectedRestaurant(null);
    setCart({});
    setOrderId(null);
    setSearchQuery("");
    setSelectedCategory(t.defaults.all);
    setSelectedPlace(t.defaults.all);
  };

  if (loading) {
    return (
      <View style={styles.flexTransparent}>
        <ActivityIndicator size="large" color={foodOrderScreenColors.spinner} />
        <Text style={ds.loadingText(isMobile)}>
          {t.loading.restaurants}
        </Text>
      </View>
    );
  }

  if (error && restaurants.length === 0) {
    return (
      <View style={styles.centerWrapPadded}>
        <Text style={ds.errorText(isMobile)}>
          {error}
        </Text>
        <Pressable
          onPress={() => loadRestaurants(selectedPlace)}
          style={({ hovered }) => ds.retryBtn(hovered)}
        >
          {() => (
            <Text style={ds.retryText(isMobile)}>
              {t.actions.retry}
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  if (step === t.steps.vendors) {
    return (
        <View style={styles.flexTransparent}>
        <ScrollView style={styles.flexOnly}>
          <View style={ds.sectionPad(isMobile, true)}>
            <View style={ds.heroCard(isMobile)}>
              <Text style={styles.vendorsKicker}>{t.hero.kicker}</Text>
              <Text style={ds.heroTitle(isMobile)}>
                {t.hero.title}
              </Text>
              <Text style={ds.heroSub(isMobile)}>
                {t.hero.subtitle}
              </Text>
            </View>

            <View style={ds.placeCard(isMobile)}>
              <Text style={ds.placeTitle(isMobile)}>
                {t.place.title}
              </Text>
              <View style={styles.rowWrap}>
                {places.map((place) => {
                  const active = selectedPlace === place;
                  return (
                    <Pressable
                      key={place}
                      onPress={() => setSelectedPlace(place)}
                      style={ds.placePill(active)}
                    >
                      <Text style={ds.placePillText(active)}>{place}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t.search.restaurants}
              placeholderTextColor={foodOrderScreenColors.placeholder}
              style={ds.searchInput(isMobile)}
            />

            {!selectedPlace ? (
              <View style={styles.emptyStatePad}>
                <Text style={ds.emptyStateText(isMobile)}>
                  {t.place.emptySelect}
                </Text>
              </View>
            ) : filteredRestaurants.length === 0 ? (
              <View style={styles.emptyStatePad}>
                <Text style={ds.emptyStateText(isMobile)}>
                  {t.place.emptyForPlace(selectedPlace)}
                </Text>
              </View>
            ) : (
              <View style={ds.vendorGrid(gridGap)}>
                {filteredRestaurants.map(restaurant => (
                  <View
                    key={restaurant.id}
                    style={ds.vendorWidth(vendorCardWidth)}
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

  if (step === t.steps.menu) {
    return (
      <View style={styles.flexTransparent}>
        <View style={ds.menuHeader(isMobile)}>
          <View style={styles.rowCenterGap12}>
            <Pressable
              onPress={handleBackToVendors}
              style={({ hovered }) => ds.backBtn(hovered)}
            >
              <Text style={ds.backArrowText(isMobile)}>{t.menu.backArrow}</Text>
            </Pressable>

            <View style={styles.flexOnly}>
              <Text style={ds.menuTitle(isMobile)}>
                {selectedRestaurant?.name}
              </Text>
              <Text style={ds.menuSub(isMobile)}>
                {t.menu.ratingStar} {selectedRestaurant?.rating} • {selectedRestaurant?.deliveryTime}
              </Text>
              {selectedRestaurant?.deliveryZones?.length ? (
                <Text style={styles.smallMetaText}>
                  {t.menu.zonesLabel} {selectedRestaurant.deliveryZones.join(", ")}
                </Text>
              ) : null}
              {selectedRestaurant?.openHours && selectedRestaurant?.closingHours ? (
                <Text style={styles.smallMetaTextTight}>
                  {t.menu.hoursLabel} {selectedRestaurant.openHours}–{selectedRestaurant.closingHours}
                </Text>
              ) : null}
            </View>
          </View>

          <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t.search.menu}
              placeholderTextColor={foodOrderScreenColors.placeholder}
              style={ds.searchInput(isMobile, true)}
            />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.menuCategoriesRow}>
              {categories.map(category => (
                <Pressable
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={ds.categoryPill(isMobile, selectedCategory === category)}
                >
                  <Text style={ds.categoryText(isMobile, selectedCategory === category)}>
                    {toTitleCase(category)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <ScrollView style={styles.flexOnly}>
          <View style={ds.menuListPad(isMobile)}>
            {menuLoading ? (
              <View style={styles.emptyStatePad}>
                <ActivityIndicator size="small" color={foodOrderScreenColors.spinner} />
                <Text style={ds.emptyMenuTextWithMargin(isMobile)}>
                  {t.menu.loading}
                </Text>
              </View>
            ) : filteredMenuItems.length === 0 ? (
              <View style={styles.emptyStatePad}>
                <Text style={ds.emptyMenuText(isMobile)}>
                  {t.menu.empty}
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
          onCheckout={() => setStep(t.steps.checkout as Step)}
        />
      </View>
    );
  }

  if (step === t.steps.checkout) {
    return (
      <View style={styles.flexTransparent}>
        <ScrollView style={styles.flexOnly}>
          <View style={ds.sectionPad(isMobile)}>
            <View style={styles.rowCenterGap12}>
              <Pressable
              onPress={() => setStep(t.steps.menu as Step)}
              style={({ hovered }) => ds.backBtn(hovered)}
            >
              <Text style={ds.backArrowText(isMobile)}>{t.menu.backArrow}</Text>
            </Pressable>

            <Text style={ds.checkoutTitle(isMobile)}>
                {t.checkout.title}
              </Text>
            </View>

            <View style={ds.orderCard(isMobile)}>
              <Text style={ds.orderCardTitle(isMobile)}>
                {t.checkout.orderFrom(selectedRestaurant?.name)}
              </Text>

              {cartItems.map(item => (
                <View
                  key={item.id}
                  style={styles.orderItemRow}
                >
                  <View style={styles.flexOnly}>
                    <Text style={ds.orderItemName(isMobile)}>
                      {item.name} {t.currency.multiply} {item.quantity}
                    </Text>
                  </View>
                  <Text style={ds.orderItemPrice(isMobile)}>
                    {t.currency.inr}{(item.price * item.quantity).toFixed(0)}
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

  if (step === t.steps.success) {
    return (
      <View style={styles.centerWrapPadded}>
        <View style={ds.successIconWrap(isMobile)}>
          <Text style={ds.successIconText(isMobile)}>{t.success.icon}</Text>
        </View>

        <Text style={ds.successTitle(isMobile)}>
          {t.success.title}
        </Text>

        <Text style={ds.successSubtitle(isMobile)}>
          {t.success.subtitle}
        </Text>

        <View style={styles.successOrderIdWrap}>
          <Text style={ds.successOrderIdText(isMobile)}>
            {t.success.orderIdLabel} {orderId}
          </Text>
        </View>

        <Text style={ds.successEta(isMobile)}>
          {t.success.etaLabel} {selectedRestaurant?.deliveryTime}
        </Text>

        <Pressable
          onPress={handleOrderMore}
          style={({ pressed, hovered }) => ds.orderMoreBtn(isMobile, hovered, pressed)}
        >
          {() => (
            <Text style={ds.orderMoreText(isMobile)}>
              {t.success.orderMore}
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  return null;
}
