export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

function getCreds() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não configurado');
  return JSON.parse(raw);
}

function getCalendarClient(impersonateEmail) {
  const creds = getCreds();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: SCOPES,
    subject: impersonateEmail,
  });
  return google.calendar({ version: 'v3', auth });
}

// Endpoint de exploração — lista calendários, eventos detalhados, estrutura crua.
// Útil pra entender como Google Appointment Scheduling aparece pra service account.
//
// Uso:
//   GET /api/agenda/debug?email=filippe@metodointento.com.br&dias=7
//   Header: x-agent-token: <SECRET>
export async function GET(request) {
  const token = request.headers.get('x-agent-token');
  if (!token || token !== process.env.AGENT_API_TOKEN) {
    return NextResponse.json({ status: 'erro', mensagem: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const dias = parseInt(searchParams.get('dias') || '7', 10);
  if (!email) {
    return NextResponse.json({ status: 'erro', mensagem: 'param email obrigatório' }, { status: 400 });
  }

  // Diagnóstico do env var GOOGLE_SERVICE_ACCOUNT_KEY (sem revelar valores).
  const envCheck = (() => {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!raw) return { setado: false };
    const out = { setado: true, tamanhoBytes: raw.length };
    try {
      const obj = JSON.parse(raw);
      out.parseOk = true;
      out.campos = Object.keys(obj);
      out.tem_client_email = !!obj.client_email;
      out.tem_private_key = !!obj.private_key;
      out.tem_client_id = !!obj.client_id;
      out.tem_project_id = !!obj.project_id;
      out.tem_type = !!obj.type;
      out.client_email_dominio = obj.client_email ? obj.client_email.split('@')[1] : null;
      out.client_email = obj.client_email; // não é segredo, é a identidade pública da SA
      out.client_id = obj.client_id;       // mesmo
      out.project_id = obj.project_id;
      out.private_key_tamanho = obj.private_key ? obj.private_key.length : 0;
      out.private_key_comeca_com_BEGIN = obj.private_key ? obj.private_key.startsWith('-----BEGIN') : false;
      out.private_key_termina_com_END = obj.private_key ? obj.private_key.trim().endsWith('-----') : false;
      out.private_key_tem_newlines = obj.private_key ? obj.private_key.includes('\n') : false;
      out.type_value = obj.type;
    } catch (e) {
      out.parseOk = false;
      out.parseErro = e.message;
      out.primeiros20chars = raw.slice(0, 20);
      out.ultimos20chars = raw.slice(-20);
    }
    return out;
  })();

  try {
    const calendar = getCalendarClient(email);
    const agora = new Date();
    const fim = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);

    // 1. Lista de calendários visíveis pra service account impersonando o email
    let calendarsList = null;
    try {
      const r = await calendar.calendarList.list({ maxResults: 50 });
      calendarsList = (r.data.items || []).map((c) => ({
        id: c.id,
        summary: c.summary,
        primary: !!c.primary,
        accessRole: c.accessRole,
        backgroundColor: c.backgroundColor,
      }));
    } catch (e) {
      calendarsList = { erro: e.message };
    }

    // 2. Tenta diferentes eventTypes — vê quais aparecem
    const eventTypesToTry = [
      ['default'],
      ['outOfOffice'],
      ['focusTime'],
      ['workingLocation'],
      ['fromGmail'],
      ['birthday'],
      ['default','outOfOffice','focusTime','workingLocation','fromGmail','birthday'],
    ];
    const eventsByType = {};
    for (const types of eventTypesToTry) {
      const key = types.join(',');
      try {
        const r = await calendar.events.list({
          calendarId: 'primary',
          timeMin: agora.toISOString(),
          timeMax: fim.toISOString(),
          singleEvents: true,
          maxResults: 50,
          eventTypes: types,
        });
        eventsByType[key] = (r.data.items || []).map(simplifyEvent);
      } catch (e) {
        eventsByType[key] = { erro: e.message, code: e.code };
      }
    }

    // 3. Lista TODOS os eventos sem filtro (default behavior) com campos completos
    let allEvents = null;
    try {
      const r = await calendar.events.list({
        calendarId: 'primary',
        timeMin: agora.toISOString(),
        timeMax: fim.toISOString(),
        singleEvents: true,
        maxResults: 100,
        showDeleted: false,
      });
      allEvents = (r.data.items || []).map(simplifyEvent);
    } catch (e) {
      allEvents = { erro: e.message };
    }

    // 4. Tenta listar eventos com q='Appointment'
    let queriedAppointment = null;
    try {
      const r = await calendar.events.list({
        calendarId: 'primary',
        timeMin: agora.toISOString(),
        timeMax: fim.toISOString(),
        singleEvents: true,
        q: 'Appointment',
        maxResults: 50,
      });
      queriedAppointment = (r.data.items || []).map(simplifyEvent);
    } catch (e) {
      queriedAppointment = { erro: e.message };
    }

    return NextResponse.json({
      status: 'sucesso',
      email,
      janela: { de: agora.toISOString(), ate: fim.toISOString() },
      envCheck,
      calendarsList,
      eventsByType,
      allEvents,
      queriedAppointment,
    });

  } catch (e) {
    console.error('[/api/agenda/debug]', e);
    return NextResponse.json({ status: 'erro', mensagem: e.message, stack: e.stack, envCheck }, { status: 500 });
  }
}

function simplifyEvent(e) {
  return {
    id: e.id,
    summary: e.summary,
    description: e.description,
    start: e.start,
    end: e.end,
    eventType: e.eventType,
    status: e.status,
    creator: e.creator?.email,
    organizer: e.organizer?.email,
    extendedProperties: e.extendedProperties,
    source: e.source,
    visibility: e.visibility,
    transparency: e.transparency,
    htmlLink: e.htmlLink,
    recurringEventId: e.recurringEventId,
    iCalUID: e.iCalUID,
    conferenceData: e.conferenceData ? { hasMeet: true } : null,
  };
}
