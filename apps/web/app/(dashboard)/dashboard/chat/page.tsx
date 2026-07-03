"use client";
import { motion } from "framer-motion";
import { Bot, Send, User, Terminal, MessageSquare, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { StreamingMarkdown } from "@/components/chat";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  isStreaming?: boolean;
}

interface ChatSession {
  id: string;
  title: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

const SUGGESTED_PROMPTS = [
  "What does this project do?",
  "How does authentication work?",
  "Find potential security vulnerabilities",
  "Explain the architecture",
  "How do I set up the dev environment?",
  "List all API endpoints",
];

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const showSidebar = true;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: repos } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await fetch("/api/repositories");
      const data = await res.json();
      return data.repositories || [];
    },
  });

  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ["chat-sessions", selectedRepo],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await fetch(`/api/chat?repositoryId=${selectedRepo}`);
      const data = await res.json();
      return (data.sessions || []) as ChatSession[];
    },
    enabled: !!selectedRepo,
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text ?? input.trim();
    if (!messageText || isLoading || !selectedRepo) return;

    const userMessage: Message = { id: `user-${Date.now()}`, role: "user", content: messageText };
    const assistantMessage: Message = { id: `ai-${Date.now()}`, role: "assistant", content: "", isStreaming: true };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);

    const currentAssistantId = assistantMessage.id;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          repositoryId: selectedRepo,
          message: messageText,
          sessionId: selectedSession,
          stream: true,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === "chunk") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantId
                  ? { ...m, content: m.content + data.content }
                  : m
              )
            );
          } else if (data.type === "done") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantId
                  ? { ...m, isStreaming: false, sources: data.sources, id: data.messageId }
                  : m
              )
            );
            if (!selectedSession && data.sessionId) {
              setSelectedSession(data.sessionId);
            }
            if (data.sessionId) refetchSessions();
          } else if (data.type === "error") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantId
                  ? { ...m, content: `Error: ${data.error}`, isStreaming: false }
                  : m
              )
            );
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === currentAssistantId
            ? { ...m, content: `Error: ${err.message ?? "Failed to generate response"}`, isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSelectedSession(null);
    inputRef.current?.focus();
  };

  const selectSession = async (sessionId: string) => {
    setSelectedSession(sessionId);
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        const loaded = (data.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources?.files ?? [],
        }));
        setMessages(loaded);
      }
    } catch {
      setMessages([]);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-160px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Terminal className="w-3.5 h-3.5" />
            <span>[root@acre]$ <span className="text-primary">./ai/chat --interactive</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedRepo && (
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={handleNewChat}>
              <Plus className="w-3 h-3" /> New Chat
            </Button>
          )}
          {repos && repos.length > 0 && (
            <select value={selectedRepo ?? ""} onChange={(e) => { setSelectedRepo(e.target.value || null); setMessages([]); setSelectedSession(null); }}
              className="terminal-select text-xs max-w-[160px]">
              <option value="">Select repo...</option>
              {repos.map((repo: any) => (<option key={repo.id} value={repo.id}>{repo.name}</option>))}
            </select>
          )}
        </div>
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        {/* Session sidebar */}
        {showSidebar && selectedRepo && sessions && sessions.length > 0 && (
          <div className="w-52 flex-shrink-0 overflow-y-auto border border-primary/10 rounded-sm bg-primary-muted/5">
            <div className="px-2 py-1.5 border-b border-primary/10 text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
              Sessions ({sessions.length})
            </div>
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSession(s.id)}
                className={cn(
                  "w-full text-left px-2 py-1.5 text-[10px] font-mono border-b border-primary/5 flex items-center gap-1.5 transition-colors",
                  s.id === selectedSession
                    ? "bg-primary-muted/20 text-primary"
                    : "text-muted-foreground hover:bg-primary-muted/10"
                )}
              >
                <MessageSquare className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate">{s.title ?? "Untitled"}</span>
                <span className="ml-auto text-[8px] text-muted-foreground">{s.messageCount}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main chat area */}
        <Card className="flex-1 terminal-panel flex flex-col min-w-0">
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!selectedRepo ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-xs font-mono text-muted-foreground">Select a repository to start chatting.</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <Bot className="w-7 h-7 text-secondary mx-auto mb-3" />
                    <p className="text-xs font-mono text-muted-foreground mb-4">Ask anything about your codebase.</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SUGGESTED_PROMPTS.map((s) => (
                        <button key={s} onClick={() => handleSuggestedPrompt(s)}
                          className="px-2.5 py-1 text-[10px] font-mono border border-primary/10 text-muted-foreground hover:text-primary hover:border-primary/30 rounded-sm transition-all">
                          $ {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex items-start gap-2 animate-fade-in", msg.role === "user" ? "justify-end" : "justify-start")}>
                      {msg.role === "assistant" && (
                        <div className="p-1.5 rounded-sm bg-secondary-muted flex-shrink-0 mt-0.5">
                          <Bot className="w-3 h-3 text-secondary" />
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[85%] rounded-sm px-3 py-2",
                        msg.role === "user"
                          ? "bg-primary-muted border border-primary/20"
                          : "bg-primary-muted/20 border border-primary/10"
                      )}>
                        <div className="overflow-hidden">
                          {msg.role === "user" ? (
                            <p className="text-xs font-mono text-primary whitespace-pre-wrap break-words">{msg.content}</p>
                          ) : (
                            <StreamingMarkdown
                              content={msg.content}
                              isStreaming={msg.isStreaming}
                            />
                          )}
                          {msg.sources && msg.sources.length > 0 && !msg.isStreaming && (
                            <div className="mt-2 pt-2 border-t border-primary/10">
                              <p className="text-[9px] text-muted-foreground mb-1 uppercase tracking-wider font-mono">Sources:</p>
                              <div className="flex flex-wrap gap-1">
                                {msg.sources.map((src, i) => (
                                  <Badge key={i} variant="outline" className="text-[8px] px-1 py-0 font-mono">{src.split("/").pop()}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {msg.role === "user" && (
                        <div className="p-1.5 rounded-sm bg-primary-muted flex-shrink-0 mt-0.5">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-primary/10 p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-1.5 terminal-input text-xs">
                  <Bot className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <input ref={inputRef} type="text" placeholder={selectedRepo ? "Ask about your codebase..." : "Select a repo first..."}
                    value={input}
                    onChange={(e) => { setInput(e.target.value); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={!selectedRepo || isLoading}
                    className="bg-transparent text-xs text-primary placeholder:text-muted-foreground outline-none flex-1 font-mono disabled:opacity-50" />
                  <kbd className="text-[8px] font-mono text-muted-foreground border border-primary/10 px-1 py-0.5 rounded-sm">↵</kbd>
                </div>
                <Button size="icon" className="flex-shrink-0 h-7 w-7" onClick={() => handleSend()} disabled={!input.trim() || isLoading || !selectedRepo}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-[9px] text-muted-foreground font-mono mt-1.5 text-center">
                Responses use AI via OpenRouter with repository context. Supports markdown, code blocks, and tables.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
