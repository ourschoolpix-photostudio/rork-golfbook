import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as MailComposer from 'expo-mail-composer';
import type { Member, Event, Grouping } from '@/types';
import { type LabelOverride } from '@/utils/groupingsHelper';

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
    
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const yymmdd = String(now.getFullYear()).slice(-2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    const cleanEventName = eventName.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `${hhmm}${yymmdd}${cleanEventName}.pdf`;
    
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
      textContent += `${itemNumber}. ${member.name} $${totalCost}${paymentText}\n`;
      
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
        textContent += `${itemNumber}. ${member.name} - ${handicap} $${entryFee}${paymentText}\n`;
      } else {
        textContent += `${itemNumber}. ${member.name} $${entryFee}${paymentText}\n`;
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
  orgInfo?: { name?: string; logoUrl?: string };
}

export async function generateInvoicePDF(
  options: InvoicePDFOptions,
  openEmail: boolean = false
): Promise<string | void> {
  try {
    console.log('[pdfGenerator] Starting invoice PDF generation...');
    const { registration, member, event, orgInfo } = options;
    const htmlContent = buildInvoiceHTMLContent(registration, member, event, orgInfo);

    if (Platform.OS === 'web') {
      generateWebPDF(htmlContent, `${event.name}-Invoice`, 'Invoice');
      return;
    }

    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const yymmdd = String(now.getFullYear()).slice(-2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    const cleanEventName = event.name.replace(/[^a-zA-Z0-9]/g, '');
    const cleanMemberName = member.name.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `${hhmm}${yymmdd}${cleanEventName}${cleanMemberName}Invoice.pdf`;

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    console.log('[pdfGenerator] Invoice PDF created at:', uri);

    if (openEmail && member.email && await MailComposer.isAvailableAsync()) {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          recipients: [member.email],
          subject: `${event.name} - Registration Invoice`,
          body: `Dear ${member.name},\n\nThank you for registering for ${event.name}. Please find your invoice attached.\n\nEvent Details:\nDate: ${event.date}${event.endDate && event.endDate !== event.date ? ` - ${event.endDate}` : ''}\nLocation: ${event.location || event.venue}\nEntry Fee: ${event.entryFee}\n\nBest regards,\n${orgInfo?.name || 'Event Organizer'}`,
          attachments: [uri],
        });
      }
    } else if (!openEmail) {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Invoice PDF',
          UTI: 'com.adobe.pdf',
        });
      }
    }

    return uri;
  } catch (error) {
    console.error('[pdfGenerator] Invoice PDF error:', error);
    throw error;
  }
}

function buildInvoiceHTMLContent(
  registration: any,
  member: Member,
  event: Event,
  orgInfo?: { name?: string; logoUrl?: string }
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
      ${member.phone ? `<div class="detail-row">${member.phone}</div>` : ''}
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

  <div class="footer">
    <p>Thank you for your registration!</p>
    <p>If you have any questions, please contact the event organizer.</p>
  </div>
</body>
</html>`;
}
