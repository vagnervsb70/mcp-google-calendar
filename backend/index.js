import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import calendarioRoutes from './routes/calendario.js';

// Resolver __dirname com ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar o app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Servir a interface web da pasta frontend
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// Rotas
app.use('/auth', authRoutes);
app.use('/calendario', calendarioRoutes);

// Porta dinâmica para Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
