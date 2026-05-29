require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

let dbConnectionError = null;

// LỚP BẢO VỆ CHỐNG TREO MÁY CHỦ: Báo lỗi ngay lập tức về Web nếu MongoDB bị mất kết nối
app.use((req, res, next) => {
    if (!isDBConnected && req.path.startsWith('/api/') && req.path !== '/api/movies') {
        if (dbConnectionError) {
            return res.status(500).json({ message: `Lỗi kết nối CSDL: ${dbConnectionError}` });
        }
        return res.status(500).json({ message: 'Lỗi Hệ Thống: Máy chủ chưa kết nối được Cơ sở dữ liệu (MongoDB). Vui lòng kiểm tra lại cấu hình MONGODB_URI trên Render hoặc mở IP (0.0.0.0/0) trên trang MongoDB Atlas!' });
    }
    next();
});

// Phục vụ các file tĩnh (HTML, CSS, JS) từ thư mục frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Kết nối tới MongoDB
const mongoURI = process.env.MONGODB_URI;
let isDBConnected = false;

// Khởi tạo tự động tài khoản Quản Lý Cấp Cao an toàn
const initSuperAdmin = async () => {
    try {
        const adminExists = await User.findOne({ username: 'chunhatpham_admin' });
        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Admin@123456', salt); // Mật khẩu được mã hóa, không ai đọc được trong DB
            const superAdmin = new User({
                phone: '0999999999', 
                email: 'superadmin@caocon.online',
                username: 'chunhatpham_admin',
                password: hashedPassword,
                level: 'SuperAdmin', // Cấp bậc cao nhất
                premiumUntil: new Date('2099-12-31'), // Vĩnh viễn
                noAdsUntil: new Date('2099-12-31') // Vĩnh viễn
            });
            await superAdmin.save();
            console.log('🛡️ Đã tạo tài khoản Quản Lý Cấp Cao an toàn!');
        }
    } catch (err) { console.error('Lỗi tạo Super Admin:', err); }
};

if (!mongoURI) {
    console.error('❌ CẢNH BÁO: Chưa có biến môi trường MONGODB_URI trên hệ thống Render!');
    dbConnectionError = 'Bạn chưa thiết lập biến môi trường MONGODB_URI trên Render.';
} else {
    // serverSelectionTimeoutMS: 5000 giúp máy chủ không bị treo nếu không tìm thấy Database
    mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 })
        .then(() => {
            console.log('✅ Đã kết nối cơ sở dữ liệu MongoDB thành công!');
            isDBConnected = true;
            dbConnectionError = null;
            initSuperAdmin(); // Chạy tạo tài khoản bảo mật
            syncLocalMoviesToDB(); // Đảm bảo tự động đồng bộ phim khi server khởi động
        })
        .catch(err => {
            console.error('❌ Lỗi kết nối MongoDB:', err.message);
            dbConnectionError = err.message;
        });
}

// Tạo Schema (Cấu trúc dữ liệu) cho Truyện
const movieSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, required: true },
    ss1: { type: String, default: '#' },
    ss2: { type: String, default: '#' },
    ss3: { type: String, default: '#' },
    ss4: { type: String, default: '#' },
    ss5: { type: String, default: '#' },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Tạo Model từ Schema
const Movie = mongoose.model('Movie', movieSchema);

// Tạo Schema cho Người Dùng (User)
const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    level: { type: String, default: 'Thành viên Đồng' }, // Cấp độ tài khoản sau này
    balance: { type: Number, default: 0 }, // Số dư tài khoản
    premiumUntil: { type: Date }, // Hạn Premium
    noAdsUntil: { type: Date }, // Hạn Tắt quảng cáo
    createdAt: { type: Date, default: Date.now },
    resetOtp: { type: String }, // Lưu mã OTP
    resetOtpExpire: { type: Date } // Thời gian hết hạn OTP
});
const User = mongoose.model('User', userSchema);

// Tạo Schema cho Lịch sử Giao dịch (Transaction)
const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['DEPOSIT', 'WITHDRAW', 'PAYMENT'], default: 'DEPOSIT' },
    description: { type: String },
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'], default: 'PENDING' },
    createdAt: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

