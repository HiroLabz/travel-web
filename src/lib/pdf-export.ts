import { jsPDF } from 'jspdf';
import { WizardItineraryItem, ACTIVITY_TRAVEL_TYPE_LABELS, ActivityTravelType } from '@/types';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/constants';

// Cache for the loaded font
let cachedFontBase64: string | null = null;
let fontLoadAttempted = false;

// Load NotoSans font from public folder
async function loadFont(): Promise<string | null> {
  if (fontLoadAttempted && !cachedFontBase64) {
    return null;
  }

  if (cachedFontBase64) {
    return cachedFontBase64;
  }

  fontLoadAttempted = true;

  try {
    const response = await fetch('/NotoSans-Regular.ttf');
    if (!response.ok) {
      console.warn('Failed to load font');
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Convert to base64 in chunks to avoid call stack issues
    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }

    cachedFontBase64 = btoa(binary);
    return cachedFontBase64;
  } catch (error) {
    console.warn('Failed to load font:', error);
    return null;
  }
}

// Helper to sanitize text for PDF (remove emojis that fonts can't render, keep Thai/Vietnamese/etc)
function sanitizeForPdf(text: string, removeLineBreaks: boolean = false): string {
  let result = text
    // Remove emojis only (keep Thai, Vietnamese, Chinese, Japanese, Korean, etc)
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons (smileys)
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map symbols
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation Selectors
    // Replace common typography symbols with ASCII equivalents
    .replace(/→/g, ' to ')
    .replace(/←/g, ' from ')
    .replace(/↔/g, ' to/from ')
    .replace(/•/g, '-')
    .replace(/…/g, '...')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/✓/g, '[x]')
    .replace(/✔/g, '[x]')
    .replace(/✗/g, '[ ]')
    .replace(/✘/g, '[ ]')
    // Clean up any double spaces left after emoji removal
    .replace(/\s{2,}/g, ' ');

  if (removeLineBreaks) {
    result = result
      .replace(/\\n/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return result.trim();
}

// Helper to strip HTML tags from description
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper to check if value is valid (not null, undefined, 'N/A', etc.)
function isValidValue(val: string | undefined | null): boolean {
  return !!(val && val !== 'null' && val !== 'N/A' && val.trim() !== '');
}

// Helper to check if a time string is valid (HH:MM format)
function isValidTime(time: string | undefined | null): boolean {
  if (!time || typeof time !== 'string' || !time.includes(':')) return false;
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  return !isNaN(hour) && !isNaN(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

// Helper to convert 24-hour time to 12-hour format with AM/PM
function formatTimeTo12Hour(time: string | undefined | null): string {
  if (!isValidTime(time)) return '';

  const [hourStr, minuteStr] = time!.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr.padStart(2, '0');

  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${period}`;
}

export async function exportItineraryToPdf(
  items: WizardItineraryItem[],
  tripTitle: string,
  defaultCurrency: string = 'USD'
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Load and register NotoSans font for Thai/Vietnamese support
  let fontName = 'helvetica';
  try {
    const fontBase64 = await loadFont();
    if (fontBase64) {
      doc.addFileToVFS('NotoSans-Regular.ttf', fontBase64);
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      fontName = 'NotoSans';
    }
  } catch (error) {
    console.warn('Failed to register font, using default:', error);
  }

  // Helper to add new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper to add a labeled field
  const addField = (label: string, value: string, indent: number = 0) => {
    checkPageBreak(6);
    doc.setFontSize(9);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(80);
    doc.text(`${label}:`, margin + indent, yPos + 4);
    const labelWidth = doc.getTextWidth(`${label}: `);
    doc.setFont(fontName, 'normal');
    doc.setTextColor(60);
    const sanitizedValue = sanitizeForPdf(value, true);
    const valueLines = doc.splitTextToSize(sanitizedValue, contentWidth - indent - labelWidth - 5);
    doc.text(valueLines, margin + indent + labelWidth, yPos + 4);
    yPos += valueLines.length * 4 + 2;
  };

  // Title - wrap if too long and center each line
  doc.setFontSize(20);
  doc.setFont(fontName, 'bold');
  const sanitizedTitle = sanitizeForPdf(tripTitle, true);
  const titleLines: string[] = doc.splitTextToSize(sanitizedTitle, contentWidth);
  titleLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
  });
  yPos += 2;

  // Subtitle
  doc.setFontSize(12);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(100);
  doc.text('Travel Itinerary', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Trip summary info
  doc.setFontSize(9);
  doc.setTextColor(120);
  const totalActivities = items.length;
  const sortedDatesForSummary = [...new Set(items.map(i => i.dateFrom))].sort();
  const startDate = sortedDatesForSummary[0];
  const endDate = sortedDatesForSummary[sortedDatesForSummary.length - 1];
  if (startDate && endDate) {
    const dateRange = startDate === endDate
      ? format(parseISO(startDate), 'MMMM d, yyyy')
      : `${format(parseISO(startDate), 'MMM d')} - ${format(parseISO(endDate), 'MMM d, yyyy')}`;
    doc.text(`${dateRange} | ${totalActivities} activities`, pageWidth / 2, yPos, { align: 'center' });
  }
  yPos += 12;

  // Reset text color
  doc.setTextColor(0);

  // Group items by date
  const itemsByDate = items.reduce((acc, item) => {
    const date = item.dateFrom;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, WizardItineraryItem[]>);

  // Sort dates
  const sortedDates = Object.keys(itemsByDate).sort();

  // Render each day
  sortedDates.forEach((date, dayIndex) => {
    const dayItems = itemsByDate[date].sort((a, b) =>
      (a.timeFrom || '').localeCompare(b.timeFrom || '')
    );

    // Check if we need a new page for the date header
    checkPageBreak(25);

    // Date header
    doc.setFillColor(59, 130, 246); // Blue
    doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(255);

    const formattedDate = format(parseISO(date), 'EEEE, MMMM d, yyyy');
    doc.text(`Day ${dayIndex + 1} - ${formattedDate}`, margin + 5, yPos + 7);
    yPos += 15;

    // Reset text color for activities
    doc.setTextColor(0);

    // Render each activity
    dayItems.forEach((item, itemIndex) => {
      // Estimate height needed and check for page break
      checkPageBreak(40);

      // Activity card background
      doc.setFillColor(248, 250, 252); // Light gray
      doc.roundedRect(margin, yPos, contentWidth, 8, 1, 1, 'F');

      // Time and travel type on same line (only show if time exists)
      doc.setFontSize(10);
      doc.setFont(fontName, 'bold');
      doc.setTextColor(79, 70, 229); // Indigo

      let headerOffset = 0;
      if (isValidTime(item.timeFrom)) {
        const fromTime = formatTimeTo12Hour(item.timeFrom);
        const toTime = formatTimeTo12Hour(item.timeTo);
        const timeStr = toTime ? `${fromTime} - ${toTime}` : fromTime;
        doc.text(timeStr, margin + 3, yPos + 5.5);
        headerOffset = doc.getTextWidth(timeStr) + 8;
      }

      // Travel type badge
      if (item.travelType) {
        const typeLabel = ACTIVITY_TRAVEL_TYPE_LABELS[item.travelType as ActivityTravelType];
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`[${typeLabel}]`, margin + 3 + headerOffset, yPos + 5.5);
      }

      yPos += 12;

      // Activity name
      doc.setFontSize(12);
      doc.setFont(fontName, 'bold');
      doc.setTextColor(30);
      const sanitizedPlaceName = sanitizeForPdf(item.placeName, true);
      const placeNameLines: string[] = doc.splitTextToSize(sanitizedPlaceName, contentWidth - 10);
      placeNameLines.forEach((line: string) => {
        checkPageBreak(6);
        doc.text(line, margin, yPos + 4);
        yPos += 6;
      });
      yPos += 2;

      // Address
      if (isValidValue(item.address)) {
        doc.setFontSize(9);
        doc.setFont(fontName, 'normal');
        doc.setTextColor(100);
        const sanitizedAddress = sanitizeForPdf(item.address, true);
        const addressLines = doc.splitTextToSize(sanitizedAddress, contentWidth - 10);
        addressLines.forEach((line: string) => {
          checkPageBreak(5);
          doc.text(line, margin, yPos + 4);
          yPos += 4;
        });
        yPos += 2;
      }

      // Operator name (airline, hotel, etc.)
      if (isValidValue(item.operatorName)) {
        addField('Operator', item.operatorName!);
      }

      // Flight number
      if (isValidValue(item.flightNumber)) {
        addField('Flight', item.flightNumber!);
      }

      // Confirmation number
      if (isValidValue(item.confirmationNumber)) {
        addField('Confirmation', item.confirmationNumber!);
      }

      // Gate number
      if (isValidValue(item.gateNumber)) {
        addField('Gate', item.gateNumber!);
      }

      // Boarding time
      if (isValidTime(item.boardingTime)) {
        addField('Boarding Time', formatTimeTo12Hour(item.boardingTime));
      }

      // Terminal info (departure)
      if (isValidValue(item.terminalInfo)) {
        addField('From', item.terminalInfo!);
      }

      // Arrival info
      if (isValidValue(item.arrivalInfo)) {
        addField('To', item.arrivalInfo!);
      }

      // Passengers/Guests (use "Guests" for accommodation)
      if (item.passengers && item.passengers.length > 0) {
        checkPageBreak(10);
        const isAccommodation = item.travelType === 'accommodation';
        const label = isAccommodation ? 'Guests' : 'Passengers';
        doc.setFontSize(9);
        doc.setFont(fontName, 'bold');
        doc.setTextColor(80);
        doc.text(`${label} (${item.passengers.length}):`, margin, yPos + 4);
        yPos += 6;

        item.passengers.forEach((passenger) => {
          checkPageBreak(5);
          doc.setFont(fontName, 'normal');
          doc.setTextColor(60);
          let passengerInfo = `  - ${sanitizeForPdf(passenger.name, true)}`;
          // Only show seat/ticket info for non-accommodation (transport)
          if (!isAccommodation) {
            if (isValidValue(passenger.seatNumber)) {
              passengerInfo += ` | Seat: ${passenger.seatNumber}`;
            }
            if (isValidValue(passenger.class)) {
              passengerInfo += ` | ${passenger.class}`;
            }
            if (isValidValue(passenger.ticketNumber)) {
              passengerInfo += ` | Ticket: ${passenger.ticketNumber}`;
            }
          }
          doc.text(passengerInfo, margin, yPos + 4);
          yPos += 4;
        });
        yPos += 2;
      }

      // Contact number
      if (isValidValue(item.contactNumber)) {
        addField('Contact', item.contactNumber!);
      }

      // Check-in instructions
      if (isValidValue(item.checkInInstructions)) {
        addField('Check-in', item.checkInInstructions!);
      }

      // Description (strip HTML)
      if (isValidValue(item.description)) {
        const plainDescription = stripHtml(item.description);
        if (plainDescription.length > 0) {
          checkPageBreak(10);
          doc.setFontSize(9);
          doc.setFont(fontName, 'bold');
          doc.setTextColor(80);
          doc.text('Notes:', margin, yPos + 4);
          yPos += 5;
          doc.setFont(fontName, 'normal');
          doc.setTextColor(70);
          const sanitizedDesc = sanitizeForPdf(plainDescription, false);
          const descLines = doc.splitTextToSize(sanitizedDesc, contentWidth - 10);
          // Limit description lines to prevent overflow
          const maxDescLines = 6;
          const displayLines = descLines.slice(0, maxDescLines);
          displayLines.forEach((line: string) => {
            checkPageBreak(4);
            doc.text(line, margin, yPos + 4);
            yPos += 4;
          });
          if (descLines.length > maxDescLines) {
            doc.setTextColor(120);
            doc.text('...', margin, yPos + 4);
            yPos += 4;
          }
          yPos += 2;
        }
      }

      // Quick notes
      if (isValidValue(item.quickNotes)) {
        checkPageBreak(10);
        doc.setFontSize(9);
        doc.setFont(fontName, 'bold');
        doc.setTextColor(180, 130, 50); // Amber
        doc.text('Quick Notes:', margin, yPos + 4);
        yPos += 5;
        doc.setFont(fontName, 'normal');
        doc.setTextColor(100);
        const sanitizedNotes = sanitizeForPdf(item.quickNotes!, false);
        const notesLines = doc.splitTextToSize(sanitizedNotes, contentWidth - 10);
        const maxNotesLines = 4;
        const displayNotesLines = notesLines.slice(0, maxNotesLines);
        displayNotesLines.forEach((line: string) => {
          checkPageBreak(4);
          doc.text(line, margin, yPos + 4);
          yPos += 4;
        });
        if (notesLines.length > maxNotesLines) {
          doc.text('...', margin, yPos + 4);
          yPos += 4;
        }
        yPos += 2;
      }

      // Checklist
      if (item.checklist && item.checklist.length > 0) {
        checkPageBreak(10);
        const completedCount = item.checklist.filter(c => c.completed).length;
        doc.setFontSize(9);
        doc.setFont(fontName, 'bold');
        doc.setTextColor(79, 70, 229); // Indigo
        doc.text(`Checklist (${completedCount}/${item.checklist.length}):`, margin, yPos + 4);
        yPos += 5;

        item.checklist.forEach((checkItem) => {
          checkPageBreak(4);
          doc.setFont(fontName, 'normal');
          const checkMark = checkItem.completed ? '[x]' : '[ ]';
          doc.setTextColor(checkItem.completed ? 120 : 60);
          const itemText = `  ${checkMark} ${sanitizeForPdf(checkItem.text, true)}`;
          doc.text(itemText, margin, yPos + 4);
          yPos += 4;
        });
        yPos += 2;
      }

      // Linked documents
      if (item.sourceDocuments && item.sourceDocuments.length > 0) {
        checkPageBreak(6);
        doc.setFontSize(8);
        doc.setFont(fontName, 'normal');
        doc.setTextColor(130);
        const docNames = item.sourceDocuments.map(d => sanitizeForPdf(d.name, true)).join(', ');
        doc.text(`Linked docs: ${docNames}`, margin, yPos + 4);
        yPos += 5;
      }

      // Divider line between activities
      if (itemIndex < dayItems.length - 1) {
        yPos += 2;
        doc.setDrawColor(220);
        doc.setLineWidth(0.3);
        doc.line(margin + 10, yPos, pageWidth - margin - 10, yPos);
        yPos += 6;
      } else {
        yPos += 4;
      }
    });

    yPos += 8; // Extra space between days
  });

  // Footer with generation date
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${format(new Date(), 'MMM d, yyyy')} | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Download the PDF
  const fileName = `${tripTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_itinerary.pdf`;
  doc.save(fileName);
}
