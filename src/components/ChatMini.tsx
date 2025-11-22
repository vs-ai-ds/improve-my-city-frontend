import { useState, useEffect, useRef } from "react";
import { api } from "../services/apiClient";
import { useAuth } from "../store/useAuth";
import { useReportModal } from "../store/useReportModal";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

type Message = {
  role: "user" | "bot";
  text: string;
  ts: number;
};

type ChatResponse = {
  reply: string;
  suggestions: string[];
  state?: Record<string, any>;
};

function getSessionId(): string {
  const stored = localStorage.getItem("chat_session_id");
  if (stored) return stored;
  const newId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem("chat_session_id", newId);
  return newId;
}

export default function ChatMini() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [sessionId] = useState(getSessionId());
  const [lastIssueId, setLastIssueId] = useState<number | null>(null);
  const { user } = useAuth();
  const { openWith: openReportModal } = useReportModal();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = user
        ? `Hi ${user.name || user.email.split("@")[0]} 👋 How can I help with your issues today?`
        : "Hi there! 👋 How can I help you today?";
      
      const initialSuggestions = [
        "How do I report an issue?",
        "Check status of an issue",
        "Show my issues",
        "What do statuses mean?",
        "Report An Issue",
        "View issue by number"
      ];

      setMessages([{ role: "bot", text: greeting, ts: Date.now() }]);
      setSuggestions(initialSuggestions);
    }
  }, [open, user]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || typing) return;

    const userInput = text.trim();
    const userMsg: Message = { role: "user", text: userInput, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSuggestions([]);
    setTyping(true);
    
    // Don't auto-open modals - only open when user clicks specific buttons

    try {
      const typingDelay = setTimeout(() => setTyping(true), 400);
      
      const { data } = await api.post<ChatResponse>("/bot/chat", {
        session_id: sessionId,
        message: userInput,
        user: user ? { id: user.id, email: user.email } : null
      });

      clearTimeout(typingDelay);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const botMsg: Message = { role: "bot", text: data.reply, ts: Date.now() };
      setMessages(prev => [...prev, botMsg]);
      setSuggestions(data.suggestions || []);
      
      // Store issue ID if present in response
      if (data.state?.issue_id) {
        setLastIssueId(data.state.issue_id);
      } else {
        // Try to extract from reply text
        const issueMatch = data.reply.match(/#(\d+)/);
        if (issueMatch) {
          setLastIssueId(parseInt(issueMatch[1]));
        }
      }
      
      // Only auto-open modals if explicitly requested (auto_open is true or not set)
      // But based on user requirements, we should NOT auto-open
      // Modals will only open when user clicks specific suggestion buttons
    } catch (error: any) {
      const errorMsg: Message = {
        role: "bot",
        text: error?.response?.data?.detail || "Sorry, I encountered an error. Please try again.",
        ts: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
      setSuggestions(["Try again", "How do I report an issue?"]);
    } finally {
      setTyping(false);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    // Handle special action buttons
    if (suggestion === "Login to report an issue") {
      window.dispatchEvent(new CustomEvent("imc:open-auth", { 
        detail: { view: "login", openReportAfterAuth: true } 
      }));
      return;
    }
    
    if (suggestion === "Report An Issue") {
      if (user) {
        openReportModal();
      } else {
        window.dispatchEvent(new CustomEvent("imc:open-auth", { 
          detail: { view: "login", openReportAfterAuth: true } 
        }));
      }
      return;
    }
    
    if (suggestion === "Login") {
      window.dispatchEvent(new CustomEvent("imc:open-auth", { 
        detail: { view: "login" } 
      }));
      return;
    }
    
    if (suggestion === "View full details") {
      // Use stored issue ID or extract from last bot message
      if (lastIssueId) {
        window.dispatchEvent(new CustomEvent("imc:open-issue-detail", { 
          detail: { issueId: lastIssueId } 
        }));
        return;
      }
      // Try to extract from last bot message
      const lastBotMsg = messages.filter(m => m.role === "bot").pop();
      if (lastBotMsg) {
        const issueMatch = lastBotMsg.text.match(/#(\d+)/);
        if (issueMatch) {
          const issueId = parseInt(issueMatch[1]);
          window.dispatchEvent(new CustomEvent("imc:open-issue-detail", { 
            detail: { issueId } 
          }));
          return;
        }
      }
      // If we can't find issue ID, just send the message
    }
    
    if (suggestion === "Open login") {
      window.dispatchEvent(new CustomEvent("imc:open-auth", { 
        detail: { view: "login" } 
      }));
      return;
    }
    
    // For all other suggestions, send as message
    sendMessage(suggestion);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 flex items-center justify-center"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <h3 className="font-semibold">IMC Assistant</h3>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="hover:bg-white/20 rounded-lg p-1 transition-colors"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-900 border border-gray-200"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        
        {typing && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestion(suggestion)}
                className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Type your message..."
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={typing}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || typing}
            className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
