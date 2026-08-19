"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Page() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Olá! Estou aqui para te ajudar no teu papel de catequista. O que posso fazer por ti?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState([]); // local File objects selected
  const [uploadedFileIds, setUploadedFileIds] = useState([]);
  const fileRef = useRef();
  const bottomRef = useRef();
  const textareaRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Cleans up multiple empty lines from AI responses
  function cleanResponse(text) {
    // Remove trailing spaces
    let t = text.trim();
    // Collapse 3+ newlines into 2
    t = t.replace(/\n{3,}/g, "\n");
    // Optionally, remove extra spaces inside paragraphs
    t = t.replace(/([^\S\r\n]{2,})/g, " ");
    return t;
  }

  // Converts single line breaks into double line breaks for Markdown rendering
  function preprocessMarkdown(text) {
    // First clean excessive blank lines
    let cleanText = cleanResponse(text);
    // Replace single \n (not part of list or heading) with two \n
    return cleanText.replace(/([^\n])\n([^\n*#-])/g, "$1\n\n$2");
  }

  function onFilesSelected(e) {
    const sel = Array.from(e.target.files || []);
    if (sel.length === 0) return;
    setFiles(prev => [...prev, ...sel]);
    e.target.value = ""; // allow selecting the same file again later
  }

  async function uploadFilesSequentially(selectedFiles) {
    // Upload files one by one to backend, returning array of fileIds
    const ids = [];
    for (const f of selectedFiles) {
      try {
        const form = new FormData();
        form.append("file", f);
        const resp = await fetch("/api/upload", { method: "POST", body: form });
        const json = await resp.json();
        if (json?.fileId) ids.push(json.fileId);
        else if (json?.fileIds && Array.isArray(json.fileIds)) {
          ids.push(...json.fileIds);
        } else {
          console.warn("Upload response unexpected:", json);
        }
      } catch (err) {
        console.error("Upload failed for", f.name, err);
      }
    }
    return ids;
  }

  async function sendMessage() {
    if (!input.trim() && files.length === 0) return;

    // Append user message locally
    const userMsg = { role: "user", content: input || "(uploaded file)" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Upload selected files (if any)
    let newFileIds = [];
    if (files.length > 0) {
      newFileIds = await uploadFilesSequentially(files);
      setUploadedFileIds(prev => [...prev, ...newFileIds]);
      setFiles([]); // clear selected file list after upload
    }

    // Prepare payload for backend (backend will add the system prompt)
    const payloadMessages = [...messages, userMsg];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          fileIds: [...uploadedFileIds, ...newFileIds]
        })
      });

      const json = await res.json();

      // backend may return reply as string or object with content
      let replyText = "";
      if (!json) replyText = "No response from server.";
      else if (typeof json.reply === "string") replyText = json.reply;
      else if (json.reply?.content) replyText = json.reply.content;
      else if (json.reply?.message?.content) replyText = json.reply.message.content;
      else replyText = JSON.stringify(json.reply).slice(0, 1000);

      const assistantMsg = { role: "assistant", content: cleanResponse(replyText) };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Ocorreu um erro. Por favor tenta novamente." }
      ]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function removeSelectedFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  const canSend = !isLoading && (input.trim().length > 0 || files.length > 0);

  return (
    <main className="page-root">
      <div className="chat-shell">
        <header className="chat-header">
          <div className="header-logo">
            <img src="/24111357539635-2.jpg" alt="Catequese de Lisboa" />
          </div>
          <div>
            <div className="brand">IA Catequese</div>
            <div className="brand-sub">Apoio à preparação de encontros</div>
          </div>
          <div className="meta">v1</div>
        </header>

        <div className="chat-body" role="log" aria-live="polite">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`message-row ${m.role === "user" ? "from-user" : "from-assistant"}`}
            >
              <div className="message-bubble">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message-row from-assistant" aria-hidden="false">
              <div
                className="message-bubble typing-bubble"
                role="status"
                aria-label="A escrever resposta"
              >
                <div className="dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="chat-composer">
          <label className="upload-btn" htmlFor="file-upload" aria-label="Anexar ficheiro">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </label>
          <input
            id="file-upload"
            ref={fileRef}
            type="file"
            multiple
            onChange={onFilesSelected}
            className="hidden-file-input"
          />

          <div className="composer-middle">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escreve a tua mensagem — Enter para enviar, Shift+Enter para nova linha"
              aria-label="Mensagem"
              className="composer-textarea"
              rows={2}
            />
            {files.length > 0 && (
              <div className="attached-list" aria-live="polite">
                {files.map((f, idx) => (
                  <div key={idx} className="file-pill">
                    <span className="file-name">{f.name}</span>
                    <button
                      onClick={() => removeSelectedFile(idx)}
                      className="file-remove"
                      aria-label={`Remover ${f.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="composer-right">
            <button
              onClick={sendMessage}
              className="send-btn"
              disabled={!canSend}
              aria-label="Enviar mensagem"
            >
              {isLoading ? "A enviar…" : "Enviar"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
