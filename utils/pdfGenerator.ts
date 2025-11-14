import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import type { Grouping, Member, Event } from '@/types';

import { generateGroupLabel } from '@/utils/groupLabelHelper';

interface PDFOptions {
  groups: Grouping[];
  event: Event;
  activeDay: number;
  eventName: string;
  labelOverride?: 'none' | 'teeTime' | 'shotgun';
  members?: Member[];
}

export async function generateGroupingsPDF(options: PDFOptions): Promise<void> {
  try {
    console.log('[pdfGenerator] Starting PDF generation...');
    const { groups, event, activeDay, eventName, labelOverride = 'none', members = [] } = options;
    const htmlContent = buildHTMLContent(groups, event, activeDay, eventName, labelOverride, members);

    if (Platform.OS === 'web') {
      return generateWebPDF(htmlContent, eventName, activeDay);
    }

    // Native: use expo-print to generate PDF
    return generateNativePDF(htmlContent, eventName, activeDay);
  } catch (error) {
    console.error('[pdfGenerator] Error:', error);
    throw error;
  }
}

async function generateNativePDF(
  htmlContent: string,
  eventName: string,
  activeDay: number
): Promise<void> {
  try {
    console.log('[pdfGenerator] Generating PDF with expo-print...');
    
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    console.log('[pdfGenerator] PDF created at:', uri);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Groupings PDF',
        UTI: 'com.adobe.pdf',
      });
    }
  } catch (error) {
    console.error('[pdfGenerator] Native PDF error:', error);
    throw error;
  }
}

function generateWebPDF(htmlContent: string, eventName: string, activeDay: number): void {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventName.replace(/\s+/g, '-')}_groupings_day${activeDay}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('[pdfGenerator] Web download initiated');
  } catch (error) {
    console.error('[pdfGenerator] Web error:', error);
  }
}

