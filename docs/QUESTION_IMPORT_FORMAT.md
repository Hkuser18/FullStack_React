# CSV Question Import/Export Format

This system supports importing and exporting questions in CSV format. 
You can use any spreadsheet software (Excel, Google Sheets) to create these files.

File Requirements:
- Format: CSV (Comma Separated Values)
- Encoding: UTF-8 (recommended)
- Header Row: The first row must be a header, but exact column names do not matter as long as they are in the correct order.
- Columns: Exactly 9 columns per row.

Column Layout:
--------------
1. Type: "multiple-choice" or "open"
2. Topic: Optional string (e.g. "JavaScript", "HTML")
3. Text: The actual question text.
4. Option 1: Answer option (only for multiple-choice).
5. Option 2: Answer option (only for multiple-choice).
6. Option 3: Answer option (only for multiple-choice).
7. Option 4: Answer option (only for multiple-choice).
8. Correct Answer (1-4): Number representing the correct option (1, 2, 3, or 4). Only for multiple-choice.
9. Keywords: Comma-separated grading keywords. Only for open questions.

Examples:
---------
Type,Topic,Text,Option 1,Option 2,Option 3,Option 4,Correct Answer (1-4),Keywords
multiple-choice,JS,What is a closure?,var,let,const,None of the above,4,
open,React,Explain useEffect.,,,,,,"side effect, lifecycle, cleanup"

Notes:
- For 'open' questions, columns 4 through 8 are ignored and can be left blank.
- For 'multiple-choice' questions, column 9 is ignored.
- Commas inside text fields (like in the keywords column) should be enclosed in double quotes (handled automatically by Excel/Google Sheets when exporting to CSV).
