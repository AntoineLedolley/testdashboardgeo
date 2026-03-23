'use client';
import { useState, useCallback, useRef } from 'react';
import { AiMessage, AiContext } from '@/types/ai';

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

const WELCOME_MESSAGE: AiMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Bonjour. Je suis **GS TradeAI**, votre analyste senior.\n\nJ'ai accès en temps réel à l'ensemble des données de la plateforme : prix, chandeliers, moyennes mobiles, volumes, options flow, portefeuille, watchlist.\n\nMes analyses suivent la structure Goldman Sachs Research : Vision directionnelle, Scénarios pondérés (Bull/Base/Bear), Risques clés, et Setup opérationnel précis.\n\n**Ce que je peux faire :**\n- Analyse technique complète avec recommandation directionnelle\n- Scénarios probabilisés avec objectifs de prix\n- Niveaux clés : entrée, stop, cible 1 & 2\n- Impact cross-asset : VIX, DXY, taux\n- Analyse de votre portefeuille et positions ouvertes\n\nQue voulez-vous analyser ?`,
  timestamp: Date.now(),
};

export type TraderLevel = 'debutant' | 'intermediaire' | 'expert';

export function useAiChat() {
  const [messages, setMessages] = useState<AiMessage[]>([WELCOME_MESSAGE]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputText, setInputText] = useState('');

  // Refs for RAF-batched streaming (smooth 60fps updates)
  const contentRef = useRef('');
  const rafIdRef = useRef<number | null>(null);
  const assistantMsgIdRef = useRef<string>('');

  const sendMessage = useCallback(
    async (text: string, context: AiContext, level: TraderLevel = 'intermediaire', persona = '') => {
      if (!text.trim() || isStreaming) return;

      const userMsg: AiMessage = {
        id: generateId(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      const assistantMsg: AiMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      setInputText('');

      // Reset streaming refs
      contentRef.current = '';
      assistantMsgIdRef.current = assistantMsg.id;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      try {
        const conversationHistory = [...messages, userMsg]
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: conversationHistory, context, level, persona }),
        });

        if (!res.ok || !res.body) throw new Error('Stream failed');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Accumulate content in ref — no re-render yet
          contentRef.current += decoder.decode(value, { stream: true });

          // Schedule a single RAF update if not already pending (caps re-renders at 60fps)
          if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(() => {
              rafIdRef.current = null;
              const content = contentRef.current;
              const id = assistantMsgIdRef.current;
              setMessages((prev) =>
                prev.map((m) => (m.id === id ? { ...m, content } : m))
              );
            });
          }
        }

        // Cancel pending RAF and do one final authoritative update
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        const finalContent = contentRef.current;
        const finalId = assistantMsgIdRef.current;
        setMessages((prev) =>
          prev.map((m) => (m.id === finalId ? { ...m, content: finalContent } : m))
        );

      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: 'Erreur de connexion. Veuillez réessayer.' }
              : m
          )
        );
      } finally {
        // Cleanup any lingering RAF
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        setIsStreaming(false);
      }
    },
    [messages, isStreaming]
  );

  const clearMessages = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
  }, []);

  return { messages, isStreaming, inputText, setInputText, sendMessage, clearMessages };
}
