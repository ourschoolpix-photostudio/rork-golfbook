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

export async function generateRegistrationPDF(options: RegistrationPDFOptions, includeHandicap?: boolean): Promise<void> {
  try {
    console.log('[pdfGenerator] Starting registration PDF generation...');
    const { registrations, members, event, useCourseHandicap = false } = options;
    const htmlContent = buildRegistrationHTMLContent(registrations, members, event, useCourseHandicap, includeHandicap);

    if (Platform.OS === 'web') {
      return generateWebRegistrationPDF(htmlContent, event.name);
    }

    return generateNativeRegistrationPDF(htmlContent, event.name);
  } catch (error) {
    console.error('[pdfGenerator] Registration PDF error:', error);
    throw error;
  }
}

export async function generateRegistrationHTML(options: RegistrationPDFOptions, includeHandicap?: boolean): Promise<string> {
  const { registrations, members, event, useCourseHandicap = false } = options;
  return buildRegistrationHTMLContent(registrations, members, event, useCourseHandicap, includeHandicap);
}

export async function generateRegistrationText(options: RegistrationPDFOptions, includeHandicap?: boolean): Promise<string> {
  const { registrations, members, event, useCourseHandicap = false } = options;
  return buildRegistrationTextContent(registrations, members, event, useCourseHandicap, includeHandicap);
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
  useCourseHandicap: boolean,
  includeHandicap?: boolean
): string {
  const isSocial = event.type === 'social';
  let playersHTML = '';
  let itemNumber = 0;

  if (isSocial) {
    const sponsors = registrations
      .filter(reg => reg.isSponsor)
      .map(reg => ({ reg, member: members.find(m => m.id === reg.memberId) }))
      .filter(item => item.member)
      .sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));
    
    const nonSponsors = registrations
      .filter(reg => !reg.isSponsor)
      .map(reg => ({ reg, member: members.find(m => m.id === reg.memberId) }))
      .filter(item => item.member)
      .sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));

    if (sponsors.length > 0) {
      playersHTML += `
        <div class="sponsor-section">
          <div class="sponsor-header">Special Thanks to Our Valued Sponsors</div>
          <div class="sponsor-subheader">Thank you for your dedication and sponsorship throughout the season</div>
      `;
      
      sponsors.forEach(({ member }) => {
        if (!member) return;
        playersHTML += `
          <div class="sponsor-name">${member.name}</div>
        `;
      });
      
      playersHTML += `
        </div>
      `;
    }

    let totalAttendees = 0;

    nonSponsors.forEach(({ reg, member }) => {
      if (!member) return;
      
      itemNumber++;
      totalAttendees++;
      
      const guestNames = reg.guestNames ? reg.guestNames.split('\n').filter((n: string) => n.trim()) : [];
      
      playersHTML += `
        <div class="player-row">
          <div class="item-number">${itemNumber}.</div>
          <div class="player-name-item">${member.name}</div>
        </div>
      `;
      
      if (guestNames.length > 0) {
        guestNames.forEach((guestName: string) => {
          itemNumber++;
          totalAttendees++;
          playersHTML += `
            <div class="player-row">
              <div class="item-number">${itemNumber}.</div>
              <div class="player-name-item">${member.name} - ${guestName}</div>
            </div>
          `;
        });
      }
    });

    playersHTML += `
      <div class="total-row">
        <div class="total-label">Total Attendees:</div>
        <div class="total-value">${totalAttendees}</div>
      </div>
    `;
  } else {
    const calculateTournamentFlight = (player: Member, reg: any): string => {
      if (event.flightACutoff === undefined || event.flightBCutoff === undefined) {
        return 'L';
      }
      
      const handicap = reg?.adjustedHandicap && reg.adjustedHandicap !== '0' && reg.adjustedHandicap !== '' 
        ? parseFloat(reg.adjustedHandicap) 
        : (player.handicap ?? 0);
      
      if (handicap <= Number(event.flightACutoff)) return 'A';
      if (handicap <= Number(event.flightBCutoff)) return 'B';
      return 'C';
    };
    
    const regsWithFlight = registrations
      .map(reg => ({
        reg,
        member: members.find(m => m.id === reg.memberId),
        flight: calculateTournamentFlight(members.find(m => m.id === reg.memberId)!, reg)
      }))
      .filter(item => item.member);
    
    const groupedByFlight: Record<string, typeof regsWithFlight> = {
      A: [],
      B: [],
      C: [],
      L: []
    };
    
    regsWithFlight.forEach(item => {
      if (item.flight in groupedByFlight) {
        groupedByFlight[item.flight].push(item);
      }
    });
    
    let totalPlayers = 0;

    ['A', 'B', 'C', 'L'].forEach(flight => {
      const flightRegs = groupedByFlight[flight];
      if (flightRegs.length === 0) return;
      
      flightRegs.sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));
      
      playersHTML += `
        <div class="flight-separator">Flight ${flight}</div>
      `;
      
      flightRegs.forEach(({ reg, member }) => {
        if (!member) return;
        itemNumber++;
        totalPlayers++;
        const handicap = getDisplayHandicap(member, reg, event, useCourseHandicap, 1);
        
        if (includeHandicap) {
          playersHTML += `
            <div class="player-row">
              <div class="item-number">${itemNumber}.</div>
              <div class="player-name">${member.name}</div>
              <div class="handicap">${handicap}</div>
            </div>
          `;
        } else {
          playersHTML += `
            <div class="player-row-no-handicap">
              <div class="item-number">${itemNumber}.</div>
              <div class="player-name-full">${member.name}</div>
            </div>
          `;
        }
      });
    });

    playersHTML += `
      <div class="total-row">
        <div class="total-label">Total Players:</div>
        <div class="total-value">${totalPlayers}</div>
      </div>
    `;
  }

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
      margin-top: 2px;
    }
    .sponsor-section {
      background: #FFF3E0;
      border: 1.5px solid #F57C00;
      border-radius: 4px;
      padding: 8px;
      margin-bottom: 12px;
    }
    .sponsor-header {
      font-size: 11px;
      font-weight: 700;
      color: #E65100;
      text-align: center;
      margin-bottom: 3px;
    }
    .sponsor-subheader {
      font-size: 8px;
      color: #F57C00;
      text-align: center;
      margin-bottom: 6px;
      font-style: italic;
    }
    .sponsor-name {
      font-size: 10px;
      font-weight: 600;
      color: #1a1a1a;
      padding: 2px 4px;
      text-align: center;
    }
    .player-row {
      display: flex;
      align-items: baseline;
      padding: 3px 0px;
      line-height: 1.3;
      gap: 6px;
    }
    .item-number {
      font-size: 10px;
      font-weight: 600;
      color: #666;
      min-width: 22px;
      text-align: left;
    }
    .player-name-item {
      font-size: 10px;
      font-weight: 600;
      color: #1a1a1a;
      flex: 1;
      line-height: 1.3;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 6px;
      margin-top: 12px;
      border-top: 2px solid #1B5E20;
      background: #E8F5E9;
    }
    .total-label {
      font-size: 11px;
      font-weight: 700;
      color: #1B5E20;
    }
    .total-value {
      font-size: 14px;
      font-weight: 700;
      color: #1B5E20;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">${event.name}</div>
    <div class="header-subtitle">Attendee List</div>
  </div>
  ${playersHTML}
</body>
</html>`;
  } else {
    const dateRange = event.endDate && event.endDate !== event.date 
      ? `${event.date} - ${event.endDate}` 
      : event.date;

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
    .header-dates {
      font-size: 9px;
      color: #666;
      margin-top: 2px;
      margin-bottom: 2px;
    }
    .header-subtitle {
      font-size: 9px;
      color: #666;
      margin-top: 2px;
    }
    .flight-separator {
      background: #E8F5E9;
      padding: 6px;
      font-weight: bold;
      font-size: 10px;
      color: #1B5E20;
      margin-top: 8px;
      margin-bottom: 4px;
      border-radius: 3px;
    }
    .player-row {
      display: flex;
      padding: 4px 6px;
      border-bottom: 1px solid #E0E0E0;
      font-size: 9px;
      line-height: 1.3;
      gap: 6px;
    }
    .item-number {
      font-size: 9px;
      font-weight: 600;
      color: #666;
      min-width: 20px;
    }
    .player-name {
      flex: 2;
      font-weight: 600;
      color: #1a1a1a;
    }
    .handicap {
      flex: 1;
      text-align: right;
      color: #666;
      font-weight: 600;
    }
    .player-row-no-handicap {
      display: flex;
      padding: 4px 6px;
      border-bottom: 1px solid #E0E0E0;
      font-size: 9px;
      line-height: 1.3;
      gap: 6px;
    }
    .player-name-full {
      font-weight: 600;
      color: #1a1a1a;
      flex: 1;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 6px;
      margin-top: 12px;
      border-top: 2px solid #1B5E20;
      background: #E8F5E9;
    }
    .total-label {
      font-size: 11px;
      font-weight: 700;
      color: #1B5E20;
    }
    .total-value {
      font-size: 14px;
      font-weight: 700;
      color: #1B5E20;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">${event.name}</div>
    <div class="header-dates">${dateRange}</div>
    <div class="header-subtitle">Registration List</div>
  </div>
  ${playersHTML}
</body>
</html>`;
  }
}

