import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from './api';

const API_URL = "http://localhost:8000";

function Cart() {
    const [cartItems, setCartItems] = useState([]);
    const [subTotal, setSubTotal] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const navigate = useNavigate();

    useEffect(() => { fetchCart(); }, []);

    useEffect(() => {
        if (appliedCoupon) {
            const discountAmount = (subTotal * appliedCoupon.discount_percent) / 100;
            setTotalPrice(subTotal - discountAmount);
        } else { setTotalPrice(subTotal); }
    }, [subTotal, appliedCoupon]);

    const fetchCart = async () => {
        try {
            const cartRes = await api.get('/cart');
            const items = cartRes.data;
            if (items.length === 0) { setCartItems([]); return; }

            const enrichedItems = await Promise.all(items.map(async (item) => {
                try {
                    // API này của restaurant_service trả về đầy đủ food info gồm cả image_url
                    const foodDetail = await api.get(`/foods/${item.food_id}`);
                    return {
                        ...item,
                        name: foodDetail.data.name,
                        price: foodDetail.data.price,
                        image_url: foodDetail.data.image_url // Lấy ảnh
                    };
                } catch (e) { return { ...item, name: "Món đã xóa", price: 0 }; }
            }));

            setCartItems(enrichedItems);
            calculateSubTotal(enrichedItems);
        } catch (err) { console.error(err); }
    };

    const calculateSubTotal = (items) => {
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        setSubTotal(total);
    };

    const updateQuantity = async (foodId, newQty) => {
        if (newQty < 1) return;
        try {
            await api.put('/cart', { food_id: foodId, quantity: newQty });
            const updatedItems = cartItems.map(item => item.food_id === foodId ? { ...item, quantity: newQty } : item);
            setCartItems(updatedItems);
            calculateSubTotal(updatedItems);
        } catch (err) { toast.error("Lỗi cập nhật số lượng"); }
    };

    const clearCart = async () => {
        if (!window.confirm("Xóa hết giỏ hàng?")) return;
        try {
            await api.delete('/cart');
            setCartItems([]); setSubTotal(0); setAppliedCoupon(null);
            toast.info("Đã xóa giỏ hàng");
        } catch (err) { toast.error("Lỗi xóa giỏ"); }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        if (cartItems.length === 0) return toast.warning("Giỏ trống!");
        const currentBranchId = cartItems[0].branch_id;
        try {
            const res = await api.get('/coupons/verify', { params: { code: couponCode, branch_id: currentBranchId } });
            setAppliedCoupon(res.data);
            toast.success(`Áp dụng mã ${res.data.code} thành công!`);
        } catch (err) { setAppliedCoupon(null); toast.error(err.response?.data?.detail || "Mã không hợp lệ"); }
    };

    const handleCheckout = () => {
        if (cartItems.length === 0) return toast.warning("Giỏ trống!");
        navigate('/checkout', {
            state: {
                items: cartItems, // items này đã có image_url
                coupon: appliedCoupon,
                final_price: totalPrice,
                branch_id: cartItems[0].branch_id
            }
        });
    };

    const formatMoney = (a) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(a);

    return (
        <div className="cart-container">
            <h2>🛒 Giỏ hàng của bạn</h2>
            <button className="back-btn" onClick={() => navigate('/shop')}>← Tiếp tục mua sắm</button>

            {cartItems.length === 0 ? (
                <div className="empty-cart"><p>Giỏ hàng trống trơn...</p><button onClick={() => navigate('/shop')}>Đi mua ngay</button></div>
            ) : (
                <div className="cart-content">
                    <table className="cart-table">
                        <thead><tr><th>Món ăn</th><th>Đơn giá</th><th>Số lượng</th><th>Thành tiền</th></tr></thead>
                        <tbody>
                            {cartItems.map((item) => (
                                <tr key={item.food_id}>
                                    <td>
                                        {/* HIỂN THỊ ẢNH NHỎ */}
                                        {item.image_url && <img src={`${API_URL}${item.image_url}`} className="cart-thumb" alt="" />}
                                        <strong>{item.name}</strong>
                                    </td>
                                    <td>{formatMoney(item.price)}</td>
                                    <td>
                                        <div className="qty-control">
                                            <button onClick={() => updateQuantity(item.food_id, item.quantity - 1)}>-</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.food_id, item.quantity + 1)}>+</button>
                                        </div>
                                    </td>
                                    <td>{formatMoney(item.price * item.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="cart-summary-box">
                        <div className="coupon-section">
                            <input placeholder="Nhập mã giảm giá" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} />
                            <button onClick={handleApplyCoupon}>Áp dụng</button>
                        </div>
                        <div className="summary-row"><span>Tạm tính:</span><span>{formatMoney(subTotal)}</span></div>
                        {appliedCoupon && <div className="summary-row discount"><span>Giảm giá ({appliedCoupon.code}):</span><span>- {formatMoney(subTotal * appliedCoupon.discount_percent / 100)}</span></div>}
                        <div className="summary-row total"><span>Tổng cộng:</span><span>{formatMoney(totalPrice)}</span></div>
                        <div className="cart-actions">
                            <button className="clear-btn" onClick={clearCart}>Xóa giỏ</button>
                            <button className="checkout-btn" onClick={handleCheckout}>Tiến hành Đặt hàng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Cart;