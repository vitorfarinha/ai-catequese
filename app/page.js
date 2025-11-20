"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const bottomRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  async function handleFileUpload(e) {
    const selected = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selected]);
  }

  async function sendMessage() {
    if (!input.trim() && files.length === 0) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    scrollToBottom();

    // Upload files if any
    let uploadedFileIds = [];

    if (files.length > 0) {
      const formData = new FormData();
      files.forEach(f => formData.append("files", f));

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      uploadedFileIds = uploadData.fileIds || [];
      setFiles([]); // clear after upload
    }

    // Call chat API
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...messages, userMessage],
        fileIds: uploadedFileIds,
      }),
    });

    const data = await res.json();

    const assistantMessage = {
      role: "assistant",
      content: data.reply,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
    scrollToBottom();
  }

  return (
    <main className="flex flex-col items-center justify-between min-h-screen p-4 bg-gray-100">
      <div className="w-full max-w-3xl bg-white shadow-lg rounded-lg flex flex-col p-4">
        
        <h1 className="text-xl font-semibold mb-4 text-center">
          School AI Tutor
        </h1>

        {/* CHAT WINDOW */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 max-h-[70vh] pr-2">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg max-w-[80%] ${
                msg.role === "user"
                  ? "ml-auto bg-blue-600 text-white"
                  : "mr-auto bg-gray-200"
              }`}
            >
              {msg.content}
            </div>
          ))}

          {isLoading && (
            <div className="thinking mr-auto px-3 py-2 bg-gray-200 rounded-lg max-w-[80%]">
              Thinking…
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* INPUT AREA */}
        <div className="flex items-end gap-2 mt-2">

          {/* UPLOAD BUTTON */}
          <label className="cursor-pointer bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded transition">
            📎 Add files
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* TEXTAREA */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type your message…"
            className="w-full p-3 border rounded-lg resize-none"
            rows={2}
          />

          {/* SEND BUTTON */}
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 transition"
          >
            Send
          </button>
        </div>

        {/* SHOW SELECTED FILES */}
        {files.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            Attached: {files.map(f => f.name).join(", ")}
          </div>
        )}

      </div>
    </main>
  );
}

