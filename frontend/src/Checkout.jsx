import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from './api';

const API_URL = "http://localhost:8000";

function Checkout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { items, coupon, final_price, branch_id } = location.state || {};

    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '', note: '' });
    const [branchName, setBranchName] = useState('Đang tải...');
    const [savedAddresses, setSavedAddresses] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Checkout Form, 3: Success (Dùng cho luồng cũ, nhưng ta giữ nguyên)

    useEffect(() => {
        if (!items || items.length === 0) { navigate('/shop'); return; }
        if (branch_id) fetchBranchInfo();
        fetchSavedAddresses(); 
    }, [items, branch_id, navigate]);

    const fetchSavedAddresses = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const res = await api.get('/users/addresses', { headers: { Authorization: `Bearer ${token}` } });
            setSavedAddresses(res.data);
        } catch (err) { console.error(err); }
    };

    const handleSelectAddress = (e) => {
        const addrId = e.target.value;
        if (!addrId) return;
        const selected = savedAddresses.find(a => a.id == addrId);
        if (selected) {
            setCustomerInfo(prev => ({ ...prev, name: selected.name, phone: selected.phone, address: selected.address }));
            toast.info(`Đã chọn: ${selected.title}`);
        }
    };

    const fetchBranchInfo = async () => {
        try {
            const res = await api.get(`/branches/${branch_id}`);
            setBranchName(res.data.name);
        } catch (err) { setBranchName(`Chi nhánh #${branch_id}`); }
    };

    const handleChange = (e) => setCustomerInfo({...customerInfo, [e.target.name]: e.target.value});

    const handleConfirmOrder = async () => {
        if (!customerInfo.address || !customerInfo.phone || !customerInfo.name) {
            toast.warning("Vui lòng điền đầy đủ thông tin! ✍️");
            return;
        }
        setLoading(true);
        const userId = localStorage.getItem('user_id');

        try {
            const orderPayload = {
                user_id: userId ? parseInt(userId) : null,
                branch_id: branch_id,
                items: items.map(item => ({ food_id: item.food_id, quantity: item.quantity })),
                coupon_code: coupon ? coupon.code : null,
                customer_name: customerInfo.name,
                customer_phone: customerInfo.phone,
                delivery_address: customerInfo.address,
                note: customerInfo.note
            };
            
            // 1. GỌI API TẠO ĐƠN HÀNG (Quan trọng)
            const orderRes = await api.post('/checkout', orderPayload);
            const { order_id, total_price } = orderRes.data;

            // 2. CHUYỂN HƯỚNG SANG CỔNG THANH TOÁN
            toast.info("Đang chuyển sang cổng thanh toán...");
            navigate('/payment', { 
                state: { order_id: order_id, total_price: total_price } 
            });

            // Quan trọng: RETURN để thoát khỏi hàm, không chạy vào logic setStep(3)
            return; 

        } catch (err) {
            console.error(err);
            toast.error("Lỗi xử lý đơn hàng");
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (a) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(a);
    if (!items) return null;

    return (
        <div className="container" style={{maxWidth: '800px'}}>
            {step === 1 && (
                <div className="checkout-layout" style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                    <div className="info-section" style={{flex: 1, minWidth: '300px'}}>
                        <h2>📍 Thông tin giao hàng</h2>
                        {/* Phần chọn địa chỉ... */}
                        {savedAddresses.length > 0 && (
                            <div style={{marginBottom: '15px', padding: '10px', background: '#e9ecef', borderRadius: '5px'}}>
                                <label style={{fontWeight: 'bold'}}>⚡ Chọn nhanh:</label>
                                <select onChange={handleSelectAddress} style={{width: '100%', padding: '8px', marginTop: '5px'}}>
                                    <option value="">-- Sổ địa chỉ --</option>
                                    {savedAddresses.map(addr => (<option key={addr.id} value={addr.id}>{addr.title} ({addr.name}) - {addr.address}</option>))}
                                </select>
                            </div>
                        )}
                        <div className="auth-form">
                            <label>Họ tên:</label><input name="name" value={customerInfo.name} onChange={handleChange} placeholder="Nguyễn Văn A" />
                            <label>SĐT:</label><input name="phone" value={customerInfo.phone} onChange={handleChange} placeholder="098..." />
                            <label>Địa chỉ:</label><textarea name="address" value={customerInfo.address} onChange={handleChange} placeholder="Số nhà, đường..." style={{width:'100%', padding:'10px', height:'80px'}} />
                            <label>Ghi chú:</label><input name="note" value={customerInfo.note} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="order-summary" style={{flex: 1, minWidth: '300px', background: '#f8f9fa', padding: '20px', borderRadius: '8px', height: 'fit-content'}}>
                        <h3 style={{marginTop:0}}>🧾 Đơn từ: <span style={{color: '#007bff'}}>{branchName}</span></h3>
                        <ul style={{listStyle:'none', padding:0}}>
                            {items.map(item => (
                                <li key={item.food_id} style={{display:'flex', alignItems: 'center', justifyContent:'space-between', marginBottom:'8px'}}>
                                    <div style={{display:'flex', alignItems: 'center'}}>
                                        {item.image_url && <img src={`${API_URL}${item.image_url}`} className="checkout-thumb" alt="" />}
                                        <span><b>{item.quantity}x</b> {item.name}</span>
                                    </div>
                                    <span>{formatMoney(item.price*item.quantity)}</span>
                                </li>
                            ))}
                        </ul>
                        <hr/>
                        {coupon && <div style={{display:'flex', justifyContent:'space-between', color:'green'}}><span>Mã giảm ({coupon.code}):</span><span>-{coupon.discount_percent}%</span></div>}
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:'1.3rem', fontWeight:'bold', marginTop:'15px', color:'#d32f2f'}}><span>Tổng:</span><span>{formatMoney(final_price)}</span></div>
                        <div style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
                            <button onClick={() => navigate('/cart')} style={{flex: 1, padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px'}}>Quay lại</button>
                            <button onClick={handleConfirmOrder} disabled={loading} style={{flex: 2, padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold'}}>
                                {loading ? <><span className="spinner"></span> Xử lý...</> : "ĐẶT HÀNG NGAY"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* GIỮ NGUYÊN PHẦN STEP 3 CHO HIỂN THỊ THÀNH CÔNG, DÙ BÂY GIỜ TA SẼ KHÔNG BAO GIỜ DÙNG NÓ NỮA */}
            {step === 3 && (
                <div className="success-screen" style={{textAlign: 'center', padding: '50px', background:'white'}}>
                    <div style={{fontSize: '60px'}}>🚀</div>
                    <h2 style={{color: '#28a745'}}>Thành công!</h2>
                    <p>Đơn hàng đang chờ thanh toán.</p>
                    <button onClick={() => navigate('/history')} style={{marginTop: '20px', padding: '12px 30px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px'}}>Xem đơn hàng</button>
                </div>
            )}
        </div>
    );
}
export default Checkout;