function buildRegistrationTextContent(
  registrations: any[],
  members: Member[],
  event: Event,
  useCourseHandicap: boolean,
  includeHandicap?: boolean
): string {
  const isSocial = event.type === 'social';
  let textContent = '';
  let itemNumber = 0;

  textContent += `${event.name}\n`;
  
  if (isSocial) {
    textContent += `Attendee List\n\n`;

    const sponsors = registrations
      .filter(reg => reg.isSponsor)
      .map(reg => ({ reg, member: members.find(m => m.id === reg.memberId) }))
      .filter(item => item.member)
      .sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));
    
    const nonSponsors = registrations
      .filter(reg => !reg.isSponsor)
      .map(reg => ({ reg, member: members.find(m => m.id === reg.memberId) }))
      .filter(item => item.member)
      .sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));

    if (sponsors.length > 0) {
      textContent += `Special Thanks to Our Valued Sponsors\n`;
      textContent += `Thank you for your dedication and sponsorship throughout the season\n\n`;
      
      sponsors.forEach(({ member }) => {
        if (!member) return;
        textContent += `${member.name}\n`;
      });
      
      textContent += `\n`;
    }

    let totalAttendees = 0;

    nonSponsors.forEach(({ reg, member }) => {
      if (!member) return;
      
      itemNumber++;
      totalAttendees++;
      
      const guestNames = reg.guestNames ? reg.guestNames.split('\n').filter((n: string) => n.trim()) : [];
      
      textContent += `${itemNumber}. ${member.name}\n`;
      
      if (guestNames.length > 0) {
        guestNames.forEach((guestName: string) => {
          itemNumber++;
          totalAttendees++;
          textContent += `${itemNumber}. ${member.name} - ${guestName}\n`;
        });
      }
    });

    textContent += `\nTotal Attendees: ${totalAttendees}`;
  } else {
    const dateRange = event.endDate && event.endDate !== event.date 
      ? `${event.date} - ${event.endDate}` 
      : event.date;
    
    textContent += `${dateRange}\n`;
    textContent += `Registration List\n\n`;

    const calculateTournamentFlight = (player: Member, reg: any): string => {
      if (event.flightACutoff === undefined || event.flightBCutoff === undefined) {
        return 'L';
      }
      
      const handicap = reg?.adjustedHandicap && reg.adjustedHandicap !== '0' && reg.adjustedHandicap !== '' 
        ? parseFloat(reg.adjustedHandicap) 
        : (player.handicap ?? 0);
      
      if (handicap <= Number(event.flightACutoff)) return 'A';
      if (handicap <= Number(event.flightBCutoff)) return 'B';
      return 'C';
    };
    
    const regsWithFlight = registrations
      .map(reg => ({
        reg,
        member: members.find(m => m.id === reg.memberId),
        flight: calculateTournamentFlight(members.find(m => m.id === reg.memberId)!, reg)
      }))
      .filter(item => item.member);
    
    const groupedByFlight: Record<string, typeof regsWithFlight> = {
      A: [],
      B: [],
      C: [],
      L: []
    };
    
    regsWithFlight.forEach(item => {
      if (item.flight in groupedByFlight) {
        groupedByFlight[item.flight].push(item);
      }
    });
    
    let totalPlayers = 0;

    ['A', 'B', 'C', 'L'].forEach(flight => {
      const flightRegs = groupedByFlight[flight];
      if (flightRegs.length === 0) return;
      
      flightRegs.sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));
      
      textContent += `Flight ${flight}\n`;
      
      flightRegs.forEach(({ reg, member }) => {
        if (!member) return;
        itemNumber++;
        totalPlayers++;
        const handicap = getDisplayHandicap(member, reg, event, useCourseHandicap, 1);
        
        if (includeHandicap) {
          textContent += `${itemNumber}. ${member.name} - ${handicap}\n`;
        } else {
          textContent += `${itemNumber}. ${member.name}\n`;
        }
      });
      
      textContent += `\n`;
    });

    textContent += `Total Players: ${totalPlayers}`;
  }

  return textContent;
}