function buildHTMLContent(groups: Grouping[], event: Event, activeDay: number, eventName: string, labelOverride: 'none' | 'teeTime' | 'shotgun' = 'none', members: Member[] = []): string {
  let groupsHTML = '';

  // Helper to get member details from slot (which is now string ID or Member object or null)
  const getMemberDetails = (slot: string | Member | null) => {
    if (!slot) return null;
    if (typeof slot === 'string') {
      const member = members.find(m => m.id === slot);
      return member || null;
    }
    return slot;
  };

  groups.forEach((group, groupIndex) => {
    const slots = group.slots;
    const header = generateGroupLabel(groupIndex, event, activeDay, labelOverride);

    groupsHTML += `
      <div class="group-card">
        <div class="hole-header">${header}</div>
        <div class="group-content">
          <div class="row">
            <div class="cart-section">
              <div class="cart-title">CART 1</div>
              <div class="cart">
                ${slots[0] ? (() => { const m = getMemberDetails(slots[0]); return m ? `
                  <div class="player-info">
                    <div class="player-name">${m.name}</div>
                    <div class="handicap-line">HDC: ${m.adjustedHandicap && m.adjustedHandicap !== '0' && m.adjustedHandicap !== '' ? m.adjustedHandicap : (m.handicap ?? 0)}</div>
                    <div class="flight-line">Flight: ${m.flight || 'N/A'}</div>
                  </div>
                ` : '<div class="empty-slot">Empty</div>'; })() : '<div class="empty-slot">Empty</div>'}
              </div>
            </div>
            <div class="cart-section">
              <div class="cart-title">CART 2</div>
              <div class="cart">
                ${slots[2] ? (() => { const m = getMemberDetails(slots[2]); return m ? `
                  <div class="player-info">
                    <div class="player-name">${m.name}</div>
                    <div class="handicap-line">HDC: ${m.adjustedHandicap && m.adjustedHandicap !== '0' && m.adjustedHandicap !== '' ? m.adjustedHandicap : (m.handicap ?? 0)}</div>
                    <div class="flight-line">Flight: ${m.flight || 'N/A'}</div>
                  </div>
                ` : '<div class="empty-slot">Empty</div>'; })() : '<div class="empty-slot">Empty</div>'}
              </div>
            </div>
          </div>
          <div class="row">
            <div class="cart-section">
              <div class="cart">
                ${slots[1] ? (() => { const m = getMemberDetails(slots[1]); return m && m.name !== 'F9' && m.name !== 'B9' ? `
                  <div class="player-info">
                    <div class="player-name">${m.name}</div>
                    <div class="handicap-line">HDC: ${m.adjustedHandicap && m.adjustedHandicap !== '0' && m.adjustedHandicap !== '' ? m.adjustedHandicap : (m.handicap ?? 0)}</div>
                    <div class="flight-line">Flight: ${m.flight || 'N/A'}</div>
                  </div>
                ` : '<div class="empty-slot">Empty</div>'; })() : '<div class="empty-slot">Empty</div>'}
              </div>
            </div>
            <div class="cart-section">
              <div class="cart">
                ${slots[3] ? (() => { const m = getMemberDetails(slots[3]); return m && m.name !== 'F9' && m.name !== 'B9' ? `
                  <div class="player-info">
                    <div class="player-name">${m.name}</div>
                    <div class="handicap-line">HDC: ${m.adjustedHandicap && m.adjustedHandicap !== '0' && m.adjustedHandicap !== '' ? m.adjustedHandicap : (m.handicap ?? 0)}</div>
                    <div class="flight-line">Flight: ${m.flight || 'N/A'}</div>
                  </div>
                ` : '<div class="empty-slot">Empty</div>'; })() : '<div class="empty-slot">Empty</div>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${eventName} - Day ${activeDay}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      width: 3.50in;
      background: white;
      padding: 0.3in;
    }
    @page { size: 3.50in 11in; margin: 0.3in; }
    .header {
      text-align: center;
      margin-bottom: 8px;
      border-bottom: 2px solid #1B5E20;
      padding-bottom: 8px;
    }
    .header-title {
      font-size: 16px;
      font-weight: bold;
      color: #1B5E20;
    }
    .venue-name {
      font-size: 12px;
      color: #333;
      margin-top: 2px;
    }
    .header-subtitle {
      font-size: 10px;
      color: #666;
      margin-top: 2px;
    }
    .group-card {
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .hole-header {
      background: #1B5E20;
      color: white;
      padding: 6px 8px;
      font-size: 13px;
      font-weight: bold;
      text-align: center;
      border-radius: 3px 3px 0 0;
    }
    .group-content {
      border: 1.5px solid #1B5E20;
      border-top: none;
      border-radius: 0 0 3px 3px;
      padding: 6px;
      background: white;
    }
    .row {
      display: flex;
      gap: 4px;
      margin-bottom: 4px;
    }
    .row:last-child {
      margin-bottom: 0;
    }
    .cart-section {
      flex: 1;
    }
    .cart-title {
      background: #1B5E20;
      color: black;
      padding: 3px 4px;
      font-size: 12px;
      font-weight: bold;
      text-align: center;
      border-radius: 2px 2px 0 0;
      margin-bottom: 2px;
    }
    .cart {
      border: 1px solid #333;
      border-radius: 0 0 3px 3px;
      overflow: hidden;
      background: #f9f9f9;
    }
    .player-info {
      padding: 6px;
      min-height: 55px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: #D9D9D9;
    }
    .player-name {
      font-size: 12px;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 2px;
      word-break: break-word;
    }
    .stat-line {
      font-size: 8px;
      color: #333;
      line-height: 1.2;
    }
    .handicap-line {
      font-size: 12px;
      color: #333;
      line-height: 1.2;
    }
    .flight-line {
      font-size: 12px;
      color: #333;
      line-height: 1.2;
    }
    .empty-slot {
      padding: 6px;
      min-height: 55px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #B0B0B0;
      color: #666;
      font-size: 9px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">${eventName}</div>
    <div class="venue-name">${event.location || ''}</div>
    <div class="header-subtitle">Day ${activeDay} Groupings</div>
  </div>
  ${groupsHTML}
</body>
</html>`;
}
