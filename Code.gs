const SHEET_NAMES = {
  MEMBERS: 'Members',
  LOGS: 'Logs'
};

const PRICE = {
  urgent: 10000,
  waste: 2000,
  gown: 8500,
  pack: 2000,
  anti: 27900
};

function doGet(e) {
  try {
    const action = (e.parameter.action || 'data').toLowerCase();
    const callback = e.parameter.callback;

    let payload;
    if (action === 'track') {
      payload = trackEvent_(e.parameter.userKey, e.parameter.serviceKey);
    } else {
      payload = getDashboardData_(e.parameter.userKey);
    }

    return respond_(payload, callback);
  } catch (error) {
    const callback = e && e.parameter ? e.parameter.callback : '';
    return respond_({ success: false, message: error.message }, callback);
  }
}

function respond_(payload, callback) {
  if (callback) {
    const text = `${callback}(${JSON.stringify(payload)})`;
    return ContentService
      .createTextOutput(text)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getDashboardData_(userKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const membersSheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);
  const logsSheet = ss.getSheetByName(SHEET_NAMES.LOGS);

  if (!membersSheet) throw new Error('Members 시트를 찾을 수 없습니다.');
  if (!logsSheet) throw new Error('Logs 시트를 찾을 수 없습니다.');

  const members = sheetToObjects_(membersSheet);
  if (!members.length) throw new Error('Members 시트에 데이터가 없습니다.');

  const member = members.find(row => String(row.userKey) === String(userKey)) || members[0];
  const logs = getLogSummary_(logsSheet, member.userKey);

  const urgent = toNumber_(member.urgent);
  const waste = toNumber_(member.waste);
  const gown = toNumber_(member.gown);
  const pack = toNumber_(member.pack);
  const antiSubscribed = String(member.antiSubscribed || '').toUpperCase() === 'Y';

  const mappedMember = {
    userKey: String(member.userKey),
    name: member.name || '',
    daysUsed: toNumber_(member.daysUsed),
    urgentLimit: toNumber_(member.urgentLimit || 5),
    gownLimit: toNumber_(member.gownLimit || 2),
    urgent: urgent,
    waste: waste,
    gown: gown,
    pack: pack,
    antiSubscribed: antiSubscribed ? 'Y' : 'N',
    accessMethod: member.accessMethod || '비밀번호 출입',
    accessUpdatedAt: formatDateTime_(member.accessUpdatedAt),
    urgentSaving: urgent * PRICE.urgent,
    wasteSaving: waste * PRICE.waste,
    gownSaving: gown * PRICE.gown,
    packSaving: pack * PRICE.pack,
    antiSaving: antiSubscribed ? PRICE.anti : 0
  };
  mappedMember.totalSaving = mappedMember.urgentSaving + mappedMember.wasteSaving + mappedMember.gownSaving + mappedMember.packSaving + mappedMember.antiSaving;

  const avgSaving = Math.round(members.reduce((sum, row) => {
    const u = toNumber_(row.urgent);
    const w = toNumber_(row.waste);
    const g = toNumber_(row.gown);
    const p = toNumber_(row.pack);
    const anti = String(row.antiSubscribed || '').toUpperCase() === 'Y' ? PRICE.anti : 0;
    return sum + (u * PRICE.urgent) + (w * PRICE.waste) + (g * PRICE.gown) + (p * PRICE.pack) + anti;
  }, 0) / members.length);

  return {
    success: true,
    member: mappedMember,
    logs: logs,
    comparison: {
      avgSaving: avgSaving
    },
    updatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
  };
}

function trackEvent_(userKey, serviceKey) {
  if (!userKey) throw new Error('userKey가 필요합니다.');
  if (!serviceKey) throw new Error('serviceKey가 필요합니다.');

  const allowed = ['urgent', 'waste', 'gown', 'pack'];
  if (allowed.indexOf(serviceKey) === -1) throw new Error('허용되지 않은 serviceKey입니다.');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logsSheet = ss.getSheetByName(SHEET_NAMES.LOGS);
  if (!logsSheet) throw new Error('Logs 시트를 찾을 수 없습니다.');

  logsSheet.appendRow([
    new Date(),
    String(userKey),
    String(serviceKey),
    'detail_click'
  ]);

  return {
    success: true,
    message: '데이터가 저장되었습니다.',
    userKey: String(userKey),
    serviceKey: String(serviceKey)
  };
}

function getLogSummary_(sheet, userKey) {
  const rows = sheetToObjects_(sheet).filter(row => String(row.userKey) === String(userKey));

  const base = {
    urgentClicks: 0, urgentLastAt: '-',
    wasteClicks: 0, wasteLastAt: '-',
    gownClicks: 0, gownLastAt: '-',
    packClicks: 0, packLastAt: '-'
  };

  rows.forEach(row => {
    const key = String(row.serviceKey || '');
    const dateText = formatDateTime_(row.createdAt);

    if (key === 'urgent') {
      base.urgentClicks += 1;
      base.urgentLastAt = dateText;
    }
    if (key === 'waste') {
      base.wasteClicks += 1;
      base.wasteLastAt = dateText;
    }
    if (key === 'gown') {
      base.gownClicks += 1;
      base.gownLastAt = dateText;
    }
    if (key === 'pack') {
      base.packClicks += 1;
      base.packLastAt = dateText;
    }
  });

  return base;
}

function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(v => String(v).trim());
  return values.slice(1).filter(row => row.join('') !== '').map(row => {
    const obj = {};
    headers.forEach((header, index) => obj[header] = row[index]);
    return obj;
  });
}

function toNumber_(value) {
  if (value === '' || value === null || value === undefined) return 0;
  return Number(value) || 0;
}

function formatDateTime_(value) {
  if (!value) return '-';
  let date = value;
  if (!(value instanceof Date)) {
    date = new Date(value);
  }
  if (String(date) === 'Invalid Date') return String(value);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function setupSampleSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let membersSheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);
  if (!membersSheet) membersSheet = ss.insertSheet(SHEET_NAMES.MEMBERS);
  membersSheet.clear();
  membersSheet.getRange(1, 1, 4, 11).setValues([
    ['userKey', 'name', 'daysUsed', 'urgentLimit', 'gownLimit', 'urgent', 'waste', 'gown', 'pack', 'antiSubscribed', 'accessMethod'],
    ['10000000', '더샵약국', 128, 5, 2, 1, 1, 4, 3, 'N', '비밀번호 출입'],
    ['10000710', '테스트약국A', 80, 5, 2, 2, 3, 2, 0, 'Y', '비밀번호 출입'],
    ['10002665', '테스트약국B', 45, 5, 2, 1, 2, 1, 1, 'N', '비밀번호 출입']
  ]);
  membersSheet.getRange('L1').setValue('accessUpdatedAt');
  membersSheet.getRange('L2:L4').setValues([[new Date()], [new Date()], [new Date()]]);

  let logsSheet = ss.getSheetByName(SHEET_NAMES.LOGS);
  if (!logsSheet) logsSheet = ss.insertSheet(SHEET_NAMES.LOGS);
  logsSheet.clear();
  logsSheet.getRange(1, 1, 4, 4).setValues([
    ['createdAt', 'userKey', 'serviceKey', 'eventType'],
    [new Date(), '10000000', 'urgent', 'detail_click'],
    [new Date(), '10000000', 'gown', 'detail_click'],
    [new Date(), '10000000', 'gown', 'detail_click']
  ]);
}
