import { useState, useEffect } from 'react';
import api from './api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function Profile() {
    const [addresses, setAddresses] = useState([]);
    // Thêm trường name
    const [newAddress, setNewAddress] = useState({ title: '', name: '', address: '', phone: '' });
    const navigate = useNavigate();

    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const res = await api.get('/users/addresses', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAddresses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddAddress = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('access_token');
        
        try {
            await api.post('/users/addresses', newAddress, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Thêm địa chỉ thành công! 🏠");
            setNewAddress({ title: '', name: '', address: '', phone: '' }); // Reset form
            fetchAddresses(); // Tải lại danh sách
        } catch (err) {
             let msg = "Lỗi thêm địa chỉ";
             if (err.response && err.response.data && err.response.data.detail) {
                 // Nếu lỗi validation từ backend trả về
                 if (Array.isArray(err.response.data.detail)) {
                    msg = err.response.data.detail[0].msg;
                 } else {
                    msg = err.response.data.detail;
                 }
             }
             toast.error(msg);
        }
    };

    return (
        <div className="container" style={{maxWidth: '900px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h2>👤 Hồ sơ cá nhân</h2>
                <button onClick={() => navigate('/shop')}>← Quay lại mua sắm</button>
            </div>

            <div className="profile-layout" style={{display: 'flex', gap: '30px', flexWrap: 'wrap'}}>
                
                {/* CỘT TRÁI: THÊM ĐỊA CHỈ MỚI */}
                <div style={{flex: 1, minWidth: '350px'}}>
                    <h3>Thêm địa chỉ mới</h3>
                    <form onSubmit={handleAddAddress} className="auth-form">
                        <input 
                            placeholder="Tên gợi nhớ (VD: Nhà riêng, Công ty)" 
                            value={newAddress.title}
                            onChange={e => setNewAddress({...newAddress, title: e.target.value})}
                            required 
                        />
                        {/* INPUT MỚI: TÊN NGƯỜI NHẬN */}
                        <input 
                            placeholder="Họ và tên người nhận" 
                            value={newAddress.name}
                            onChange={e => setNewAddress({...newAddress, name: e.target.value})}
                            required 
                        />
                        <input 
                            placeholder="Số điện thoại (10 số)" 
                            value={newAddress.phone}
                            onChange={e => setNewAddress({...newAddress, phone: e.target.value})}
                            required 
                        />
                        <textarea 
                            placeholder="Địa chỉ chi tiết (Số nhà, đường...)" 
                            value={newAddress.address}
                            onChange={e => setNewAddress({...newAddress, address: e.target.value})}
                            required
                            style={{width: '100%', padding: '10px', height: '80px', marginBottom: '10px'}}
                        />
                        <button type="submit">Lưu địa chỉ</button>
                    </form>
                </div>

                {/* CỘT PHẢI: DANH SÁCH ĐỊA CHỈ */}
                <div style={{flex: 1, minWidth: '350px'}}>
                    <h3>Sổ địa chỉ của tôi</h3>
                    {addresses.length === 0 ? <p>Chưa có địa chỉ nào được lưu.</p> : (
                        <div className="address-list">
                            {addresses.map(addr => (
                                <div key={addr.id} style={{border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '10px', background: '#f9f9f9'}}>
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <span style={{fontWeight: 'bold', color: '#007bff'}}>{addr.title}</span>
                                    </div>
                                    <div style={{marginTop:'5px', fontWeight:'600'}}>👤 {addr.name}</div>
                                    <div>📞 {addr.phone}</div>
                                    <div>📍 {addr.address}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Profile;