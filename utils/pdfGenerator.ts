import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import type { Member, Event } from '@/types';

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
