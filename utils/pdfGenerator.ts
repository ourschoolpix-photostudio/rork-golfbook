import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as MailComposer from 'expo-mail-composer';
import { createPayPalOrder } from '@/utils/paypalService';
import type { Member, Event, Grouping } from '@/types';
import { type LabelOverride } from '@/utils/groupingsHelper';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { calculateTournamentFlight } from '@/utils/handicapHelper';

interface RegistrationPDFOptions {
  registrations: any[];
  members: Member[];
  event: Event;
}

export async function generateCheckInPDF(options: RegistrationPDFOptions, logoUrl?: string): Promise<void> {
  try {
    console.log('[pdfGenerator] Starting check-in PDF generation...');
    const { registrations, members, event } = options;
    const htmlContent = buildCheckInHTMLContent(registrations, members, event, logoUrl);

    if (Platform.OS === 'web') {
      return generateWebPDF(htmlContent, event.name, 'CheckIn');
    }

    return generateNativePDF(htmlContent, event.name, 'CheckIn');
  } catch (error) {
    console.error('[pdfGenerator] Check-in PDF error:', error);
    throw error;
  }
}

export async function generateRegistrationPDF(options: RegistrationPDFOptions, includeHandicap?: boolean): Promise<void> {
  try {
    console.log('[pdfGenerator] Starting registration PDF generation...');
    const { registrations, members, event } = options;
    const htmlContent = buildRegistrationHTMLContent(registrations, members, event, includeHandicap);

    if (Platform.OS === 'web') {
      return generateWebPDF(htmlContent, event.name, 'Registration');
    }

    return generateNativePDF(htmlContent, event.name, 'Registration');
  } catch (error) {
    console.error('[pdfGenerator] Registration PDF error:', error);
    throw error;
  }
}

export async function generateRegistrationText(options: RegistrationPDFOptions, includeHandicap?: boolean): Promise<string> {
  const { registrations, members, event } = options;
  return buildRegistrationTextContent(registrations, members, event, includeHandicap);
}

async function generateNativePDF(htmlContent: string, eventName: string, type: string): Promise<void> {
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
        dialogTitle: `Share ${type} PDF`,
        UTI: 'com.adobe.pdf',
      });
    }
  } catch (error) {
    console.error('[pdfGenerator] Native PDF error:', error);
    throw error;
  }
}

