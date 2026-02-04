// Small helper service to talk to your backend AI chatbot endpoints
const API_BASE = process.env.REACT_APP_API_BASE || '';

function getSessionId() {
  // Use sessionStorage so the conversation is cleared when the browser tab
  // or window is closed. This matches the user's request to not persist
  // chat sessions across browser restarts.
  let s = sessionStorage.getItem('pf_chat_session');
  if (!s) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      s = crypto.randomUUID();
    } else {
      s = 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
    }
    sessionStorage.setItem('pf_chat_session', s);
  }
  return s;
}

async function initConversation(userId) {
  const sessionId = getSessionId();
  const res = await fetch(`${API_BASE}/api/ai-chatbot/conversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, userId }),
  });
  return res.json();
}

async function sendMessage(message, userId) {
  const sessionId = getSessionId();
  const res = await fetch(`${API_BASE}/api/ai-chatbot/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message, userId }),
  });
  return res.json();
}

async function getSuggestions(context) {
  const sessionId = getSessionId();
  const res = await fetch(`${API_BASE}/api/ai-chatbot/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, context }),
  });
  return res.json();
}

module.exports = {
  getSessionId,
  initConversation,
  sendMessage,
  getSuggestions,
};