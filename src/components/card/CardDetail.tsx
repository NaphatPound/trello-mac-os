import React, { useState } from 'react';
import {
  X, CreditCard, AlignLeft, CheckSquare, Clock, Tag, User, MessageSquare,
  Palette, Trash2, Archive, Plus, MoreHorizontal
} from 'lucide-react';
import { Card as CardType, Board } from '../../types';
import { useBoardStore } from '../../stores/boardStore';
import { formatDueDate, getDueDateStatus, getChecklistProgress, formatTimeAgo, getInitials } from '../../utils/helpers';
import { LABEL_COLORS, COVER_COLORS } from '../../utils/colors';
import Avatar from '../common/Avatar';
import './card-detail.css';

interface CardDetailProps {
  card: CardType;
  board: Board;
  onClose: () => void;
}

const CardDetail: React.FC<CardDetailProps> = ({ card, board, onClose }) => {
  const [editTitle, setEditTitle] = useState(card.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editDesc, setEditDesc] = useState(card.description || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showLabels, setShowLabels] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showDueDate, setShowDueDate] = useState(false);
  const [showCover, setShowCover] = useState(false);
  const [checklistTitle, setChecklistTitle] = useState('Checklist');
  const [newChecklistItems, setNewChecklistItems] = useState<Record<string, string>>({});
  const [dueInput, setDueInput] = useState(card.dueDate ? card.dueDate.split('T')[0] : '');

  const updateCard = useBoardStore(s => s.updateCard);
  const deleteCard = useBoardStore(s => s.deleteCard);
  const archiveCard = useBoardStore(s => s.archiveCard);
  const addChecklist = useBoardStore(s => s.addChecklist);
  const deleteChecklist = useBoardStore(s => s.deleteChecklist);
  const addChecklistItem = useBoardStore(s => s.addChecklistItem);
  const toggleChecklistItem = useBoardStore(s => s.toggleChecklistItem);
  const deleteChecklistItem = useBoardStore(s => s.deleteChecklistItem);
  const addComment = useBoardStore(s => s.addComment);
  const deleteComment = useBoardStore(s => s.deleteComment);
  const lists = useBoardStore(s => s.lists);
  const currentList = lists[card.listId];

  const cardLabels = board.labels.filter(l => card.labelIds.includes(l.id));
  const dueDateStatus = card.dueDate ? getDueDateStatus(card.dueDate, card.isDueDateComplete) : null;

  const handleSaveTitle = () => {
    if (editTitle.trim()) updateCard(card.id, { title: editTitle.trim() });
    setIsEditingTitle(false);
  };

  const handleSaveDesc = () => {
    updateCard(card.id, { description: editDesc });
    setIsEditingDesc(false);
  };

  const handleToggleLabel = (labelId: string) => {
    const newLabels = card.labelIds.includes(labelId)
      ? card.labelIds.filter(id => id !== labelId)
      : [...card.labelIds, labelId];
    updateCard(card.id, { labelIds: newLabels });
  };

  const handleAddChecklist = () => {
    addChecklist(card.id, checklistTitle);
    setChecklistTitle('Checklist');
    setShowChecklist(false);
  };

  const handleAddChecklistItem = (checklistId: string) => {
    const text = newChecklistItems[checklistId];
    if (text?.trim()) {
      addChecklistItem(card.id, checklistId, text.trim());
      setNewChecklistItems(prev => ({ ...prev, [checklistId]: '' }));
    }
  };

  const handleAddComment = () => {
    if (commentText.trim()) {
      addComment(card.id, commentText.trim());
      setCommentText('');
    }
  };

  const handleSetDueDate = () => {
    if (dueInput) {
      updateCard(card.id, { dueDate: new Date(dueInput).toISOString() });
    }
    setShowDueDate(false);
  };

  const handleRemoveDueDate = () => {
    updateCard(card.id, { dueDate: undefined, isDueDateComplete: false });
    setDueInput('');
    setShowDueDate(false);
  };

  const handleDelete = () => {
    if (window.confirm('Delete this card? This cannot be undone.')) {
      deleteCard(card.id);
      onClose();
    }
  };

  return (
    <div className="card-detail-backdrop" onClick={onClose}>
      <div className="card-detail animate-scale-in" onClick={e => e.stopPropagation()}>
        <button className="card-detail-close" onClick={onClose}><X size={20} /></button>

        {/* Cover */}
        {card.coverColor && (
          <div className="card-detail-cover" style={{ backgroundColor: card.coverColor }} />
        )}

        <div className="card-detail-body">
          {/* Main Content */}
          <div className="card-detail-main">
            {/* Title */}
            <div className="card-detail-title-area">
              <CreditCard size={20} className="card-detail-icon" />
              <div style={{ flex: 1 }}>
                {isEditingTitle ? (
                  <input
                    type="text"
                    className="card-detail-title-input"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                    autoFocus
                  />
                ) : (
                  <h2 className="card-detail-title" onClick={() => setIsEditingTitle(true)}>
                    {card.title}
                  </h2>
                )}
                <p className="card-detail-list-info">
                  in list <strong>{currentList?.title || 'Unknown'}</strong>
                </p>
              </div>
            </div>

            {/* Labels, Members, Due Date Row */}
            <div className="card-detail-meta">
              {card.memberIds.length > 0 && (
                <div className="card-detail-meta-item">
                  <span className="card-detail-meta-label">Members</span>
                  <div className="card-detail-meta-avatars">
                    {board.members.filter(m => card.memberIds.includes(m.id)).map(m => (
                      <Avatar key={m.id} name={m.name} color={m.color} size="md" />
                    ))}
                  </div>
                </div>
              )}
              {cardLabels.length > 0 && (
                <div className="card-detail-meta-item">
                  <span className="card-detail-meta-label">Labels</span>
                  <div className="card-detail-meta-labels">
                    {cardLabels.map(l => (
                      <span key={l.id} className="card-detail-label-pill" style={{ backgroundColor: l.color }}>
                        {l.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {card.dueDate && (
                <div className="card-detail-meta-item">
                  <span className="card-detail-meta-label">Due date</span>
                  <div className={`card-detail-due-badge card-detail-due-badge--${dueDateStatus}`}>
                    <input
                      type="checkbox"
                      checked={card.isDueDateComplete}
                      onChange={() => updateCard(card.id, { isDueDateComplete: !card.isDueDateComplete })}
                    />
                    <span>{formatDueDate(card.dueDate)}</span>
                    {dueDateStatus === 'overdue' && <span className="card-detail-due-tag">Overdue</span>}
                    {dueDateStatus === 'due-soon' && <span className="card-detail-due-tag">Due soon</span>}
                    {dueDateStatus === 'complete' && <span className="card-detail-due-tag">Complete</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="card-detail-section">
              <div className="card-detail-section-header">
                <AlignLeft size={20} className="card-detail-icon" />
                <h3>Description</h3>
              </div>
              {isEditingDesc ? (
                <div className="card-detail-desc-edit">
                  <textarea
                    className="card-detail-desc-textarea"
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    placeholder="Add a more detailed description..."
                    autoFocus
                  />
                  <div className="card-detail-desc-actions">
                    <button className="btn-primary" onClick={handleSaveDesc}>Save</button>
                    <button className="btn-secondary" onClick={() => { setEditDesc(card.description || ''); setIsEditingDesc(false); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div
                  className={`card-detail-desc-display ${!card.description ? 'card-detail-desc-empty' : ''}`}
                  onClick={() => setIsEditingDesc(true)}
                >
                  {card.description || 'Add a more detailed description...'}
                </div>
              )}
            </div>

            {/* Checklists */}
            {card.checklists.map(checklist => {
              const progress = getChecklistProgress(checklist.items);
              return (
                <div key={checklist.id} className="card-detail-section">
                  <div className="card-detail-section-header">
                    <CheckSquare size={20} className="card-detail-icon" />
                    <h3>{checklist.title}</h3>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => deleteChecklist(card.id, checklist.id)}
                      style={{ marginLeft: 'auto' }}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="checklist-progress">
                    <span className="checklist-progress-text">{progress.percent}%</span>
                    <div className="checklist-progress-bar">
                      <div
                        className={`checklist-progress-fill ${progress.percent === 100 ? 'checklist-progress-fill--complete' : ''}`}
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>
                  <div className="checklist-items">
                    {checklist.items.map(item => (
                      <div key={item.id} className="checklist-item">
                        <input
                          type="checkbox"
                          checked={item.isChecked}
                          onChange={() => toggleChecklistItem(card.id, checklist.id, item.id)}
                        />
                        <span className={`checklist-item-text ${item.isChecked ? 'checklist-item-text--checked' : ''}`}>
                          {item.text}
                        </span>
                        <button
                          className="checklist-item-delete"
                          onClick={() => deleteChecklistItem(card.id, checklist.id, item.id)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="checklist-add-item">
                      <input
                        type="text"
                        placeholder="Add an item..."
                        value={newChecklistItems[checklist.id] || ''}
                        onChange={e => setNewChecklistItems(prev => ({ ...prev, [checklist.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem(checklist.id)}
                      />
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => handleAddChecklistItem(checklist.id)}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Comments */}
            <div className="card-detail-section">
              <div className="card-detail-section-header">
                <MessageSquare size={20} className="card-detail-icon" />
                <h3>Activity</h3>
              </div>
              <div className="comment-input-area">
                <Avatar name="You" color="#0079BF" size="md" />
                <div className="comment-input-wrapper">
                  <textarea
                    className="comment-textarea"
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  {commentText && (
                    <button className="btn-primary" onClick={handleAddComment}>Save</button>
                  )}
                </div>
              </div>
              <div className="comment-list">
                {card.comments.map(comment => (
                  <div key={comment.id} className="comment">
                    <Avatar name="You" color="#0079BF" size="md" />
                    <div className="comment-body">
                      <div className="comment-header">
                        <span className="comment-author">You</span>
                        <span className="comment-time">{formatTimeAgo(comment.createdAt)}</span>
                      </div>
                      <p className="comment-text">{comment.text}</p>
                      <div className="comment-actions-row">
                        <button onClick={() => deleteComment(card.id, comment.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="card-detail-sidebar">
            <span className="card-detail-sidebar-title">Add to card</span>

            {/* Members */}
            <button
              className="card-detail-action-btn"
              onClick={() => {
                const memberId = 'member-1';
                const newMembers = card.memberIds.includes(memberId)
                  ? card.memberIds.filter(id => id !== memberId)
                  : [...card.memberIds, memberId];
                updateCard(card.id, { memberIds: newMembers });
              }}
            >
              <User size={16} />
              {card.memberIds.includes('member-1') ? 'Leave' : 'Join'}
            </button>

            {/* Labels */}
            <div style={{ position: 'relative' }}>
              <button className="card-detail-action-btn" onClick={() => setShowLabels(!showLabels)}>
                <Tag size={16} /> Labels
              </button>
              {showLabels && (
                <div className="card-detail-popover">
                  <div className="card-detail-popover-header">
                    <span>Labels</span>
                    <button onClick={() => setShowLabels(false)}><X size={14} /></button>
                  </div>
                  <div className="card-detail-popover-body">
                    {board.labels.map(label => (
                      <label key={label.id} className="label-option">
                        <input
                          type="checkbox"
                          checked={card.labelIds.includes(label.id)}
                          onChange={() => handleToggleLabel(label.id)}
                        />
                        <span className="label-option-color" style={{ backgroundColor: label.color }}>
                          {label.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Checklist */}
            <div style={{ position: 'relative' }}>
              <button className="card-detail-action-btn" onClick={() => setShowChecklist(!showChecklist)}>
                <CheckSquare size={16} /> Checklist
              </button>
              {showChecklist && (
                <div className="card-detail-popover">
                  <div className="card-detail-popover-header">
                    <span>Add checklist</span>
                    <button onClick={() => setShowChecklist(false)}><X size={14} /></button>
                  </div>
                  <div className="card-detail-popover-body">
                    <input
                      type="text"
                      className="popover-input"
                      value={checklistTitle}
                      onChange={e => setChecklistTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddChecklist()}
                      autoFocus
                    />
                    <button className="btn-primary btn-sm" onClick={handleAddChecklist}>Add</button>
                  </div>
                </div>
              )}
            </div>

            {/* Due Date */}
            <div style={{ position: 'relative' }}>
              <button className="card-detail-action-btn" onClick={() => setShowDueDate(!showDueDate)}>
                <Clock size={16} /> Due date
              </button>
              {showDueDate && (
                <div className="card-detail-popover">
                  <div className="card-detail-popover-header">
                    <span>Due date</span>
                    <button onClick={() => setShowDueDate(false)}><X size={14} /></button>
                  </div>
                  <div className="card-detail-popover-body">
                    <input
                      type="date"
                      className="popover-input"
                      value={dueInput}
                      onChange={e => setDueInput(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-primary btn-sm" onClick={handleSetDueDate}>Save</button>
                      <button className="btn-secondary btn-sm" onClick={handleRemoveDueDate}>Remove</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cover */}
            <div style={{ position: 'relative' }}>
              <button className="card-detail-action-btn" onClick={() => setShowCover(!showCover)}>
                <Palette size={16} /> Cover
              </button>
              {showCover && (
                <div className="card-detail-popover">
                  <div className="card-detail-popover-header">
                    <span>Cover</span>
                    <button onClick={() => setShowCover(false)}><X size={14} /></button>
                  </div>
                  <div className="card-detail-popover-body">
                    <div className="cover-color-grid">
                      {COVER_COLORS.map(color => (
                        <button
                          key={color}
                          className={`cover-color-btn ${card.coverColor === color ? 'cover-color-btn--selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => updateCard(card.id, { coverColor: color })}
                        />
                      ))}
                    </div>
                    {card.coverColor && (
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => updateCard(card.id, { coverColor: undefined })}
                        style={{ marginTop: 8 }}
                      >
                        Remove cover
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <span className="card-detail-sidebar-title" style={{ marginTop: 16 }}>Actions</span>
            <button className="card-detail-action-btn" onClick={() => { archiveCard(card.id); onClose(); }}>
              <Archive size={16} /> Archive
            </button>
            <button className="card-detail-action-btn card-detail-action-btn--danger" onClick={handleDelete}>
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetail;
