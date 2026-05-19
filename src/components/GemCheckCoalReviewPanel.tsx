/**
 * GemCheckCoalReviewPanel
 *
 * Appears after the user clicks "Accept & Close" in AssessmentModal,
 * but only when at least one gem/check/coal was saved during that assessment.
 *
 * The user can:
 * - Include or exclude each item (checkbox)
 * - Move items between types (Gem / Check / Coal)
 * - Reorder items within a type (up/down arrows)
 * - Items that are textually similar are placed adjacent with a subtle indicator
 *
 * On confirm:
 * - Confirmed Gems are saved to Databricks KB
 * - All three confirmed lists are passed to ProcessWireframe for injection into future prompts
 *
 * Location: src/components/GemCheckCoalReviewPanel.tsx
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { SpinHex } from './LoadingGem';
import { saveGem } from '../utils/databricksAPI';
import gemIcon from 'figma:asset/53dc6cf554f69e479cfbd60a46741f158d11dd21.png';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ItemType = 'gem' | 'check' | 'coal';

export interface ReviewItem {
  id: string;
  text: string;
  type: ItemType;
  included: boolean;
  hexId: string;
  hexLabel: string;
  fileName?: string | null;
  fileId?: string | null;
  /** index within its type group for ordering */
  rank: number;
  /** set true if textually similar to adjacent item */
  similarToNext?: boolean;
}

interface GemCheckCoalReviewPanelProps {
  isOpen: boolean;
  items: ReviewItem[];
  brand: string;
  projectType: string;
  hexLabel: string;
  userEmail: string;
  userRole: string;
  onConfirm: (confirmedItems: ReviewItem[]) => void;
  onClose: () => void;
}

// ── Icon helpers ──────────────────────────────────────────────────────────────

function GemIcon({ size = 20 }: { size?: number }) {
  return (
    <img
      src={gemIcon}
      alt="CoHive gem icon"
      style={{ width: size, height: size, flexShrink: 0, objectFit: 'contain' }}
    />
  );
}

function CheckIcon({ size = 20 }: { size?: number }) {
  const s = size;
  return (
    <svg viewBox="0 0 32 32" style={{ width: s, height: s, flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="checkBg" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#0F766E" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
        <radialGradient id="checkGold" cx="50%" cy="50%" r="30%">
          <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
        </radialGradient>
      </defs>
      <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="url(#checkBg)" />
      <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="url(#checkGold)" />
      <path d="M9 16.5l5 5 9.5-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function CoalIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      {/* Main coal lump */}
      <path d="M4 15 L7 6 L14 5 L20 9 L19 17 L12 20 L5 18 Z" fill="#1F2937" />
      {/* Dark facet top */}
      <path d="M7 6 L14 5 L12 11 Z" fill="#111827" opacity="0.8" />
      {/* Mid-gray facet right */}
      <path d="M14 5 L20 9 L14 12 Z" fill="#374151" />
      {/* Lighter gray facet left */}
      <path d="M4 15 L7 6 L11 13 Z" fill="#4B5563" />
      {/* Dark bottom facet */}
      <path d="M12 20 L19 17 L14 12 Z" fill="#111827" opacity="0.6" />
    </svg>
  );
}

// ── Similarity check ──────────────────────────────────────────────────────────

function wordsOf(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean));
}

function isSimilar(a: string, b: string): boolean {
  const wa = wordsOf(a);
  const wb = wordsOf(b);
  if (wa.size === 0 || wb.size === 0) return false;
  let shared = 0;
  wa.forEach(w => { if (wb.has(w)) shared++; });
  const jaccard = shared / (wa.size + wb.size - shared);
  // Also catch substring containment
  const al = a.toLowerCase(), bl = b.toLowerCase();
  const contained = al.includes(bl.substring(0, Math.min(30, bl.length))) ||
                    bl.includes(al.substring(0, Math.min(30, al.length)));
  return jaccard > 0.55 || contained;
}

