import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from './api';

// Định nghĩa đường dẫn gốc để load ảnh
const API_URL = "http://localhost:8000";

function Shop() {
    const [foods, setFoods] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); 
    const [selectedFood, setSelectedFood] = useState(null); 
    const [foodOptions, setFoodOptions] = useState([]);
    const navigate = useNavigate();

    useEffect(() => { fetchFoods(); }, []);

    const fetchFoods = async (query = '') => {
        try {
            const res = await api.get(`/foods/search?q=${query}`);
            setFoods(res.data);
        } catch (err) { console.error(err); }
    };

    const handleSearch = (e) => { e.preventDefault(); fetchFoods(searchTerm); };

    const handleViewOptions = async (foodName) => {
        try {
            const res = await api.get(`/foods/options?name=${foodName}`);
            setFoodOptions(res.data);
            setSelectedFood(foodName);
        } catch (err) { toast.error("Lỗi tải chi tiết"); }
    };

    const handleAddToCart = async (option) => {
        try {
            await api.post('/cart', { food_id: option.food_id, branch_id: option.branch_id, quantity: 1 });
            toast.success(`Đã thêm vào giỏ! 🛒`);
            setSelectedFood(null);
        } catch (err) {
            if (err.response?.status === 409) {
                if(window.confirm("Giỏ hàng khác quán! Xóa giỏ cũ?")) {
                    await api.delete('/cart');
                    await api.post('/cart', { food_id: option.food_id, branch_id: option.branch_id, quantity: 1 });
                    toast.success("Đã tạo giỏ mới!");
                    setSelectedFood(null);
                }
            } else { toast.error("Lỗi thêm vào giỏ"); }
        }
    };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };
    const formatMoney = (a) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(a);

    return (
        <div className="shop-container">
            <header className="shop-header">
                <h2>🍔 Food Delivery</h2>
                <div className="header-actions">
                    <button onClick={() => navigate('/profile')}>👤 Hồ sơ</button>
                    <button onClick={() => navigate('/history')}>📜 Lịch sử</button>
                    <button onClick={() => navigate('/cart')}>Giỏ hàng 🛒</button>
                    <button onClick={handleLogout} className="logout-btn">Đăng xuất</button>
                </div>
            </header>

            <div className="search-bar">
                <form onSubmit={handleSearch}>
                    <input placeholder="Tìm món ăn..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    <button type="submit">Tìm</button>
                </form>
            </div>

            <div className="food-grid">
                {foods.map((food, index) => (
                    <div key={index} className="food-card" onClick={() => handleViewOptions(food.name)}>
                        {/* --- LOGIC HIỂN THỊ ẢNH --- */}
                        {food.image_url ? (
                            <img src={`${API_URL}${food.image_url}`} alt={food.name} />
                        ) : (
                            <div className="food-image-placeholder">🍖</div>
                        )}
                        {/* ------------------------- */}
                        
                        <h3>{food.name}</h3>
                        
                        <div style={{color: '#f6c23e', marginBottom: '5px', fontSize: '0.9rem'}}>
                            {food.avg_rating > 0 ? (
                                <>★ <b>{food.avg_rating}</b> <span style={{color: '#999'}}>({food.review_count})</span></>
                            ) : <span style={{color: '#ccc', fontSize: '0.8rem'}}>Chưa có đánh giá</span>}
                        </div>

                        <p className="price-range">
                            {formatMoney(food.min_price)} {food.min_price !== food.max_price && ` - ${formatMoney(food.max_price)}`}
                        </p>
                        <span className="badge">{food.branch_count} quán bán</span>
                    </div>
                ))}
            </div>

            {selectedFood && (
                <div className="modal-overlay" onClick={() => setSelectedFood(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Chọn quán: {selectedFood}</h3>
                        <button className="close-btn" onClick={() => setSelectedFood(null)}>×</button>
                        <div className="options-list">
                            {foodOptions.map((opt) => (
                                <div key={opt.food_id} className="option-item">
                                    {/* Hiển thị ảnh nhỏ trong modal chọn quán */}
                                    <div style={{display:'flex', alignItems:'center'}}>
                                        {opt.image_url && <img src={`${API_URL}${opt.image_url}`} style={{width:'50px', height:'50px', objectFit:'cover', borderRadius:'4px', marginRight:'10px'}} />}
                                        <div className="option-info">
                                            <strong>{opt.branch_name}</strong>
                                            <div>
                                                {opt.discount > 0 && <span className="old-price">{formatMoney(opt.original_price)}</span>}
                                                <span className="final-price">{formatMoney(opt.final_price)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleAddToCart(opt)}>+ Thêm</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Shop;