function generateWebPDF(htmlContent: string, eventName: string, type: string): void {
  try {
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const yymmdd = String(now.getFullYear()).slice(-2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    const cleanEventName = eventName.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `${hhmm}${yymmdd}${cleanEventName}.html`;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('[pdfGenerator] Web download initiated');
  } catch (error) {
    console.error('[pdfGenerator] Web error:', error);
  }
}

function buildCheckInHTMLContent(
  registrations: any[],
  members: Member[],
  event: Event,
  logoUrl?: string
): string {
  const isSocial = event.type === 'social';
  let playersHTML = '';
  let itemNumber = 0;

  if (isSocial) {
    const sponsors = registrations
      .filter(reg => reg.isSponsor)
      .map(reg => {
        if (reg.isCustomGuest) {
          return { reg, member: { id: reg.id, name: reg.customGuestName || 'Unknown Guest' } };
        }
        return { reg, member: members.find(m => m.id === reg.memberId) };
      })
      .filter(item => item.member)
      .sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));
    
    const nonSponsors = registrations
      .filter(reg => !reg.isSponsor)
      .map(reg => {
        if (reg.isCustomGuest) {
          return { reg, member: { id: reg.id, name: reg.customGuestName || 'Unknown Guest' } };
        }
        return { reg, member: members.find(m => m.id === reg.memberId) };
      })
      .filter(item => item.member)
      .sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));

    if (sponsors.length > 0) {
      playersHTML += `
        <div class="sponsor-section">
          <div class="sponsor-header">Sponsors</div>
      `;
      
      sponsors.forEach(({ reg, member }) => {
        if (!member) return;
        itemNumber++;
        const isPaid = reg.paymentStatus === 'paid';
        playersHTML += `
          <div class="check-in-row ${!isPaid ? 'unpaid-row' : ''}">
            <div class="checkbox"></div>
            <div class="player-number">${itemNumber}.</div>
            <div class="player-name">${member.name}${!isPaid ? ' <span class="unpaid-badge">UNPAID</span>' : ''}</div>
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
      const isPaid = reg.paymentStatus === 'paid';
      
      playersHTML += `
        <div class="check-in-row ${!isPaid ? 'unpaid-row' : ''}">
          <div class="checkbox"></div>
          <div class="player-number">${itemNumber}.</div>
          <div class="player-name">${member.name}${!isPaid ? ' <span class="unpaid-badge">UNPAID</span>' : ''}</div>
        </div>
      `;
      
      if (guestNames.length > 0) {
        guestNames.forEach((guestName: string) => {
          itemNumber++;
          playersHTML += `
            <div class="check-in-row guest-row ${!isPaid ? 'unpaid-row' : ''}">
              <div class="checkbox"></div>
              <div class="player-number">${itemNumber}.</div>
              <div class="player-name">${member.name} - ${guestName}${!isPaid ? ' <span class="unpaid-badge">UNPAID</span>' : ''}</div>
            </div>
          `;
        });
      }
    });
  } else {
    const allRegs = registrations
      .map(reg => {
        let member;
        if (reg.isCustomGuest) {
          member = { id: reg.id, name: reg.customGuestName || 'Unknown Guest', handicap: 0 };
        } else {
          member = members.find(m => m.id === reg.memberId);
        }
        return { reg, member };
      })
      .filter(item => item.member)
      .sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));

    allRegs.forEach(({ reg, member }) => {
      if (!member) return;
      itemNumber++;
      const isPaid = reg.paymentStatus === 'paid';
      
      playersHTML += `
        <div class="check-in-row ${!isPaid ? 'unpaid-row' : ''}">
          <div class="checkbox"></div>
          <div class="player-number">${itemNumber}.</div>
          <div class="player-name">${member.name}${!isPaid ? ' <span class="unpaid-badge">UNPAID</span>' : ''}</div>
        </div>
      `;
    });
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const dateRange = event.endDate && event.endDate !== event.date 
    ? `${formatDate(event.date)} - ${formatDate(event.endDate)}` 
    : formatDate(event.date);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${event.name} - Check-In List</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: letter; margin: 0.5in 0.75in; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: white;
      padding: 20px;
      font-size: 10px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 3px solid #1B5E20;
      padding-bottom: 12px;
    }
    .logo-container {
      margin-bottom: 10px;
    }
    .logo {
      max-height: 60px;
      max-width: 180px;
      height: auto;
      width: auto;
    }
    .header-title {
      font-size: 22px;
      font-weight: bold;
      color: #1B5E20;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .venue-date-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      font-size: 11px;
      color: #666;
      margin-top: 5px;
    }
    .venue-text, .date-text {
      font-size: 11px;
      color: #666;
    }
    .sponsor-section {
      background: #FFF3E0;
      border: 2px solid #FF9500;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 15px;
    }
    .sponsor-header {
      font-size: 14px;
      font-weight: 700;
      color: #FF9500;
      text-align: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 2px solid #FF9500;
    }
    .check-in-row {
      display: flex;
      align-items: center;
      padding: 6px 8px;
      border-bottom: 1px solid #E0E0E0;
      gap: 10px;
      page-break-inside: avoid;
    }
    .guest-row {
      background: #FAFAFA;
    }
    .checkbox {
      width: 16px;
      height: 16px;
      border: 2px solid #1B5E20;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .player-number {
      font-size: 11px;
      font-weight: 600;
      color: #666;
      min-width: 28px;
      text-align: left;
    }
    .player-name {
      font-size: 11px;
      font-weight: 600;
      color: #1a1a1a;
      flex: 1;
    }
    .unpaid-row {
      background: #FFF9E6;
    }
    .unpaid-badge {
      display: inline-block;
      background: #808080;
      color: white;
      font-size: 8px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 2px;
      margin-left: 8px;
      letter-spacing: 0.3px;
    }
    .footer {
      margin-top: 25px;
      padding-top: 15px;
      border-top: 2px solid #1B5E20;
      text-align: center;
    }
    .footer-text {
      font-size: 10px;
      color: #666;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header">
    ${logoUrl ? `
    <div class="logo-container">
      <img src="${logoUrl}" alt="Club Logo" class="logo" />
    </div>` : ''}
    <div class="header-title">${event.name}</div>
    <div class="venue-date-row">
      ${event.location ? `<span class="venue-text">${event.location}</span>` : ''}
      <span class="date-text">${dateRange}</span>
    </div>
  </div>
  ${playersHTML}
  <div class="footer">
    <div class="footer-text">Total: ${itemNumber} ${isSocial ? 'attendees' : 'players'}</div>
  </div>
</body>
</html>`;
}

function buildRegistrationHTMLContent(
  registrations: any[],
  members: Member[],
  event: Event,
  includeHandicap?: boolean
): string {
  const isSocial = event.type === 'social';
  let playersHTML = '';
  let itemNumber = 0;

  if (isSocial) {
    const sponsors = registrations
      .filter(reg => reg.isSponsor)
      .map(reg => {
        if (reg.isCustomGuest) {
          return { reg, member: { id: reg.id, name: reg.customGuestName || 'Unknown Guest' } };
        }
        return { reg, member: members.find(m => m.id === reg.memberId) };
      })
      .filter(item => item.member)
      .sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));
    
    const nonSponsors = registrations
      .filter(reg => !reg.isSponsor)
      .map(reg => {
        if (reg.isCustomGuest) {
          return { reg, member: { id: reg.id, name: reg.customGuestName || 'Unknown Guest' } };
        }
        return { reg, member: members.find(m => m.id === reg.memberId) };
      })
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
    const allRegs = registrations
      .map(reg => {
        let member;
        if (reg.isCustomGuest) {
          member = { id: reg.id, name: reg.customGuestName || 'Unknown Guest', handicap: 0 };
        } else {
          member = members.find(m => m.id === reg.memberId);
        }
        return { reg, member };
      })
      .filter(item => item.member)
      .sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));

    allRegs.forEach(({ reg, member }) => {
      if (!member) return;
      itemNumber++;
      const handicap = reg?.adjustedHandicap || member.handicap || 0;
      
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

    playersHTML += `
      <div class="total-row">
        <div class="total-label">Total Players:</div>
        <div class="total-value">${itemNumber}</div>
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

interface GroupingsPDFOptions {
  groups: Grouping[];
  event: Event;
  activeDay: number;
  eventName: string;
  labelOverride: LabelOverride;
  members: Member[];
}

export async function generateGroupingsPDF(options: GroupingsPDFOptions): Promise<void> {
  try {
    console.log('[pdfGenerator] Starting groupings PDF generation...');
    const { groups, event, activeDay, eventName, labelOverride, members } = options;
    const htmlContent = buildGroupingsHTMLContent(groups, event, activeDay, eventName, labelOverride, members);

    if (Platform.OS === 'web') {
      return generateWebPDF(htmlContent, eventName, 'Groupings');
    }

    return generateNativePDF(htmlContent, eventName, 'Groupings');
  } catch (error) {
    console.error('[pdfGenerator] Groupings PDF error:', error);
    throw error;
  }
}

function buildGroupingsHTMLContent(
  groups: Grouping[],
  event: Event,
  activeDay: number,
  eventName: string,
  labelOverride: LabelOverride,
  members: Member[]
): string {
  let groupsHTML = '';

  groups.forEach((group, idx) => {
    let label = '';
    
    if (labelOverride === 'teeTime') {
      const dayStartTime = activeDay === 1 ? event.day1StartTime : activeDay === 2 ? event.day2StartTime : event.day3StartTime;
      const dayStartPeriod = activeDay === 1 ? event.day1StartPeriod : activeDay === 2 ? event.day2StartPeriod : event.day3StartPeriod;
      const startTime = dayStartTime ? parseInt(dayStartTime) : 8;
      const period = dayStartPeriod || 'AM';
      
      const totalMinutes = idx * 8;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      let hour = startTime + hours;
      let currentPeriod = period;
      
      if (period === 'AM' && hour >= 12) {
        currentPeriod = 'PM';
        if (hour > 12) hour -= 12;
      } else if (period === 'PM' && hour >= 12) {
        if (hour > 12) hour -= 12;
      }
      
      label = `${hour}:${minutes.toString().padStart(2, '0')} ${currentPeriod}`;
    } else if (labelOverride === 'shotgun') {
      const leadingHole = activeDay === 1 ? event.day1LeadingHole : activeDay === 2 ? event.day2LeadingHole : event.day3LeadingHole;
      const hole = leadingHole ? parseInt(leadingHole) + idx : idx + 1;
      label = `Hole ${hole}`;
    } else {
      label = `Group ${idx + 1}`;
    }

    const playersInGroup = group.slots.filter(slot => slot !== null);
    
    if (playersInGroup.length === 0) return;

    groupsHTML += `
      <div class="group-card">
        <div class="group-header">${label}</div>
    `;

    playersInGroup.forEach((memberId) => {
      if (!memberId) return;
      const member = members.find(m => m.id === memberId);
      if (!member) return;

      groupsHTML += `
        <div class="player-row">
          <div class="player-name">${member.name}</div>
        </div>
      `;
    });

    groupsHTML += `
      </div>
    `;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const dateRange = event.endDate && event.endDate !== event.date 
    ? `${formatDate(event.date)} - ${formatDate(event.endDate)}` 
    : formatDate(event.date);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${eventName} - Groupings Day ${activeDay}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: letter; margin: 0.5in 0.75in; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: white;
      padding: 20px;
      font-size: 10px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 3px solid #1B5E20;
      padding-bottom: 12px;
    }
    .header-title {
      font-size: 22px;
      font-weight: bold;
      color: #1B5E20;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .header-subtitle {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
    .venue-date-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      font-size: 11px;
      color: #666;
      margin-top: 5px;
    }
    .venue-text, .date-text {
      font-size: 11px;
      color: #666;
    }
    .groups-container {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 10px;
    }
    .group-card {
      border: 2px solid #1B5E20;
      border-radius: 8px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .group-header {
      background: #1B5E20;
      color: white;
      padding: 10px;
      font-size: 13px;
      font-weight: bold;
      text-align: center;
    }
    .player-row {
      padding: 8px 12px;
      border-bottom: 1px solid #E0E0E0;
    }
    .player-row:last-child {
      border-bottom: none;
    }
    .player-name {
      font-size: 11px;
      font-weight: 600;
      color: #1a1a1a;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">${eventName}</div>
    <div class="header-subtitle">Day ${activeDay} Groupings</div>
    <div class="venue-date-row">
      ${event.location ? `<span class="venue-text">${event.location}</span>` : ''}
      <span class="date-text">${dateRange}</span>
    </div>
  </div>
  <div class="groups-container">
    ${groupsHTML}
  </div>
</body>
</html>`;
}

function buildRegistrationTextContent(
  registrations: any[],
  members: Member[],
  event: Event,
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
      .map(reg => {
        if (reg.isCustomGuest) {
          return { reg, member: { id: reg.id, name: reg.customGuestName || 'Unknown Guest' } };
        }
        return { reg, member: members.find(m => m.id === reg.memberId) };
      })
      .filter(item => item.member)
      .sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));
    
    const nonSponsors = registrations
      .filter(reg => !reg.isSponsor)
      .map(reg => {
        if (reg.isCustomGuest) {
          return { reg, member: { id: reg.id, name: reg.customGuestName || 'Unknown Guest' } };
        }
        return { reg, member: members.find(m => m.id === reg.memberId) };
      })
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
      const numberOfGuests = reg.numberOfGuests || 0;
      const entryFee = Number(event.entryFee) || 0;
      const totalCost = entryFee * (1 + numberOfGuests);
      const isPaid = reg.paymentStatus === 'paid';
      
      const paymentText = !isPaid ? ' **UNPAID**' : '';
      textContent += `${itemNumber}. ${member.name} ${totalCost.toFixed(2)}${paymentText}\n`;
      
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

    const allRegs = registrations
      .map(reg => {
        let member;
        if (reg.isCustomGuest) {
          member = { id: reg.id, name: reg.customGuestName || 'Unknown Guest', handicap: 0 };
        } else {
          member = members.find(m => m.id === reg.memberId);
        }
        return { reg, member };
      })
      .filter(item => item.member)
      .sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));

    allRegs.forEach(({ reg, member }) => {
      if (!member) return;
      itemNumber++;
      const handicap = reg?.adjustedHandicap || member.handicap || 0;
      const entryFee = Number(event.entryFee) || 0;
      const isPaid = reg.paymentStatus === 'paid';
      const paymentText = !isPaid ? ' **UNPAID**' : '';
      
      if (includeHandicap) {
        textContent += `${itemNumber}. ${member.name} - ${handicap} ${entryFee.toFixed(2)}${paymentText}\n`;
      } else {
        textContent += `${itemNumber}. ${member.name} ${entryFee.toFixed(2)}${paymentText}\n`;
      }
    });

    textContent += `\nTotal Players: ${itemNumber}`;
  }

  return textContent;
}

