import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useBoardStore } from '../../stores/boardStore';
import './card.css';

interface AddCardProps {
  listId: string;
  boardId: string;
}

const AddCard: React.FC<AddCardProps> = ({ listId, boardId }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const createCard = useBoardStore(s => s.createCard);

  const handleAdd = () => {
    if (!title.trim()) return;
    createCard(listId, boardId, title.trim());
    setTitle('');
  };

  const handleCancel = () => {
    setTitle('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === 'Escape') handleCancel();
  };

  if (!isAdding) {
    return (
      <button className="add-card-btn" onClick={() => setIsAdding(true)}>
        <Plus size={16} />
        Add a card
      </button>
    );
  }

  return (
    <div className="add-card-form">
      <textarea
        className="add-card-textarea"
        placeholder="Enter a title for this card..."
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <div className="add-card-actions">
        <button className="add-card-submit" onClick={handleAdd}>Add card</button>
        <button className="add-card-cancel" onClick={handleCancel}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default AddCard;
