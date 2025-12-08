import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from './api';

const API_URL = "http://localhost:8000"; 

function SellerDashboard() {
    const navigate = useNavigate();
    const role = localStorage.getItem('role');
    const sellerMode = localStorage.getItem('seller_mode'); 
    const branchId = localStorage.getItem('branch_id');     
    
    const [activeTab, setActiveTab] = useState('orders');
    const [foods, setFoods] = useState([]);
    const [orders, setOrders] = useState([]);
    const [coupons, setCoupons] = useState([]);

    // Form thêm/sửa món
    const [newFood, setNewFood] = useState({ name: '', price: '', discount: 0 });
    const [imageFile, setImageFile] = useState(null); 
    const [editingFoodId, setEditingFoodId] = useState(null); 
    
    // Form tạo coupon
    const [newCoupon, setNewCoupon] = useState({ 
        code: '', discount_percent: 0, start_date: '', end_date: ''
    });

    useEffect(() => {
        // Log để kiểm tra xem localStorage có gì
        console.log("--- DEBUG DASHBOARD ---");
        console.log("Role:", role);
        console.log("Seller Mode:", sellerMode);
        console.log("Branch ID:", branchId);

        if (role !== 'seller') {
            toast.error("Không có quyền truy cập!");
            navigate('/');
            return;
        }
        fetchOrders();
        fetchFoods();
        fetchCoupons(); // Gọi hàm lấy danh sách (Giờ ai cũng gọi được)
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await api.get('/orders', { params: { branch_id: branchId } });
            setOrders(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchFoods = async () => {
        try {
            let url = branchId ? `/foods?branch_id=${branchId}` : '/foods';
            const res = await api.get(url);
            setFoods(res.data);
        } catch (err) { console.error(err); }
    };

    // [ĐÃ SỬA] Bỏ điều kiện check Owner, Staff cũng fetch được
    const fetchCoupons = async () => {
        console.log("Đang gọi API lấy Coupon...");
        try {
            const res = await api.get('/coupons');
            console.log("Kết quả Coupon:", res.data);
            setCoupons(res.data);
        } catch (err) { 
            console.error("Lỗi lấy coupon:", err); 
        }
    };

    const stats = useMemo(() => {
        const today = new Date().toDateString();
        const todaysOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
        const validOrders = todaysOrders.filter(o => ['PAID', 'SHIPPING', 'COMPLETED'].includes(o.status));
        const todayRevenue = validOrders.reduce((sum, o) => sum + o.total_price, 0);
        const pendingCount = orders.filter(o => o.status === 'PAID').length;
        return { todayRevenue, todayCount: todaysOrders.length, pendingCount, totalFoods: foods.length };
    }, [orders, foods]);

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await api.put(`/orders/${orderId}/status`, null, { params: { status: newStatus } });
            toast.success(`Đã cập nhật đơn #${orderId} -> ${newStatus}`);
            fetchOrders();
        } catch (err) { toast.error("Lỗi cập nhật trạng thái"); }
    };

    // --- XỬ LÝ MÓN ĂN ---
    const handleSaveFood = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', newFood.name);
        formData.append('price', newFood.price);
        formData.append('discount', newFood.discount);
        if (imageFile) formData.append('image', imageFile);

        try {
            if (editingFoodId) {
                await api.put(`/foods/${editingFoodId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success("Cập nhật món thành công!");
            } else {
                await api.post('/foods', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success("Thêm món thành công!");
            }
            setNewFood({ name: '', price: '', discount: 0 });
            setImageFile(null);
            setEditingFoodId(null);
            document.getElementById('fileInput').value = ""; 
            fetchFoods();
        } catch (err) { console.error(err); toast.error("Lỗi xử lý món ăn"); }
    };

    const startEdit = (food) => {
        setEditingFoodId(food.id);
        setNewFood({ name: food.name, price: food.price, discount: food.discount });
        window.scrollTo(0, 0);
    };

    const cancelEdit = () => {
        setEditingFoodId(null);
        setNewFood({ name: '', price: '', discount: 0 });
        setImageFile(null);
        document.getElementById('fileInput').value = ""; 
    };

    const handleDeleteFood = async (id) => {
        if (!window.confirm("Xóa món này?")) return;
        try { await api.delete(`/foods/${id}`); toast.info("Đã xóa món"); fetchFoods(); } catch (e) {}
    };

    // --- XỬ LÝ COUPON ---
    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        if (!newCoupon.start_date || !newCoupon.end_date) return toast.warning("Chọn ngày đầy đủ!");
        try {
            await api.post('/coupons', newCoupon);
            toast.success(`Đã tạo mã ${newCoupon.code}!`);
            setNewCoupon({ code: '', discount_percent: 0, start_date: '', end_date: '' });
            fetchCoupons(); 
        } catch (err) { toast.error("Lỗi tạo mã"); }
    };

    const formatMoney = (a) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(a);
    const formatDate = (d) => new Date(d).toLocaleString('vi-VN');
    const renderStatusBadge = (status) => {
        const colors = { 'PENDING_PAYMENT': '#ffc107', 'PAID': '#28a745', 'SHIPPING': '#17a2b8', 'COMPLETED': '#6c757d', 'CANCELLED': '#dc3545' };
        return <span style={{background: colors[status] || '#ccc', color: 'white', padding: '5px 10px', borderRadius: '4px', fontSize: '0.8rem'}}>{status}</span>
    };

    return (
        <div className="seller-container">
            <header className="seller-header">
                <div>
                    <h2>💼 Kênh Người Bán ({sellerMode === 'owner' ? 'Chủ' : 'NV'})</h2>
                    {branchId ? <small>Chi nhánh ID: {branchId}</small> : <small style={{color:'red'}}>Chưa có Chi nhánh (Vui lòng logout và login lại)</small>}
                </div>
                <button onClick={() => { localStorage.clear(); navigate('/'); }} className="logout-btn">Đăng xuất</button>
            </header>

            {/* Thống kê giữ nguyên */}
            <div className="stats-grid" style={{display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap'}}>
                <div style={{flex: 1, background: '#4e73df', color: 'white', padding: '20px', borderRadius: '8px'}}><div>DOANH THU</div><div style={{fontSize: '1.8rem', fontWeight: 'bold'}}>{formatMoney(stats.todayRevenue)}</div></div>
                <div style={{flex: 1, background: '#1cc88a', color: 'white', padding: '20px', borderRadius: '8px'}}><div>ĐƠN HÔM NAY</div><div style={{fontSize: '1.8rem', fontWeight: 'bold'}}>{stats.todayCount} đơn</div></div>
                <div style={{flex: 1, background: '#f6c23e', color: 'white', padding: '20px', borderRadius: '8px'}}><div>CHỜ XỬ LÝ</div><div style={{fontSize: '1.8rem', fontWeight: 'bold'}}>{stats.pendingCount} đơn</div></div>
                <div style={{flex: 1, background: '#36b9cc', color: 'white', padding: '20px', borderRadius: '8px'}}><div>TỔNG MÓN</div><div style={{fontSize: '1.8rem', fontWeight: 'bold'}}>{stats.totalFoods} món</div></div>
            </div>

            <div className="tabs">
                <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>📦 Đơn hàng</button>
                <button className={activeTab === 'menu' ? 'active' : ''} onClick={() => setActiveTab('menu')}>🍽️ Thực đơn</button>
                {/* [ĐÃ SỬA] Bỏ check Owner, ai cũng thấy Tab Coupon */}
                <button className={activeTab === 'coupons' ? 'active' : ''} onClick={() => setActiveTab('coupons')}>🎟️ Mã giảm giá</button>
            </div>

            {/* CONTENT: ORDERS (Giữ nguyên) */}
            {activeTab === 'orders' && (
                <div className="tab-content">
                    <table className="data-table">
                        <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td><strong>#{order.id}</strong><br/><small>{formatDate(order.created_at)}</small></td>
                                    <td><strong>{order.user_name}</strong><br/><small>{order.customer_phone}</small><br/><small>📍 {order.delivery_address}</small>{order.note && <div style={{color: 'red', fontSize: '0.8rem'}}>📝 {order.note}</div>}</td>
                                    <td>{formatMoney(order.total_price)}</td>
                                    <td>{renderStatusBadge(order.status)}</td>
                                    <td>
                                        <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                                            {order.status === 'PAID' && <button onClick={() => handleUpdateStatus(order.id, 'SHIPPING')} style={{background: '#17a2b8', color: 'white', border: 'none', padding: '5px', borderRadius: '3px'}}>🚚 Giao hàng</button>}
                                            {order.status === 'SHIPPING' && <button onClick={() => handleUpdateStatus(order.id, 'COMPLETED')} style={{background: '#6c757d', color: 'white', border: 'none', padding: '5px', borderRadius: '3px'}}>✅ Hoàn tất</button>}
                                            {(order.status === 'PAID' || order.status === 'PENDING_PAYMENT') && <button onClick={() => handleUpdateStatus(order.id, 'CANCELLED')} style={{background: '#dc3545', color: 'white', border: 'none', padding: '5px', borderRadius: '3px'}}>❌ Hủy đơn</button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* CONTENT: MENU (Owner sửa/xóa, Staff chỉ xem) */}
            {activeTab === 'menu' && (
                <div className="tab-content">
                    {sellerMode === 'owner' && (
                        <div className="add-form" style={{background: editingFoodId ? '#fff3cd' : '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
                            <h4>{editingFoodId ? '✏️ Đang sửa món' : '➕ Thêm món mới'}</h4>
                            <form onSubmit={handleSaveFood} style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
                                <input placeholder="Tên món" value={newFood.name} onChange={e => setNewFood({...newFood, name: e.target.value})} required />
                                <input type="number" placeholder="Giá" value={newFood.price} onChange={e => setNewFood({...newFood, price: e.target.value})} required style={{width: '100px'}}/>
                                <input type="number" placeholder="Giảm %" value={newFood.discount} onChange={e => setNewFood({...newFood, discount: e.target.value})} style={{width: '80px'}}/>
                                <input id="fileInput" type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={{border: 'none', padding: '5px'}}/>
                                <button type="submit" style={{background: editingFoodId ? '#ffc107' : '#007bff', color: editingFoodId ? 'black' : 'white'}}>{editingFoodId ? 'Lưu thay đổi' : 'Thêm món'}</button>
                                {editingFoodId && <button type="button" onClick={cancelEdit} style={{background: '#6c757d', color: 'white'}}>Hủy</button>}
                            </form>
                        </div>
                    )}
                    <table className="data-table">
                        <thead><tr><th>Ảnh</th><th>Tên món</th><th>Giá</th><th>Giảm</th><th>Hành động</th></tr></thead>
                        <tbody>
                            {foods.map(f => (
                                <tr key={f.id}>
                                    <td>{f.image_url ? <img src={`${API_URL}${f.image_url}`} alt="" style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px'}} /> : <span>🍖</span>}</td>
                                    <td>{f.name}</td>
                                    <td>{formatMoney(f.price)}</td>
                                    <td>{f.discount}%</td>
                                    <td>
                                        {sellerMode === 'owner' && (
                                            <div style={{display:'flex', gap: '5px'}}>
                                                <button onClick={() => startEdit(f)} style={{background: '#ffc107', border:'none', padding: '5px 10px', borderRadius:'4px', cursor:'pointer'}}>Sửa</button>
                                                <button className="delete-btn" onClick={() => handleDeleteFood(f.id)}>Xóa</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* CONTENT: COUPONS ([ĐÃ SỬA] Staff xem được, Owner mới được tạo) */}
            {activeTab === 'coupons' && (
                <div className="tab-content">
                    {/* CHỈ OWNER MỚI THẤY FORM TẠO */}
                    {sellerMode === 'owner' && (
                        <div className="add-form">
                            <h4>Tạo mã giảm giá mới</h4>
                            <form onSubmit={handleCreateCoupon} style={{display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end'}}>
                                <div><label style={{fontSize: '0.8rem'}}>Mã Code</label><input placeholder="VD: TET2025" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value})} required /></div>
                                <div><label style={{fontSize: '0.8rem'}}>Giảm %</label><input type="number" placeholder="%" value={newCoupon.discount_percent} onChange={e => setNewCoupon({...newCoupon, discount_percent: e.target.value})} required style={{width: '60px'}}/></div>
                                <div><label style={{fontSize: '0.8rem'}}>Từ ngày</label><input type="date" value={newCoupon.start_date} onChange={e => setNewCoupon({...newCoupon, start_date: e.target.value})} required /></div>
                                <div><label style={{fontSize: '0.8rem'}}>Đến ngày</label><input type="date" value={newCoupon.end_date} onChange={e => setNewCoupon({...newCoupon, end_date: e.target.value})} required /></div>
                                <button type="submit" style={{height: '40px'}}>Tạo mã</button>
                            </form>
                        </div>
                    )}

                    <h3 style={{marginTop: '30px'}}>🎟️ Mã giảm giá hiện có</h3>
                    <table className="data-table">
                        <thead><tr><th>Mã</th><th>Giảm</th><th>Bắt đầu</th><th>Kết thúc</th><th>Trạng thái</th></tr></thead>
                        <tbody>
                            {coupons.length === 0 ? <tr><td colSpan="5" style={{textAlign:'center'}}>Chưa có mã nào (Hoặc lỗi tải dữ liệu)</td></tr> : coupons.map(c => {
                                const isExpired = new Date(c.end_date) < new Date();
                                return (
                                    <tr key={c.id} style={{opacity: isExpired ? 0.6 : 1}}>
                                        <td><strong>{c.code}</strong></td>
                                        <td>{c.discount_percent}%</td>
                                        <td>{new Date(c.start_date).toLocaleDateString('vi-VN')}</td>
                                        <td>{new Date(c.end_date).toLocaleDateString('vi-VN')}</td>
                                        <td>{isExpired ? <span style={{color:'red'}}>Hết hạn</span> : <span style={{color:'green'}}>Đang chạy</span>}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
export default SellerDashboard;