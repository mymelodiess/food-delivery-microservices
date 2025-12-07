import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify'; // Dùng Toast cho đẹp
import api from './api';

function OrderHistory() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchOrders(); 
        
        // Polling: Tự động cập nhật mỗi 5s
        const interval = setInterval(() => {
            fetchOrders(true);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchOrders = async (isBackground = false) => {
        const userId = localStorage.getItem('user_id');
        if (!userId) {
            if (!isBackground) navigate('/');
            return;
        }

        try {
            if (!isBackground) setLoading(true);
            const res = await api.get('/orders/my-orders', { params: { user_id: userId } });
            setOrders(res.data);
        } catch (err) {
            console.error("Lỗi tải lịch sử:", err);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    // --- HÀM XỬ LÝ HỦY ĐƠN ---
    const handleCancelOrder = async (orderId) => {
        // Hỏi lại cho chắc
        if (!window.confirm(`Bạn có chắc muốn hủy đơn hàng #${orderId} không?`)) return;

        try {
            // Gọi API đổi trạng thái thành CANCELLED
            // API này bạn đã test OK bên Seller Dashboard rồi
            await api.put(`/orders/${orderId}/status`, null, {
                params: { status: 'CANCELLED' }
            });
            
            toast.success(`Đã hủy đơn hàng #${orderId}`);
            fetchOrders(); // Tải lại danh sách ngay
        } catch (err) {
            toast.error("Không thể hủy đơn hàng này");
            console.error(err);
        }
    };

    const renderStatus = (status) => {
        const styles = {
            'PENDING_PAYMENT': { color: '#ffc107', label: '⏳ Chờ thanh toán' }, // Màu vàng
            'PAID': { color: '#28a745', label: '✅ Đã thanh toán (Chờ món)' },  // Màu xanh lá
            'SHIPPING': { color: '#17a2b8', label: '🚚 Đang giao hàng' },      // Màu xanh dương
            'COMPLETED': { color: '#6c757d', label: '🎉 Hoàn tất' },           // Màu xám
            'CANCELLED': { color: '#dc3545', label: '❌ Đã hủy' }              // Màu đỏ
        };
        const s = styles[status] || { color: 'black', label: status };
        return <span style={{ color: s.color, fontWeight: 'bold' }}>{s.label}</span>;
    };

    const formatMoney = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    const formatDate = (dateString) => new Date(dateString).toLocaleString('vi-VN');

    return (
        <div className="container" style={{maxWidth: '900px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h2>📜 Lịch sử đơn hàng</h2>
                <button onClick={() => navigate('/shop')} style={{padding: '8px 15px', cursor: 'pointer'}}>← Quay lại mua sắm</button>
            </div>

            {loading ? <p>Đang tải...</p> : (
                orders.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px', background: '#f9f9f9', borderRadius: '8px'}}>
                        <p>Bạn chưa có đơn hàng nào.</p>
                        <button onClick={() => navigate('/shop')}>Đặt món ngay</button>
                    </div>
                ) : (
                    <div className="order-list">
                        {orders.map(order => (
                            <div key={order.id} style={{border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px', padding: '20px', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px'}}>
                                    <div>
                                        <strong>Đơn #{order.id}</strong> - <span style={{color: '#666'}}>{formatDate(order.created_at)}</span>
                                    </div>
                                    <div>{renderStatus(order.status)}</div>
                                </div>

                                <div style={{fontSize: '0.9rem', color: '#555', marginBottom: '10px'}}>
                                    <p>📍 <b>Giao đến:</b> {order.user_name} ({order.customer_phone}) - {order.delivery_address}</p>
                                    {order.note && <p>📝 <b>Ghi chú:</b> {order.note}</p>}
                                </div>

                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px'}}>
                                    <span style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#d32f2f'}}>
                                        Tổng: {formatMoney(order.total_price)}
                                    </span>

                                    {/* LOGIC HIỂN THỊ NÚT HỦY */}
                                    {/* Chỉ hiện khi đơn chưa giao (PENDING hoặc PAID) */}
                                    {(order.status === 'PENDING_PAYMENT' || order.status === 'PAID') && (
                                        <button 
                                            onClick={() => handleCancelOrder(order.id)}
                                            style={{
                                                background: '#fff', 
                                                border: '1px solid #dc3545', 
                                                color: '#dc3545', 
                                                padding: '5px 15px',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                            onMouseOver={(e) => {e.target.style.background = '#dc3545'; e.target.style.color = 'white'}}
                                            onMouseOut={(e) => {e.target.style.background = 'white'; e.target.style.color = '#dc3545'}}
                                        >
                                            Hủy đơn
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

export default OrderHistory;