/** Sort items so similar ones are adjacent, preserving relative order otherwise */
function sortWithSimilarAdjacent(items: ReviewItem[]): ReviewItem[] {
  if (items.length <= 1) return items;
  const result: ReviewItem[] = [];
  const used = new Set<string>();

  for (const item of items) {
    if (used.has(item.id)) continue;
    result.push(item);
    used.add(item.id);
    // Find similar items not yet placed
    for (const other of items) {
      if (!used.has(other.id) && isSimilar(item.text, other.text)) {
        result.push({ ...other, similarToNext: false });
        used.add(other.id);
      }
    }
  }

  // Mark similarToNext flags
  for (let i = 0; i < result.length - 1; i++) {
    result[i] = { ...result[i], similarToNext: isSimilar(result[i].text, result[i + 1].text) };
  }
  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ItemType, {
  label: string;
  description: string;
  bg: string;
  border: string;
  headerBg: string;
  headerText: string;
  icon: (size?: number) => JSX.Element;
}> = {
  gem: {
    label: 'Gems',
    description: 'Elements we really like',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    headerBg: 'bg-amber-100',
    headerText: 'text-amber-900',
    icon: (size) => <GemIcon size={size} />,
  },
  check: {
    label: 'Tracks',
    description: 'Elements we\'re interested in',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    headerBg: 'bg-purple-100',
    headerText: 'text-purple-900',
    icon: (size) => <CheckIcon size={size} />,
  },
  coal: {
    label: 'Coal',
    description: 'Elements to avoid',
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    headerBg: 'bg-gray-200',
    headerText: 'text-gray-900',
    icon: (size) => <CoalIcon size={size} />,
  },
};

export function GemCheckCoalReviewPanel({
  isOpen,
  items: initialItems,
  brand,
  hexLabel,
  userEmail,
  userRole,
  onConfirm,
  onClose,
}: GemCheckCoalReviewPanelProps) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Sort each type group with similar items adjacent, then combine
    const gems   = sortWithSimilarAdjacent(initialItems.filter(i => i.type === 'gem'));
    const checks = sortWithSimilarAdjacent(initialItems.filter(i => i.type === 'check'));
    const coal   = sortWithSimilarAdjacent(initialItems.filter(i => i.type === 'coal'));
    setItems([...gems, ...checks, ...coal]);
  }, [isOpen, initialItems]);

  if (!isOpen) return null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const itemsOfType = (type: ItemType) => items.filter(i => i.type === type);

  const updateItem = (id: string, patch: Partial<ReviewItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const moveItem = (id: string, dir: 'up' | 'down') => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const group = items.filter(i => i.type === item.type);
    const idx = group.findIndex(i => i.id === id);
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= group.length) return;

    // Swap in the full items array
    setItems(prev => {
      const next = [...prev];
      const ai = next.findIndex(i => i.id === group[idx].id);
      const bi = next.findIndex(i => i.id === group[newIdx].id);
      [next[ai], next[bi]] = [next[bi], next[ai]];
      return next;
    });
  };

  const changeType = (id: string, newType: ItemType) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, type: newType } : i));
  };

  // ── Confirm & save ─────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const confirmed = items.filter(i => i.included);

      // Save confirmed gems to Databricks KB
      const gemsToSave = confirmed.filter(i => i.type === 'gem');
      for (const gem of gemsToSave) {
        try {
          await saveGem({
            gemText: gem.text,
            fileId: gem.fileId || undefined,
            fileName: gem.fileName || undefined,
            hexId: gem.hexId,
            hexLabel: gem.hexLabel,
            brand,
            userEmail,
            userRole,
          });
        } catch (e) {
          console.warn('[GemCheckCoalReview] Gem save failed:', e);
        }
      }

      onConfirm(confirmed);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const includedCount = items.filter(i => i.included).length;

  return (
    <div className="fixed inset-y-0 left-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ right: 'var(--modal-r)', padding: 'var(--modal-p)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-gray-900 font-semibold text-lg">Review your selections</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              From {hexLabel} · {includedCount} of {items.length} included
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-6 flex-shrink-0 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="font-bold text-gray-400">↑↓</span>
            Drag the arrows to rank priority order
          </span>
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1.5">
            <input type="checkbox" className="w-3 h-3 accent-purple-600" readOnly />
            Uncheck to remove an item
          </span>
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-gray-400">⬡▾</span>
            Use the dropdown to change type
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {(['gem', 'check', 'coal'] as ItemType[]).map(type => {
            const group = itemsOfType(type);
            if (group.length === 0) return null;
            const cfg = TYPE_CONFIG[type];

            return (
              <div key={type} className={`border-2 ${cfg.border} rounded-xl overflow-hidden`}>
                {/* Section header */}
                <div className={`${cfg.headerBg} px-4 py-2.5 flex items-center gap-2`}>
                  {cfg.icon(18)}
                  <span className={`font-semibold text-sm ${cfg.headerText}`}>{cfg.label}</span>
                  <span className={`text-xs ${cfg.headerText} opacity-70`}>— {cfg.description}</span>
                  <span className="ml-auto text-xs text-gray-500">{group.filter(i => i.included).length}/{group.length} included</span>
                </div>

                {/* Items */}
                <div className={`divide-y divide-gray-100 ${cfg.bg}`}>
                  {group.map((item, idx) => (
                    <div key={item.id}>
                      {/* Similar indicator */}
                      {idx > 0 && isSimilar(item.text, group[idx - 1].text) && (
                        <div className="flex items-center gap-2 px-4 py-1 bg-yellow-50 border-y border-yellow-200">
                          <span className="text-xs text-yellow-700">↑ Similar to above — review both</span>
                        </div>
                      )}

                      <div className={`flex items-start gap-3 px-4 py-3 transition-opacity ${!item.included ? 'opacity-40' : ''}`}>
                        {/* Include checkbox */}
                        <input
                          type="checkbox"
                          checked={item.included}
                          onChange={e => updateItem(item.id, { included: e.target.checked })}
                          className="w-4 h-4 mt-0.5 flex-shrink-0 accent-purple-600"
                        />

                        {/* Text */}
                        <p className="flex-1 text-sm text-gray-800 leading-relaxed">{item.text}</p>

                        {/* Controls */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Type switcher */}
                          <select
                            value={item.type}
                            onChange={e => changeType(item.id, e.target.value as ItemType)}
                            className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600 focus:outline-none"
                          >
                            <option value="gem">⬡ Gem</option>
                            <option value="check">✓ Track</option>
                            <option value="coal">🪨 Coal</option>
                          </select>

                          {/* Up/down rank */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => moveItem(item.id, 'up')}
                              disabled={idx === 0}
                              title="Rank higher"
                              className="w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-20 leading-none"
                            >
                              ^
                            </button>
                            <button
                              onClick={() => moveItem(item.id, 'down')}
                              disabled={idx === group.length - 1}
                              title="Rank lower"
                              className="w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-20 leading-none"
                            >
                              v
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <p className="text-xs text-gray-400 text-center pb-2">
            Confirmed Gems will be saved to the Knowledge Base. All included items will be used in subsequent prompts.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || includedCount === 0}
            className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
          >
            {saving ? <><SpinHex className="w-4 h-4" />Saving gems…</> : `Confirm ${includedCount} item${includedCount !== 1 ? 's' : ''}`}
          </button>
        </div>

      </div>
    </div>
  );
}
