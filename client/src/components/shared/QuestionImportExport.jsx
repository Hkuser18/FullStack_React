import React, { useRef } from 'react';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';

// Basic CSV parser that handles quoted strings
export const parseCSVRow = (text) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && text[i+1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

export const escapeCSV = (str) => {
  if (str == null) return '';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const QuestionImportExport = ({ onImport, questionsToExport = [] }) => {
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset so onChange fires for same file
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length <= 1) {
          Notify.warning('The CSV file appears to be empty or missing data rows.');
          return;
        }

        // skip header
        const dataLines = lines.slice(1);
        const importedQuestions = [];

        for (let i = 0; i < dataLines.length; i++) {
          const row = parseCSVRow(dataLines[i]);
          if (row.length < 3) continue; // skip invalid rows

          const type = row[0].trim().toLowerCase() === 'open' ? 'open' : 'multiple-choice';
          const topic = row[1]?.trim() || '';
          const textContent = row[2]?.trim() || '';

          const q = {
            id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            text: textContent,
            type: type,
            topic: topic,
          };

          if (type === 'multiple-choice') {
            q.options = [row[3] || '', row[4] || '', row[5] || '', row[6] || ''];
            let correct = parseInt(row[7], 10);
            if (isNaN(correct) || correct < 1 || correct > 4) correct = 1;
            q.correctOption = correct - 1;
          } else {
            const kws = row[8] ? row[8].split(',').map(k => k.trim()).filter(Boolean) : [];
            q.keywords = kws;
            q.rawKeywords = kws.join(', ');
          }
          importedQuestions.push(q);
        }

        if (importedQuestions.length > 0) {
          onImport(importedQuestions);
          Notify.success(`Imported ${importedQuestions.length} questions.`);
          Logger.info('QuestionImportExport: imported', { count: importedQuestions.length });
        } else {
          Notify.warning('No valid questions found in the CSV.');
        }
      } catch (err) {
        Notify.error('Failed to parse CSV file.');
        Logger.error('QuestionImportExport.import', err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleExportClick = () => {
    if (!questionsToExport || questionsToExport.length === 0) {
      Notify.warning('No questions to export.');
      return;
    }

    const header = ['Type', 'Topic', 'Text', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer (1-4)', 'Keywords'];
    const rows = [header.join(',')];

    for (const q of questionsToExport) {
      const row = [];
      row.push(escapeCSV(q.type));
      row.push(escapeCSV(q.topic || ''));
      row.push(escapeCSV(q.text || ''));
      
      if (q.type === 'multiple-choice') {
        const opts = q.options || ['', '', '', ''];
        row.push(escapeCSV(opts[0]));
        row.push(escapeCSV(opts[1]));
        row.push(escapeCSV(opts[2]));
        row.push(escapeCSV(opts[3]));
        row.push(escapeCSV((q.correctOption != null ? q.correctOption + 1 : 1).toString()));
        row.push(''); // keywords empty
      } else {
        row.push('', '', '', '', ''); // options empty
        const kws = q.keywords ? q.keywords.join(', ') : '';
        row.push(escapeCSV(kws));
      }
      rows.push(row.join(','));
    }

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `questions_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    Logger.info('QuestionImportExport: exported', { count: questionsToExport.length });
  };

  return (
    <div className="d-flex gap-2">
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        data-testid="csv-input"
      />
      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleImportClick}>
        ⬆️ Import CSV
      </button>
      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleExportClick}>
        ⬇️ Export CSV
      </button>
    </div>
  );
};

export default QuestionImportExport;
