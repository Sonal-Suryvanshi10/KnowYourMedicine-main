import { useEffect, useRef, useState } from 'react'
import { Bot, MessageCircle, Send, ShieldCheck, X } from 'lucide-react'
import { api } from '../api.js'

const welcomeMessage = {
  role: 'assistant',
  content: 'Hello! I can share general information about medicines. I cannot diagnose a condition or recommend a personal dose. What would you like to know?',
}

const suggestedQuestions = [
  'What information should I check on a medicine label?',
  'What should I ask my pharmacist about side effects?',
]

export default function MedicineAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([welcomeMessage])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const messageListRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const openAssistant = () => setIsOpen(true)
    window.addEventListener('open-medicine-assistant', openAssistant)
    return () => window.removeEventListener('open-medicine-assistant', openAssistant)
  }, [])

  useEffect(() => {
    if (isOpen) {
      messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [isOpen, messages, busy])

  const sendMessage = async event => {
    event.preventDefault()
    const content = input.trim()
    if (!content || busy) return

    const conversation = [...messages, { role: 'user', content }]
    setMessages(conversation)
    setInput('')
    setBusy(true)
    setError('')
    try {
      const history = conversation.slice(1).slice(-8)
      if (history[0]?.role === 'assistant') history.shift()
      const { data } = await api.post('/assistant', { messages: history }, { timeout: 0 })
      setMessages(previous => [...previous, { role: 'assistant', content: data.reply }])
    } catch (requestError) {
      setError(requestError.userMessage || 'The assistant is unavailable right now. Please try again later.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="medicine-assistant">
    {isOpen && <section className="assistant-panel" aria-label="Medicine information assistant">
      <header className="assistant-header">
        <span className="assistant-avatar"><Bot size={21}/></span>
        <div><b>Medicine Assistant</b><small>General information only</small></div>
        <button className="assistant-close" onClick={() => setIsOpen(false)} aria-label="Close assistant"><X size={19}/></button>
      </header>
      <div className="assistant-safety"><ShieldCheck size={15}/><span>Not a doctor. Never change a medicine or dose based on chat advice.</span></div>
      <div className="assistant-messages" ref={messageListRef} aria-live="polite">
        {messages.map((message, index) => <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === 'assistant' && <Bot size={14}/>}</span><p>{message.content}</p></div>)}
        {messages.length === 1 && <div className="assistant-suggestions">{suggestedQuestions.map(question => <button key={question} onClick={() => setInput(question)}>{question}</button>)}</div>}
        {busy && <div className="assistant-typing" role="status">Thinking…</div>}
        {error && <p className="assistant-error" role="alert">{error}</p>}
      </div>
      <form className="assistant-input" onSubmit={sendMessage}>
        <label className="sr-only" htmlFor="medicine-assistant-message">Ask a general medicine question</label>
        <input ref={inputRef} id="medicine-assistant-message" value={input} onChange={event => setInput(event.target.value)} placeholder="Ask a general question…" maxLength={1000} disabled={busy}/>
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send message"><Send size={17}/></button>
      </form>
      <small className="assistant-disclaimer">For personal advice, speak with a licensed doctor or pharmacist.</small>
    </section>}
    <button className={`assistant-launcher${isOpen ? ' is-open' : ''}`} onClick={() => setIsOpen(open => !open)} aria-label={isOpen ? 'Close medicine assistant' : 'Open medicine assistant'} aria-expanded={isOpen}>
      {isOpen ? <X size={22}/> : <><MessageCircle size={21}/><span>Ask about medicines</span></>}
    </button>
  </div>
}
