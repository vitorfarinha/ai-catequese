"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const WELCOME = "Olá! Estou aqui para te ajudar no teu papel de catequista. O que posso fazer por ti?";

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Normalizes markdown coming back from the model so lists render as tight,
// correctly-nested lists instead of stray marker lines with big gaps.
function normalizeMarkdown(text) {
  let t = text.trim();
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/^([ \t]*(?:\d+[.)]|[-*+]))[ \t]*\n+[ \t]*(?=\S)/gm, "$1 ");
  return t;
}

export default function Page() {
  const [messages, setMessages] = useState([{ id: uid(), role: "assistant", content: WELCOME }]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadedFileIds, setUploadedFileIds] = useState([]);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const fileRef = useRef();
  const bodyRef = useRef();
  const bottomRef = useRef();
  const textareaRef = useRef();
  const rafPending = useRef(false);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const maybeAutoScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (nearBottom && !rafPending.current) {
      rafPending.current = true;
      requestAnimationFrame(() => {
        scrollToBottom(isStreaming ? "auto" : "smooth");
        rafPending.current = false;
      });
    }
  }, [scrollToBottom, isStreaming]);

  useEffect(() => {
    maybeAutoScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  function handleBodyScroll() {
    const el = bodyRef.current;
    if (!el) return;
    setShowScrollButton(el.scrollHeight - el.scrollTop - el.clientHeight > 220);
  }

  function autoResizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }
  useEffect(() => {
    autoResizeTextarea();
  }, [input]);

  function updateMessage(id, updater) {
    setMessages(prev => prev.map(m => (m.id === id ? updater(m) : m)));
  }

  function onFilesSelected(e) {
    const sel = Array.from(e.target.files || []);
    if (sel.length === 0) return;
    setFiles(prev => [...prev, ...sel]);
    e.target.value = "";
  }

  function removeSelectedFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function uploadFilesSequentially(selectedFiles) {
    const ids = [];
    for (const f of selectedFiles) {
      try {
        const form = new FormData();
        form.append("file", f);
        const resp = await fetch("/api/upload", { method: "POST", body: form });
        const json = await resp.json();
        if (json?.fileId) ids.push(json.fileId);
        else console.warn("Upload response unexpected:", json);
      } catch (err) {
        console.error("Upload failed for", f.name, err);
      }
    }
    return ids;
  }

  async function sendMessage() {
    if (isStreaming || (!input.trim() && files.length === 0)) return;

    const userMsg = { id: uid(), role: "user", content: input || "(ficheiro anexado)" };
    const historyForRequest = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    let newFileIds = [];
    if (files.length > 0) {
      newFileIds = await uploadFilesSequentially(files);
      setUploadedFileIds(prev => [...prev, ...newFileIds]);
      setFiles([]);
    }

    const assistantId = uid();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyForRequest,
          fileIds: [...uploadedFileIds, ...newFileIds]
        })
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const chunkText = acc;
        updateMessage(assistantId, m => ({ ...m, content: chunkText }));
      }

      updateMessage(assistantId, m => ({ ...m, content: normalizeMarkdown(acc) }));
    } catch (err) {
      console.error("Chat error:", err);
      updateMessage(assistantId, m => ({
        ...m,
        content: "Ocorreu um erro. Por favor tenta novamente."
      }));
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const canSend = !isStreaming && (input.trim().length > 0 || files.length > 0);

  return (
    <main className="relative h-screen w-full flex items-center justify-center p-4 sm:p-6">
      <div className="glass-backdrop">
        <div className="blob" />
      </div>

      <div className="relative z-10 w-full max-w-2xl h-full sm:h-[calc(100vh-3rem)] flex flex-col glass-panel rounded-[28px] overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="w-10 h-10 rounded-2xl overflow-hidden shrink-0 bg-black/5 dark:bg-white/10 flex items-center justify-center">
            <img src="/logo.jpg" alt="Catequese de Lisboa" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[15px] tracking-tight text-neutral-900 dark:text-neutral-100">
              IA Catequese
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Apoio à preparação de encontros
            </div>
          </div>
          <div className="ml-auto text-[11px] font-medium px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
            v2
          </div>
        </header>

        {/* Messages */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={bodyRef}
            onScroll={handleBodyScroll}
            className="chat-scroll h-full overflow-y-auto px-4 sm:px-5 py-6 flex flex-col gap-4"
          >
            <AnimatePresence initial={false}>
              {messages.map(m => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "bubble-user max-w-[80%] rounded-[20px] rounded-br-md px-4 py-3 text-[15px] leading-relaxed shadow-sm"
                        : "max-w-[80%] rounded-[20px] rounded-bl-md px-4 py-3 text-[15px] leading-relaxed glass-pill"
                    }
                    style={
                      m.role === "user"
                        ? { background: "rgb(var(--user-bubble))", color: "rgb(var(--user-bubble-foreground))" }
                        : { color: "rgb(var(--foreground))" }
                    }
                  >
                    {m.content ? (
                      <div className="markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="typing-dots" role="status" aria-label="A escrever resposta">
                        <span />
                        <span />
                        <span />
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                onClick={() => scrollToBottom()}
                aria-label="Ir para o fim da conversa"
                className="absolute bottom-3 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full glass-panel flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:opacity-80 transition-opacity"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Composer */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2">
          <div className="glass-pill rounded-[24px] px-3 pt-3 pb-2 focus-within:ring-2 focus-within:ring-black/10 dark:focus-within:ring-white/20 transition-shadow">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escreve a tua mensagem — Enter para enviar, Shift+Enter para nova linha"
              aria-label="Mensagem"
              rows={1}
              className="w-full resize-none bg-transparent outline-none text-[15px] leading-relaxed px-1 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500/70 max-h-[200px]"
            />

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1 mt-2" aria-live="polite">
                {files.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 max-w-[220px] pl-3 pr-1.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs text-neutral-700 dark:text-neutral-200"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      onClick={() => removeSelectedFile(idx)}
                      aria-label={`Remover ${f.name}`}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-500/15 hover:text-red-500 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-1.5">
              <label
                htmlFor="file-upload"
                aria-label="Anexar ficheiro"
                className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-neutral-800 dark:hover:text-neutral-100 cursor-pointer transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </label>
              <input id="file-upload" ref={fileRef} type="file" multiple onChange={onFilesSelected} className="sr-only" />

              <button
                onClick={sendMessage}
                disabled={!canSend}
                aria-label="Enviar mensagem"
                className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                style={{ background: "rgb(var(--user-bubble))", color: "rgb(var(--user-bubble-foreground))" }}
              >
                {isStreaming ? (
                  <span className="typing-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