// Tạo Schema cho Thông Báo (Notification)
const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema);

// Tạo Schema cho Yêu cầu Hỗ trợ (Support Ticket)
const supportSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Thêm để biết ai gửi
    name: { type: String, required: true },
    contact: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, default: 'PENDING' }, // PENDING, RESOLVED
    adminReply: { type: String }, // Câu trả lời của Admin
    repliedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});
const SupportTicket = mongoose.model('SupportTicket', supportSchema);

// Cấu hình gửi Email (Nodemailer)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// =================================================================
// DỮ LIỆU PHIM CỨNG - BẤT BẠI (THEO YÊU CẦU CỦA BẠN)
// Từ nay, bạn chỉ cần thêm phim mới vào danh sách này là xong!
// =================================================================
const hardcodedMovies = [
    {
        name: "Gia Đình Giàu Mà Mình Lại Khổ",
        image: "https://i.postimg.cc/NGX4d1N8/IMG-2334.jpg",
        ss1: "https://videotourl.com/audio/1779906544582-f31c938b-fc06-4103-bd2f-f85837cb6c71.mp3",
        ss2: "https://videotourl.com/audio/1779906606083-9e2f3e63-13e2-4b39-b335-06bd32778728.mp3",
        ss3: "https://videotourl.com/audio/1779906640483-715a9ada-aa2f-4720-8968-0205930460c3.mp3",
        ss4: "#",
        ss5: "#"
    },
    {
        name: "Tôi Bảo Vệ Em Gái",
        image: "https://i.postimg.cc/7PzVKgBV/IMG-2335.jpg",
        ss1: "https://videotourl.com/audio/1779956284407-faca6ea4-3431-4cdb-93dd-93420e0b28af.mp3",
        ss2: "https://videotourl.com/audio/1779956378549-4d8a3340-49bd-440a-b356-ee9f95d6f266.mp3",
        ss3: "https://videotourl.com/audio/1779956410151-e3af6d49-fb98-446d-8b5f-3711ce162478.mp3",
        ss4: "#",
        ss5: "#"
    },
    {
        name: "Ở lại cùng vợ lúc khó khăn",
        image: "https://i.postimg.cc/kMScTxjw/IMG-2336.jpg",
        ss1: "https://videotourl.com/audio/1779957207100-ca5a9359-cf54-4121-87f2-78f6bb414ade.mp3",
        ss2: "https://videotourl.com/audio/1779957256801-8db163e2-e859-4414-b3a6-94ad8e47a6f8.mp3",
        ss3: "https://videotourl.com/audio/1779957332674-13baa7ee-863e-4829-a69d-dae08cb688d0.mp3",
        ss4: "#",
        ss5: "#"
    },
    {
        name: "Tôi bị xem thường rồi",
        image: "https://i.postimg.cc/T1mwsSJ4/IMG-2369.jpg",
        ss1: "https://videotourl.com/audio/1780019928711-ea2ae7df-8975-441c-8979-7d4a641489c3.mp3",
        ss2: "https://videotourl.com/audio/1780020031282-9a49046b-e303-4af8-91df-645c4fd5a5b3.mp3",
        ss3: "https://videotourl.com/audio/1780020073312-9b679979-30bd-4003-b828-0b3feb2a3fbf.mp3",
        ss4: "#",
        ss5: "#"
    }
    // Thêm phim mới ở đây, ví dụ:
    // , { name: "Phim Mới 2", image: "link_anh_2", ss1: "link_audio_2" ... }
];

// Đọc phim trực tiếp từ mã nguồn JS (Chuẩn 100% không bao giờ lỗi)
function getLocalMovies() {
    // Bỏ qua việc đọc file, lấy thẳng dữ liệu cứng bên trên
    return hardcodedMovies;
}

