import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir arquivos estáticos da pasta frontend
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

import dotenv from 'dotenv';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Redireciona para login do Google
app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent'
  });
  res.redirect(url);
});

// Callback do Google OAuth2
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({
    auth: oauth2Client,
    version: 'v2'
  });
  const { data: userInfo } = await oauth2.userinfo.get();

  // Salva ou atualiza tokens do usuário
  await supabase.from('users').upsert({
    id: userInfo.id,
    email: userInfo.email,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: new Date(tokens.expiry_date).toISOString(),
    created_at: new Date().toISOString()
  });

  res.redirect(`http://localhost:3000/frontend/success.html?email=${userInfo.email}`);
});

// Agendamento usando token do usuário
app.post('/agendar', async (req, res) => {
  const { email, summary, description, startTime, endTime } = req.body;

  const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (error || !data) return res.status(401).send('Usuário não autenticado');

  const client = new google.auth.OAuth2();
  client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token
  });

  const calendar = google.calendar({ version: 'v3', auth: client });

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary,
        description,
        start: { dateTime: startTime },
        end: { dateTime: endTime }
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao agendar evento');
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Servidor rodando na porta ${process.env.PORT}`);
});
