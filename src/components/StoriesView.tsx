import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { STORY_CATEGORIES, type StoryCategory, type StorySubtype } from '@/data/storyTypes';
import gemIcon from 'figma:asset/53dc6cf554f69e479cfbd60a46741f158d11dd21.png';
import { CoalIcon } from './GemCheckCoalReviewPanel';

interface StoriesViewProps {
  brand: string;
  iterationDirections: string[];
  onGenerate: (params: { category: StoryCategory; subtype: StorySubtype }) => void;
  onAddIterationDirection?: (direction: string) => void;
  onSaveRecommendation?: (recommendation: string, hexId: string) => void;
  userEmail?: string;
  userRole?: string;
  projectType?: string;
}

const ARC_LABEL: Record<string, string> = {
  'rise': '↑ Rise',
  'fall': '↓ Fall',
  'fall-rise': '↓↑',
  'rise-fall': '↑↓',
  'rise-fall-rise': '↑↓↑',
  'fall-rise-fall': '↓↑↓',
};

export function StoriesView({
  brand,
  iterationDirections,
  onGenerate,
  onAddIterationDirection,
  onSaveRecommendation,
  userEmail = 'user@cohive.app',
  userRole = 'user',
  projectType = '',
}: StoriesViewProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubtypeId, setSelectedSubtypeId] = useState<string | null>(null);
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [directionText, setDirectionText] = useState('');
  const [sendToKnowledgeBase, setSendToKnowledgeBase] = useState(false);
  const [recommendationText, setRecommendationText] = useState('');
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugReportText, setBugReportText] = useState('');
  const [bugReportSending, setBugReportSending] = useState(false);

  const selectedCategory = STORY_CATEGORIES.find(c => c.id === selectedCategoryId) ?? null;
  const selectedSubtype = selectedCategory?.subtypes.find(s => s.id === selectedSubtypeId) ?? null;

  const handleCategoryChange = (id: string) => {
    const cat = STORY_CATEGORIES.find(c => c.id === id);
    setSelectedCategoryId(id);
    // Auto-select if there's only one subtype — no second click needed
    setSelectedSubtypeId(cat?.subtypes.length === 1 ? cat.subtypes[0].id : null);
  };

  const handleGenerate = () => {
    if (!selectedCategory || !selectedSubtype) return;
    onGenerate({ category: selectedCategory, subtype: selectedSubtype });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-gray-900 leading-tight mb-3">Select a Story Type</h3>

      {/* Category + subtype radio selector */}
      <div className="space-y-0">
        {STORY_CATEGORIES.map(cat => (
          <div key={cat.id}>
            <label className="flex items-start gap-2 p-0.5 cursor-pointer hover:bg-gray-50 rounded transition-colors">
              <input
                type="radio"
                name="storyCategory"
                value={cat.id}
                checked={selectedCategoryId === cat.id}
                onChange={() => handleCategoryChange(cat.id)}
                className="w-4 h-4 mt-0.5"
              />
              <div>
                <span className="text-gray-900 font-semibold">{cat.label}</span>
                <span className="text-sm text-gray-600 font-normal ml-2">{cat.description}</span>
              </div>
            </label>

            {selectedCategoryId === cat.id && cat.subtypes.length > 1 && (
              <div style={{ marginLeft: '24px', paddingLeft: '12px', borderLeft: '3px solid #d8b4fe', marginTop: '4px', marginBottom: '4px' }}>
                {cat.subtypes.map(sub => (
                  <label key={sub.id} className="flex items-start gap-2 p-0.5 cursor-pointer hover:bg-gray-50 rounded transition-colors">
                    <input
                      type="radio"
                      name="storySubtype"
                      value={sub.id}
                      checked={selectedSubtypeId === sub.id}
                      onChange={() => setSelectedSubtypeId(sub.id)}
                      className="w-4 h-4 mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-gray-800 font-medium">{sub.label}</span>
                      <span className="text-xs text-gray-400 font-mono ml-2">{ARC_LABEL[sub.arc]}</span>
                      {sub.dualPOV && (
                        <span className="text-xs ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded">dual POV</span>
                      )}
                      <div className="text-xs text-gray-500 leading-snug">{sub.arcDescription}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!selectedSubtype}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all mt-2 ${
          selectedSubtype
            ? 'bg-purple-700 hover:bg-purple-800 text-white'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        {selectedSubtype ? `Generate ${selectedSubtype.label} Story` : 'Select a story to generate'}
      </button>

      {brand && selectedSubtype && (
        <p className="text-xs text-center text-gray-400">
          Story will be generated for <strong>{brand}</strong>
        </p>
      )}

      {/* ── notices ── */}
      <div className="p-3 border-t-2 border-gray-300 mt-4 space-y-3">

        {/* Add Direction / Focus */}
        <div>
          <label
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setShowDirectionModal(true)}
          >
            <input
              type="checkbox"
              checked={iterationDirections.length > 0}
              onChange={() => setShowDirectionModal(true)}
              className="w-4 h-4 accent-purple-600"
              readOnly
            />
            <span className="text-gray-900">Add insight, focus or direction to remaining prompts</span>
          </label>
          {iterationDirections.length > 0 && (
            <div className="mt-2 ml-6 space-y-1">
              {iterationDirections.map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-purple-800 bg-purple-50 border border-purple-200 rounded px-2 py-1">
                  <span className="mt-0.5">→</span>
                  <span className="flex-1">{d.length > 80 ? d.substring(0, 80) + '…' : d}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Send Recommendations to Knowledge Base */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendToKnowledgeBase}
              onChange={e => setSendToKnowledgeBase(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-gray-900">Send Recommendations to Knowledge Base</span>
          </label>
          {sendToKnowledgeBase && (
            <div className="space-y-2 ml-7 mt-2">
              <textarea
                className="w-full h-24 border-2 border-gray-300 bg-white rounded p-2 text-gray-700 resize-none focus:outline-none focus:border-blue-500 text-sm"
                placeholder="Enter your recommendations for the knowledge base..."
                value={recommendationText}
                onChange={e => setRecommendationText(e.target.value)}
              />
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                disabled={!recommendationText.trim()}
                onClick={() => {
                  if (recommendationText.trim() && onSaveRecommendation) {
                    onSaveRecommendation(recommendationText, 'stories');
                    alert('Recommendation saved to Knowledge base!');
                    setRecommendationText('');
                    setSendToKnowledgeBase(false);
                  }
                }}
              >
                Save to Knowledge base
              </button>
            </div>
          )}

          {/* Report Suggestions or Bugs */}
          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={showBugReport}
              onChange={(e) => { setShowBugReport(e.target.checked); setBugReportText(''); }}
              className="w-4 h-4"
            />
            <span className="text-gray-900">Report Suggestions or Bugs</span>
          </label>
          {showBugReport && (
            <div className="space-y-2 ml-7 mt-2">
              <textarea
                className="w-full h-24 border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 resize-none focus:outline-none focus:border-purple-400"
                placeholder="Share your suggestions or found bugs here:"
                value={bugReportText}
                onChange={e => setBugReportText(e.target.value)}
              />
              <button
                className="px-4 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!bugReportText.trim() || bugReportSending}
                onClick={async () => {
                  if (!bugReportText.trim()) return;
                  setBugReportSending(true);
                  try {
                    await fetch('/api/feedback/report', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: bugReportText.trim(),
                        userEmail,
                        hexId: 'stories',
                        hexLabel: 'Stories',
                        brand,
                        projectType,
                        userRole,
                      }),
                    });
                  } catch (_) {}
                  setBugReportText('');
                  setShowBugReport(false);
                  setBugReportSending(false);
                }}
              >
                Send
              </button>
            </div>
          )}
        </div>

        {/* Gem / Check / Coal legend */}
        <div className="pt-3 border-t border-gray-200 space-y-2">
          <div className="flex items-center gap-2">
            <img src={gemIcon} alt="CoHive gem icon" className="w-7 h-7 flex-shrink-0" />
            <span className="text-gray-900">Highlight elements you like</span>
          </div>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="w-7 h-7 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="storiesChkBg" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#0F766E" />
                  <stop offset="50%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#DC2626" />
                </linearGradient>
                <radialGradient id="storiesChkGold" cx="50%" cy="50%" r="30%">
                  <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
                </radialGradient>
              </defs>
              <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="url(#storiesChkBg)" />
              <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="url(#storiesChkGold)" />
              <path d="M9 16.5l5 5 9.5-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="text-gray-900">Track elements of interest</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-7 flex items-center justify-center"><CoalIcon size={22} /></span>
            <span className="text-gray-900">Flag elements you want to avoid</span>
          </div>
        </div>
      </div>

      {/* Direction modal */}
      {showDirectionModal && (
        <div className="fixed inset-y-0 left-0 z-50 flex items-center justify-center bg-black/40" style={{ right: 'var(--modal-r)', padding: 'var(--modal-p)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-gray-900 font-semibold text-base">Add insight, focus or direction</h3>
              <p className="text-gray-500 text-sm mt-1">
                What additional insight, focus or direction would you like to add to the remaining prompts in this iteration?
              </p>
            </div>
            <div className="px-6 py-4">
              <textarea
                autoFocus
                className="w-full h-32 border-2 border-gray-300 bg-white rounded-lg p-3 text-gray-800 text-sm resize-none focus:outline-none focus:border-purple-500 leading-relaxed"
                placeholder="e.g. Focus on the 18–24 age group. Lean into the sustainability angle."
                value={directionText}
                onChange={e => setDirectionText(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-2">This will be added to all remaining hex prompts in this iteration.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => { setShowDirectionModal(false); setDirectionText(''); }}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (directionText.trim() && onAddIterationDirection) {
                    onAddIterationDirection(directionText.trim());
                  }
                  setShowDirectionModal(false);
                  setDirectionText('');
                }}
                disabled={!directionText.trim()}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
              >
                Add to prompts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