// Đồng bộ phim từ file vào MongoDB
async function syncLocalMoviesToDB() {
    const localMovies = getLocalMovies();
    for (const movieData of localMovies) {
        try {
            // Tự động tạo mới hoặc cập nhật nếu có sửa link audio, KHÔNG làm mất view/like cũ
            await Movie.findOneAndUpdate(
                { name: movieData.name },
                { $set: { ...movieData, updatedAt: Date.now() } },
                { upsert: true, new: true }
            );
        } catch (e) { console.error(`Lỗi đồng bộ phim ${movieData.name}:`, e); }
    }
    if (localMovies.length > 0) console.log(`🎬 Đã tự động đồng bộ ${localMovies.length} phim từ Code vào Database!`);
}

// API Endpoint: Nút bấm đồng bộ thủ công từ Code (Dành cho Admin)
app.post('/api/sync-movies', async (req, res) => {
    try {
        const localMovies = getLocalMovies();
        await syncLocalMoviesToDB();
        res.json({ message: `Tuyệt vời! Đã quét thấy ${localMovies.length} file phim và nạp thành công lên Web!` });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi đồng bộ phim' });
    }
});

// API Endpoint: Lấy danh sách truyện từ MongoDB cho Frontend
app.get('/api/movies', async (req, res) => {
    try {
        if (!isDBConnected) {
            // PHƯƠNG ÁN BẤT BẠI: Nếu DB lỗi, trả về phim cứng từ code để web không bao giờ trắng!
            const fallbackMovies = hardcodedMovies.map((m, i) => ({
                ...m,
                _id: `hardcoded_${i}`,
                views: 0,
                likes: 0
            }));
            return res.json(fallbackMovies);
        }

        let movies = await Movie.find().sort({ updatedAt: -1, createdAt: -1 });

        // TỰ ĐỘNG CHỮA LỖI: Nếu DB trống, hãy thử đồng bộ từ code và tải lại
        if (movies.length === 0 && isDBConnected) {
            console.log('⚠️ Cơ sở dữ liệu trống, đang thử đồng bộ từ mã nguồn...');
            await syncLocalMoviesToDB();
            movies = await Movie.find().sort({ updatedAt: -1, createdAt: -1 });
            console.log(`🔄 Sau khi đồng bộ, tìm thấy ${movies.length} phim.`);
        }

        res.json(movies);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi lấy dữ liệu từ cơ sở dữ liệu' });
    }
});

// API Endpoint: Thêm truyện mới vào MongoDB (Dùng cho Admin sau này)
app.post('/api/movies', async (req, res) => {
    try {
        const { name, image, ss1, ss2, ss3, ss4, ss5 } = req.body;
        const newMovie = new Movie({ name, image, ss1, ss2, ss3, ss4, ss5, updatedAt: Date.now() });
        await newMovie.save(); // Lưu vào MongoDB
        res.status(201).json({ message: 'Thêm truyện thành công!', data: newMovie });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi thêm truyện' });
    }
});

// API Endpoint: Cập nhật truyện (Sửa)
app.put('/api/movies/:id', async (req, res) => {
    try {
        const { name, image, ss1, ss2, ss3, ss4, ss5 } = req.body;
        const updatedMovie = await Movie.findByIdAndUpdate(req.params.id, { name, image, ss1, ss2, ss3, ss4, ss5, updatedAt: Date.now() }, { new: true });
        res.json({ message: 'Cập nhật thành công!', data: updatedMovie });
    } catch (error) { res.status(500).json({ message: 'Lỗi khi cập nhật truyện' }); }
});

// API Endpoint: Xóa truyện
app.delete('/api/movies/:id', async (req, res) => {
    try {
        await Movie.findByIdAndDelete(req.params.id);
        res.json({ message: 'Xóa thành công!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi khi xóa truyện' }); }
});

// API Endpoint: Tăng lượt View
app.post('/api/movies/:id/view', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (movie) {
            movie.views += 1;
            await movie.save();
            res.json({ success: true, views: movie.views });
        } else {
            res.status(404).json({ success: false });
        }
    } catch (error) { res.status(500).json({ success: false }); }
});

