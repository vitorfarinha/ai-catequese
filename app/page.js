"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function Page() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello — I'm your SAIS AI tutor. Ask a question and I'll guide your thinking."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadedFileIds, setUploadedFileIds] = useState([]);
  const fileRef = useRef();
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function cleanText(text) {
    return text.replace(/\n{3,}/g, "\n\n"); // limit multiple newlines
  }

  function onFilesSelected(e) {
    const sel = Array.from(e.target.files || []);
    if (sel.length === 0) return;
    setFiles(prev => [...prev, ...sel]);
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

    const userMsg = { role: "user", content: input || "(uploaded file)" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let newFileIds = [];
    if (files.length > 0) {
      newFileIds = await uploadFilesSequentially(files);
      setUploadedFileIds(prev => [...prev, ...newFileIds]);
      setFiles([]);
    }

    const payloadMessages = [...messages, userMsg];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          fileIds: [...uploadedFileIds, ...newFileIds],
        }),
      });

      const json = await res.json();
      let replyText = "";
      if (!json) replyText = "No response from server.";
      else if (typeof json.reply === "string") replyText = json.reply;
      else if (json.reply?.content) replyText = json.reply.content;
      else if (json.reply?.message?.content) replyText = json.reply.message.content;
      else replyText = JSON.stringify(json.reply).slice(0, 1000);

      const assistantMsg = { role: "assistant", content: replyText };
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
    <main style={{ padding: 16, display: "flex", justifyContent: "center" }}>
      <div style={{
        width: "100%",
        maxWidth: 900,
        height: "80vh",
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 8px 30px rgba(2,6,23,0.08)",
        background: "white"
      }}>
        <header style={{
          padding: 14,
          borderBottom: "1px solid #eef2f7",
          display: "flex",
          alignItems: "center"
        }}>
          <div style={{ fontWeight: 700 }}>SAIS AI Tutor</div>
        </header>

        <section style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "#0ea5e9" : "#f3f4f6",
              color: m.role === "user" ? "white" : "#0f172a",
              padding: "10px 14px",
              borderRadius: 10,
              maxWidth: "80%",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            }}>
              {m.role === "assistant" ? (
                <ReactMarkdown>{cleanText(m.content)}</ReactMarkdown>
              ) : (
                cleanText(m.content)
              )}
            </div>
          ))}

          {isLoading && (
            <div style={{
              alignSelf: "flex-start",
              background: "#f3f4f6",
              padding: "10px 14px",
              borderRadius: 10,
              color: "#374151",
              fontStyle: "italic",
              animation: "fadeInOut 1.6s ease-in-out infinite"
            }}>
              Thinking…
            </div>
          )}

          <div ref={bottomRef} />
        </section>

        <div style={{ padding: 12, borderTop: "1px solid #eef2f7", display: "flex", gap: 8, alignItems: "flex-end" }}>
          <label style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 8,
            background: "#f1f5f9",
            cursor: "pointer"
          }}>
            📎 Add files
            <input
              ref={fileRef}
              type="file"
              multiple
              onChange={onFilesSelected}
              style={{ display: "none" }}
            />
          </label>

          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message — Enter to send, Shift+Enter for a newline"
              rows={2}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #e6edf3",
                resize: "none",
                fontSize: 14
              }}
            />
            {files.length > 0 && (
              <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {files.map((f, idx) => (
                  <div key={idx} style={{
                    background: "#eef2ff",
                    padding: "6px 8px",
                    borderRadius: 8,
                    display: "inline-flex",
                    gap: 8,
                    alignItems: "center",
                    fontSize: 13
                  }}>
                    <span>{f.name}</span>
                    <button onClick={() => removeSelectedFile(idx)} style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#0f172a"
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={sendMessage}
            style={{
              background: "#0ea5e9",
              color: "white",
              border: "none",
              padding: "10px 14px",
              borderRadius: 8,
              cursor: "pointer"
            }}
            disabled={isLoading}
          >
            Send
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInOut {
          0% { opacity: 0.25; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
          100% { opacity: 0.25; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
