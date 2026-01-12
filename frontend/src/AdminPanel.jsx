// ARQUIVO: frontend/src/AdminPanel.jsx (VERSÃO DEMO ATUALIZADA)

import React, { useState, useEffect } from 'react';
import './Admin.css'; 

// >>> URL DO BACKEND DEMO (CORRIGIDA) <<<
const API_BASE_URL = 'https://backend-sms-demo.onrender.com';
// --------------------------------------------------------

// Função auxiliar para converter a lista de objetos para formato CSV
const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    // Define a ordem e os nomes dos cabeçalhos
    const headers = ["coupon_uuid", "nome", "telefone", "endereco", "status_uso", "data_cadastro", "data_uso"];
    
    const csvContent = [
        headers.join(";"), 
        ...data.map(row => 
            headers.map(header => {
                let value = row[header] === null || row[header] === undefined ? '' : row[header];
                // Formatação da data
                if (header.startsWith('data_') && value) {
                    value = new Date(value).toLocaleDateString('pt-BR');
                }
                value = String(value).replace(/"/g, '""'); 
                if (value.includes(';') || value.includes('\n')) {
                    value = `"${value}"`;
                }
                return value;
            }).join(';')
        )
    ].join('\n');

    return "\uFEFF" + csvContent; // Adiciona BOM para compatibilidade com Excel
};

// Limpar o número de telefone para ter apenas dígitos e o sinal de +
const cleanPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    return phoneNumber.replace(/[^\d+]/g, ''); 
};
// --------------------------------------------------------------------------------------


const AdminPanel = () => {
    // --- Estados de Autenticação e Dados ---
    const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
    const [nivelAcesso, setNivelAcesso] = useState(localStorage.getItem('adminNivel') || '');
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState(''); 
    const [loginError, setLoginError] = useState('');

    // --- Estados do Dashboard ---
    const [cupons, setCupons] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [dataError, setDataError] = useState('');


    // --- 1. Efeito para carregar os dados ao autenticar ---
    useEffect(() => {
        if (token && nivelAcesso === 'ADMIN') {
            fetchData();
        }
    }, [token, nivelAcesso]); 

    // --- 2. Lógica de Carregamento de Dados (Dashboard) ---
    const fetchData = async () => {
        setLoadingData(true);
        setDataError('');

        try {
            const response = await fetch(`${API_BASE_URL}/admin/leads`, { 
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Auth-Token': token 
                },
            });

            const data = await response.json();
            
            if (response.ok) {
                setCupons(data);
            } else if (response.status === 401 || response.status === 403) {
                handleLogout();
                setLoginError('Acesso expirado ou negado. Faça login novamente.');
            } else {
                setDataError(data.message || 'Erro ao carregar os dados.');
            }

        } catch (error) {
            setDataError('Erro de comunicação com o servidor ao buscar dados.');
        } finally {
            setLoadingData(false);
        }
    };


    // --- 3. Lógica de Login ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, senha: password }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.nivel !== 'ADMIN') {
                    setLoginError('Acesso negado. Esta área é restrita a Administradores.');
                    return;
                }
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminNivel', data.nivel);
                setToken(data.token);
                setNivelAcesso(data.nivel);
            } else {
                setLoginError(data.message || 'Erro de login desconhecido.');
            }
        } catch (error) {
            setLoginError('Erro de conexão com o servidor de autenticação.');
        }
    };

    // --- 4. Lógica de Logout ---
    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminNivel');
        setToken('');
        setNivelAcesso('');
        setCupons([]);
        setLoginError('');
    };

    // --- 5. Lógica de Exportação CSV ---
    const handleExportCSV = () => {
        if (cupons.length === 0) return;

        const csv = convertToCSV(cupons);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        
        if (link.download !== undefined) { 
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `leads_demo_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // --- 6. Renderização ---

    // Tela de Login
    if (!token || nivelAcesso !== 'ADMIN') {
        return (
            <div className="admin-container login-form">
                <h2>Painel de Administração</h2>
                <span className="brand-name">DONPEDRO Demo</span>
                <form onSubmit={handleLogin}>
                    <input
                        type="text"
                        placeholder="Usuário Admin"
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Senha Admin"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="off" 
                    />
                    <button type="submit">Acessar Dashboard</button>
                    {loginError && <p className="login-error">{loginError}</p>}
                </form>
            </div>
        );
    }

    // Dashboard
    return (
        <div className="admin-container dashboard-panel">
            <header className="admin-header">
                <div className="admin-info-content">
                    <h1>Dashboard (Versão Demo)</h1>
                    <p>Usuário logado: <strong>{usuario}</strong> ({nivelAcesso})</p>
                </div>
                <div className="admin-actions">
                    <button onClick={handleExportCSV} disabled={loadingData || cupons.length === 0} className="export-button">
                        {cupons.length > 0 ? `EXPORTAR ${cupons.length} REGISTROS` : 'NENHUM DADO'}
                    </button>
                    <button onClick={handleLogout} className="logout-button">SAIR</button>
                </div>
            </header>
            <hr className="admin-separator" />

            {loadingData && <p className="loading-message">Carregando dados...</p>}
            {dataError && <p className="error-message">{dataError}</p>}

            {!loadingData && cupons.length > 0 && (
                <p className="total-count">Total de Cadastros: <strong>{cupons.length}</strong></p>
            )}

            {!loadingData && cupons.length > 0 && (
                <div className="data-table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Telefone</th>
                                <th>Endereço</th>
                                <th>Status Uso</th>
                                <th>Código Cupom</th>
                                <th>Cadastrado Em</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cupons.map((c) => (
                                <tr key={c.coupon_uuid} className={`status-${c.status_uso.toLowerCase().replace('_', '-')}`}>
                                    <td data-label="Nome">{c.nome}</td>
                                    <td data-label="Telefone">{cleanPhoneNumber(c.telefone)}</td>
                                    <td data-label="Endereço">{c.endereco}</td>
                                    <td data-label="Status Uso">{c.status_uso.replace('_', ' ')}</td>
                                    <td data-label="Código Cupom" title={c.coupon_uuid}>{c.coupon_uuid.substring(0, 8)}...</td>
                                    <td data-label="Cadastrado Em">{new Date(c.data_cadastro).toLocaleDateString('pt-BR')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {!loadingData && cupons.length === 0 && !dataError && (
                <p className="no-data">Nenhum cupom cadastrado ainda.</p>
            )}

        </div>
    );
};

export default AdminPanel;