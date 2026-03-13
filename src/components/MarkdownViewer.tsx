import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface MarkdownViewerProps {
  title: string;
  markdown: string;
  brand?: string;
  projectType?: string;
  onClose: () => void;
}

export function MarkdownViewer({ title, markdown, brand, projectType, onClose }: MarkdownViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    // Convert markdown to HTML (basic implementation)
    // For a production app, consider using a library like 'marked' or 'react-markdown'
    const convertMarkdownToHTML = (md: string): string => {
      let html = md;

      // Headers
      html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>');
      html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>');
      html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>');

      // Bold and italic
      html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

      // Lists
      html = html.replace(/^\s*[-*+]\s+(.*)$/gim, '<li class="ml-4">$1</li>');
      html = html.replace(/(<li.*<\/li>)/s, '<ul class="list-disc ml-6 my-2">$1</ul>');

      // Numbered lists
      html = html.replace(/^\s*\d+\.\s+(.*)$/gim, '<li class="ml-4">$1</li>');

      // Code blocks
      html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded my-3 overflow-x-auto"><code>$1</code></pre>');
      html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>');

      // Tables (basic support)
      html = html.replace(/\|(.+)\|/g, (match, content) => {
        const cells = content.split('|').filter((c: string) => c.trim());
        const cellsHTML = cells.map((c: string) => `<td class="border border-gray-300 px-3 py-2">${c.trim()}</td>`).join('');
        return `<tr>${cellsHTML}</tr>`;
      });
      html = html.replace(/(<tr>.*<\/tr>)/s, '<table class="table-auto border-collapse border border-gray-300 my-4">$1</table>');

      // Paragraphs (lines separated by blank lines)
      html = html.replace(/\n\n/g, '</p><p class="my-2">');
      html = `<p class="my-2">${html}</p>`;

      // Line breaks
      html = html.replace(/\n/g, '<br/>');

      // Horizontal rules
      html = html.replace(/^---$/gm, '<hr class="my-4 border-t-2 border-gray-300"/>');

      return html;
    };

    setHtmlContent(convertMarkdownToHTML(markdown));
  }, [markdown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-gray-300 p-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-gray-900 font-semibold truncate">{title}</h3>
            {(brand || projectType) && (
              <div className="text-xs text-gray-600 mt-1">
                {brand && <span>Brand: {brand}</span>}
                {brand && projectType && <span className="ml-4">|</span>}
                {projectType && <span className={brand ? 'ml-4' : ''}>Project: {projectType}</span>}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            className="prose prose-sm max-w-none text-gray-900"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-300 p-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