export async function generateCheckInPDF(options: RegistrationPDFOptions): Promise<void> {
  try {
    console.log('[pdfGenerator] Starting check-in PDF generation...');
    const { registrations, members, event } = options;
    const htmlContent = buildCheckInHTMLContent(registrations, members, event);

    if (Platform.OS === 'web') {
      return generateWebCheckInPDF(htmlContent, event.name);
    }

    return generateNativeCheckInPDF(htmlContent, event.name);
  } catch (error) {
    console.error('[pdfGenerator] Check-in PDF error:', error);
    throw error;
  }
}

async function generateNativeCheckInPDF(
  htmlContent: string,
  eventName: string
): Promise<void> {
  try {
    console.log('[pdfGenerator] Generating check-in PDF with expo-print...');
    
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    console.log('[pdfGenerator] Check-in PDF created at:', uri);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Check-In List',
        UTI: 'com.adobe.pdf',
      });
    }
  } catch (error) {
    console.error('[pdfGenerator] Native check-in PDF error:', error);
    throw error;
  }
}

function generateWebCheckInPDF(htmlContent: string, eventName: string): void {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventName.replace(/\s+/g, '-')}_check-in.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('[pdfGenerator] Web check-in download initiated');
  } catch (error) {
    console.error('[pdfGenerator] Web check-in error:', error);
  }
}

