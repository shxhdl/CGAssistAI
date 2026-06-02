import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Send, X, Bot, Sparkles, RotateCcw, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEEPSEEK_API = "https://api.deepseek.com/chat/completions";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey there 👋 I'm your **Gulf College AI** assistant.\n\nAsk me about:\n- 📋 Your assignments & deadlines\n- 👨‍🏫 Who assigned what\n- 📊 Your grades & progress\n- 💡 Any concept you want explained",
  timestamp: new Date(),
};

// ─── Quick Prompt Chips ───────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "Show my assignments",
  "What's due soon?",
  "Who gave the most assignments?",
  "Explain a concept",
];

const TEACHER_PROMPTS = [
  "Who submitted?",
  "Who didn't submit?",
];

// ─── Bubble ──────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex items-end gap-2", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mb-0.5">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-violet-600 text-white rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {isUser ? (
          msg.content
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0.5 prose-ul:my-1 prose-li:my-0">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center h-9">
        {[0, 0.15, 0.3].map((delay, i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 inline-block animate-bounce"
            style={{ animationDelay: `${delay}s`, animationDuration: "0.9s" }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────── 

export function SmartChatbot() {
  const { user, session, role } = useAuth();

  const [open, setOpen] = useState<boolean>(() => {
    return localStorage.getItem("gca_chat_open") === "true";
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("gca_chat_messages");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
    return [WELCOME_MESSAGE];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unread, setUnread] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync open state to localStorage
  useEffect(() => {
    localStorage.setItem("gca_chat_open", String(open));
  }, [open]);

  // Sync messages to localStorage
  useEffect(() => {
    localStorage.setItem("gca_chat_messages", JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setUnread(0);
    }
  }, [open]);
  const getDashboardContext = async () => {
    if (!user) return "No user is logged in.";

    try {
      // 1. Get user profile
      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const profileData = profile as any;

      // 2. Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const role = roleData?.role || "student";

      // 3. Fallback hierarchy for student details
      const specialization = profileData?.specialization || user.user_metadata?.specialization;
      const level = profileData?.level || user.user_metadata?.level;
      const semester = profileData?.semester || user.user_metadata?.semester || user.user_metadata?.block;

      let courses: any[] = [];

      // 4. Fetch courses based on role
      if (role === "teacher") {
        const teacherEmail = String(profileData?.email || user.email || "").trim().toLowerCase();
        const { data } = await supabase
          .from("courses" as any)
          .select("*")
          .eq("teacher_email", teacherEmail);
        courses = data || [];
      } else {
        const { data } = await supabase
          .from("courses" as any)
          .select("*")
          .eq("specialization", String(specialization || "").trim())
          .eq("level", String(level || "").trim())
          .eq("semester", String(semester || "").trim());
        courses = data || [];
      }

      const courseIds = (courses || []).map((course: any) => course.id);
      let assignments: any[] = [];

      // 5. Fetch assignments
      if (courseIds.length > 0) {
        const { data } = await supabase
          .from("assignments" as any)
          .select("*")
          .in("course_id", courseIds)
          .order("due_date", { ascending: true });

        assignments = data || [];
      }

      // 6. Fetch submissions and build context
      if (role === "teacher") {
        let submissions: any[] = [];
        if (assignments.length > 0) {
          const assignmentIds = assignments.map((a: any) => a.id);
          const { data } = await supabase
            .from("submissions")
            .select("*")
            .in("assignment_id", assignmentIds);
          submissions = data || [];
        }

        return `
Role: Teacher
Profile Details:
Name: ${profileData?.full_name || "Teacher"}
Email: ${profileData?.email || user.email}

Courses Taught:
${
  (courses || []).map((c: any) => `- ${c.code}: ${c.name} (Level ${c.level}, Semester ${c.semester})`).join("\n") ||
  "No courses assigned"
}

Assignments Created:
${
  assignments
    .map((a: any) => {
      const subs = submissions.filter((s: any) => s.assignment_id === a.id);
      const graded = subs.filter((s: any) => s.grade !== null).length;
      const pendingGrading = subs.filter((s: any) => s.grade === null).length;
      return `- ${a.title} | Course: ${a.subject} | Due: ${a.due_date} | Submissions: ${subs.length} total (${pendingGrading} pending grading, ${graded} graded)`;
    })
    .join("\n") || "No assignments created"
}

Dashboard Overview:
Total courses taught: ${(courses || []).length}
Total assignments created: ${assignments.length}
Total submissions received: ${submissions.length}
Submissions pending grading: ${submissions.filter((s: any) => s.grade === null).length}
`;
      } else {
        // Student role
        const { data: submissions } = await supabase
          .from("submissions")
          .select("*")
          .eq("student_id", user.id);

        const submittedIds = new Set(
          (submissions || []).map((s: any) => s.assignment_id)
        );

        return `
Role: Student
Profile Details:
Name: ${profileData?.full_name || "Student"}
Email: ${profileData?.email || user.email}
Programme: ${specialization || "Not specified"}
Level: ${level || "Not specified"}
Block: ${semester || "Not specified"}

Courses Enrolled:
${
  (courses || []).map((c: any) => `- ${c.code}: ${c.name}`).join("\n") ||
  "No courses found"
}

Assignments:
${
  assignments
    .map(
      (a: any) =>
        `- ${a.title} | ${a.subject} | Type: ${a.priority} | Due: ${a.due_date} | Status: ${
          submittedIds.has(a.id) ? "Submitted" : "Pending"
        }`
    )
    .join("\n") || "No assignments found"
}

Dashboard Overview:
Total courses: ${(courses || []).length}
Total assignments: ${assignments.length}
Pending assignments: ${assignments.filter((a: any) => !submittedIds.has(a.id)).length}
Completed assignments: ${assignments.filter((a: any) => submittedIds.has(a.id)).length}
`;
      }
    } catch (e: any) {
      console.error("Error generating chatbot context:", e);
      return "Error loading dashboard context.";
    }
  };
  // ── Send message ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      try {
        const dashboardContext = await getDashboardContext();
        const currentDateStr = new Date().toLocaleString("en-US", { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const res = await fetch(DEEPSEEK_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content: `
You are GCAssist AI, a simple and direct study assistant for Gulf College.

Current Date: ${currentDateStr}

=========================================
DASHBOARD DATA:
${dashboardContext}
=========================================

CRITICAL INSTRUCTIONS:
1. **BE EXTREMELY BRIEF & SIMPLE**: Answer in as few words as possible. Keep responses under 2-3 short sentences. No filler words, no conversational fluff, no repeating dates/times unnecessarily.
2. **FORMAT DIRECTLY**: Use simple bullet points or short bold statements.
3. **DO NOT EXPLAIN COMMONSENSE**: If an assignment is due in the past, just list it as "Overdue" directly. Do not write paragraphs explaining *why* it is overdue.
4. **NO UNSOLICITED ADVICE**: Do not offer study plans, generic advice, or warnings about "penalties" unless the user explicitly asks for them.

RULES:
- A student is in a course if listed in "Courses".
- **Overdue** = Status is "Pending" AND due date is in the past relative to ${currentDateStr}.
- **Next Deadline** = The "Pending" assignment with the closest future due date.
- For academic concepts (e.g. OOP, databases), explain them in a very simple, 1-2 sentence definition.
- Never say you cannot access data. Never mention external portals like Moodle or Blackboard.
`
              },
      {
        role: "user",
        content: text.trim(),
      },
    ],
  }),
});

const data = await res.json();

console.log("DeepSeek Response:", data);

const botMsg: ChatMessage = {
  id: crypto.randomUUID(),
  role: "assistant",
  content:
    data?.choices?.[0]?.message?.content ||
    "No response received.",
  timestamp: new Date(),
};

        setMessages((prev) => [...prev, botMsg]);

        if (!open) setUnread((n) => n + 1);
            } catch (error) {
        console.error("DeepSeek Error:", error);

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "⚠️ Something went wrong. Please try again.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, session, open]
  );

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setUnread(0);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Floating Trigger ── */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/30 flex items-center justify-center transition-all duration-200"
        aria-label="Open chat"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <Sparkles className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed bottom-24 right-6 z-50 w-[92vw] sm:w-[380px] flex flex-col bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            style={{ height: "min(600px, 80vh)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm shadow-violet-600/30">
                  <Sparkles className="w-[18px] h-[18px] text-white" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">Gulf College AI</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {user?.email
                      ? `Signed in as ${user.email.split("@")[0]}`
                      : "Academic assistant"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {/* Quick Prompts — only show when only welcome message */}
            {messages.length === 1 && !isLoading && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {(role === "teacher" ? TEACHER_PROMPTS : QUICK_PROMPTS).map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-border shrink-0 bg-card">
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 bg-secondary rounded-2xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-violet-500/40 transition-shadow"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about your studies…"
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-1 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-violet-700 active:scale-95 transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
              <p className="text-center text-[10px] text-muted-foreground/50 mt-2 tracking-widest uppercase font-medium">
                Powered by DeepSeek · Gulf College
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}