// API Endpoint: Tăng/Giảm lượt Like
app.post('/api/movies/:id/like', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (movie) {
            movie.likes += 1; // Ở phiên bản này ta cho phép cộng dồn like
            await movie.save();
            res.json({ success: true, likes: movie.likes });
        } else {
            res.status(404).json({ success: false });
        }
    } catch (error) { res.status(500).json({ success: false }); }
});

// API Đăng Ký Tài Khoản
app.post('/api/register', async (req, res) => {
    try {
        const { phone, email, password, username } = req.body;

        // Kiểm tra từng thông tin để báo lỗi chính xác cho người dùng
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ message: 'Tên tài khoản này đã có người sử dụng! Vui lòng chọn một tên khác.' });
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email này đã được đăng ký cho một tài khoản khác!' });
        }

        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({ message: 'Số điện thoại này đã được sử dụng!' });
        }

        // Mã hóa mật khẩu bảo mật
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Lưu vào DB
        const newUser = new User({ phone, email, username, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ 
            message: 'Đăng ký tài khoản thành công!',
            user: { id: newUser._id, username: newUser.username, email: newUser.email, phone: newUser.phone, level: newUser.level, balance: newUser.balance, premiumUntil: newUser.premiumUntil, noAdsUntil: newUser.noAdsUntil } 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi đăng ký' });
    }
});

