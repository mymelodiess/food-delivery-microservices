import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from './api';

function PaymentPage() {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Nhận order_id và tiền từ trang Checkout
    const { order_id, total_price } = location.state || {};

    const [savedCards, setSavedCards] = useState([]);
    const [selectedCardId, setSelectedCardId] = useState('new'); // Mặc định chọn nhập mới
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Form nhập thẻ mới
    const [newCard, setNewCard] = useState({
        bank_name: '',
        card_number: '',
        card_holder: '',
        expiry_date: ''
    });

    useEffect(() => {
        if (!order_id) { navigate('/shop'); return; }
        fetchCards();
    }, [order_id]);

    const fetchCards = async () => {
        const token = localStorage.getItem('access_token');
        try {
            const res = await api.get('/payment-methods', { headers: { Authorization: `Bearer ${token}` } });
            setSavedCards(res.data);
            // Nếu có thẻ cũ, chọn thẻ đầu tiên
            if (res.data.length > 0) setSelectedCardId(res.data[0].id);
        } catch (err) { console.error(err); }
    };

    const handleConfirmPayment = async () => {
        setProcessing(true);
        const token = localStorage.getItem('access_token');

        try {
            // 1. Nếu chọn nhập thẻ mới -> Lưu thẻ trước
            if (selectedCardId === 'new') {
                if (!newCard.card_number || !newCard.card_holder) {
                    toast.warning("Vui lòng nhập thông tin thẻ! 💳");
                    setProcessing(false);
                    return;
                }
                // Lưu thẻ
                await api.post('/payment-methods', newCard, { headers: { Authorization: `Bearer ${token}` } });
            }

            // 2. Giả lập delay 2 giây
            await new Promise(r => setTimeout(r, 2000));

            // 3. Gọi API thanh toán (Backend cũ của bạn)
            await api.post('/pay', { order_id: order_id, amount: total_price });

            // 4. Thành công
            toast.success("Thanh toán thành công! 💸");
            try { await api.delete('/cart'); } catch(e) {}

            navigate('/history');

        } catch (err) {
            console.error(err);
            toast.error("Lỗi thanh toán. Vui lòng thử lại.");
        } finally {
            setProcessing(false);
        }
    };

    const formatMoney = (a) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(a);

    return (
        <div className="container" style={{maxWidth: '600px', marginTop: '40px'}}>
            <h2 style={{textAlign: 'center', marginBottom: '30px'}}>💳 Cổng Thanh Toán</h2>

            <div style={{background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center'}}>
                <p>Thanh toán cho đơn hàng <b>#{order_id}</b></p>
                <h1 style={{color: '#d32f2f', margin: '10px 0'}}>{formatMoney(total_price)}</h1>
            </div>

            <div className="payment-methods">
                <h3 style={{marginBottom: '15px'}}>Chọn phương thức:</h3>

                {/* DANH SÁCH THẺ CŨ */}
                {savedCards.map(card => (
                    <div key={card.id} 
                        onClick={() => setSelectedCardId(card.id)}
                        style={{
                            border: selectedCardId === card.id ? '2px solid #007bff' : '1px solid #ddd',
                            padding: '15px', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer',
                            background: selectedCardId === card.id ? '#e7f1ff' : 'white',
                            display: 'flex', alignItems: 'center'
                        }}
                    >
                        <input type="radio" checked={selectedCardId === card.id} onChange={() => setSelectedCardId(card.id)} style={{marginRight: '15px', transform: 'scale(1.5)'}} />
                        <div>
                            <div style={{fontWeight: 'bold'}}>🏦 {card.bank_name}</div>
                            <div>**** **** **** {card.card_number.slice(-4)}</div>
                            <small>{card.card_holder}</small>
                        </div>
                    </div>
                ))}

                {/* NHẬP THẺ MỚI */}
                <div 
                    onClick={() => setSelectedCardId('new')}
                    style={{
                        border: selectedCardId === 'new' ? '2px solid #007bff' : '1px solid #ddd',
                        padding: '15px', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer',
                        background: selectedCardId === 'new' ? '#fff' : '#f9f9f9'
                    }}
                >
                    <div style={{display: 'flex', alignItems: 'center', marginBottom: selectedCardId === 'new' ? '15px' : '0'}}>
                        <input type="radio" checked={selectedCardId === 'new'} onChange={() => setSelectedCardId('new')} style={{marginRight: '15px', transform: 'scale(1.5)'}} />
                        <b>➕ Thêm thẻ / Tài khoản mới</b>
                    </div>

                    {selectedCardId === 'new' && (
                        <div style={{marginLeft: '30px'}}>
                            <input placeholder="Ngân hàng (VD: MBBank)" value={newCard.bank_name} onChange={e=>setNewCard({...newCard, bank_name: e.target.value})} style={{width: '100%', padding: '10px', marginBottom: '10px'}} />
                            <input placeholder="Số thẻ" value={newCard.card_number} onChange={e=>setNewCard({...newCard, card_number: e.target.value})} style={{width: '100%', padding: '10px', marginBottom: '10px'}} />
                            <div style={{display: 'flex', gap: '10px'}}>
                                <input placeholder="Chủ thẻ" value={newCard.card_holder} onChange={e=>setNewCard({...newCard, card_holder: e.target.value.toUpperCase()})} style={{flex: 2, padding: '10px'}} />
                                <input placeholder="MM/YY" value={newCard.expiry_date} onChange={e=>setNewCard({...newCard, expiry_date: e.target.value})} style={{flex: 1, padding: '10px'}} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <button 
                onClick={handleConfirmPayment} 
                disabled={processing}
                style={{
                    width: '100%', padding: '15px', fontSize: '1.2rem', fontWeight: 'bold',
                    background: processing ? '#6c757d' : '#28a745', color: 'white', border: 'none', borderRadius: '8px', marginTop: '20px', cursor: processing ? 'not-allowed' : 'pointer'
                }}
            >
                {processing ? "⏳ Đang kết nối..." : "THANH TOÁN NGAY"}
            </button>
        </div>
    );
}

export default PaymentPage;