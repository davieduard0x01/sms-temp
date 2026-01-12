// ARQUIVO: backend/index.js (VERSÃO DEMO - CADASTRO DIRETO SEM OTP)

require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid'); 

const app = express();
const PORT = process.env.PORT || 3001;

// --- Configurações Fixas ---
const FIXED_COUPON_CODE = "D0nP3dro20"; 

// --- CORS LIBERADO ---
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Token'],
    optionsSuccessStatus: 200
}));

app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Funções de Ajuda ---
const normalizePhoneNumber = (number) => {
    const digits = number.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) { return `+${digits}`; }
    if (digits.length === 10) { return `+1${digits}`; }
    return `+${digits}`; 
};

// ... (Middlewares de Autenticação mantidos para o Painel Admin) ...
const authenticateAccess = async (req, res, next) => {
    const token = req.header('X-Auth-Token');
    if (!token) { return res.status(401).json({ message: 'Token ausente.' }); }
    try {
        const [usuario, nivel] = token.split(':');
        const { data, error } = await supabase.from('users_acesso').select('nivel').eq('usuario', usuario).limit(1);
        if (error || !data || data.length === 0) { return res.status(401).json({ message: 'Usuário inválido.' }); }
        req.user_nivel = data[0].nivel; 
        req.user_usuario = usuario;
        next();
    } catch (e) { return res.status(401).json({ message: 'Token inválido.' }); }
};

const requireAdmin = (req, res, next) => {
    if (req.user_nivel !== 'ADMIN') { return res.status(403).json({ message: 'Acesso negado.' }); }
    next();
};


// ----------------------------------------------------
// --- ROTA DE CADASTRO DIRETO (SUBSTITUI O SEND-OTP) ---
// ----------------------------------------------------

app.post('/api/register-direct', async (req, res) => {
    const { name, phone, address } = req.body; 
    
    console.log(`[DEMO] Tentativa de cadastro: ${phone}`);

    if (!name || !phone || !address) { return res.status(400).json({ message: 'Campos obrigatórios.' }); }
    
    const normalizedNumber = normalizePhoneNumber(phone);
    
    if (!normalizedNumber.startsWith('+') || normalizedNumber.length < 12) {
        return res.status(400).json({ message: 'Número inválido. Use formato com DDD.' });
    }

    // 1. VERIFICA SE JÁ EXISTE (Lógica original)
    try {
        const { data: existingCupons } = await supabase.from('leads_cupons').select('*').eq('telefone', normalizedNumber);
        
        if (existingCupons && existingCupons.length > 0) {
            // USUÁRIO JÁ EXISTE: Retorna lista de cupons
            const cuponsValidos = existingCupons.filter(c => c.status_uso === 'NAO_UTILIZADO');
            const cupomPrincipal = cuponsValidos.length > 0 ? cuponsValidos[0].coupon_uuid : existingCupons[0].coupon_uuid;

            console.log(`[DEMO] Usuário encontrado: ${existingCupons[0].nome}`);

            return res.status(409).json({ 
                message: `Bem-vindo de volta, ${existingCupons[0].nome}!`,
                cupons: existingCupons,
                isExistingUser: true
            });
        }
    } catch (dbError) { return res.status(500).json({ message: 'Erro ao verificar usuário.' }); }
    
    // 2. SE NÃO EXISTE, CADASTRA DIRETO (Pula etapa de OTP)
    const couponUUID = uuidv4(); 
    const registrationData = {
        coupon_uuid: couponUUID,
        nome: name,
        telefone: normalizedNumber, 
        endereco: address,
        status_uso: 'NAO_UTILIZADO',
        coupon_code: FIXED_COUPON_CODE, 
    };

    try {
        await supabase.from('leads_cupons').insert([registrationData]);
        console.log(`[DEMO] Novo cadastro realizado: ${name}`);

        return res.status(200).json({ 
            message: `Cadastro realizado com sucesso!`,
            couponUUID: couponUUID, 
            couponCode: FIXED_COUPON_CODE 
        });

    } catch (e) {
        console.error('Erro ao salvar:', e);
        return res.status(500).json({ message: 'Erro interno ao salvar.' });
    }
});


// ... (Rotas de Login e Admin mantidas iguais para o painel funcionar) ...
app.post('/auth/login', async (req, res) => {
    const { usuario, senha } = req.body;
    try {
        const { data } = await supabase.from('users_acesso').select('*').eq('usuario', usuario).eq('senha', senha).limit(1);
        if (!data || data.length === 0) { return res.status(401).json({ message: 'Credenciais inválidas.' }); }
        const token = `${data[0].usuario}:${data[0].nivel}`;
        return res.status(200).json({ message: 'Login OK', token, nivel: data[0].nivel });
    } catch (dbError) { return res.status(500).json({ message: 'Erro interno.' }); }
});

app.post('/func/validate', authenticateAccess, async (req, res) => {
    const { couponUUID } = req.body; 
    if (!couponUUID) return res.status(400).json({ message: 'Código obrigatório.' });
    try {
        const { data: coupon } = await supabase.from('leads_cupons').select('*').eq('coupon_uuid', couponUUID).limit(1);
        if (!coupon || coupon.length === 0) return res.status(404).json({ message: 'Cupom não encontrado.' });
        if (coupon[0].status_uso === 'UTILIZADO') return res.status(409).json({ message: `Cupom já utilizado por ${coupon[0].nome}.` });
        if (coupon[0].status_uso === 'EXPIRADO') return res.status(409).json({ message: 'Cupom expirado.' });
        await supabase.from('leads_cupons').update({ status_uso: 'UTILIZADO', data_uso: new Date().toISOString() }).eq('coupon_uuid', couponUUID);
        return res.status(200).json({ message: `CUPOM VÁLIDO! Registrado para ${coupon[0].nome}.`, status: 'VALIDADO', nome: coupon[0].nome });
    } catch (dbError) { return res.status(500).json({ message: 'Erro na validação.' }); }
});

app.get('/admin/leads', authenticateAccess, requireAdmin, async (req, res) => {
    try {
        const { data: leads } = await supabase.from('leads_cupons').select('*');
        return res.status(200).json(leads);
    } catch (dbError) { return res.status(500).json({ message: 'Erro ao buscar dados.' }); }
});

app.listen(PORT, () => {
    console.log(`Servidor DEMO (Direct) rodando na porta ${PORT}`);
});