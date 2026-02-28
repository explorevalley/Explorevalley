import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Animated,
  Keyboard,
} from "react-native";
import { apiPost } from "../lib/api";
import { getAuthMode, getAuthUser } from "../lib/auth";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: number;
};

type WidgetState = "closed" | "mini" | "full";

export default function AIChatWidget({
  onRequireAuth,
}: {
  onRequireAuth?: () => void;
}) {
  const { width: winW, height: winH } = useWindowDimensions();
  const isMobile = winW < 768;
  const scrollRef = useRef<ScrollView>(null);

  const [state, setState] = useState<WidgetState>("closed");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I'm your Fest AI assistant.\n\n• Browse menus and order food\n• Tour and hotel recommendations\n• Order tracking and refunds\n\nJust type naturally!",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse the FAB when there are unread messages
  const doPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 200, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  }, [pulseAnim]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const authMode = getAuthMode();
    if (authMode !== "authenticated") {
      onRequireAuth?.();
      return;
    }

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const user = getAuthUser();
      const res = await apiPost<{ reply: string; intent?: string; escalated?: boolean }>(
        "/api/ai/chat",
        {
          message: text,
          sessionId: `session_${user?.phone || user?.email || "anon"}`,
        }
      );
      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        text: res.reply || "I couldn't process that. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      if (res.escalated) {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys_${Date.now()}`,
            role: "system",
            text: "🔔 Your request has been escalated to our support team. They'll reach out shortly.",
            timestamp: Date.now(),
          },
        ]);
      }

      // If widget is closed, bump unread count
      if (state === "closed") {
        setUnread((n) => n + 1);
        doPulse();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "system",
          text: `⚠️ ${err.message || "Something went wrong. Please try again."}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, sending, onRequireAuth, state, doPulse]);

  const open = (s: WidgetState) => {
    setState(s);
    if (s !== "closed") setUnread(0);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 150);
  };

  /* ── Dimensions ── */
  const MINI_W = isMobile ? winW - 24 : 380;
  const MINI_H = isMobile ? winH * 0.55 : 520;
  const FULL_W = isMobile ? winW : Math.min(700, winW - 40);
  const FULL_H = isMobile ? winH : winH - 40;
  const chatW = state === "full" ? FULL_W : MINI_W;
  const chatH = state === "full" ? FULL_H : MINI_H;

  /* ── Floating Action Button (always visible when closed) ── */
  if (state === "closed") {
    return (
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", bottom: 0, right: 0, left: 0, top: 0, zIndex: 9000 }}
      >
        <Animated.View
          style={{
            position: "absolute",
            right: 16,
            top: "50%",
            marginTop: -28,
            transform: [{ scale: pulseAnim }],
          }}
        >
          <Pressable
            onPress={() => open("mini")}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#16a34a",
              ...(Platform.OS === "web"
                ? { boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }
                : { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 }),
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>AI</Text>
            {unread > 0 ? (
              <View
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  backgroundColor: "#ef4444",
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{unread}</Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  /* ── Chat Modal ── */
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9000,
      }}
    >
      {/* Dim backdrop (full mode) */}
      {state === "full" ? (
        <Pressable
          onPress={() => setState("mini")}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" }}
        />
      ) : null}

      {/* Chat card */}
      <View
        style={{
          position: "absolute",
          ...(state === "full"
            ? {
                top: isMobile ? 0 : 20,
                left: isMobile ? 0 : (winW - FULL_W) / 2,
                right: isMobile ? 0 : undefined,
                bottom: isMobile ? 0 : 20,
              }
            : {
                bottom: 18,
                right: 12,
              }),
          width: state === "full" && isMobile ? undefined : chatW,
          height: state === "full" && isMobile ? undefined : chatH,
          backgroundColor: "#0c0c0c",
          borderRadius: state === "full" && isMobile ? 0 : 16,
          borderWidth: 1,
          borderColor: "#2a2a2a",
          overflow: "hidden",
          ...(Platform.OS === "web"
            ? { boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }
            : { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 }),
        }}
      >
        {/* Header bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#222",
            backgroundColor: "#111",
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 18 }}>🤖</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>AI Assistant</Text>
            <Text style={{ color: "#666", fontSize: 10 }}>Menu · Tours · Orders</Text>
          </View>
          {/* Maximize / minimize toggle */}
          <Pressable
            onPress={() => setState(state === "full" ? "mini" : "full")}
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              backgroundColor: "#1a1a1a",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#888", fontSize: 14 }}>{state === "full" ? "⊟" : "⊞"}</Text>
          </Pressable>
          {/* Close */}
          <Pressable
            onPress={() => setState("closed")}
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              backgroundColor: "#1a1a1a",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#888", fontSize: 16 }}>✕</Text>
          </Pressable>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, paddingHorizontal: 10 }}
          contentContainerStyle={{ paddingVertical: 10, gap: 8 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                backgroundColor:
                  msg.role === "user"
                    ? "#16a34a"
                    : msg.role === "system"
                    ? "#2a2a1a"
                    : "#161616",
                borderRadius: 12,
                borderWidth: msg.role === "assistant" ? 1 : 0,
                borderColor: "#2a2a2a",
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text
                style={{
                  color: msg.role === "user" ? "#fff" : msg.role === "system" ? "#fbbf24" : "#ddd",
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                {msg.text}
              </Text>
              <Text
                style={{
                  color: msg.role === "user" ? "rgba(255,255,255,0.5)" : "#444",
                  fontSize: 9,
                  marginTop: 3,
                  textAlign: msg.role === "user" ? "right" : "left",
                }}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          ))}
          {sending ? (
            <View style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8 }}>
              <ActivityIndicator color="#16a34a" size="small" />
            </View>
          ) : null}
        </ScrollView>

        {/* Input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: "#222",
            backgroundColor: "#111",
            gap: 6,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about food, tours, orders..."
            placeholderTextColor="#555"
            onSubmitEditing={sendMessage}
            style={{
              flex: 1,
              backgroundColor: "#1a1a1a",
              color: "#fff",
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: Platform.OS === "web" ? 8 : 6,
              fontSize: 13,
              borderWidth: 1,
              borderColor: "#2a2a2a",
              ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
            }}
          />
          <Pressable
            onPress={sendMessage}
            disabled={sending || !input.trim()}
            style={{
              backgroundColor: input.trim() ? "#16a34a" : "#2a2a2a",
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16 }}>↑</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
