import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const EditQuestionDialog = ({ isOpen, onClose, question, onSave }) => {
  const [editedAnswer, setEditedAnswer] = useState('');
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (question) {
      setEditedAnswer(question.answer || '');
    }
  }, [question]); 

  const handleSave = () => {
    onSave(question.question_id, editedAnswer);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className={`relative p-6 rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300 ${isOpen ? 'scale-100' : 'scale-95'} ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Edit Answer
        </h3>
        {question && (
          <div className="mb-4">
            <p className={`font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Question:
            </p>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
              {question.question_text}
            </p>
          </div>
        )}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Your Answer:</label>
          <textarea
            className={`w-full p-3 rounded-lg resize-none ${isDarkMode ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'} focus:ring-purple-500 focus:border-purple-500`}
            rows="6"
            value={editedAnswer}
            onChange={(e) => setEditedAnswer(e.target.value)}
          ></textarea>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditQuestionDialog;
