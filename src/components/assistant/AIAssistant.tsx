import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Loader2, CheckCircle2, AlertCircle, Terminal, ImagePlus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Board } from '../../types';
import { useBoardStore } from '../../stores/boardStore';
import { analyzeRequirements, chatWithImage } from '../../services/ai';
import { createRunnerTask } from '../../services/claudeRunner';
import './ai-assistant.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  createdCards?: string[];
  isLoading?: boolean;
  isError?: boolean;
}

interface AIAssistantProps {
  board: Board;
  onClose: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ board, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi! I'm your AI assistant for the "${board.title}" board. Describe your project requirements and I'll automatically break them down into tasks and create cards in your To Do list.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ base64: string; previewUrl: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lists = useBoardStore(s => s.lists);
  const createCard = useBoardStore(s => s.createCard);
  const updateCard = useBoardStore(s => s.updateCard);
  const addChecklist = useBoardStore(s => s.addChecklist);
  const addChecklistItem = useBoardStore(s => s.addChecklistItem);
  const createLabel = useBoardStore(s => s.createLabel);

  const todoList = board.listIds
    .map(id => lists[id])
    .filter(Boolean)
    .find(l => {
      const t = l.title.toLowerCase();
      return t.includes('to do') || t === 'todo' || t === 'backlog';
    }) ?? (board.listIds.length > 0 ? lists[board.listIds[0]] : null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const WORKING_DIR = import.meta.env.VITE_CLAUDE_RUNNER_WORKING_DIR || '';

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Extract base64 without the data:image/xxx;base64, prefix
      const base64 = dataUrl.split(',')[1];
      setPendingImage({ base64, previewUrl: dataUrl });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleSendImage = async () => {
    if (!pendingImage || isLoading) return;
    const prompt = input.trim() || 'What is in this image? Describe it in detail.';
    const imagePreview = pendingImage.previewUrl;
    const imageBase64 = pendingImage.base64;

    const userMsg: Message = { id: uuidv4(), role: 'user', content: prompt, imageUrl: imagePreview };
    const loadingId = uuidv4();
    setMessages(prev => [...prev, userMsg, { id: loadingId, role: 'assistant', content: '', isLoading: true }]);
    setInput('');
    setPendingImage(null);
    setIsLoading(true);

    try {
      const onChunk = (partial: string) => {
        setMessages(prev => prev.map(m =>
          m.id === loadingId ? { ...m, content: partial, isLoading: true } : m
        ));
      };

      const result = await chatWithImage(prompt, imageBase64, onChunk);

      const response: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: result,
      };
      setMessages(prev => prev.filter(m => m.id !== loadingId).concat(response));
    } catch (e) {
      const raw = String(e);
      const friendly = raw.includes('401') || raw.includes('403')
        ? 'Authentication failed. Check VITE_OLLAMA_API_KEY.'
        : raw.includes('does not support images') || raw.includes('vision')
        ? 'This model does not support image analysis. Try a vision model like llava or bakllava.'
        : `Error analyzing image: ${raw}`;
      setMessages(prev => prev.filter(m => m.id !== loadingId).concat({
        id: uuidv4(), role: 'assistant', content: friendly, isError: true,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunWithClaude = async () => {
    if (!input.trim() || isLoading) return;
    const prompt = input.trim();
    const userMsg: Message = { id: uuidv4(), role: 'user', content: `[Claude Code] ${prompt}` };
    const loadingId = uuidv4();
    setMessages(prev => [...prev, userMsg, { id: loadingId, role: 'assistant', content: 'Starting Claude Code task...', isLoading: true }]);
    setInput('');
    setIsLoading(true);
    try {
      const task = await createRunnerTask(prompt, WORKING_DIR || undefined);

      // Also create a card for tracking if we have a list
      if (todoList) {
        const card = createCard(todoList.id, board.id, prompt.slice(0, 60));
        updateCard(card.id, {
          description: prompt,
          claudeTaskId: task.id,
          claudeTaskStatus: task.status,
        });
      }

      const response: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `Claude Code task started! Task ID: ${task.id.slice(0, 8)}...\nStatus: ${task.status}\n\nA tracking card has been created. The task will auto-move to "Done" when completed.`,
      };
      setMessages(prev => prev.filter(m => m.id !== loadingId).concat(response));
    } catch (e) {
      const errorMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `Failed to start Claude Code task: ${String(e)}.\nMake sure Claude Code Runner is running at localhost:3456.`,
        isError: true,
      };
      setMessages(prev => prev.filter(m => m.id !== loadingId).concat(errorMsg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdd = () => {
    if (!input.trim() || isLoading) return;
    if (!todoList) {
      setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: 'No list found. Please create a list first.', isError: true }]);
      return;
    }
    const title = input.trim();
    createCard(todoList.id, board.id, title);
    setInput('');
    setMessages(prev => [...prev,
      { id: uuidv4(), role: 'user', content: title },
      { id: uuidv4(), role: 'assistant', content: `Quick-added 1 card in "${todoList.title}":`, createdCards: [title] },
    ]);
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: uuidv4(), role: 'user', content: input.trim() };
    const loadingId = uuidv4();
    const loadingMessage: Message = { id: loadingId, role: 'assistant', content: '', isLoading: true };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (!todoList) {
        throw new Error('No list found to add cards to. Please create a list first.');
      }

      const existingLabels = board.labels.map(l => ({ name: l.name, color: l.color }));

      // Show streaming tokens in the loading bubble
      const onChunk = (partial: string) => {
        setMessages(prev => prev.map(m =>
          m.id === loadingId ? { ...m, content: partial } : m
        ));
      };

      const tasks = await analyzeRequirements(userMessage.content, existingLabels, onChunk);

      const createdTitles: string[] = [];

      // Sort tasks by taskOrder so they appear in order in the list
      const sortedTasks = [...tasks].sort((a, b) => (a.taskOrder ?? 99) - (b.taskOrder ?? 99));

      for (const task of sortedTasks) {
        const card = createCard(todoList.id, board.id, task.title);

        // Apply priority, group, order
        const cardUpdate: Record<string, unknown> = {};
        if (task.description) cardUpdate.description = task.description;
        if (task.priority) cardUpdate.priority = task.priority;
        if (task.taskGroup) cardUpdate.taskGroup = task.taskGroup;
        if (task.taskOrder != null) cardUpdate.taskOrder = task.taskOrder;
        if (Object.keys(cardUpdate).length > 0) updateCard(card.id, cardUpdate);

        for (const labelSpec of task.labels ?? []) {
          const { boards } = useBoardStore.getState();
          const freshBoard = boards[board.id];
          const existing = freshBoard?.labels.find(l => l.name === labelSpec.name);
          const labelId = existing
            ? existing.id
            : createLabel(board.id, labelSpec.name, labelSpec.color).id;
          const freshCard = useBoardStore.getState().cards[card.id];
          if (freshCard && !freshCard.labelIds.includes(labelId)) {
            updateCard(card.id, { labelIds: [...freshCard.labelIds, labelId] });
          }
        }

        if (task.checklist && task.checklist.length > 0) {
          addChecklist(card.id, 'Tasks');
          const freshCard = useBoardStore.getState().cards[card.id];
          const checklist = freshCard?.checklists[freshCard.checklists.length - 1];
          if (checklist) {
            for (const item of task.checklist) {
              addChecklistItem(card.id, checklist.id, item);
            }
          }
        }

        const priorityIcon = task.priority === 'critical' ? '🔴' : task.priority === 'high' ? '🟠' : task.priority === 'medium' ? '🟡' : '🟢';
        const groupInfo = task.taskGroup ? ` [${task.taskGroup}${task.taskOrder ? ` #${task.taskOrder}` : ''}]` : '';
        createdTitles.push(`${priorityIcon} ${task.title}${groupInfo}`);
      }

      // Count groups
      const groups = [...new Set(sortedTasks.map(t => t.taskGroup).filter(Boolean))];
      const groupSummary = groups.length > 0 ? `\nGroups: ${groups.join(', ')}` : '';

      const response: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `I've created ${tasks.length} task${tasks.length !== 1 ? 's' : ''} with priorities and execution order:${groupSummary}\n\nDrag the first card to "In Progress" to start. When it completes, the next one will auto-start.`,
        createdCards: createdTitles,
      };
      setMessages(prev => prev.filter(m => m.id !== loadingId).concat(response));
    } catch (e) {
      const raw = String(e);
      const friendly = raw.includes('401') || raw.includes('403')
        ? 'Authentication failed. Check VITE_OLLAMA_API_KEY in your .env file.'
        : raw.includes('500')
        ? 'Ollama server error (500). The model may be unavailable — try again in a moment.'
        : raw.includes('fetch') || raw.includes('Failed to fetch')
        ? 'Could not reach the Ollama server. Check your connection and VITE_OLLAMA_BASE_URL.'
        : `Sorry, I ran into an error: ${raw}`;
      const errorMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: friendly,
        isError: true,
      };
      setMessages(prev => prev.filter(m => m.id !== loadingId).concat(errorMsg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (pendingImage) {
        handleSendImage();
      } else {
        handleSubmit();
      }
    }
  };

  return (
    <div className="ai-assistant">
      <div className="ai-assistant-header">
        <div className="ai-assistant-title">
          <Bot size={18} />
          <span>AI Assistant</span>
        </div>
        <button className="ai-assistant-close" onClick={onClose} title="Close">
          <X size={16} />
        </button>
      </div>

      <div className="ai-assistant-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`ai-msg ai-msg--${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="ai-msg-avatar">
                <Bot size={13} />
              </div>
            )}
            <div className={`ai-msg-bubble${msg.isError ? ' ai-msg-bubble--error' : ''}`}>
              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="Uploaded" className="ai-msg-image" />
              )}
              {msg.isLoading ? (
                <div className="ai-msg-loading">
                  <Loader2 size={14} className="ai-spin" />
                  {msg.content
                    ? <span className="ai-msg-stream">{msg.content}</span>
                    : <span>Analyzing{msg.imageUrl ? ' image' : ''}…</span>
                  }
                </div>
              ) : (
                <>
                  {msg.isError && <AlertCircle size={14} style={{ flexShrink: 0 }} />}
                  <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  {msg.createdCards && (
                    <ul className="ai-created-list">
                      {msg.createdCards.map((title, i) => (
                        <li key={i}>
                          <CheckCircle2 size={12} />
                          <span>{title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-assistant-footer">
        {/* Image Preview */}
        {pendingImage && (
          <div className="ai-image-preview">
            <img src={pendingImage.previewUrl} alt="Preview" />
            <button className="ai-image-preview-remove" onClick={() => setPendingImage(null)} title="Remove image">
              <X size={14} />
            </button>
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="ai-assistant-input"
          placeholder={pendingImage ? "Ask about this image… (Enter to send)" : "Describe requirements for AI analysis, or upload an image…"}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={isLoading}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />
        <div className="ai-assistant-actions">
          <button
            className="ai-image-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Upload image for AI analysis"
          >
            <ImagePlus size={16} />
          </button>
          {!pendingImage ? (
            <>
              <button
                className="ai-quick-add-btn"
                onClick={handleQuickAdd}
                disabled={!input.trim() || isLoading}
                title="Quick Add — create card directly without AI"
              >
                + Quick Add
              </button>
              <button
                className="ai-claude-run-btn"
                onClick={handleRunWithClaude}
                disabled={!input.trim() || isLoading}
                title="Run as Claude Code task"
              >
                <Terminal size={14} />
                Run
              </button>
              <button
                className="ai-assistant-send"
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                title="Analyze with AI (Enter)"
              >
                {isLoading ? <Loader2 size={16} className="ai-spin" /> : <Send size={16} />}
              </button>
            </>
          ) : (
            <button
              className="ai-assistant-send"
              onClick={handleSendImage}
              disabled={isLoading}
              title="Send image to AI (Enter)"
            >
              {isLoading ? <Loader2 size={16} className="ai-spin" /> : <Send size={16} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