function buildCheckInHTMLContent(
  registrations: any[],
  members: Member[],
  event: Event
): string {
  const isSocial = event.type === 'social';
  let playersHTML = '';
  let itemNumber = 0;

  if (isSocial) {
    const sponsors = registrations
      .filter(reg => reg.isSponsor)
      .map(reg => ({ reg, member: members.find(m => m.id === reg.memberId) }))
      .filter(item => item.member)
      .sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));
    
    const nonSponsors = registrations
      .filter(reg => !reg.isSponsor)
      .map(reg => ({ reg, member: members.find(m => m.id === reg.memberId) }))
      .filter(item => item.member)
      .sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));

    if (sponsors.length > 0) {
      playersHTML += `
        <div class="sponsor-section">
          <div class="sponsor-header">Sponsors</div>
      `;
      
      sponsors.forEach(({ member }) => {
        if (!member) return;
        itemNumber++;
        playersHTML += `
          <div class="check-in-row">
            <div class="checkbox"></div>
            <div class="player-number">${itemNumber}.</div>
            <div class="player-name">${member.name}</div>
          </div>
        `;
      });
      
      playersHTML += `
        </div>
      `;
    }

    nonSponsors.forEach(({ reg, member }) => {
      if (!member) return;
      
      itemNumber++;
      const guestNames = reg.guestNames ? reg.guestNames.split('\n').filter((n: string) => n.trim()) : [];
      
      playersHTML += `
        <div class="check-in-row">
          <div class="checkbox"></div>
          <div class="player-number">${itemNumber}.</div>
          <div class="player-name">${member.name}</div>
        </div>
      `;
      
      if (guestNames.length > 0) {
        guestNames.forEach((guestName: string) => {
          itemNumber++;
          playersHTML += `
            <div class="check-in-row guest-row">
              <div class="checkbox"></div>
              <div class="player-number">${itemNumber}.</div>
              <div class="player-name">${member.name} - ${guestName}</div>
            </div>
          `;
        });
      }
    });
  } else {
    const calculateTournamentFlight = (player: Member, reg: any): string => {
      if (event.flightACutoff === undefined || event.flightBCutoff === undefined) {
        return 'L';
      }
      
      const handicap = reg?.adjustedHandicap && reg.adjustedHandicap !== '0' && reg.adjustedHandicap !== '' 
        ? parseFloat(reg.adjustedHandicap) 
        : (player.handicap ?? 0);
      
      if (handicap <= Number(event.flightACutoff)) return 'A';
      if (handicap <= Number(event.flightBCutoff)) return 'B';
      return 'C';
    };
    
    const regsWithFlight = registrations
      .map(reg => ({
        reg,
        member: members.find(m => m.id === reg.memberId),
        flight: calculateTournamentFlight(members.find(m => m.id === reg.memberId)!, reg)
      }))
      .filter(item => item.member);
    
    const groupedByFlight: Record<string, typeof regsWithFlight> = {
      A: [],
      B: [],
      C: [],
      L: []
    };
    
    regsWithFlight.forEach(item => {
      if (item.flight in groupedByFlight) {
        groupedByFlight[item.flight].push(item);
      }
    });

    ['A', 'B', 'C', 'L'].forEach(flight => {
      const flightRegs = groupedByFlight[flight];
      if (flightRegs.length === 0) return;
      
      flightRegs.sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));
      
      playersHTML += `
        <div class="flight-separator">Flight ${flight} (${flightRegs.length})</div>
      `;
      
      flightRegs.forEach(({ member }) => {
        if (!member) return;
        itemNumber++;
        
        playersHTML += `
          <div class="check-in-row">
            <div class="checkbox"></div>
            <div class="player-number">${itemNumber}.</div>
            <div class="player-name">${member.name}</div>
          </div>
        `;
      });
    });
  }

  const dateRange = event.endDate && event.endDate !== event.date 
    ? `${event.date} - ${event.endDate}` 
    : event.date;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${event.name} - Check-In List</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: letter; margin: 0.75in; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: white;
      padding: 20px;
      font-size: 12px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #1B5E20;
      padding-bottom: 15px;
    }
    .header-title {
      font-size: 28px;
      font-weight: bold;
      color: #1B5E20;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }
    .header-subtitle {
      font-size: 16px;
      color: #666;
      margin-top: 5px;
    }
    .header-date {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .sponsor-section {
      background: #FFF3E0;
      border: 2px solid #FF9500;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 25px;
    }
    .sponsor-header {
      font-size: 18px;
      font-weight: 700;
      color: #FF9500;
      text-align: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #FF9500;
    }
    .flight-separator {
      background: #E8F5E9;
      padding: 12px 15px;
      font-weight: bold;
      font-size: 16px;
      color: #1B5E20;
      margin-top: 20px;
      margin-bottom: 10px;
      border-radius: 6px;
      border-left: 4px solid #1B5E20;
    }
    .check-in-row {
      display: flex;
      align-items: center;
      padding: 12px 10px;
      border-bottom: 1px solid #E0E0E0;
      gap: 15px;
      page-break-inside: avoid;
    }
    .check-in-row:hover {
      background: #F5F5F5;
    }
    .guest-row {
      padding-left: 25px;
      background: #FAFAFA;
    }
    .checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid #1B5E20;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .player-number {
      font-size: 14px;
      font-weight: 600;
      color: #666;
      min-width: 35px;
      text-align: left;
    }
    .player-name {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
      flex: 1;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #1B5E20;
      text-align: center;
    }
    .footer-text {
      font-size: 12px;
      color: #666;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">${event.name}</div>
    <div class="header-subtitle">Check-In List</div>
    <div class="header-date">${dateRange}</div>
    ${event.location ? `<div class="header-date">${event.location}</div>` : ''}
  </div>
  ${playersHTML}
  <div class="footer">
    <div class="footer-text">Total: ${itemNumber} ${isSocial ? 'attendees' : 'players'}</div>
  </div>
</body>
</html>`;
}