// API Đăng Nhập
app.post('/api/login', async (req, res) => {
    try {
        const { loginIdentifier, password } = req.body;

        // Tìm user bằng username, email hoặc sdt
        const user = await User.findOne({ 
            $or: [{ username: loginIdentifier }, { email: loginIdentifier }, { phone: loginIdentifier }] 
        });
        
        if (!user) return res.status(400).json({ message: 'Tài khoản không tồn tại!' });

        // Kiểm tra mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Mật khẩu không chính xác!' });

        // Kiểm tra nếu hết hạn Premium thì rớt hạng về Đồng
        if (user.level !== 'Admin' && user.level !== 'SuperAdmin') {
            if (user.premiumUntil && new Date(user.premiumUntil) < new Date() && user.level !== 'Đồng') {
                user.level = 'Đồng';
                await user.save();
            }
        }

        // Đăng nhập thành công, trả về thông tin (không trả về password)
        res.status(200).json({ message: 'Đăng nhập thành công', user: { id: user._id, username: user.username, email: user.email, phone: user.phone, level: user.level, balance: user.balance, premiumUntil: user.premiumUntil, noAdsUntil: user.noAdsUntil } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
    }
});

// API Đổi Mật Khẩu (Dành cho user đã đăng nhập)
app.post('/api/change-password', async (req, res) => {
    try {
        const { userId, oldPassword, newPassword } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại!' });

        // Kiểm tra mật khẩu cũ
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Mật khẩu hiện tại không chính xác!' });

        // Mã hóa và lưu mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu' });
    }
});

// API Quên Mật Khẩu (Gửi OTP)
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) return res.status(404).json({ message: 'Email này chưa được liên kết với tài khoản nào!' });

        // Tạo mã OTP 6 số ngẫu nhiên
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Lưu OTP vào DB, giới hạn 10 phút
        user.resetOtp = otp;
        user.resetOtpExpire = Date.now() + 10 * 60 * 1000;
        await user.save();

        // Gửi email
        const mailOptions = {
            from: `"Cao Con Audio" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Mã Xác Nhận Đổi Mật Khẩu',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Xin chào ${user.username},</h2>
                    <p>Bạn vừa yêu cầu đặt lại mật khẩu tại Cao Con Audio.</p>
                    <p>Mã OTP của bạn là: <strong style="font-size: 24px; color: #ff5e00; padding: 5px 10px; border: 1px solid #ff5e00; border-radius: 5px;">${otp}</strong></p>
                    <p>Mã này sẽ hết hạn sau 10 phút. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
                    <p>Trân trọng,<br>Đội ngũ Cao Con</p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Mã OTP đã được gửi đến email của bạn!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi gửi email OTP. (Kiểm tra lại cấu hình Email)' });
    }
});

// API Đặt Lại Mật Khẩu Bằng OTP
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ 
            email, 
            resetOtp: otp, 
            resetOtpExpire: { $gt: Date.now() } // Kiểm tra xem OTP còn hạn không
        });

        if (!user) return res.status(400).json({ message: 'Mã OTP không hợp lệ hoặc đã hết hạn!' });

        // Đổi mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        // Xóa mã OTP
        user.resetOtp = undefined;
        user.resetOtpExpire = undefined;
        await user.save();

        res.status(200).json({ message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi đặt lại mật khẩu' });
    }
});

// API Lấy thông tin tài khoản & lịch sử giao dịch (Cho chức năng Ví)
app.post('/api/profile', async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản!' });

        // Kiểm tra và rớt hạng nếu hết hạn
        if (user.level !== 'Admin' && user.level !== 'SuperAdmin') {
            if (user.premiumUntil && new Date(user.premiumUntil) < new Date() && user.level !== 'Đồng') {
                user.level = 'Đồng';
                await user.save();
            }
        }

        // Lấy 10 giao dịch gần nhất
        const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(10);
        
        res.status(200).json({ 
            user: { id: user._id, username: user.username, email: user.email, phone: user.phone, level: user.level, balance: user.balance, premiumUntil: user.premiumUntil, noAdsUntil: user.noAdsUntil },
            transactions 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi lấy thông tin' });
    }
});

// API Mua Gói Premium / Tắt QC
app.post('/api/premium/buy', async (req, res) => {
    try {
        const { userId, packageType } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại!' });

        const packages = {
            'REMOVE_ADS': { price: 20000, days: 30, level: user.level, name: 'Tắt Quảng Cáo 1 Tháng' },
            '1_MONTH': { price: 70000, days: 30, level: 'Bạc', name: 'Premium 1 Tháng' },
            '3_MONTHS': { price: 180000, days: 90, level: 'Vàng', name: 'Premium 3 Tháng' },
            '6_MONTHS': { price: 320000, days: 180, level: 'Kim Cương', name: 'Premium 6 Tháng' },
            '12_MONTHS': { price: 550000, days: 365, level: 'Rubi', name: 'Premium 1 Năm' }
        };

        const pkg = packages[packageType];
        if (!pkg) return res.status(400).json({ message: 'Gói không hợp lệ!' });

        if ((user.balance || 0) < pkg.price) {
            return res.status(400).json({ message: `Số dư không đủ! Gói này giá ${new Intl.NumberFormat('vi-VN').format(pkg.price)}đ. Vui lòng nạp thêm.` });
        }

        user.balance -= pkg.price;
        const now = Date.now();

        if (packageType === 'REMOVE_ADS') {
            const currentNoAds = user.noAdsUntil && user.noAdsUntil > now ? user.noAdsUntil.getTime() : now;
            user.noAdsUntil = new Date(currentNoAds + pkg.days * 24 * 60 * 60 * 1000);
        } else {
            const currentPrem = user.premiumUntil && user.premiumUntil > now ? user.premiumUntil.getTime() : now;
            user.premiumUntil = new Date(currentPrem + pkg.days * 24 * 60 * 60 * 1000);
            user.level = pkg.level;
            
            // Nâng cấp Premium sẽ bao gồm cả Tắt quảng cáo
            const currentNoAds = user.noAdsUntil && user.noAdsUntil > now ? user.noAdsUntil.getTime() : now;
            if (user.premiumUntil.getTime() > currentNoAds) {
                user.noAdsUntil = user.premiumUntil;
            }
        }

        await user.save();

        const tx = new Transaction({ userId: user._id, amount: pkg.price, type: 'PAYMENT', description: `Thanh toán: ${pkg.name}`, status: 'COMPLETED' });
        await tx.save();

        res.status(200).json({ message: `Nâng cấp ${pkg.name} thành công!`, user: { id: user._id, username: user.username, email: user.email, phone: user.phone, level: user.level, balance: user.balance, premiumUntil: user.premiumUntil, noAdsUntil: user.noAdsUntil } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi thanh toán gói' });
    }
});

// API Khởi tạo đơn nạp tiền (PENDING)
app.post('/api/deposit/init', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại' });

        // Tạo nội dung CK duy nhất: NAP + SĐT + 3 số ngẫu nhiên
        const content = `NAP${user.phone}${Math.floor(100 + Math.random() * 900)}`;
        
        const newTx = new Transaction({ userId: user._id, amount, type: 'DEPOSIT', description: content, status: 'PENDING' });
        await newTx.save();

        res.status(200).json({ txId: newTx._id, content });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi tạo đơn nạp tiền' });
    }
});

// API Kiểm tra trạng thái đơn nạp tiền
app.post('/api/deposit/check', async (req, res) => {
    try {
        const { txId } = req.body;
        const tx = await Transaction.findById(txId);
        res.status(200).json({ status: tx ? tx.status : 'NOT_FOUND' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi kiểm tra trạng thái' });
    }
});

// API Hủy hoặc Đánh dấu thất bại đơn nạp
app.post('/api/deposit/update-status', async (req, res) => {
    try {
        const { txId, status } = req.body;
        const tx = await Transaction.findById(txId);
        if (tx && tx.status === 'PENDING') {
            tx.status = status; // 'CANCELLED' hoặc 'FAILED'
            await tx.save();
        }
        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// API Webhook: Lắng nghe giao dịch nạp tiền tự động từ SePay
app.post('/api/webhook/sepay', async (req, res) => {
    try {
        console.log("📥 [SePay Webhook] Nhận tín hiệu chuyển khoản:", req.body);
        let data = req.body;
        
        // Đề phòng hệ thống SePay gửi cấu trúc bọc trong mảng data (Array)
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            data = data.data[0];
        } else if (Array.isArray(data) && data.length > 0) {
            data = data[0];
        }
        
        // Hỗ trợ lấy dữ liệu theo mọi chuẩn API của SePay
        const amount = parseInt(data.transferAmount || data.amountIn || data.amount);
        const rawContent = data.content || data.transactionContent || data.description || '';
        const content = rawContent.toUpperCase().replace(/\s+/g, '');
        const transferType = data.transferType;

        if (transferType && transferType !== 'in') {
            return res.json({ success: true, message: "Bỏ qua giao dịch chuyển ra" });
        }
        if (!amount || amount <= 0) {
            return res.json({ success: true, message: "Không tìm thấy số tiền hợp lệ" });
        }

        // Tìm giao dịch PENDING xem nội dung CK có chứa mã đơn không (Xử lý việc ngân hàng chèn thêm chữ IBFT)
        const pendingTxs = await Transaction.find({ status: 'PENDING', type: 'DEPOSIT' });
        let existTx = null;
        for (let tx of pendingTxs) {
            if (content.includes(tx.description)) {
                existTx = tx;
                break;
            }
        }
        
        if (existTx && existTx.status !== 'COMPLETED') {
            const user = await User.findById(existTx.userId);
            
            if (user) {
                // Cộng tiền và đổi trạng thái
                user.balance += existTx.amount;
                await user.save();
                
                existTx.status = 'COMPLETED';
                await existTx.save();
                console.log(`✅ [Tự động] Đã cộng ${existTx.amount}đ cho tài khoản ${user.username}`);
            }
        }
        res.json({ success: true }); // Phản hồi cho SePay biết đã nhận
    } catch (error) {
        console.error("Lỗi Webhook SePay:", error);
        res.status(500).json({ success: false });
    }
});

// API Gửi Yêu cầu Hỗ trợ từ mục Liên Hệ
app.post('/api/contact', async (req, res) => {
    try {
        const { userId, name, contact, description } = req.body;
        const newTicket = new SupportTicket({ userId, name, contact, description });
        await newTicket.save();
        res.json({ success: true, message: 'Gửi yêu cầu hỗ trợ thành công!' });
    } catch (e) { res.status(500).json({ message: 'Lỗi khi gửi yêu cầu' }); }
});

// API BẢO MẬT: Chỉ dành cho Quản Lý Cấp Cao lấy danh sách toàn bộ người dùng
app.post('/api/superadmin/users', async (req, res) => {
    try {
        const { adminId, startDate, endDate } = req.body;
        const admin = await User.findById(adminId);

        // Kiểm tra định danh: Phải tồn tại, phải là SuperAdmin và đúng Username
        if (!admin || admin.level !== 'SuperAdmin' || admin.username !== 'chunhatpham_admin') {
            return res.status(403).json({ message: '⛔ Truy cập bị từ chối! Hành động này đã được ghi lại.' });
        }

        // Khởi tạo bộ lọc (Filter)
        let userFilter = {};
        let txFilter = { status: 'COMPLETED' }; 
        let supportFilter = {}; 
        let txSummaryFilter = { status: 'COMPLETED', type: 'DEPOSIT' }; 
        let supportSummaryFilter = { status: 'PENDING' }; 

        if (startDate && endDate) {
            const dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };
            userFilter.createdAt = dateFilter;
            txFilter.createdAt = dateFilter;
            supportFilter.createdAt = dateFilter;
            txSummaryFilter.createdAt = dateFilter;
            supportSummaryFilter.createdAt = dateFilter;
        }

        // Lấy dữ liệu đã được lọc theo thời gian
        const users = await User.find(userFilter).select('-password -resetOtp -resetOtpExpire').sort({ createdAt: -1 });
        
        // Lấy danh sách giao dịch (nạp + mua VIP) và Support (Có populate để lấy thông tin User)
        const transactions = await Transaction.find(txFilter).populate('userId', 'username phone email').sort({ createdAt: -1 });
        const supportTickets = await SupportTicket.find(supportFilter).populate('userId', 'username').sort({ createdAt: -1 });

        // Tổng nạp và đếm Pending
        const depositTxs = await Transaction.find(txSummaryFilter);
        const totalDeposit = depositTxs.reduce((sum, tx) => sum + tx.amount, 0);
        const pendingSupport = await SupportTicket.countDocuments(supportSummaryFilter);

        res.status(200).json({ users, totalBalance: totalDeposit, pendingSupport, transactions, supportTickets });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi máy chủ bảo mật' });
    }
});

// API BẢO MẬT: SuperAdmin - Cộng/Trừ tiền người dùng
app.post('/api/superadmin/users/:id/balance', async (req, res) => {
    try {
        const { adminId, action, amount, reason } = req.body;
        const admin = await User.findById(adminId);
        if (!admin || admin.level !== 'SuperAdmin' || admin.username !== 'chunhatpham_admin') return res.status(403).json({ message: '⛔ Truy cập bị từ chối!' });
        
        const user = await User.findById(req.params.id);
        if(!user) return res.status(404).json({message: 'Không tìm thấy người dùng'});

        const value = parseInt(amount);
        if (action === 'ADD') { user.balance = (user.balance || 0) + value; } 
        else if (action === 'DEDUCT') { 
            user.balance = Math.max(0, (user.balance || 0) - value); 
            
            // Tự động tạo thông báo gửi cho người dùng nếu có lý do
            if (reason && reason.trim() !== '') {
                const noti = new Notification({ userId: user._id, title: 'Biến động số dư', message: `Tài khoản của bạn đã bị trừ ${new Intl.NumberFormat('vi-VN').format(value)}đ. Lý do: ${reason}` });
                await noti.save();
            }
        }
        
        await user.save();
        res.json({ success: true, message: `Đã ${action === 'ADD' ? 'cộng' : 'trừ'} ${new Intl.NumberFormat('vi-VN').format(value)}đ cho ${user.username}`, balance: user.balance });
    } catch (e) { res.status(500).json({ message: 'Lỗi server' }); }
});

// API BẢO MẬT: SuperAdmin - Sửa thông tin người dùng
app.put('/api/superadmin/users/:id', async (req, res) => {
    try {
        const { adminId, username, phone, email, level, newPassword, premiumDays } = req.body;
        const admin = await User.findById(adminId);
        if (!admin || admin.level !== 'SuperAdmin' || admin.username !== 'chunhatpham_admin') return res.status(403).json({ message: '⛔ Truy cập bị từ chối!' });
        
        const existUser = await User.findOne({ $or: [{ username }, { email }, { phone }], _id: { $ne: req.params.id } });
        if (existUser) return res.status(400).json({ message: 'Tên, Email hoặc SĐT đã bị trùng với tài khoản khác!' });

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản!' });

        user.username = username; user.phone = phone; user.email = email; user.level = level;

        // Đổi mật khẩu không cần mật khẩu cũ
        if (newPassword && newPassword.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        // Nâng cấp số ngày Premium
        const days = parseInt(premiumDays);
        if (days && days > 0) {
            const currentPrem = user.premiumUntil && user.premiumUntil > Date.now() ? user.premiumUntil.getTime() : Date.now();
            user.premiumUntil = new Date(currentPrem + days * 24 * 60 * 60 * 1000);
            user.noAdsUntil = user.premiumUntil; // Tặng kèm tắt QC
        }

        await user.save();
        res.json({ success: true, message: 'Cập nhật tài khoản thành công!' });
    } catch (e) { res.status(500).json({ message: 'Lỗi server' }); }
});

// API BẢO MẬT: SuperAdmin - Xóa người dùng
app.delete('/api/superadmin/users/:id', async (req, res) => {
    try {
        const { adminId } = req.body;
        const admin = await User.findById(adminId);
        if (!admin || admin.level !== 'SuperAdmin' || admin.username !== 'chunhatpham_admin') return res.status(403).json({ message: '⛔ Truy cập bị từ chối!' });
        
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Đã xóa tài khoản vĩnh viễn!' });
    } catch (e) { res.status(500).json({ message: 'Lỗi server' }); }
});

// API BẢO MẬT: SuperAdmin - Trả lời Hỗ Trợ
app.post('/api/superadmin/support/:id/reply', async (req, res) => {
    try {
        const { adminId, replyMessage } = req.body;
        const admin = await User.findById(adminId);
        if (!admin || admin.level !== 'SuperAdmin') return res.status(403).json({ message: '⛔ Từ chối!' });
        
        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });

        ticket.status = 'RESOLVED';
        ticket.adminReply = replyMessage;
        ticket.repliedAt = Date.now();
        await ticket.save();

        // Gửi thông báo cho người dùng
        if (ticket.userId) {
            const noti = new Notification({ userId: ticket.userId, title: 'Hỗ trợ khách hàng', message: `Admin đã trả lời yêu cầu của bạn: "${replyMessage}"` });
            await noti.save();
        }

        res.json({ success: true, message: 'Đã trả lời và đóng yêu cầu hỗ trợ!' });
    } catch (e) { res.status(500).json({ message: 'Lỗi server' }); }
});

// API Endpoint: Lấy danh sách thông báo của người dùng
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const notis = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(20);
        res.json(notis);
    } catch (e) { res.status(500).json({ message: 'Lỗi' }); }
});

// API Endpoint: Đánh dấu tất cả thông báo đã đọc
app.post('/api/notifications/:userId/read-all', async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.params.userId, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: 'Lỗi' }); }
});

// API BẢO MẬT: Quản Lý / Admin gửi thông báo
app.post('/api/admin/send-notification', async (req, res) => {
    try {
        const { adminId, targetUsername, title, message } = req.body;
        const admin = await User.findById(adminId);
        if (!admin || (admin.level !== 'Admin' && admin.level !== 'SuperAdmin')) {
             return res.status(403).json({ message: '⛔ Không có quyền thực hiện hành động này!' });
        }

        if (targetUsername) {
            // Gửi cho 1 người cụ thể
            const user = await User.findOne({ username: targetUsername });
            if (!user) return res.status(404).json({ message: 'Không tìm thấy Username này trong hệ thống!' });
            const noti = new Notification({ userId: user._id, title, message });
            await noti.save();
        } else {
            // Gửi cho tất cả mọi người
            const users = await User.find({});
            const notis = users.map(u => ({ userId: u._id, title, message }));
            await Notification.insertMany(notis);
        }
        res.json({ message: 'Gửi thông báo thành công!' });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ message: 'Lỗi máy chủ khi gửi thông báo' }); 
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});