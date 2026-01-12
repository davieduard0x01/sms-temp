// ARQUIVO: frontend/src/App.jsx (VERSÃO DEMO - CADASTRO INSTANTÂNEO)

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react'; 
import './App.css'; 

// --- URL DO BACKEND ---
// Mude para o link do Render quando subir, ou localhost para teste
const API_BASE_URL = 'https://coupon-sms-proejct-donpedro.onrender.com'; 
const API_REGISTER_DIRECT = `${API_BASE_URL}/api/register-direct`;

// -----------------------

// Componente para exibir cupons existentes (Mantido)
const UserCuponsList = ({ cupons, onViewQR }) => ( 
    <div className="coupon-list-wrapper">
        <h2>My Coupons</h2>
        <p className="list-intro">You are already registered. Here are your coupons:</p>
        <div className="coupon-grid">
            {cupons.map((coupon) => (
                <div 
                    key={coupon.coupon_uuid} 
                    className={`coupon-card status-${coupon.status_uso.toLowerCase().replace('_', '-')}`}
                    onClick={() => coupon.status_uso === 'NAO_UTILIZADO' && onViewQR(coupon.coupon_uuid)} 
                    style={{ cursor: coupon.status_uso === 'NAO_UTILIZADO' ? 'pointer' : 'default' }}
                >
                    <p className="status-label">
                        {coupon.status_uso === 'NAO_UTILIZADO' ? 'ACTIVE' : coupon.status_uso.replace('_', ' ')}
                    </p>
                    <p className="coupon-code-display">{coupon.coupon_code} ({coupon.coupon_uuid.substring(0, 8)}...)</p>
                    {coupon.status_uso === 'NAO_UTILIZADO' ? (
                        <p className="print-info">Click to view valid QR Code again.</p>
                    ) : (
                        <p className="print-info">This coupon has been {coupon.status_uso.toLowerCase()}.</p>
                    )}
                </div>
            ))}
        </div>
        <p className="note">If you lost your valid QR Code, please contact support.</p>
    </div>
);


function App() {
  // --- DADOS ---
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // --- ESTADOS ---
  const [currentPhase, setCurrentPhase] = useState('cadastro'); // 'cadastro' OU 'qrcode' (sem validação)
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // --- RESULTADOS ---
  const [couponUUID, setCouponUUID] = useState(null);
  const [existingUserCupons, setExistingUserCupons] = useState(null);
  const [duplicityMessage, setDuplicityMessage] = useState('');


  // Função para ver QR Code de usuário existente
  const handleViewQR = (uuid) => {
    setCouponUUID(uuid);
    setMessage("Your valid coupon has been retrieved.");
    setCurrentPhase('qrcode');
    setExistingUserCupons(null); 
  };


  // --- CADASTRO DIRETO (SEM OTP) ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setDuplicityMessage('');
    setExistingUserCupons(null); 

    try {
      const response = await fetch(API_REGISTER_DIRECT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, address }), 
      });

      const data = await response.json();
      
      if (response.ok) {
        // SUCESSO: Vai DIRETO para a tela de QR Code
        setMessage(data.message || 'Success!');
        setCouponUUID(data.couponUUID);
        setCurrentPhase('qrcode');
        
      } else if (response.status === 409) {
        // JÁ EXISTE: Mostra lista de cupons
        setDuplicityMessage(data.message || 'User already registered.'); 
        setExistingUserCupons(data.cupons); 
        
      } else {
        setMessage(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Request Error:', error);
      setMessage('Connection error with the server.');
    } finally {
      setLoading(false);
    }
  };


  // --- RENDERIZAÇÃO ---

  // TELA 1.1: JÁ CADASTRADO
  if (existingUserCupons) {
      return (
        <div className="container duplication-container">
            <img src="/logo.svg" alt="DONPEDRO" className="brand-logo" /> 
            <h1 className="main-title-error">Welcome Back!</h1>
            <span className="brand-name">{duplicityMessage}</span>
            <UserCuponsList cupons={existingUserCupons} onViewQR={handleViewQR} />
            <button 
                className="reset-button" 
                onClick={() => { setExistingUserCupons(null); setDuplicityMessage(''); setMessage(''); }}
                style={{ marginTop: '20px' }}
            >
                BACK
            </button>
        </div>
      );
  }

  // TELA 2: QR CODE (SUCESSO IMEDIATO)
  if (currentPhase === 'qrcode') {
      return (
        <div className="container qr-display-container">
            <div className="success-icon-container"><span className="success-check-mark">✔</span></div>
            <h1 className="main-title-qr">Coupon Generated!</h1>
            <span className="brand-name">DONPEDRO</span>
            <p className="success-message">{message}</p>
            <div className="qrcode-box">
                <QRCodeSVG value={couponUUID} size={256} level="H" includeMargin={false} />
            </div>
            <p className="instruction-small">Show this QR Code to the cashier. Valid for 1 use.</p>
            <button className="reset-button" onClick={() => setCurrentPhase('cadastro')}>BACK TO START</button>
        </div>
      );
  }


  // TELA 1: CADASTRO SIMPLIFICADO
  return (
    <div className="container">
      <img src="/logo.svg" alt="DONPEDRO" className="brand-logo" />
      <h1 className="main-title">GET EXCLUSIVE ACCESS</h1>
      <p style={{ marginTop: '10px', marginBottom: '20px' }}>
        Enter your information below to generate your coupon instantly.
      </p>
      
      <form onSubmit={handleRegister}> 
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" required disabled={loading} />
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number" required disabled={loading} />
        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Your Address [Required]" required disabled={loading} />
        
        <button type="submit" disabled={loading} style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}>
          {loading ? 'Processing...' : 'GET MY CODE'}
        </button>
      </form>

      {message && <p className="result-message error">{message}</p>}
      <p className="note">*Demo Version - No SMS required.</p>
    </div>
  );
}

export default App;