interface InvoicePDFOptions {
  registration: any;
  member: Member;
  event: Event;
  orgInfo?: { name?: string; logoUrl?: string; zellePhone?: string; paypalClientId?: string; paypalClientSecret?: string; paypalMode?: 'sandbox' | 'live' };
}

export async function generateInvoicePDF(
  options: InvoicePDFOptions,
  openEmail: boolean = false
): Promise<string | void> {
  try {
    console.log('[pdfGenerator] Starting invoice generation...');
    const { registration, member, event, orgInfo } = options;

    if (openEmail && member.email && await MailComposer.isAvailableAsync()) {
      const entryFee = Number(event.entryFee) || 0;
      const numberOfGuests = registration?.numberOfGuests || 0;
      const isSponsor = registration?.isSponsor || false;
      const totalPeople = isSponsor ? 0 : 1 + numberOfGuests;
      const total = entryFee * totalPeople;
      const isPaid = registration?.paymentStatus === 'paid';
      
      const tournamentFlight = event.type === 'tournament' 
        ? calculateTournamentFlight(
            member,
            Number(event.flightACutoff) || undefined,
            Number(event.flightBCutoff) || undefined,
            registration,
            event,
            false,
            1
          )
        : null;
      
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      };
      
      const dateRange = event.endDate && event.endDate !== event.date 
        ? `${formatDate(event.date)} - ${formatDate(event.endDate)}` 
        : formatDate(event.date);

      let emailBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1B5E20; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; border-top: none; }
    .section { background: white; padding: 15px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #e0e0e0; }
    .section-title { font-weight: 700; color: #1B5E20; margin-bottom: 10px; font-size: 16px; }
    .detail-row { margin-bottom: 8px; }
    .detail-label { font-weight: 600; color: #666; }
    .total-section { background: #E8F5E9; padding: 15px; border-radius: 8px; margin-top: 15px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 18px; font-weight: 700; color: #1B5E20; }
    .payment-status { padding: 15px; border-radius: 8px; text-align: center; font-weight: 700; margin-top: 15px; }
    .paid { background: #E8F5E9; color: #2E7D32; border: 2px solid #2E7D32; }
    .unpaid { background: #FFF9E6; color: #F57C00; border: 2px solid #F57C00; }
    .payment-instructions { background: #E3F2FD; padding: 15px; border-radius: 8px; border: 2px solid #1976D2; margin-top: 15px; }
    .payment-instructions h3 { color: #1976D2; margin-top: 0; }
    .sponsor-badge { background: #FF9500; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin-bottom: 15px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Registration Invoice</h1>
  </div>
  <div class="content">`;

      if (isSponsor) {
        emailBody += `
    <div class="sponsor-badge">SPONSOR REGISTRATION</div>`;
      }

      emailBody += `
    <div class="section">
      <div class="section-title">Member Information</div>
      <div class="detail-row"><span class="detail-label">Name:</span> ${member.name}</div>
      ${member.email ? `<div class="detail-row"><span class="detail-label">Email:</span> ${member.email}</div>` : ''}
      ${member.phone ? `<div class="detail-row"><span class="detail-label">Phone:</span> ${formatPhoneNumber(member.phone)}</div>` : ''}
      ${tournamentFlight ? `<div class="detail-row"><span class="detail-label">Flight:</span> ${tournamentFlight}</div>` : ''}
    </div>

    <div class="section">
      <div class="section-title">${event.type === 'tournament' ? 'Tournament Information' : 'Venue Information'}</div>
      <ul style="list-style-type: disc; margin-left: 20px; padding-left: 0;">
        <li style="margin-bottom: 6px;">Event: ${event.name}</li>
        <li style="margin-bottom: 6px;">Date: ${dateRange}</li>
        ${event.location ? `<li style="margin-bottom: 6px;">Location: ${event.location}</li>` : ''}
        ${event.numberOfDays ? `<li style="margin-bottom: 6px;">Number of Days: ${event.numberOfDays}</li>` : ''}
        ${!isSponsor ? `<li style="margin-bottom: 6px;">Entry Fee: ${entryFee.toFixed(2)}</li>` : ''}
      </ul>
    </div>`;

      // Add day-by-day details
      const daysDetails: string[] = [];
      if (event.numberOfDays && event.numberOfDays >= 1) {
        for (let day = 1; day <= event.numberOfDays; day++) {
          const dayKey = `day${day}` as const;
          const startTime = (event as any)[`${dayKey}StartTime`];
          const startPeriod = (event as any)[`${dayKey}StartPeriod`];
          const startType = (event as any)[`${dayKey}StartType`];
          const course = (event as any)[`${dayKey}Course`];
          
          if (startTime || startType || course) {
            let dayDetail = `<div style="margin-top: 12px; padding: 12px; background: #f5f5f5; border-left: 3px solid #1B5E20; border-radius: 4px;">`;
            dayDetail += `<div style="font-weight: 700; color: #1B5E20; margin-bottom: 6px;">Day ${day}</div>`;
            
            if (course) {
              dayDetail += `<div class="detail-row"><span class="detail-label">Course:</span> ${course}</div>`;
            }
            
            if (startType) {
              const startTypeFormatted = startType === 'tee-time' ? 'Tee Time' : 'Shotgun';
              dayDetail += `<div class="detail-row"><span class="detail-label">Start Type:</span> ${startTypeFormatted}</div>`;
            }
            
            if (startTime && startPeriod) {
              dayDetail += `<div class="detail-row"><span class="detail-label">Start Time:</span> ${startTime} ${startPeriod}</div>`;
            }
            
            dayDetail += `</div>`;
            daysDetails.push(dayDetail);
          }
        }
      }
      
      if (daysDetails.length > 0) {
        emailBody += `
    <div class="section">
      <div class="section-title">Daily Schedule</div>
      ${daysDetails.join('')}
    </div>`;
      }

      // Add trophy and prize details
      const trophyDetails: string[] = [];
      
      if (event.type === 'tournament') {
        const flights = ['A', 'B', 'C', 'L'];
        
        for (const flight of flights) {
          const trophies: string[] = [];
          const prizes: string[] = [];
          
          if ((event as any)[`flight${flight}Trophy1st`]) trophies.push('1st Place');
          if ((event as any)[`flight${flight}Trophy2nd`]) trophies.push('2nd Place');
          if ((event as any)[`flight${flight}Trophy3rd`]) trophies.push('3rd Place');
          
          const prize1st = (event as any)[`flight${flight}CashPrize1st`];
          const prize2nd = (event as any)[`flight${flight}CashPrize2nd`];
          const prize3rd = (event as any)[`flight${flight}CashPrize3rd`];
          
          if (prize1st) prizes.push(`1st: ${prize1st}`);
          if (prize2nd) prizes.push(`2nd: ${prize2nd}`);
          if (prize3rd) prizes.push(`3rd: ${prize3rd}`);
          
          if (trophies.length > 0 || prizes.length > 0) {
            let flightDetail = `<div style="margin-bottom: 8px;">`;
            flightDetail += `<div style="font-weight: 600; color: #1B5E20;">Flight ${flight}:</div>`;
            
            if (trophies.length > 0) {
              flightDetail += `<div style="margin-left: 12px;">Trophies: ${trophies.join(', ')}</div>`;
            }
            
            if (prizes.length > 0) {
              flightDetail += `<div style="margin-left: 12px;">Prizes: ${prizes.join(', ')}</div>`;
            }
            
            flightDetail += `</div>`;
            trophyDetails.push(flightDetail);
          }
        }
        
        // Low gross
        if (event.lowGrossTrophy || event.lowGrossCashPrize) {
          let lowGrossDetail = `<div style="margin-bottom: 8px;">`;
          lowGrossDetail += `<div style="font-weight: 600; color: #1B5E20;">Low Gross:</div>`;
          
          if (event.lowGrossTrophy) {
            lowGrossDetail += `<div style="margin-left: 12px;">Trophy: Yes</div>`;
          }
          
          if (event.lowGrossCashPrize) {
            lowGrossDetail += `<div style="margin-left: 12px;">Prize: ${event.lowGrossCashPrize}</div>`;
          }
          
          lowGrossDetail += `</div>`;
          trophyDetails.push(lowGrossDetail);
        }
        
        // Closest to pin
        if (event.closestToPin) {
          trophyDetails.push(`<div style="margin-bottom: 8px;"><div style="font-weight: 600; color: #1B5E20;">Closest to Pin:</div><div style="margin-left: 12px;">${event.closestToPin}</div></div>`);
        }
      }
      
      if (trophyDetails.length > 0) {
        emailBody += `
    <div class="section">
      <div class="section-title">Trophies & Prizes</div>
      ${trophyDetails.join('')}
    </div>`;
      }

      // Add final details (memo/description)
      if (event.memo || event.description) {
        const details = event.memo || event.description || '';
        const detailLines = details.split('\n').filter((line: string) => line.trim() !== '');
        let detailsHTML = '<ul style="list-style-type: disc; margin-left: 20px; padding-left: 0;">';
        detailLines.forEach((line: string) => {
          detailsHTML += `<li style="margin-bottom: 6px;">${line.trim()}</li>`;
        });
        detailsHTML += '</ul>';
        
        emailBody += `
    <div class="section">
      <div class="section-title">Registration Includes</div>
      ${detailsHTML}
    </div>`;
      }


      if (isSponsor) {
        emailBody += `
    <div class="section">
      <div class="section-title">Thank You!</div>
      <p>Thank you for your generous sponsorship! Your registration is complimentary.</p>
    </div>`;
      }

      emailBody += `
    <div class="total-section">
      <div class="total-row">
        <span>Total Amount:</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </div>

    <div class="payment-status ${isPaid ? 'paid' : 'unpaid'}">
      ${isPaid ? '✓ PAID IN FULL' : `AMOUNT DUE: ${total.toFixed(2)}`}
    </div>`;

      if (!isPaid && (orgInfo?.zellePhone || orgInfo?.paypalClientId)) {
        emailBody += `
    <div class="payment-instructions">
      <h3>Payment Instructions</h3>
      <p>Please complete your payment using one of the following methods:</p>`;
        
        if (orgInfo?.zellePhone) {
          const formattedPhone = formatPhoneNumber(orgInfo.zellePhone);
          emailBody += `
      <p><strong>Option 1: Zelle (${total.toFixed(2)})</strong><br/>Send payment to: <strong>${formattedPhone}</strong><br/><span style="font-size: 12px; color: #666; font-style: italic;">No fees for Zelle payments</span></p>`;
        }
        
        if (orgInfo?.paypalClientId && orgInfo?.paypalClientSecret) {
          try {
            console.log('[pdfGenerator] 🎯 Creating PayPal order for email invoice...');
            const serviceFeePercentage = 0.05;
            const subtotal = total;
            const serviceFeeAmount = subtotal * serviceFeePercentage;
            const totalWithFee = subtotal + serviceFeeAmount;
            
            const paypalOrder = await createPayPalOrder({
              amount: totalWithFee,
              eventName: event.name,
              eventId: event.id,
              playerEmail: member.email,
              paypalClientId: orgInfo.paypalClientId,
              paypalClientSecret: orgInfo.paypalClientSecret,
              paypalMode: orgInfo.paypalMode || 'sandbox',
            });
            
            console.log('[pdfGenerator] ✅ PayPal order created:', paypalOrder.orderId);
            console.log('[pdfGenerator] 📧 Including approval URL in email:', paypalOrder.approvalUrl);
            
            emailBody += `
      <p><strong>Option 2: PayPal</strong><br/>
      <a href="${paypalOrder.approvalUrl}" style="display: inline-block; background: #0070BA; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; margin-top: 8px;">Pay ${totalWithFee.toFixed(2)} with PayPal</a><br/>
      <span style="font-size: 12px; color: #666; margin-top: 4px; display: inline-block;">Includes ${serviceFeeAmount.toFixed(2)} service fee</span></p>`;
          } catch (error) {
            console.error('[pdfGenerator] ❌ Failed to create PayPal order for email:', error);
            emailBody += `
      <p><strong>Option 2: PayPal</strong><br/>
      <span style="color: #DC2626;">PayPal payment link unavailable. Please contact the event organizer or use Zelle.</span></p>`;
          }
        }
        
        emailBody += `
    </div>`;
      }

      emailBody += `
    <div class="footer">
      <p>Thank you for your registration!</p>
      <p>If you have any questions, please contact the event organizer.</p>
      ${orgInfo?.name ? `<p><strong>${orgInfo.name}</strong></p>` : ''}
    </div>
  </div>
</body>
</html>`;

      await MailComposer.composeAsync({
        recipients: [member.email],
        subject: `${event.name} - Registration Invoice`,
        body: emailBody,
        isHtml: true,
      });
      
      console.log('[pdfGenerator] ✅ Email composer opened successfully');
    } else {
      console.log('[pdfGenerator] ⚠️  No email to open or email not available');
    }
  } catch (error) {
    console.error('[pdfGenerator] Invoice generation error:', error);
    throw error;
  }
}

export function buildInvoiceHTMLContent(
  registration: any,
  member: Member,
  event: Event,
  orgInfo?: { name?: string; logoUrl?: string; zellePhone?: string; paypalClientId?: string; paypalMode?: 'sandbox' | 'live' }
): string {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const dateRange = event.endDate && event.endDate !== event.date 
    ? `${formatDate(event.date)} - ${formatDate(event.endDate)}` 
    : formatDate(event.date);

  const invoiceDate = formatDate(new Date().toISOString().split('T')[0]);
  const entryFee = Number(event.entryFee) || 0;
  const numberOfGuests = registration?.numberOfGuests || 0;
  const isSponsor = registration?.isSponsor || false;
  const totalPeople = isSponsor ? 0 : 1 + numberOfGuests;
  const subtotal = entryFee * totalPeople;
  const tax = 0;
  const total = subtotal + tax;
  const isPaid = registration?.paymentStatus === 'paid';
  const amountDue = isPaid ? 0 : total;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${event.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: letter; margin: 0.75in; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: white;
      padding: 20px;
      font-size: 11px;
      color: #333;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      border-bottom: 3px solid #1B5E20;
      padding-bottom: 20px;
    }
    .logo-section {
      flex: 1;
    }
    .logo {
      max-height: 80px;
      max-width: 200px;
      height: auto;
      width: auto;
    }
    .org-name {
      font-size: 22px;
      font-weight: 700;
      color: #1B5E20;
      margin-bottom: 5px;
    }
    .invoice-title-section {
      text-align: right;
    }
    .invoice-title {
      font-size: 32px;
      font-weight: 700;
      color: #1B5E20;
      margin-bottom: 10px;
    }
    .invoice-number {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }
    .invoice-date {
      font-size: 12px;
      color: #666;
    }
    .invoice-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .detail-section {
      flex: 1;
    }
    .detail-title {
      font-size: 12px;
      font-weight: 700;
      color: #1B5E20;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .detail-row {
      margin-bottom: 5px;
      font-size: 11px;
      line-height: 1.5;
    }
    .detail-label {
      font-weight: 600;
      color: #666;
    }
    .items-table {
      width: 100%;
      margin-bottom: 30px;
      border-collapse: collapse;
    }
    .items-table th {
      background: #1B5E20;
      color: white;
      padding: 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #E0E0E0;
      font-size: 11px;
    }
    .items-table tr:last-child td {
      border-bottom: none;
    }
    .text-right {
      text-align: right;
    }
    .totals-section {
      margin-left: auto;
      width: 300px;
      margin-bottom: 30px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 15px;
      font-size: 12px;
    }
    .total-row.subtotal {
      background: #F5F5F5;
    }
    .total-row.grand-total {
      background: #1B5E20;
      color: white;
      font-size: 16px;
      font-weight: 700;
      margin-top: 5px;
    }
    .payment-status {
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 20px;
    }
    .payment-status.paid {
      background: #E8F5E9;
      color: #2E7D32;
      border: 2px solid #2E7D32;
    }
    .payment-status.unpaid {
      background: #FFF9E6;
      color: #F57C00;
      border: 2px solid #F57C00;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #E0E0E0;
      text-align: center;
      font-size: 10px;
      color: #999;
    }
    ${isSponsor ? `
    .sponsor-badge {
      display: inline-block;
      background: #FF9500;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 15px;
    }
    ` : ''}
  </style>
</head>
<body>
  <div class="invoice-header">
    <div class="logo-section">
      ${orgInfo?.logoUrl ? `<img src="${orgInfo.logoUrl}" alt="Logo" class="logo" />` : ''}
      ${orgInfo?.name ? `<div class="org-name">${orgInfo.name}</div>` : ''}
    </div>
    <div class="invoice-title-section">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-number">Invoice #: ${registration?.id?.substring(0, 8).toUpperCase() || 'N/A'}</div>
      <div class="invoice-date">Date: ${invoiceDate}</div>
    </div>
  </div>

  ${isSponsor ? '<div class="sponsor-badge">SPONSOR REGISTRATION</div>' : ''}

  <div class="invoice-details">
    <div class="detail-section">
      <div class="detail-title">Bill To:</div>
      <div class="detail-row"><strong>${member.name}</strong></div>
      ${member.email ? `<div class="detail-row">${member.email}</div>` : ''}
      ${member.phone ? `<div class="detail-row">${formatPhoneNumber(member.phone)}</div>` : ''}
      ${member.address ? `<div class="detail-row">${member.address}</div>` : ''}
      ${member.city || member.state ? `<div class="detail-row">${member.city || ''}${member.city && member.state ? ', ' : ''}${member.state || ''}</div>` : ''}
    </div>
    <div class="detail-section">
      <div class="detail-title">Event Details:</div>
      <div class="detail-row"><strong>${event.name}</strong></div>
      <div class="detail-row">${dateRange}</div>
      ${event.location ? `<div class="detail-row">${event.location}</div>` : ''}
      ${event.address ? `<div class="detail-row">${event.address}</div>` : ''}
      ${event.city || event.state ? `<div class="detail-row">${event.city || ''}${event.city && event.state ? ', ' : ''}${event.state || ''} ${event.zipcode || ''}</div>` : ''}
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-right">Quantity</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${!isSponsor ? `
      <tr>
        <td>${event.name} - Entry Fee</td>
        <td class="text-right">1</td>
        <td class="text-right">${entryFee.toFixed(2)}</td>
        <td class="text-right">${entryFee.toFixed(2)}</td>
      </tr>
      ` : ''}
      ${!isSponsor && numberOfGuests > 0 ? `
      <tr>
        <td>Additional Guest${numberOfGuests > 1 ? 's' : ''}</td>
        <td class="text-right">${numberOfGuests}</td>
        <td class="text-right">${entryFee.toFixed(2)}</td>
        <td class="text-right">${(entryFee * numberOfGuests).toFixed(2)}</td>
      </tr>
      ` : ''}
      ${isSponsor ? `
      <tr>
        <td>${event.name} - Sponsor Registration<br/><em style="font-size: 10px; color: #666;">Thank you for your generous sponsorship!</em></td>
        <td class="text-right">1</td>
        <td class="text-right">$0.00</td>
        <td class="text-right">$0.00</td>
      </tr>
      ` : ''}
    </tbody>
  </table>

  <div class="totals-section">
    <div class="total-row subtotal">
      <span>Subtotal:</span>
      <span>${subtotal.toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span>Tax:</span>
      <span>${tax.toFixed(2)}</span>
    </div>
    <div class="total-row grand-total">
      <span>Total:</span>
      <span>${total.toFixed(2)}</span>
    </div>
  </div>

  <div class="payment-status ${isPaid ? 'paid' : 'unpaid'}">
    ${isPaid ? '✓ PAID IN FULL' : `AMOUNT DUE: ${amountDue.toFixed(2)}`}
  </div>

  ${registration?.guestNames ? `
  <div style="margin-bottom: 20px; padding: 15px; background: #F5F5F5; border-radius: 8px;">
    <div style="font-weight: 700; margin-bottom: 8px; color: #1B5E20;">Guest Names:</div>
    <div style="font-size: 11px; line-height: 1.6; white-space: pre-line;">${registration.guestNames}</div>
  </div>
  ` : ''}

  ${!isPaid && (orgInfo?.zellePhone || orgInfo?.paypalClientId) ? `
  <div style="margin-bottom: 20px; padding: 20px; background: #E3F2FD; border: 2px solid #1976D2; border-radius: 8px;">
    <div style="font-weight: 700; margin-bottom: 12px; color: #1976D2; font-size: 14px;">Payment Instructions</div>
    <div style="font-size: 11px; line-height: 1.8; color: #333;">
      <p style="margin-bottom: 10px;">Please complete your payment using one of the following methods:</p>
      ${orgInfo?.zellePhone ? `
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 700; color: #1976D2; margin-bottom: 4px;">Option 1: Zelle</div>
        <div>Send payment to: <strong>${formatPhoneNumber(orgInfo.zellePhone)}</strong></div>
      </div>
      ` : ''}
      ${orgInfo?.paypalClientId ? `
      <div style="margin-bottom: 8px;">
        <div style="font-weight: 700; color: #1976D2; margin-bottom: 4px;">Option 2: PayPal</div>
        <div>Visit: <a href="https://www.paypal.com/${orgInfo.paypalMode === 'live' ? 'paypalme' : 'sandbox'}" style="color: #1976D2; text-decoration: underline;">PayPal Payment Link</a></div>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p>Thank you for your registration!</p>
    <p>If you have any questions, please contact the event organizer.</p>
  </div>
</body>
</html>`;
}
