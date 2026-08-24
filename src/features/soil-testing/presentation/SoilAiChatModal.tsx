import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Bot, Send, Sparkles, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AgriButton } from '@/components/ui/agri-button';
import { SoilTestOrder } from '../domain/soilTestingTypes';
import { askKisanAiAboutReport, analyzeSoilReportWithAi } from '../domain/soilAiAdvisor';
import { useLanguage } from '@/contexts/LanguageContext';

interface SoilAiChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: SoilTestOrder | null;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const SoilAiChatModal: React.FC<SoilAiChatModalProps> = ({
  open,
  onOpenChange,
  order,
}) => {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!order) return [];
    const analysis = analyzeSoilReportWithAi(order);
    return [
      {
        id: 'initial',
        sender: 'ai',
        text: `Namaste! I am your Kisan AI Soil Advisor. I have reviewed your official lab report for order ${order.order_number}.\n\n${analysis.statusOverview}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const handleSend = (questionText?: string) => {
    const textToSend = questionText || input;
    if (!textToSend.trim() || !order) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiReplyText = askKisanAiAboutReport(order, textToSend.trim());

    const aiMsg: ChatMessage = {
      id: `ai-${Date.now() + 1}`,
      sender: 'ai',
      text: aiReplyText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
  };

  const QUICK_QUESTIONS = [
    'How should I apply Urea and DAP based on this test?',
    'Is my soil pH suitable for crops?',
    'What micronutrients are deficient?',
    'Which crops are best suited for this soil?',
  ];

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            {t('soil.ai.eyebrow') || 'Kisan AI Soil Specialist'}
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            {t('soil.ai.title') || 'Ask Kisan AI About Your Soil Report'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t('soil.ai.subtitle') || 'Answers strictly grounded in your verified laboratory test results.'} (Order: {order.order_number})
          </DialogDescription>
        </DialogHeader>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${
                m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  m.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-muted/80 text-foreground border border-border/60 rounded-tl-none whitespace-pre-line'
                }`}
              >
                {m.text}
                <div
                  className={`text-[9px] mt-1 text-right ${
                    m.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="py-2 border-t border-border/40">
          <div className="text-[10px] text-muted-foreground font-semibold mb-1.5">
            {t('soil.ai.suggestedPrompts') || 'Suggested Questions'}:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q)}
                className="text-[11px] bg-secondary/80 hover:bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full text-left transition-colors border border-border/50"
              >
                💡 {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('soil.ai.placeholder') || 'Ask about fertilizer dosage, pH, micronutrients…'}
            className="flex-1 px-3.5 py-2.5 text-xs bg-muted/60 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-foreground placeholder:text-muted-foreground"
          />
          <AgriButton
            onClick={() => handleSend()}
            disabled={!input.trim()}
            variant="primary"
            className="rounded-xl px-4 py-2.5 shrink-0"
          >
            <Send className="w-4 h-4" />
          </AgriButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};
