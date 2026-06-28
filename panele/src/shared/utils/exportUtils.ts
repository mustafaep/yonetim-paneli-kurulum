// src/shared/utils/exportUtils.ts

export interface ExportColumn {
  field: string;
  headerName: string;
  width?: number;
  valueGetter?: (value: any, row: any) => any;
  /** HTML / PDF export: <td> için inline CSS string (ör. "background-color:#BBDEFB;color:#0D47A1;") */
  cellStyleGetter?: (value: any, row: any) => string | undefined;
  /** Excel export: hücre doldurma/yazı rengi (# olmadan 6-haneli HEX, ör. "BBDEFB") */
  cellExcelStyleGetter?: (value: any, row: any) => { bgRgb?: string; textRgb?: string } | undefined;
}

/**
 * CSV export fonksiyonu (Excel uyumlu)
 */
export const exportToCSV = (
  data: any[],
  columns: ExportColumn[],
  filename: string = 'export',
) => {
  try {
    // Sadece görünür kolonları al
    const visibleColumns = columns.filter((col) => col.field !== 'actions');
    
    // CSV başlık satırı
    const headers = visibleColumns.map((col) => col.headerName);
    const csvHeaders = headers.join(',');
    
    // CSV veri satırları
    const csvRows = data.map((row) =>
      visibleColumns.map((col) => {
        let value = row[col.field];
        if (col.valueGetter) {
          try {
            value = col.valueGetter(value, row);
          } catch (e) {
            console.error(`ValueGetter error for field ${col.field}:`, e);
            value = row[col.field] || '';
          }
        }
        // CSV formatına uygun hale getir (virgül ve tırnak işareti kontrolü)
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        // Virgül veya tırnak içeriyorsa tırnak içine al
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    );
    
    // BOM ekle (Excel'de Türkçe karakterlerin doğru görünmesi için)
    const BOM = '\uFEFF';
    const csvContent = BOM + csvHeaders + '\n' + csvRows.join('\n');
    
    // Blob oluştur ve indir
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('CSV export hatası:', error);
    throw new Error('CSV export sırasında bir hata oluştu');
  }
};

/**
 * Satır/hücre renkleri olmadan sade Excel (.xlsx) export — xlsx kütüphanesi kullanır.
 */
const exportToPlainXlsx = (
  data: any[],
  columns: ExportColumn[],
  filename: string,
) => {
  import('xlsx').then((XLSX) => {
    const visibleColumns = columns.filter((col) => col.field !== 'actions');
    const worksheetData = data.map((row) => {
      const rowData: Record<string, any> = {};
      visibleColumns.forEach((col) => {
        let value = row[col.field];
        if (col.valueGetter) {
          try { value = col.valueGetter(value, row); } catch { value = row[col.field] || ''; }
        }
        rowData[col.headerName] = value !== null && value !== undefined ? value : '';
      });
      return rowData;
    });
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    worksheet['!cols'] = visibleColumns.map((col) => ({ wch: col.width || 15 }));
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapor');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }).catch(() => exportToCSV(data, columns, filename));
};

/**
 * Satır/hücre renkleriyle Excel export.
 * xlsx CE hücre stillerini desteklemediği için Excel'in açabildiği
 * styled HTML (Office XML namespace'li .xls) formatı kullanılır.
 * rowStyleGetter: her satır için { bgRgb, textRgb } döner (# olmadan HEX).
 */
const exportToStyledXls = (
  data: any[],
  columns: ExportColumn[],
  filename: string,
  rowStyleGetter?: (row: any) => { bgRgb?: string; textRgb?: string } | undefined,
) => {
  const visibleColumns = columns.filter((col) => col.field !== 'actions');

  const escape = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const headerCells = visibleColumns
    .map(
      (col) =>
        `<th style="background-color:#1565c0;color:#fff;padding:8px 12px;font-weight:bold;border:1px solid #90caf9;white-space:nowrap;">${col.headerName}</th>`,
    )
    .join('');

  const bodyRows = data
    .map((row) => {
      const rs = rowStyleGetter ? rowStyleGetter(row) : undefined;
      const rowBg   = rs?.bgRgb   ? `#${rs.bgRgb}`   : '#ffffff';
      const rowText = rs?.textRgb ? `#${rs.textRgb}` : '#212121';

      const cells = visibleColumns
        .map((col) => {
          let value = col.valueGetter
            ? (() => { try { return col.valueGetter!(row[col.field], row); } catch { return row[col.field] || ''; } })()
            : row[col.field];

          // Hücre düzeyinde stil (cellExcelStyleGetter varsa satır rengini geçersiz kılar)
          const cs = col.cellExcelStyleGetter ? col.cellExcelStyleGetter(value, row) : undefined;
          const cellBg   = cs?.bgRgb   ? `#${cs.bgRgb}`   : rowBg;
          const cellText = cs?.textRgb ? `#${cs.textRgb}` : rowText;
          const bold     = cs ? 'font-weight:bold;' : '';

          const str = escape(value !== null && value !== undefined ? String(value) : '');
          return `<td style="background-color:${cellBg};color:${cellText};${bold}padding:6px 10px;border:1px solid #e0e0e0;">${str}</td>`;
        })
        .join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
<x:ExcelWorksheet><x:Name>Rapor</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;}
td,th{border:1px solid #e0e0e0;padding:6px 10px;}</style>
</head><body>
<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
</body></html>`;

  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', `${filename}.xls`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Excel export fonksiyonu.
 * rowStyleGetter verilirse (ya da herhangi bir kolon cellExcelStyleGetter içeriyorsa)
 * renkli styled .xls formatı kullanılır; aksi hâlde sade .xlsx üretilir.
 */
export const exportToExcel = (
  data: any[],
  columns: ExportColumn[],
  filename: string = 'export',
  rowStyleGetter?: (row: any) => { bgRgb?: string; textRgb?: string } | undefined,
) => {
  try {
    const needsStyle =
      !!rowStyleGetter || columns.some((col) => col.cellExcelStyleGetter);

    if (needsStyle) {
      exportToStyledXls(data, columns, filename, rowStyleGetter);
    } else {
      exportToPlainXlsx(data, columns, filename);
    }
  } catch (error) {
    console.error('Excel export hatası:', error);
    exportToCSV(data, columns, filename);
  }
};

/**
 * PDF export fonksiyonu (basit HTML tablosu olarak).
 * İndirme sonrası bilgi mesajı: onInfo verilirse çağrılır, yoksa alert kullanılır.
 */
export const exportToPDF = (
  data: any[],
  columns: ExportColumn[],
  filename: string = 'export',
  title: string = 'Rapor',
  onInfo?: (message: string) => void,
  rowStyleGetter?: (row: any) => string | undefined,
) => {
  try {
    // Sadece görünür kolonları al
    const visibleColumns = columns.filter((col) => col.field !== 'actions');
    
    // HTML tablosu oluştur
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #1976d2; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th { background-color: #1976d2; color: white; padding: 10px; text-align: left; }
          td { border: 1px solid #ddd; padding: 8px; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .date { color: #666; font-size: 12px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="date">Tarih: ${new Date().toLocaleDateString('tr-TR')}</div>
        <table>
          <thead>
            <tr>
              ${visibleColumns.map((col) => `<th>${col.headerName}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map((row) => {
              const rowStyle = rowStyleGetter ? rowStyleGetter(row) : '';
              return `
              <tr${rowStyle ? ` style="${rowStyle}"` : ''}>
                ${visibleColumns.map((col) => {
                  let value = row[col.field];
                  if (col.valueGetter) {
                    try {
                      value = col.valueGetter(value, row);
                    } catch (e) {
                      console.error(`ValueGetter error for field ${col.field}:`, e);
                      value = row[col.field] || '';
                    }
                  }
                  // Hücre stili (cellStyleGetter öncelikli, yoksa rowStyle miras alınır)
                  const cellStyle = col.cellStyleGetter ? col.cellStyleGetter(value, row) : undefined;
                  // HTML escape
                  const stringValue = value !== null && value !== undefined ? String(value) : '';
                  const escapedValue = stringValue
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
                  return `<td${cellStyle ? ` style="${cellStyle}"` : ''}>${escapedValue}</td>`;
                }).join('')}
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    // Blob oluştur ve indir
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    const infoMessage = 'HTML dosyası indirildi. PDF\'e dönüştürmek için tarayıcınızın yazdırma özelliğini kullanabilirsiniz (Ctrl+P > PDF olarak kaydet).';
    if (onInfo) {
      onInfo(infoMessage);
    } else {
      alert(infoMessage);
    }
  } catch (error) {
    console.error('PDF export hatası:', error);
    throw new Error('PDF export sırasında bir hata oluştu');
  }
};
