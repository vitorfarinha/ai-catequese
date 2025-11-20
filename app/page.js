"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Page() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello — I'm your SAIS AI Tutor. Ask a question and I'll guide your thinking."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState([]); // local File objects selected
  const [uploadedFileIds, setUploadedFileIds] = useState([]);
  const fileRef = useRef();
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Cleans up multiple empty lines from AI responses
  function cleanResponse(text) {
  return text.replace(/\n{3,}/g, "\n\n").trim();
  }
  
  function onFilesSelected(e) {
    const sel = Array.from(e.target.files || []);
    if (sel.length === 0) return;
    setFiles(prev => [...prev, ...sel]);
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
        { role: "assistant", content: "An error occurred. Please try again." }
      ]);
    } finally {
      setIsLoading(false);
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

  return (
    <main className="page-root">
    <div className="header-logo"><img src="/sais-estoril-vb.svg" alt="SAIS" /></div>
      <div className="chat-shell">
        <header className="chat-header">
          <div className="brand">SAIS AI Tutor</div>
          <div className="meta">v20.11.14.29</div>
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
            <div className="message-row typing from-assistant">
              <div className="message-bubble typing-bubble">
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
          <div className="composer-left">
            <label className="upload-btn" title="Attach files">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M7 10l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M12 5v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <input ref={fileRef} type="file" multiple onChange={onFilesSelected} className="hidden-file-input" />
            </label>
          </div>

          <div className="composer-middle">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message — Enter to send, Shift+Enter for newline"
              className="composer-textarea"
              rows={2}
            />
            {files.length > 0 && (
              <div className="attached-list" aria-live="polite">
                {files.map((f, idx) => (
                  <div key={idx} className="file-pill">
                    <span className="file-name">{f.name}</span>
                    <button onClick={() => removeSelectedFile(idx)} className="file-remove" aria-label={`Remove ${f.name}`}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="composer-right">
            <button onClick={sendMessage} className="send-btn" disabled={isLoading} aria-label="Send message">
              Send
            </button>
          </div>
        </div>
      </div>

      {/* inline keyframes fallback */}
      <style jsx>{`
        @keyframes bounceDots {
          0% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
          100% { transform: translateY(0); opacity: 0.4; }
        }
      `}</style>
    </main>
  );
}
