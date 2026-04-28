// Wrapper do Google Calendar pro fluxo de agenda da Intento.
// Usa Service Account com Domain-wide Delegation pra impersonar cada vendedor.
// Cada chamada passa o `userEmail` que será impersonado.

import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const TIMEZONE = 'America/Sao_Paulo';
const TAG = 'reuniao_intento'; // pra contar reuniões geradas pelo nosso serviço

function getServiceAccountCreds() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não configurado');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY inválido (não é JSON): ' + e.message);
  }
}

function getCalendarClient(impersonateEmail) {
  const creds = getServiceAccountCreds();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: SCOPES,
    subject: impersonateEmail,
  });
  return google.calendar({ version: 'v3', auth });
}

// Retorna intervalos ocupados de cada email no período.
// emails: string[]
// timeMinISO, timeMaxISO: ISO strings
// → Map<email, [{start, end}]> com horários ocupados
export async function freeBusyMulti(emails, timeMinISO, timeMaxISO) {
  if (!emails || emails.length === 0) return {};
  // Domain-wide delegation: impersona o primeiro email só pra autenticar
  // (freeBusy aceita ler outros calendars do mesmo domínio)
  const calendar = getCalendarClient(emails[0]);
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMinISO,
      timeMax: timeMaxISO,
      timeZone: TIMEZONE,
      items: emails.map((e) => ({ id: e })),
    },
  });
  const out = {};
  const cals = res.data.calendars || {};
  for (const email of emails) {
    const busy = (cals[email] && cals[email].busy) || [];
    out[email] = busy.map((b) => ({ start: b.start, end: b.end }));
  }
  return out;
}

// Cria evento no calendário do vendedor com Google Meet automático.
// Retorna { eventId, htmlLink, meetLink }
export async function criarEvento({
  vendedorEmail,
  inicioISO,
  fimISO,
  titulo,
  descricao,
  convidados, // string[] — emails extras (lead, suporte)
}) {
  const calendar = getCalendarClient(vendedorEmail);
  const requestBody = {
    summary: titulo,
    description: descricao,
    start: { dateTime: inicioISO, timeZone: TIMEZONE },
    end:   { dateTime: fimISO,   timeZone: TIMEZONE },
    attendees: (convidados || []).map((e) => ({ email: e })),
    extendedProperties: {
      private: { tipo: TAG },
    },
    conferenceData: {
      createRequest: {
        requestId: 'intento-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };
  const res = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody,
  });
  const ev = res.data;
  let meetLink = '';
  if (ev.conferenceData?.entryPoints) {
    const meet = ev.conferenceData.entryPoints.find((p) => p.entryPointType === 'video');
    if (meet) meetLink = meet.uri;
  }
  return {
    eventId: ev.id,
    htmlLink: ev.htmlLink || '',
    meetLink: meetLink || ev.hangoutLink || '',
  };
}

// Cancela evento. Não falha se já não existir.
export async function cancelarEvento({ vendedorEmail, eventId }) {
  const calendar = getCalendarClient(vendedorEmail);
  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    });
    return { ok: true };
  } catch (e) {
    if (e.code === 404 || e.code === 410) return { ok: true, jaApagado: true };
    throw e;
  }
}

// Conta reuniões do tipo nossa (extendedProperties.private.tipo='reuniao_intento')
// criadas no calendário do vendedor no mês corrente.
export async function contarReunioesDoMes(vendedorEmail) {
  const calendar = getCalendarClient(vendedorEmail);
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
  const fim    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1).toISOString();
  let total = 0;
  let pageToken;
  do {
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: inicio,
      timeMax: fim,
      privateExtendedProperty: 'tipo=' + TAG,
      singleEvents: true,
      maxResults: 100,
      pageToken,
    });
    total += (res.data.items || []).length;
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return total;
}

// === Helpers de tempo / slots ===

const DIAS_KEY = ['dom','seg','ter','qua','qui','sex','sab'];

// Verifica se um horário cai dentro das janelas declaradas (horarios_atendimento).
// horarios: { seg: ["19:00-21:30"], ter: [...], ... }
// inicio: Date
// durMin: número
// → boolean
export function dentroJanela(horarios, inicio, durMin) {
  if (!horarios || typeof horarios !== 'object') return false;
  const dia = DIAS_KEY[inicio.getDay()];
  const janelas = horarios[dia] || [];
  const fim = new Date(inicio.getTime() + durMin * 60 * 1000);
  for (const j of janelas) {
    const m = String(j).match(/^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/);
    if (!m) continue;
    const inicioJanela = new Date(inicio); inicioJanela.setHours(+m[1], +m[2], 0, 0);
    const fimJanela    = new Date(inicio); fimJanela.setHours(+m[3], +m[4], 0, 0);
    if (inicio >= inicioJanela && fim <= fimJanela) return true;
  }
  return false;
}

// Verifica se um intervalo [inicio, fim] colide com algum dos busy times do vendedor.
// busyArr: [{start, end}] vindo do freeBusy
export function colideComBusy(inicio, fim, busyArr) {
  for (const b of busyArr || []) {
    const bStart = new Date(b.start);
    const bEnd   = new Date(b.end);
    // overlap: a.start < b.end && a.end > b.start
    if (inicio < bEnd && fim > bStart) return true;
  }
  return false;
}

// Gera slots de 30 em 30 minutos dentro das janelas declaradas + período (até `dias` à frente)
// Retorna: ISO[]
export function slotsDentroJanelas(horarios, dias, durMin, antecedenciaMinHoras) {
  if (!horarios) return [];
  const out = [];
  const agora = new Date();
  const minimo = new Date(agora.getTime() + antecedenciaMinHoras * 60 * 60 * 1000);
  const fimPeriodo = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);

  // Itera dia a dia
  let cursor = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  while (cursor <= fimPeriodo) {
    const dia = DIAS_KEY[cursor.getDay()];
    const janelas = horarios[dia] || [];
    for (const j of janelas) {
      const m = String(j).match(/^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/);
      if (!m) continue;
      const inicioJ = new Date(cursor); inicioJ.setHours(+m[1], +m[2], 0, 0);
      const fimJ    = new Date(cursor); fimJ.setHours(+m[3], +m[4], 0, 0);
      let t = new Date(inicioJ);
      while (true) {
        const slotFim = new Date(t.getTime() + durMin * 60 * 1000);
        if (slotFim > fimJ) break;
        if (t >= minimo) out.push(t.toISOString());
        t = new Date(t.getTime() + 30 * 60 * 1000);
      }
    }
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return out;
}

// Formata horário pra exibição PT-BR ("Terça-feira, 06/05 às 19h00")
export function formatarHorarioBR(iso) {
  const d = new Date(iso);
  const dias = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dias[d.getDay()]}, ${dd}/${mm} às ${hh}h${min}`;
}
