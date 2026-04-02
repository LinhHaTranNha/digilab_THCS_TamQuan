import React, { useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { getApiErrorMessage, sendChatMessage } from '../../services/apiService';

function renderMessageText(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, idx) => {
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a
          key={`link-${idx}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline break-all hover:text-blue-700 transition-colors"
        >
          {part}
        </a>
      );
    }

    // Preserve newlines by splitting again and adding <br/>
    const subParts = part.split('\n');
    return subParts.map((sub, sIdx) => (
      <React.Fragment key={`sub-${idx}-${sIdx}`}>
        {sub}
        {sIdx < subParts.length - 1 && <br className="mb-1" />}
      </React.Fragment>
    ));
  });
}

function ChatWidget() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Xin chào 👋 Mình là trợ lý thư viện số. Bạn cần tìm tài liệu môn nào?',
    },
  ]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) {
      return;
    }

    if (!isAuthenticated) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text },
        { role: 'assistant', text: 'Bạn cần đăng nhập để sử dụng chatbot.' },
      ]);
      setInput('');
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setSending(true);

    try {
      const data = await sendChatMessage(text);
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply || 'Mình chưa có câu trả lời phù hợp.' }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: getApiErrorMessage(error, 'Hiện chatbot đang bận. Bạn thử lại sau nhé.') },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen ? (
        <div className="w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-800">
          <div className="px-4 py-3 bg-blue-600 text-white flex items-center justify-between">
            <div>
              <p className="font-semibold">Trợ lý thư viện số</p>
              <p className="text-xs text-blue-100">Hỏi tài liệu, môn học, lớp...</p>
            </div>
            <button
              type="button"
              className="text-sm text-blue-100 hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              Đóng
            </button>
          </div>

          <div className="h-80 overflow-y-auto p-3 space-y-2 bg-slate-50">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[90%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  message.role === 'user'
                    ? 'ml-auto bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                {renderMessageText(message.text)}
              </div>
            ))}
            {sending && (
              <div className="bg-white border border-slate-200 text-slate-500 max-w-[85%] px-3 py-2 rounded-xl text-sm">
                Đang trả lời...
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Nhập câu hỏi..."
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
            >
              Gửi
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-blue-600 text-white px-5 py-3 shadow-lg hover:bg-blue-700"
        >
          💬 Chatbot
        </button>
      )}
    </div>
  );
}

export default ChatWidget;
