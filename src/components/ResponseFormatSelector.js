import React, { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

export default function ResponseFormatSelector({ onFormatChange, currentFormat = "paragraph" }) {
  const { isDarkMode } = useTheme();
  const [selectedFormat, setSelectedFormat] = useState(currentFormat);

  const formats = [
    {
      id: "paragraph",
      name: "One Paragraph",
      icon: "📝",
      description: "Concise single paragraph response",
      template: "Provide a comprehensive answer in one well-structured paragraph..."
    },
    {
      id: "deep_dive",
      name: "Deep Dive",
      icon: "🔍",
      description: "Detailed multi-section analysis",
      template: "## Executive Summary\n\n## Detailed Analysis\n\n## Implementation Approach\n\n## Conclusion"
    },
    {
      id: "bullets",
      name: "Sentence & Bullets",
      icon: "����",
      description: "Brief intro with bullet points",
      template: "Brief overview sentence:\n\n• Key point 1\n• Key point 2\n• Key point 3"
    }
  ];

  const handleFormatSelect = (format) => {
    setSelectedFormat(format.id);
    onFormatChange(format);
  };

  return (
    <div
      className={`rounded-lg p-4 transition-colors ${
        isDarkMode
          ? "bg-gray-700 border border-gray-600"
          : "bg-gray-50 border border-gray-200"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-purple-400 text-lg">📄</span>
        <h3
          className={`font-semibold transition-colors ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Response Format Options
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {formats.map((format) => (
          <div
            key={format.id}
            className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
              selectedFormat === format.id
                ? "border-purple-500 bg-purple-500/10"
                : isDarkMode
                ? "border-gray-600 bg-gray-800 hover:border-gray-500"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
            onClick={() => handleFormatSelect(format)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{format.icon}</span>
              <span
                className={`font-medium text-sm transition-colors ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {format.name}
              </span>
            </div>
            <p
              className={`text-xs mb-3 transition-colors ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {format.description}
            </p>
            <div
              className={`text-xs p-2 rounded border transition-colors ${
                isDarkMode
                  ? "bg-gray-900 border-gray-700 text-gray-300"
                  : "bg-gray-100 border-gray-200 text-gray-700"
              }`}
            >
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {format.template}
              </pre>
            </div>
          </div>
        ))}
      </div>

      {selectedFormat && (
        <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-400">✅</span>
            <span
              className={`text-sm font-medium transition-colors ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Selected: {formats.find(f => f.id === selectedFormat)?.name}
            </span>
          </div>
          <p
            className={`text-xs transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            This format will be used for generating responses to assigned questions.
          </p>
        </div>
      )}
    </div>
  );
}