import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from './api';

// Định nghĩa URL gốc để load ảnh
const API_URL = "http://localhost:8000";

function OrderHistory() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal state
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });

    const navigate = useNavigate();

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(() => fetchOrders(true), 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchOrders = async (isBackground = false) => {
        const userId = localStorage.getItem('user_id');
        if (!userId) { if(!isBackground) navigate('/'); return; }
        try {
            if(!isBackground) setLoading(true);
            const res = await api.get('/orders/my-orders', { params: { user_id: userId } });
            setOrders(res.data);
        } catch (err) { console.error(err); } 
        finally { if(!isBackground) setLoading(false); }
    };

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm("Hủy đơn này?")) return;
        try {
            await api.put(`/orders/${orderId}/status`, null, { params: { status: 'CANCELLED' } });
            toast.success("Đã hủy đơn");
            fetchOrders();
        } catch (err) { toast.error("Lỗi hủy đơn"); }
    };

    const openReviewModal = (order) => {
        if (!order.items || order.items.length === 0) {
            toast.error("Không tìm thấy thông tin món ăn trong đơn này!");
            return;
        }
        setSelectedOrder(order);
        setShowReviewModal(true);
        setReviewData({ rating: 5, comment: '' });
    };

    const submitReview = async () => {
        if (!selectedOrder) return;
        const token = localStorage.getItem('access_token');

        try {
            const items = selectedOrder.items; 
            const payload = {
                order_id: selectedOrder.id,
                rating_general: reviewData.rating,
                comment: reviewData.comment,
                items: items.map(item => ({
                    food_id: item.food_id,
                    score: reviewData.rating 
                }))
            };

            await api.post('/reviews', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Đánh giá thành công! ⭐");
            setShowReviewModal(false);
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || "Lỗi gửi đánh giá";
            toast.error(typeof msg === 'object' ? JSON.stringify(msg) : msg);
        }
    };

    const renderStatus = (status) => {
        const styles = { 'PENDING_PAYMENT': {color:'orange', label:'⏳ Chờ thanh toán'}, 'PAID': {color:'green', label:'✅ Đã thanh toán'}, 'SHIPPING': {color:'blue', label:'🚚 Đang giao'}, 'COMPLETED': {color:'gray', label:'🎉 Hoàn tất'}, 'CANCELLED': {color:'red', label:'❌ Đã hủy'} };
        const s = styles[status] || { color: 'black', label: status };
        return <span style={{ color: s.color, fontWeight: 'bold' }}>{s.label}</span>;
    };
    
    const formatMoney = (a) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(a);
    const formatDate = (d) => new Date(d).toLocaleString('vi-VN');

    return (
        <div className="container" style={{maxWidth: '900px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                <h2>📜 Lịch sử</h2>
                <button onClick={()=>navigate('/shop')}>← Quay lại</button>
            </div>
            
            <div className="order-list">
                {orders.map(order => (
                    <div key={order.id} style={{border:'1px solid #ddd', padding:'20px', marginBottom:'20px', borderRadius:'8px', background: 'white'}}>
                        <div style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>
                            <div><strong>#{order.id}</strong> - {formatDate(order.created_at)}</div>
                            <div>{renderStatus(order.status)}</div>
                        </div>
                        
                        {/* --- DANH SÁCH MÓN ĂN (CÓ ẢNH) --- */}
                        <div style={{background: '#f9f9f9', padding: '10px', borderRadius: '5px', margin: '10px 0'}}>
                            {order.items && order.items.length > 0 ? (
                                order.items.map((item, idx) => (
                                    <div key={idx} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', marginBottom: '8px'}}>
                                        <div style={{display: 'flex', alignItems: 'center'}}>
                                            {/* Ảnh Thumbnail */}
                                            {item.image_url ? (
                                                <img 
                                                    src={`${API_URL}${item.image_url}`} 
                                                    alt="" 
                                                    style={{width: '35px', height: '35px', objectFit: 'cover', borderRadius: '4px', marginRight: '10px'}} 
                                                />
                                            ) : (
                                                // Icon dự phòng nếu không có ảnh
                                                <span style={{width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eee', borderRadius: '4px', marginRight: '10px'}}>🍖</span>
                                            )}
                                            
                                            <span>{item.quantity}x <b>{item.food_name}</b></span>
                                        </div>
                                        <span style={{color: '#666'}}>{formatMoney(item.price)}</span>
                                    </div>
                                ))
                            ) : (
                                <p style={{color: '#999', fontSize: '0.9rem'}}>Không có thông tin món ăn</p>
                            )}
                        </div>
                        {/* ---------------------------------- */}

                        <div style={{margin:'10px 0', fontSize: '0.9rem'}}>📍 {order.delivery_address}</div>
                        
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <span style={{color:'#d32f2f', fontWeight:'bold', fontSize: '1.2rem'}}>
                                Tổng: {formatMoney(order.total_price)}
                            </span>
                            
                            <div style={{display: 'flex', gap: '10px'}}>
                                {['PENDING_PAYMENT','PAID'].includes(order.status) && 
                                    <button onClick={()=>handleCancelOrder(order.id)} style={{color:'red', border:'1px solid red', background:'white', padding: '5px 10px', cursor: 'pointer'}}>Hủy đơn</button>
                                }
                                {order.status === 'COMPLETED' && 
                                    <button onClick={()=>openReviewModal(order)} style={{background:'#f6c23e', color:'white', border:'none', padding:'8px 15px', borderRadius:'4px', cursor: 'pointer', fontWeight: 'bold'}}>⭐ Đánh giá</button>
                                }
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showReviewModal && (
                <div className="modal-overlay" onClick={()=>setShowReviewModal(false)}>
                    <div className="modal-content" onClick={e=>e.stopPropagation()}>
                        <h3>Đánh giá đơn #{selectedOrder?.id}</h3>
                        <div style={{textAlign:'center', margin:'20px 0'}}>
                            {[1,2,3,4,5].map(s=>(
                                <span key={s} className={`star-rating ${s<=reviewData.rating?'active':''}`} onClick={()=>setReviewData({...reviewData, rating:s})}>★</span>
                            ))}
                        </div>
                        <textarea className="review-textarea" placeholder="Nhập bình luận..." value={reviewData.comment} onChange={e=>setReviewData({...reviewData, comment:e.target.value})} />
                        <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                            <button onClick={()=>setShowReviewModal(false)} style={{flex:1}}>Đóng</button>
                            <button onClick={submitReview} style={{flex:1, background:'green', color:'white'}}>Gửi</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default OrderHistory;