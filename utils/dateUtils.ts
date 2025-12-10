export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '';
  
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${month}/${day}/${year}`;
}

export function parseCompactDate(input: string): string {
  const cleaned = input.replace(/\D/g, '');
  
  if (cleaned.length === 8) {
    const month = cleaned.substring(0, 2);
    const day = cleaned.substring(2, 4);
    const year = cleaned.substring(4, 8);
    
    return `${month}/${day}/${year}`;
  }
  
  return input;
}

export function formatDateInput(input: string): string {
  const cleaned = input.replace(/\D/g, '');
  
  if (cleaned.length >= 8) {
    const month = cleaned.substring(0, 2);
    const day = cleaned.substring(2, 4);
    const year = cleaned.substring(4, 8);
    return `${month}/${day}/${year}`;
  }
  
  if (cleaned.length >= 4) {
    const month = cleaned.substring(0, 2);
    const day = cleaned.substring(2, 4);
    const year = cleaned.substring(4);
    return `${month}/${day}/${year}`;
  }
  
  if (cleaned.length >= 2) {
    const month = cleaned.substring(0, 2);
    const day = cleaned.substring(2);
    return `${month}/${day}`;
  }
  
  return cleaned;
}

export function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return false;
  
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day;
}

export function formatDateForDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  
  if (dateStr.includes('/')) return dateStr;
  
  if (dateStr.includes('-')) {
    const date = parseDateString(dateStr);
    if (date && !isNaN(date.getTime())) {
      return formatDate(date);
    }
  }
  
  return dateStr;
}

function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      const date = new Date(year, month - 1, day, 12, 0, 0, 0);
      return date;
    }
  }
  
  if (dateStr.includes('-')) {
    const date = new Date(dateStr + 'T12:00:00');
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
}

export function convertToISODate(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  
  if (dateStr.includes('-') && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  
  return '';
}

export function formatDateAsFullDay(dateStr: string | null | undefined, numberOfDays: number | null | undefined, dayNumber: number): string {
  if (!dateStr) return `Day ${dayNumber}`;
  
  const baseDate = parseDateString(dateStr);
  if (!baseDate || isNaN(baseDate.getTime())) return `Day ${dayNumber}`;
  
  const targetDate = new Date(baseDate);
  targetDate.setDate(baseDate.getDate() + (dayNumber - 1));
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = days[targetDate.getDay()];
  const monthName = months[targetDate.getMonth()];
  const day = String(targetDate.getDate()).padStart(2, '0');
  const year = targetDate.getFullYear();
  
  return `${dayName} ${monthName} ${day}, ${year}`;
}
