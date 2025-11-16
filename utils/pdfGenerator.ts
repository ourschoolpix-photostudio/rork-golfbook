import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import type { Grouping, Member, Event } from '@/types';

import { generateGroupLabel } from '@/utils/groupLabelHelper';
import { getDisplayHandicap } from '@/utils/handicapHelper';

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

interface RegistrationPDFOptions {
  registrations: any[];
  members: Member[];
  event: Event;
  useCourseHandicap?: boolean;
}

export async function generateRegistrationPDF(options: RegistrationPDFOptions): Promise<void> {
  try {
    console.log('[pdfGenerator] Starting registration PDF generation...');
    const { registrations, members, event, useCourseHandicap = false } = options;
    const htmlContent = buildRegistrationHTMLContent(registrations, members, event, useCourseHandicap);

    if (Platform.OS === 'web') {
      return generateWebRegistrationPDF(htmlContent, event.name);
    }

    return generateNativeRegistrationPDF(htmlContent, event.name);
  } catch (error) {
    console.error('[pdfGenerator] Registration PDF error:', error);
    throw error;
  }
}

async function generateNativeRegistrationPDF(
  htmlContent: string,
  eventName: string
): Promise<void> {
  try {
    console.log('[pdfGenerator] Generating registration PDF with expo-print...');
    
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    console.log('[pdfGenerator] Registration PDF created at:', uri);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Registration PDF',
        UTI: 'com.adobe.pdf',
      });
    }
  } catch (error) {
    console.error('[pdfGenerator] Native registration PDF error:', error);
    throw error;
  }
}

function generateWebRegistrationPDF(htmlContent: string, eventName: string): void {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventName.replace(/\s+/g, '-')}_registrations.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('[pdfGenerator] Web registration download initiated');
  } catch (error) {
    console.error('[pdfGenerator] Web registration error:', error);
  }
}

function buildRegistrationHTMLContent(
  registrations: any[],
  members: Member[],
  event: Event,
  useCourseHandicap: boolean
): string {
  const isSocial = event.type === 'social';
  let playersHTML = '';

  registrations.forEach((reg, index) => {
    const member = members.find(m => m.id === reg.memberId);
    if (!member) return;

    if (isSocial) {
      const guestCount = reg.numberOfGuests || 0;
      const guestNames = reg.guestNames ? reg.guestNames.split('\n').filter((n: string) => n.trim()) : [];
      
      playersHTML += `
        <div class="player-row">
          <div class="player-name">${member.name}</div>
          <div class="guest-count">${guestCount}</div>
          <div class="guest-names">${guestCount > 0 ? guestNames.join(', ') : '—'}</div>
        </div>
      `;
    } else {
      const handicap = getDisplayHandicap(member, reg, event, useCourseHandicap, 1);
      
      playersHTML += `
        <div class="player-row">
          <div class="player-name">${member.name}</div>
          <div class="handicap">${handicap}</div>
        </div>
      `;
    }
  });

  if (isSocial) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${event.name} - Registrations</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      width: 2.5in;
      background: white;
      padding: 0.15in;
      font-size: 10px;
    }
    @page { size: 2.5in 11in; margin: 0.15in; }
    .header {
      text-align: center;
      margin-bottom: 8px;
      border-bottom: 1.5px solid #1B5E20;
      padding-bottom: 6px;
    }
    .header-title {
      font-size: 13px;
      font-weight: bold;
      color: #1B5E20;
      margin-bottom: 2px;
    }
    .header-subtitle {
      font-size: 9px;
      color: #666;
    }
    .table-header {
      display: flex;
      background: #E8F5E9;
      padding: 4px 6px;
      font-weight: bold;
      font-size: 9px;
      border-bottom: 1px solid #1B5E20;
      margin-bottom: 4px;
    }
    .header-name {
      flex: 2;
    }
    .header-guests {
      flex: 1;
      text-align: center;
    }
    .header-guest-names {
      flex: 2;
    }
    .player-row {
      display: flex;
      padding: 4px 6px;
      border-bottom: 1px solid #E0E0E0;
      font-size: 9px;
      line-height: 1.3;
    }
    .player-name {
      flex: 2;
      font-weight: 600;
      color: #1a1a1a;
    }
    .guest-count {
      flex: 1;
      text-align: center;
      color: #666;
    }
    .guest-names {
      flex: 2;
      color: #444;
      font-size: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">${event.name}</div>
    <div class="header-subtitle">Registration List</div>
  </div>
  <div class="table-header">
    <div class="header-name">Name</div>
    <div class="header-guests">Guests</div>
    <div class="header-guest-names">Guest Names</div>
  </div>
  ${playersHTML}
</body>
</html>`;
  } else {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${event.name} - Registrations</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      width: 2.5in;
      background: white;
      padding: 0.15in;
      font-size: 10px;
    }
    @page { size: 2.5in 11in; margin: 0.15in; }
    .header {
      text-align: center;
      margin-bottom: 8px;
      border-bottom: 1.5px solid #1B5E20;
      padding-bottom: 6px;
    }
    .header-title {
      font-size: 13px;
      font-weight: bold;
      color: #1B5E20;
      margin-bottom: 2px;
    }
    .header-subtitle {
      font-size: 9px;
      color: #666;
    }
    .table-header {
      display: flex;
      background: #E8F5E9;
      padding: 4px 6px;
      font-weight: bold;
      font-size: 9px;
      border-bottom: 1px solid #1B5E20;
      margin-bottom: 4px;
    }
    .header-name {
      flex: 2;
    }
    .header-handicap {
      flex: 1;
      text-align: center;
    }
    .player-row {
      display: flex;
      padding: 4px 6px;
      border-bottom: 1px solid #E0E0E0;
      font-size: 9px;
      line-height: 1.3;
    }
    .player-name {
      flex: 2;
      font-weight: 600;
      color: #1a1a1a;
    }
    .handicap {
      flex: 1;
      text-align: center;
      color: #666;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">${event.name}</div>
    <div class="header-subtitle">Registration List</div>
  </div>
  <div class="table-header">
    <div class="header-name">Player Name</div>
    <div class="header-handicap">Handicap</div>
  </div>
  ${playersHTML}
</body>
</html>`;
  }
}
