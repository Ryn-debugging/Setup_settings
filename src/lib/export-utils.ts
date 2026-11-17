'use client';

import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BottleneckAnalysis,
  BuildSelections,
  CompatibilityReport,
  COMPONENT_CATEGORIES,
  CATEGORY_METADATA,
} from '@/types/pc';
import { formatIDR, getComponentSpecBadges } from '@/lib/format';
import { calculateTotalPrice } from '@/lib/compatibility';

export async function exportElementToPng(
  element: HTMLElement,
  filename = 'rakitpc-build-card.png'
): Promise<void> {
  const dataUrl = await toPng(element, {
    quality: 1.0,
    pixelRatio: 2,
    backgroundColor: '#0B0F17',
    cacheBust: true,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportBuildToPdf(params: {
  title: string;
  selections: BuildSelections;
  compatibility: CompatibilityReport;
  bottleneck: BottleneckAnalysis;
  shareUrl?: string;
}): void {
  const { title, selections, compatibility, bottleneck, shareUrl } = params;
  const totalPrice = calculateTotalPrice(selections);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const nowStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(248, 250, 252);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('RakitPC.id — Dokumen Spesifikasi Rakitan PC', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`Nama Rakitan: ${title}`, 14, 23);
  doc.text(`Tanggal Simulasi: ${nowStr} WIB`, 14, 29);
  if (shareUrl) {
    doc.text(`Tautan Rakitan: ${shareUrl}`, 115, 29);
  }

  // Summary Metrics Row
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 42, 182, 24, 2, 2, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL ESTIMASI HARGA', 20, 49);
  doc.text('ESTIMASI DAYA / PSU', 78, 49);
  doc.text('STATUS KOMPATIBILITAS', 125, 49);
  doc.text('SKOR BOTTLENECK', 166, 49);

  doc.setFontSize(11);
  doc.setTextColor(2, 132, 199);
  doc.text(formatIDR(totalPrice), 20, 58);

  doc.setTextColor(15, 23, 42);
  doc.text(
    `${compatibility.estimatedWattage}W (Rec. ${compatibility.recommendedPsuWattage}W)`,
    78,
    58
  );

  if (compatibility.status === 'Aman') {
    doc.setTextColor(5, 150, 105);
  } else if (compatibility.status === 'Peringatan') {
    doc.setTextColor(217, 119, 6);
  } else {
    doc.setTextColor(220, 38, 38);
  }
  doc.text(compatibility.status.toUpperCase(), 125, 58);

  doc.setTextColor(15, 23, 42);
  doc.text(
    bottleneck.limiter === 'Incomplete'
      ? 'N/A'
      : `${bottleneck.percentage}% (${bottleneck.severity})`,
    166,
    58
  );

  // Build Component Table Rows
  const tableRows: Array<[string, string, string, string, string, string]> = [];

  for (const cat of COMPONENT_CATEGORIES) {
    const label = CATEGORY_METADATA[cat].shortLabel;
    if (cat === 'Storage') {
      if (selections.Storage.length === 0) {
        tableRows.push([label, '- Belum dipilih -', '-', '-', '-', 'Rp 0']);
      } else {
        selections.Storage.forEach((st, idx) => {
          const specs = getComponentSpecBadges(st.component).slice(0, 3).join(', ');
          tableRows.push([
            idx === 0 ? label : `${label} #${idx + 1}`,
            `${st.component.name} (${st.component.brand})`,
            specs,
            `${st.component.wattage * st.quantity}W`,
            `${st.quantity}x`,
            formatIDR(st.component.price * st.quantity),
          ]);
        });
      }
    } else {
      const slot = selections[cat];
      if (!slot) {
        tableRows.push([label, '- Belum dipilih -', '-', '-', '-', 'Rp 0']);
      } else {
        const specs = getComponentSpecBadges(slot.component).slice(0, 3).join(', ');
        const wattStr =
          cat === 'PSU'
            ? `Cap: ${slot.component.specs.wattage_capacity || 0}W`
            : `${slot.component.wattage * slot.quantity}W`;
        tableRows.push([
          label,
          `${slot.component.name} (${slot.component.brand})`,
          specs,
          wattStr,
          `${slot.quantity}x`,
          formatIDR(slot.component.price * slot.quantity),
        ]);
      }
    }
  }

  autoTable(doc, {
    startY: 72,
    head: [['Kategori', 'Nama Komponen', 'Spesifikasi Teknis', 'Daya', 'Qty', 'Subtotal']],
    body: tableRows,
    foot: [
      [
        { content: 'TOTAL KESELURUHAN', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        `${compatibility.estimatedWattage}W`,
        '',
        formatIDR(totalPrice),
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [248, 250, 252],
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    footStyles: {
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      fontSize: 9,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 58 },
      2: { cellWidth: 50 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 10, halign: 'center' },
      5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable?.finalY || 180;
  finalY += 10;

  // Bottleneck & Compatibility Verification Notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Analisis Bottleneck (${bottleneck.scenario})`, 14, finalY);

  finalY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const splitBottleneck = doc.splitTextToSize(
    `${bottleneck.headline} — ${bottleneck.explanation}`,
    182
  );
  doc.text(splitBottleneck, 14, finalY);
  finalY += splitBottleneck.length * 4.5 + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Catatan Validasi Kompatibilitas (${compatibility.status})`, 14, finalY);
  finalY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  if (compatibility.issues.length === 0) {
    doc.setTextColor(5, 150, 105);
    doc.text(
      '• Seluruh komponen yang dipilih telah terverifikasi kompatibel secara socket, generasi memori DDR, dimensi fisik casing, dan daya PSU.',
      14,
      finalY
    );
  } else {
    doc.setTextColor(51, 65, 85);
    compatibility.issues.forEach((issue) => {
      const prefix =
        issue.severity === 'error'
          ? '[TIDAK KOMPATIBEL]'
          : issue.severity === 'warning'
          ? '[PERINGATAN]'
          : '[INFO]';
      const lines = doc.splitTextToSize(`• ${prefix} ${issue.title}: ${issue.message}`, 182);
      if (finalY + lines.length * 4.5 > 280) {
        doc.addPage();
        finalY = 20;
      }
      doc.text(lines, 14, finalY);
      finalY += lines.length * 4.5 + 2;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Dokumen ini dihasilkan secara otomatis oleh RakitPC.id — Platform Simulasi & Perencanaan Kustomisasi PC Indonesia.',
    14,
    288
  );

  const safeSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  doc.save(`rakitpc-${safeSlug || 'spesifikasi'}.pdf`);
}
