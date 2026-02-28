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
import { aiChatColors, aiChatDynamicStyles as ds, aiChatStyles as styles } from "../styles/AIChatWidget.styles";
import { aiChatWidgetData as t } from "../staticData/aiChatWidget.staticData";

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
      id: t.welcomeId,
      role: "assistant",
      text: t.welcomeText,
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
        t.chatEndpoint,
        {
          message: text,
          sessionId: `${t.sessionPrefix}${user?.phone || user?.email || "anon"}`,
        }
      );
      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        text: res.reply || t.fallbackReply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      if (res.escalated) {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys_${Date.now()}`,
            role: "system",
            text: t.escalatedNotice,
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
          text: `${t.errorPrefix}${err.message || t.errorFallback}`,
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
      <View pointerEvents="box-none" style={styles.overlay}>
        <Animated.View style={[styles.fabWrap, ds.fabPulse(pulseAnim)]}>
          <Pressable
            onPress={() => open("mini")}
            style={[styles.fabButton, ds.fabShadow()]}
          >
            <Text style={styles.fabText}>{t.fabLabel}</Text>
            {unread > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread}</Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  /* ── Chat Modal ── */
  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      {/* Dim backdrop (full mode) */}
      {state === "full" ? (
        <Pressable
          onPress={() => setState("mini")}
          style={styles.backdrop}
        />
      ) : null}

      {/* Chat card */}
      <View
        style={[
          styles.card,
          ds.cardPlacement(state, isMobile, winW, FULL_W),
          ds.cardSize(state, isMobile, chatW, chatH),
          ds.cardRadius(state, isMobile),
          ds.cardShadow(),
        ]}
      >
        {/* Header bar */}
        <View style={styles.header}>
          <Text style={styles.robotText}>{t.robotIcon}</Text>
          <View style={styles.flex1}>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>
          {/* Maximize / minimize toggle */}
          <Pressable
            onPress={() => setState(state === "full" ? "mini" : "full")}
            style={styles.iconBtn}
          >
            <Text style={styles.iconBtnText}>{state === "full" ? t.collapseIcon : t.expandIcon}</Text>
          </Pressable>
          {/* Close */}
          <Pressable
            onPress={() => setState("closed")}
            style={styles.iconBtn}
          >
            <Text style={styles.closeText}>{t.closeIcon}</Text>
          </Pressable>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[styles.bubble, ds.bubble(msg.role)]}
            >
              <Text style={[styles.bubbleText, ds.bubbleText(msg.role)]}>
                {msg.text}
              </Text>
              <Text style={[styles.timeText, ds.timeText(msg.role)]}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          ))}
          {sending ? (
            <View style={styles.typingWrap}>
              <ActivityIndicator color={aiChatColors.typingSpinner} size="small" />
            </View>
          ) : null}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t.askPlaceholder}
            placeholderTextColor={aiChatColors.placeholder}
            onSubmitEditing={sendMessage}
            style={[styles.input, ds.inputPadding(), ds.inputOutline()]}
          />
          <Pressable
            onPress={sendMessage}
            disabled={sending || !input.trim()}
            style={[styles.sendBtn, ds.sendBtn(Boolean(input.trim()))]}
          >
            <Text style={styles.sendText}>{t.sendIcon}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
