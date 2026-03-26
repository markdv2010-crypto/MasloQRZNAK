import { jsPDF } from 'jspdf';
import { ExtractedCode } from './pdfProcessor';

export interface PdfOptions {
    columns: number;
    rows: number;
    margin: number;
    showCutLines: boolean;
    showGtin: boolean;
    orientation: 'portrait' | 'landscape';
    codeScale: number;
    useFixedSize?: boolean;
    fixedSizeMm?: number;
}

export function generateGridPdf(codes: ExtractedCode[], options: PdfOptions) {
    const { columns, rows, margin, showCutLines, showGtin, orientation, codeScale, useFixedSize, fixedSizeMm = 40 } = options;
    const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = orientation === 'portrait' ? 210 : 297;
    const pageHeight = orientation === 'portrait' ? 297 : 210;
    const contentWidth = pageWidth - 2 * margin;
    const contentHeight = pageHeight - 2 * margin;

    // Determine grid dimensions
    let finalColumns = columns;
    let finalRows = rows;
    let cellWidth = contentWidth / columns;
    let cellHeight = contentHeight / rows;

    if (useFixedSize) {
        cellWidth = fixedSizeMm;
        cellHeight = fixedSizeMm + (showGtin ? 8 : 0); // Add space for GTIN if needed
        finalColumns = Math.floor(contentWidth / cellWidth);
        finalRows = Math.floor(contentHeight / cellHeight);
    }

    let currentCodeIndex = 0;

    while (currentCodeIndex < codes.length) {
        if (currentCodeIndex > 0) {
            pdf.addPage();
        }

        if (showCutLines) {
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.1);
            // Vertical lines
            for (let c = 0; c <= finalColumns; c++) {
                const x = margin + c * cellWidth;
                pdf.line(x, margin, x, margin + finalRows * cellHeight);
            }
            // Horizontal lines
            for (let r = 0; r <= finalRows; r++) {
                const y = margin + r * cellHeight;
                pdf.line(margin, y, margin + finalColumns * cellWidth, y);
            }
        }

        for (let r = 0; r < finalRows; r++) {
            for (let c = 0; c < finalColumns; c++) {
                if (currentCodeIndex >= codes.length) break;

                const code = codes[currentCodeIndex];
                const x = margin + c * cellWidth;
                const y = margin + r * cellHeight;

                const padding = 2;
                let imgSize = useFixedSize ? fixedSizeMm - 2 * padding : Math.min(cellWidth - 2 * padding, cellHeight - 2 * padding - (showGtin ? 4 : 0));
                imgSize *= codeScale;

                const imgX = x + (cellWidth - imgSize) / 2;
                const imgY = y + padding + (useFixedSize ? (fixedSizeMm - 2 * padding - imgSize) / 2 : (cellHeight - padding - (showGtin ? 4 : 0) - imgSize) / 2);

                pdf.addImage(code.imageUrl, 'PNG', imgX, imgY, imgSize, imgSize);

                if (showGtin) {
                    pdf.setFontSize(7);
                    pdf.setTextColor(0, 0, 0);
                    const gtinY = useFixedSize ? y + fixedSizeMm + 4 : imgY + imgSize + 3;
                    pdf.text(code.gtin, x + cellWidth / 2, gtinY, { align: 'center' });
                }

                currentCodeIndex++;
            }
        }
    }

    pdf.save('chestny-znak-grid.pdf');
}
