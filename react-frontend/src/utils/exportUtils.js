/**
 * exportUtils.js
 * Helper utilities to export filtered data to CSV or Print/PDF on both Mobile & Desktop.
 */

export const exportToCSV = (data, filename = 'export.csv', customHeaders = null) => {
  if (!data || !data.length) {
    alert("No data available to export.");
    return;
  }

  // Determine headers
  const keys = customHeaders ? Object.keys(customHeaders) : Object.keys(data[0]);
  const headerRow = customHeaders ? Object.values(customHeaders).join(',') : keys.join(',');

  const csvRows = [];
  csvRows.push(headerRow);

  data.forEach(row => {
    const values = keys.map(key => {
      let val = row[key];
      if (val === null || val === undefined) {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      } else {
        val = String(val);
      }
      // Escape double quotes and wrap in quotes if contains commas or newlines
      val = val.replace(/"/g, '""');
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        val = `"${val}"`;
      }
      return val;
    });
    csvRows.push(values.join(','));
  });

  const csvString = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printPDF = (data, title = 'Store Report', columns = []) => {
  if (!data || !data.length) {
    alert("No data available to print.");
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups to print/export PDF.");
    return;
  }

  const cols = columns.length ? columns : Object.keys(data[0]).map(k => ({ field: k, headerName: k }));

  let tableHeaderHtml = '<tr>' + cols.map(c => `<th style="border: 1px solid #ddd; padding: 8px; background-color: #1A365D; color: white; text-align: left;">${c.headerName}</th>`).join('') + '</tr>';

  let tableBodyHtml = data.map((row, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    return `<tr style="background-color: ${bg};">` + cols.map(c => {
      let val = row[c.field];
      if (val === null || val === undefined) val = '';
      return `<td style="border: 1px solid #ddd; padding: 8px;">${val}</td>`;
    }).join('') + '</tr>';
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #2D3748; }
          h2 { color: #1A365D; margin-bottom: 5px; }
          .date { color: #718096; font-size: 0.85rem; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.85rem; }
          @media print {
            body { margin: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <div class="date">Generated on: ${new Date().toLocaleString()} | Total Records: ${data.length}</div>
        <button onclick="window.print()" style="padding: 8px 16px; background: #3182CE; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 10px;">Print / Save as PDF</button>
        <table>
          <thead>${tableHeaderHtml}</thead>
          <tbody>${tableBodyHtml}</tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
