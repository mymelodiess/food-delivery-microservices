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
    const [step, setStep] = useState(1); 

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
            // [CẬP NHẬT] Điền cả tên người nhận
            setCustomerInfo(prev => ({ 
                ...prev, 
                name: selected.name, 
                phone: selected.phone, 
                address: selected.address 
            }));
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
            
            // Gọi API tạo đơn
            const orderRes = await api.post('/checkout', orderPayload);
            const { order_id, total_price } = orderRes.data;

            toast.info("Đang chuyển sang cổng thanh toán...");
            navigate('/payment', { 
                state: { order_id: order_id, total_price: total_price } 
            });
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
        <div className="container" style={{maxWidth: '900px'}}>
            {step === 1 && (
                <div className="checkout-layout" style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                    <div className="info-section" style={{flex: 1, minWidth: '350px'}}>
                        <h2>📍 Thông tin giao hàng</h2>
                        
                        {/* Dropdown chọn nhanh */}
                        {savedAddresses.length > 0 && (
                            <div style={{marginBottom: '15px', padding: '15px', background: '#e9ecef', borderRadius: '8px', border: '1px solid #dee2e6'}}>
                                <label style={{fontWeight: 'bold', display:'block', marginBottom:'5px'}}>⚡ Chọn nhanh từ sổ địa chỉ:</label>
                                <select onChange={handleSelectAddress} style={{width: '100%', padding: '10px', borderRadius:'4px', border:'1px solid #ced4da'}}>
                                    <option value="">-- Chọn địa chỉ --</option>
                                    {savedAddresses.map(addr => (
                                        <option key={addr.id} value={addr.id}>
                                            {addr.title} - {addr.name} ({addr.phone})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="auth-form">
                            <label>Họ tên người nhận:</label>
                            <input name="name" value={customerInfo.name} onChange={handleChange} placeholder="Nguyễn Văn A" />
                            
                            <label>Số điện thoại:</label>
                            <input name="phone" value={customerInfo.phone} onChange={handleChange} placeholder="098..." />
                            
                            <label>Địa chỉ nhận hàng:</label>
                            <textarea name="address" value={customerInfo.address} onChange={handleChange} placeholder="Số nhà, đường..." style={{width:'100%', padding:'10px', height:'80px'}} />
                            
                            <label>Ghi chú (tùy chọn):</label>
                            <input name="note" value={customerInfo.note} onChange={handleChange} placeholder="Ví dụ: Ít cay, nhiều nước lèo..." />
                        </div>
                    </div>

                    <div className="order-summary" style={{flex: 1, minWidth: '350px', background: '#f8f9fa', padding: '25px', borderRadius: '8px', height: 'fit-content', border: '1px solid #dee2e6'}}>
                        <h3 style={{marginTop:0, borderBottom:'1px solid #ddd', paddingBottom:'10px'}}>🧾 Đơn hàng từ: <span style={{color: '#007bff'}}>{branchName}</span></h3>
                        <ul style={{listStyle:'none', padding:0, maxHeight:'300px', overflowY:'auto'}}>
                            {items.map(item => (
                                <li key={item.food_id} style={{display:'flex', alignItems: 'center', justifyContent:'space-between', marginBottom:'15px', borderBottom:'1px dashed #eee', paddingBottom:'10px'}}>
                                    <div style={{display:'flex', alignItems: 'center', gap: '10px'}}>
                                        {item.image_url && <img src={`${API_URL}${item.image_url}`} style={{width:'50px', height:'50px', objectFit:'cover', borderRadius:'4px'}} alt="" />}
                                        <div>
                                            <div style={{fontWeight:'bold'}}>{item.name}</div>
                                            <div style={{fontSize:'0.9rem', color:'#666'}}>x {item.quantity}</div>
                                        </div>
                                    </div>
                                    <span style={{fontWeight:'bold'}}>{formatMoney(item.price*item.quantity)}</span>
                                </li>
                            ))}
                        </ul>
                        
                        {coupon && (
                            <div style={{display:'flex', justifyContent:'space-between', color:'green', background:'#d4edda', padding:'10px', borderRadius:'4px', marginBottom:'10px'}}>
                                <span>Mã giảm ({coupon.code}):</span>
                                <span>-{coupon.discount_percent}%</span>
                            </div>
                        )}
                        
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:'1.4rem', fontWeight:'bold', marginTop:'15px', color:'#d32f2f', borderTop:'2px solid #ddd', paddingTop:'15px'}}>
                            <span>Tổng tiền:</span>
                            <span>{formatMoney(final_price)}</span>
                        </div>
                        
                        <div style={{marginTop: '25px', display: 'flex', gap: '10px'}}>
                            <button onClick={() => navigate('/cart')} style={{flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor:'pointer'}}>Quay lại</button>
                            <button onClick={handleConfirmOrder} disabled={loading} style={{flex: 2, padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize:'1.1rem', cursor:'pointer'}}>
                                {loading ? "Đang xử lý..." : "ĐẶT HÀNG NGAY"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default Checkout;