// Đã xóa quảng cáo cũ, bạn có thể điền link quảng cáo mới của bạn vào đây
const adLinks = [
    "https://vt.tiktok.com/ZS9Y3gxTPWnqa-rh96I/",
    "https://vt.tiktok.com/ZS9Y3g4n6VmXM-4BYUF/",
    "https://vt.tiktok.com/ZS9Y3gqAXmGyP-DnBsH/",
    "https://vt.tiktok.com/ZS9Y3gs519F5F-Jwt9A/",
    "https://vt.tiktok.com/ZS9Y3gn8H1wbc-IFl2C/"
];

const loader = document.getElementById('loader');
const modal = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalIcon = document.getElementById('modalIcon');

function showLoader() { loader.classList.add('active'); }
function hideLoader() { loader.classList.remove('active'); }

function closeWelcomeAlert() {
    document.getElementById('welcomeAlertModal').classList.remove('active');
    showLoader();
    setTimeout(() => { hideLoader(); }, 800); 
}

function showModal(title, message, isSuccess = false) {
    modalTitle.innerText = title; 
    modalMessage.innerText = message; 
    if(isSuccess) {
        modalIcon.className = "fa-solid fa-circle-check";
        modalIcon.style.color = "#34c759"; 
    } else {
        modalIcon.className = "fa-solid fa-circle-exclamation";
        modalIcon.style.color = "#ff3b30"; 
    }
    modal.classList.add('active');
}

function closeModal() { modal.classList.remove('active'); }

async function submitContactForm(e) {
    e.preventDefault();
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        showModal('Yêu Cầu Đăng Nhập', 'Bạn cần đăng nhập để gửi yêu cầu hỗ trợ!');
        switchTab('account-tab');
        return;
    }
    const userId = JSON.parse(userStr).id;

    const name = document.getElementById('contactName').value.trim();
    const contact = document.getElementById('contactInfo').value.trim();
    const description = document.getElementById('contactDesc').value.trim();
    
    showLoader();
    try {
        const res = await fetch('https://caoconaudio.onrender.com/api/contact', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, name, contact, description })
        });
        hideLoader();
        if (res.ok) { showModal('Thành Công', 'Yêu cầu của bạn đã được gửi, chúng tôi sẽ sớm liên hệ lại!', true); document.getElementById('supportContactForm').reset(); } 
        else { showModal('Lỗi', 'Có lỗi xảy ra, vui lòng thử lại sau.'); }
    } catch (err) { hideLoader(); showModal('Lỗi', 'Không thể kết nối máy chủ.'); }
}

// QUẢN LÝ DETAIL MODAL VÀ AUDIO
const movieDetailModal = document.getElementById('movieDetailModal');
const detailTitle = document.getElementById('detailTitle');
const detailPoster = document.getElementById('detailPoster');
const detailViews = document.getElementById('detailViews');
const detailLikes = document.getElementById('detailLikes');
const likeMovieBtn = document.getElementById('likeMovieBtn');
const seasonsList = document.getElementById('seasonsList');

const globalPlayer = document.getElementById('globalPlayer');
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const rewindBtn = document.getElementById('rewindBtn');
const forwardBtn = document.getElementById('forwardBtn');
const speedBtn = document.getElementById('speedBtn');
const muteBtn = document.getElementById('muteBtn');
const volumeIcon = document.getElementById('volumeIcon');

let isPlaying = false;
let currentPlayingMovieId = null;
let currentPlayingSeason = null;

function hasNoAds() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    if (user.level === 'Admin' || user.level === 'SuperAdmin') return true;
    if (user.noAdsUntil && new Date(user.noAdsUntil) > new Date()) return true;
    return false;
}

function isPremium() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    if (user.level === 'Admin' || user.level === 'SuperAdmin') return true;
    if (user.premiumUntil && new Date(user.premiumUntil) > new Date()) return true;
    return false;
}

// ===================== HEADER ICONS (CROWN & AD-BLOCK) =====================
document.getElementById('headerAdBlockIcon').addEventListener('click', () => { switchTab('premium-tab'); });
document.getElementById('headerCrownIcon').addEventListener('click', () => { switchTab('premium-tab'); });

function updateHeaderIcons() {
    const adBlockIcon = document.getElementById('headerAdBlockIcon');
    const crownIcon = document.getElementById('headerCrownIcon');

    const noAds = hasNoAds();
    const premium = isPremium();

    if (noAds) {
        adBlockIcon.className = 'fa-solid fa-volume-xmark action-icon ad-block-icon green';
        adBlockIcon.title = "Đã tắt quảng cáo";
    } else {
        adBlockIcon.className = 'fa-solid fa-volume-xmark action-icon ad-block-icon red';
        adBlockIcon.title = "Mua gói tắt quảng cáo";
    }

    const userStr = localStorage.getItem('currentUser');
    crownIcon.className = 'fa-solid fa-crown action-icon premium-crown-icon'; 
    if (userStr) {
        const user = JSON.parse(userStr);
        if (premium && user.level !== 'Đồng') {
            crownIcon.classList.add('active');
            if (user.level === 'Bạc') crownIcon.classList.add('crown-bac');
            else if (user.level === 'Vàng') crownIcon.classList.add('crown-vang');
            else if (user.level === 'Kim Cương') crownIcon.classList.add('crown-kimcuong');
            else if (user.level === 'Rubi') crownIcon.classList.add('crown-rubi');
            else if (user.level === 'Admin' || user.level === 'SuperAdmin') crownIcon.classList.add('crown-admin');
            crownIcon.title = `Hạng: ${user.level}`;
        }
    }
}

function openMovieDetail(movie) {
    detailTitle.innerText = movie.name; 
    detailPoster.style.backgroundImage = `url('${movie.image}')`;
    detailViews.innerText = new Intl.NumberFormat('vi-VN').format(movie.views || 0);
    detailLikes.innerText = new Intl.NumberFormat('vi-VN').format(movie.likes || 0);
    
    likeMovieBtn.onclick = () => handleLikeMovie(movie._id);
    
    // Render 5 nút SS
    seasonsList.innerHTML = '';
    for(let i = 1; i <= 5; i++) {
        const link = movie[`ss${i}`] || '#';
        const isLocked = i >= 3 && !isPremium();

        const btn = document.createElement('button');
        btn.className = 'season-btn';
        if (currentPlayingMovieId === movie._id && currentPlayingSeason === `Phần ${i}`) btn.classList.add('playing');
        
        if (isLocked) {
            btn.innerHTML = `<i class="fa-solid fa-lock" style="margin-right: 5px;"></i> Phần ${i}`;
            btn.classList.add('locked-btn');
        } else {
            btn.innerText = `Phần ${i}`;
        }
        
        btn.onclick = () => {
            if (isLocked) {
                showModal('Yêu Cầu Premium', `Phần ${i} trở đi chỉ dành riêng cho tài khoản Premium (Hạng Bạc trở lên). Vui lòng nâng cấp để nghe trọn bộ!`);
                closeMovieDetail();
                switchTab('premium-tab');
                return;
            }
            if(link === '#') {
                showModal('Đang Cập Nhật', `Phần ${i} hiện đang được cập nhật, sẽ sớm có mặt nhất!`);
            } else {
                // Bỏ đánh dấu các nút cũ, đánh dấu nút mới
                document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('playing'));
                btn.classList.add('playing');
                playGlobalAudio(movie, `Phần ${i}`, link);
            }
        };
        seasonsList.appendChild(btn);
    }

    movieDetailModal.classList.add('active');
}

function closeMovieDetail() { 
    movieDetailModal.classList.remove('active'); 
    // Lưu ý: Không pause audio ở đây nữa để nhạc tiếp tục phát nền
}

movieDetailModal.addEventListener('click', function(e) { 
    if(e.target === movieDetailModal) closeMovieDetail(); 
});

function playGlobalAudio(movie, seasonName, link) {
    globalPlayer.style.display = 'flex';
    document.body.classList.add('player-active');
    
    document.getElementById('gpImage').src = movie.image;
    document.getElementById('gpTitle').innerText = movie.name;
    document.getElementById('gpSeason').innerText = seasonName;
    
    currentPlayingMovieId = movie._id;
    currentPlayingSeason = seasonName;
    
    resetPlayerUI();
    audioPlayer.src = link;
    audioPlayer.play().then(() => {
        playIcon.className = "fa-solid fa-pause";
        isPlaying = true;
        // Gọi API tăng view ngầm
        fetch(`https://caoconaudio.onrender.com/api/movies/${movie._id}/view`, { method: 'POST' });
    }).catch(e => console.log('Chờ Audio Load...'));
}

function closeGlobalPlayer() {
    audioPlayer.pause();
    isPlaying = false;
    currentPlayingMovieId = null;
    currentPlayingSeason = null;
    globalPlayer.style.display = 'none';
    document.body.classList.remove('player-active');
    document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('playing'));
}

async function handleLikeMovie(id) {
    try {
        const res = await fetch(`https://caoconaudio.onrender.com/api/movies/${id}/like`, { method: 'POST' });
        const data = await res.json();
        if(res.ok && data.success) {
            detailLikes.innerText = new Intl.NumberFormat('vi-VN').format(data.likes);
            likeMovieBtn.style.color = '#fff';
            likeMovieBtn.style.background = '#ff3b30';
        }
    } catch(e){}
}

function resetPlayerUI() {
    playIcon.className = "fa-solid fa-play";
    isPlaying = false;
    progressBar.value = 0;
    currentTimeEl.innerText = "00:00";
    totalTimeEl.innerText = "00:00";
    audioPlayer.playbackRate = 1.0;
    speedBtn.innerText = "1.0x";
}

function formatTime(time) {
    if (isNaN(time) || !isFinite(time)) return "00:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
}

playPauseBtn.addEventListener('click', () => {
    if (isPlaying) {
        audioPlayer.pause();
        playIcon.className = "fa-solid fa-play";
        isPlaying = false;
    } else {
        const playPromise = audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                playIcon.className = "fa-solid fa-pause";
                isPlaying = true;
            }).catch(error => {
                showModal('Đang Kết Nối', 'Hệ Thống Đang Kết Nối Phim Vui Lòng Đợi Chút', true);
                setTimeout(() => { window.open(audioPlayer.src, '_blank'); }, 1500);
            });
        }
    }
});

audioPlayer.addEventListener('timeupdate', () => {
    const current = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    currentTimeEl.innerText = formatTime(current);
    if (!isNaN(duration) && isFinite(duration)) {
        totalTimeEl.innerText = formatTime(duration);
        progressBar.max = duration;
    }
    if (duration > 0) progressBar.value = current;
});

audioPlayer.addEventListener('loadedmetadata', () => {
    if (!isNaN(audioPlayer.duration) && isFinite(audioPlayer.duration)) {
        totalTimeEl.innerText = formatTime(audioPlayer.duration);
        progressBar.max = audioPlayer.duration;
    }
});

progressBar.addEventListener('input', () => { audioPlayer.currentTime = progressBar.value; });
rewindBtn.addEventListener('click', () => { audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10); });
forwardBtn.addEventListener('click', () => { audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 10); });

speedBtn.addEventListener('click', () => {
    let currentSpeed = audioPlayer.playbackRate;
    if (currentSpeed === 1.0) currentSpeed = 1.25;
    else if (currentSpeed === 1.25) currentSpeed = 1.5;
    else if (currentSpeed === 1.5) currentSpeed = 2.0;
    else currentSpeed = 1.0;
    audioPlayer.playbackRate = currentSpeed;
    speedBtn.innerText = currentSpeed + "x";
});

muteBtn.addEventListener('click', () => {
    audioPlayer.muted = !audioPlayer.muted;
    if (audioPlayer.muted) {
        volumeIcon.className = "fa-solid fa-volume-xmark";
        volumeIcon.style.color = "#ff3b30"; 
    } else {
        volumeIcon.className = "fa-solid fa-volume-high";
        volumeIcon.style.color = "var(--text-main)";
    }
});

audioPlayer.addEventListener('ended', () => {
    isPlaying = false;
    playIcon.className = "fa-solid fa-play";
    progressBar.value = 0;
    audioPlayer.currentTime = 0;
});

// KHUNG PHIM VÀ LOGIC HIỆU ỨNG TRƯỚC KHI MỞ
let globalAdProgress = 0; 

function createMovieCard(isNew = false, movieObj) {
    const card = document.createElement('div');
    card.classList.add('movie-card');
    const isUpdating = (!movieObj.ss1 || movieObj.ss1 === "#");

    card.innerHTML = `
        ${isNew ? '<div class="badge-new">NEW</div>' : ''}
        <div class="movie-thumbnail">
            <div class="bg-blur" style="background-image: url('${movieObj.image}'); ${!isUpdating ? 'filter: none;' : ''}"></div>
            <div class="card-stats"><i class="fa-solid fa-headphones"></i> ${movieObj.views || 0} &nbsp;&nbsp; <i class="fa-solid fa-heart"></i> ${movieObj.likes || 0}</div>
            ${isUpdating ? '<div class="update-text"><i class="fa-solid fa-spinner fa-spin" style="margin-right:5px;"></i> Đang cập nhật</div>' : ''}
        </div>
        <div class="movie-info">
            <h2 class="searchable-title">${movieObj.name}</h2> 
        </div>
    `;
    
    card.addEventListener('click', () => {
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) {
            showModal('Yêu Cầu Đăng Nhập', 'Bạn cần đăng nhập hoặc đăng ký tài khoản để xem phim!');
            switchTab('account-tab');
            return;
        }

        if (hasNoAds()) {
            showLoader();
            setTimeout(() => { hideLoader(); openMovieDetail(movieObj); }, 800);
            return;
        }

        if (globalAdProgress < 3) {
            globalAdProgress++;
            const toast = document.getElementById('adProgressToast');
            const toastText = document.getElementById('adProgressText');
            toastText.innerText = `Tiến Độ: ${globalAdProgress}/3`;
            toast.classList.add('active');
            
            setTimeout(() => { toast.classList.remove('active'); }, 3500);
            
            // Xử lý bật quảng cáo
            if(adLinks.length > 0) {
                const randomAd = adLinks[Math.floor(Math.random() * adLinks.length)];
                window.open(randomAd, '_blank');
            }
            
            if (globalAdProgress === 3) {
                globalAdProgress = 0; 
                showLoader();
                setTimeout(() => {
                    hideLoader();
                    openMovieDetail(movieObj);
                }, 1200); 
            }
        } else {
            globalAdProgress = 0;
            showLoader();
            setTimeout(() => {
                hideLoader();
                openMovieDetail(movieObj);
            }, 1200);
        }
    });
    
    return card;
}

// Xóa truyện cũ, để lại 2 mục Demo chuẩn để bạn cập nhật sau
let realMovies = [];

const homeGrid = document.getElementById('home-movie-grid');

// Hiển thị mặc định 10 khung phim "Đang cập nhật" trên Trang chủ khi đang tải hoặc nếu không có Server
const dummyMovie = { name: "Siêu Phẩm Cáo Con", image: "https://i.postimg.cc/25nNvXsX/BFA37734-56C0-4950-A46C-3952E9F1A499.png", ss1: "#", views: 0, likes: 0 };
for (let i = 0; i < 10; i++) { 
    homeGrid.appendChild(createMovieCard(true, dummyMovie)); 
}

let currentListPage = 1;
let totalPages = 1;

function loadListPage(pageNumber) {
    currentListPage = pageNumber;
    showLoader();
    setTimeout(() => {
        const listGrid = document.getElementById('list-movie-grid');
        listGrid.innerHTML = ''; 
        const startIndex = (pageNumber - 1) * 10;
        const pageMovies = realMovies.slice(startIndex, startIndex + 10);
        pageMovies.forEach(movie => { listGrid.appendChild(createMovieCard((pageNumber === 1), movie)); });
        for (let i = pageMovies.length; i < 10; i++) { listGrid.appendChild(createMovieCard(false, dummyMovie)); }
        renderPagination();
        hideLoader();
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    }, 800);
}

function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); str = str.replace(/đ/g,"d"); return str.toLowerCase().trim();
}

document.getElementById('searchBtn').addEventListener('click', () => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        showModal('Yêu Cầu Đăng Nhập', 'Bạn cần đăng nhập để sử dụng tính năng tìm kiếm!');
        switchTab('account-tab');
        return;
    }
    const searchBar = document.getElementById('searchBar');
    searchBar.classList.toggle('active');
    if (searchBar.classList.contains('active')) document.getElementById('searchInput').focus();
});

document.getElementById('executeSearch').addEventListener('click', () => {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    if(query === '') { showModal('Lỗi', 'Vui lòng nhập tên truyện!'); return; }
    document.getElementById('searchBar').classList.remove('active');
    showLoader();
    setTimeout(() => {
        const normalizedQuery = removeVietnameseTones(query);
        const foundIndex = realMovies.findIndex(movie => removeVietnameseTones(movie.name).includes(normalizedQuery));
        if (foundIndex !== -1) {
            const foundMovie = realMovies[foundIndex];
            const targetPage = Math.floor(foundIndex / 10) + 1; 
            if (!document.getElementById('list-tab').classList.contains('active')) { switchTab('list-tab', targetPage); } 
            else { loadListPage(targetPage); }
            setTimeout(() => {
                hideLoader();
                const allCards = document.querySelectorAll('#list-tab .movie-card');
                let targetCard = null;
                for (let card of allCards) {
                    if (card.querySelector('.searchable-title').innerText === foundMovie.name) { targetCard = card; break; }
                }
                if (targetCard) {
                    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetCard.classList.add('highlight-card');
                    setTimeout(() => targetCard.classList.remove('highlight-card'), 3000); 
                    showModal('Tìm Thấy', `Đã tìm thấy: ${foundMovie.name}!`, true);
                    searchInput.value = '';
                }
            }, 800); 
        } else {
            hideLoader();
            showModal('Không Tìm Thấy', `Rất tiếc, không tìm thấy phim nào.`);
        }
    }, 800); 
});

const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');
function closeMenu() { sideMenu.classList.remove('active'); menuOverlay.classList.remove('active'); }
document.getElementById('menuBtn').addEventListener('click', () => { sideMenu.classList.add('active'); menuOverlay.classList.add('active'); });
document.getElementById('closeMenuBtn').addEventListener('click', closeMenu);
menuOverlay.addEventListener('click', closeMenu); 

function renderPagination() {
    const paginationContainer = document.getElementById('list-pagination');
    let html = '';
    const prevClass = currentListPage === 1 ? 'disabled' : '';
    html += `<button class="page-btn ${prevClass}" onclick="if(currentListPage > 1) loadListPage(currentListPage - 1)"><i class="fa-solid fa-angle-left"></i></button>`;
    html += `<button class="page-btn ${currentListPage === 1 ? 'active' : ''}" onclick="loadListPage(1)">1</button>`;
    if (currentListPage > 3 && totalPages > 1) html += `<span class="page-btn dots">...</span>`;
    
    let start = Math.max(2, currentListPage - 1);
    let end = Math.min(totalPages - 1, currentListPage + 1);
    if (currentListPage === 1) end = Math.min(4, totalPages - 1);
    if (currentListPage === totalPages && totalPages > 3) start = Math.max(2, totalPages - 3);
    
    for (let i = start; i <= end; i++) { html += `<button class="page-btn ${currentListPage === i ? 'active' : ''}" onclick="loadListPage(${i})">${i}</button>`; }
    
    if (currentListPage < totalPages - 2 && totalPages > 1) html += `<span class="page-btn dots">...</span>`;
    if (totalPages > 1) { html += `<button class="page-btn ${currentListPage === totalPages ? 'active' : ''}" onclick="loadListPage(${totalPages})">${totalPages}</button>`; }
    
    const nextClass = currentListPage === totalPages ? 'disabled' : '';
    html += `<button class="page-btn ${nextClass}" onclick="if(currentListPage < totalPages) loadListPage(currentListPage + 1)"><i class="fa-solid fa-angle-right"></i></button>`;
    paginationContainer.innerHTML = html;
}

const navLinks = document.querySelectorAll('.nav-link');
const tabContents = document.querySelectorAll('.tab-content');
function switchTab(targetId, targetPage = 1) {
    closeMenu(); showLoader(); 
    setTimeout(() => {
        tabContents.forEach(tab => tab.classList.remove('active'));
        navLinks.forEach(link => link.classList.remove('active-link'));
        document.getElementById(targetId).classList.add('active');
        const activeLink = document.querySelector(`.nav-link[data-target="${targetId}"]`);
        if(activeLink) activeLink.classList.add('active-link');
        
        if(targetId === 'list-tab') { loadListPage(targetPage); } 
        else if (targetId === 'account-tab') { loadUserProfile(); hideLoader(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else if (targetId === 'premium-tab') { renderPremiumStatus(); hideLoader(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else if (targetId === 'wallet-tab') { checkWalletAuth(); hideLoader(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else if (targetId === 'admin-tab') { loadAdminMovies(); hideLoader(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else if (targetId === 'superadmin-tab') { loadSuperAdminData(); hideLoader(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else { hideLoader(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    }, 600);
}

navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        if(!this.classList.contains('active-link')) switchTab(this.getAttribute('data-target'));
        else closeMenu(); 
    });
});

document.getElementById('logoBtn').addEventListener('click', () => {
    const homeLink = document.querySelector(`.nav-link[data-target="home-tab"]`);
    if(!homeLink.classList.contains('active-link')) switchTab('home-tab');
});

// ===================== LOGIC TÀI KHOẢN (AUTH & PROFILE) =====================

// Chuyển đổi giữa Đăng Nhập và Đăng Ký
function toggleAuthView(view) {
    document.getElementById('btnShowLogin').classList.remove('active');
    document.getElementById('btnShowRegister').classList.remove('active');
    
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('registerForm').classList.remove('active');
    document.getElementById('forgotEmailForm').classList.remove('active');
    document.getElementById('forgotOtpForm').classList.remove('active');
    document.getElementById('forgotResetForm').classList.remove('active');
    
    if(view === 'login') {
        document.getElementById('btnShowLogin').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else if (view === 'register') {
        document.getElementById('btnShowRegister').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    } else if (view === 'forgot') {
        document.getElementById('forgotEmailForm').classList.add('active');
    } else if (view === 'forgot-otp') {
        document.getElementById('forgotOtpForm').classList.add('active');
    } else if (view === 'forgot-reset') {
        document.getElementById('forgotResetForm').classList.add('active');
    }
}

// Logic Đăng Ký 2 Bước
function nextRegisterStep() {
    const phone = document.getElementById('regPhone').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPassword').value;
    const passConfirm = document.getElementById('regConfirmPassword').value;

    if(!phone || !email || !pass || !passConfirm) {
        return showModal('Thiếu thông tin', 'Vui lòng điền đầy đủ số điện thoại, email và mật khẩu.');
    }
    if(pass !== passConfirm) {
        return showModal('Lỗi Mật Khẩu', 'Mật khẩu xác nhận không khớp. Vui lòng thử lại.');
    }

    document.getElementById('regStep1').style.display = 'none';
    document.getElementById('regStep2').style.display = 'block';
}
function prevRegisterStep() {
    document.getElementById('regStep2').style.display = 'none';
    document.getElementById('regStep1').style.display = 'block';
}

// Xử lý Gửi Đăng Ký
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('regPhone').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const username = document.getElementById('regUsername').value.trim();
    if(!username) return showModal('Thiếu thông tin', 'Vui lòng đặt Tên tài khoản.');

    showLoader();
    try {
        const res = await fetch('https://caoconaudio.onrender.com/api/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, email, password, username })
        });
        const data = await res.json();
        hideLoader();
        if(res.ok) {
            // Lưu thông tin người dùng vào Local Storage để tự động đăng nhập
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            showModal('Thành Công', data.message, true);
            document.getElementById('registerForm').reset();
            prevRegisterStep();
            checkAuthAndRenderProfile(); // Chuyển thẳng vào Trung tâm tài khoản
        } else showModal('Lỗi Đăng Ký', data.message);
    } catch (err) { hideLoader(); showModal('Lỗi', 'Không thể kết nối đến máy chủ.'); }
});

// Xử lý Gửi Đăng Nhập
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginIdentifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;

    showLoader();
    try {
        const res = await fetch('https://caoconaudio.onrender.com/api/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginIdentifier, password })
        });
        const data = await res.json();
        hideLoader();
        if(res.ok) {
            // Lưu thông tin người dùng vào Local Storage của trình duyệt
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            document.getElementById('loginForm').reset();
            showModal('Thành Công', data.message, true);
            checkAuthAndRenderProfile(); // Hiển thị Profile
        } else showModal('Đăng Nhập Thất Bại', data.message);
    } catch (err) { hideLoader(); showModal('Lỗi', 'Không thể kết nối đến máy chủ.'); }
});

// Đăng xuất
function logoutUser() {
    localStorage.removeItem('currentUser');
    checkAuthAndRenderProfile();
    showModal('Đã đăng xuất', 'Hẹn gặp lại bạn!', true);
}

// ===================== QUẢN LÝ VÍ VÀ NẠP TIỀN =====================
let pollingInterval = null;
let currentTxId = null;
let currentDepositContent = "";
let currentDepositAmount = 0;

function setDepositAmount(amount) {
    document.getElementById('depositAmount').value = amount;
}

async function generateQR() {
    const amount = parseInt(document.getElementById('depositAmount').value);
    if(isNaN(amount) || amount < 10000) {
        return showModal('Lỗi Nạp Tiền', 'Số tiền nạp tối thiểu là 10.000đ');
    }
    
    const userStr = localStorage.getItem('currentUser');
    if(!userStr) return;
    const user = JSON.parse(userStr);
    
    showLoader();
    try {
        // Gọi API tạo đơn
        const res = await fetch('https://caoconaudio.onrender.com/api/deposit/init', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, amount })
        });
        const data = await res.json();
        hideLoader();
        
        if(res.ok) {
            currentTxId = data.txId;
            currentDepositContent = data.content;
            currentDepositAmount = amount;
            const qrUrl = `https://qr.sepay.vn/img?acc=96886693012894&bank=MSB&amount=${amount}&des=${data.content}`;
            
            document.getElementById('qrImage').src = qrUrl;
            document.getElementById('qrDescription').innerText = data.content;
            
            // Hiển thị Modal QR chuyên nghiệp
            document.getElementById('qrPaymentModal').classList.add('active');
            
            startDepositTracking(amount);
        } else { showModal('Lỗi', 'Không thể tạo đơn nạp tiền lúc này.'); }
    } catch (e) { hideLoader(); showModal('Lỗi', 'Mất kết nối máy chủ.'); }
}

function startDepositTracking(amount) {
    clearInterval(pollingInterval);
    
    // Kiểm tra trạng thái mỗi 3 giây
    pollingInterval = setInterval(async () => {
        try {
            const res = await fetch('https://caoconaudio.onrender.com/api/deposit/check', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ txId: currentTxId })
            });
            const data = await res.json();
            if(data.status === 'COMPLETED') {
                clearInterval(pollingInterval);
                document.getElementById('qrPaymentModal').classList.remove('active');
                
                // Hiển thị Màn hình chúc mừng
                document.getElementById('successAmountText').innerText = `+${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
                document.getElementById('depositSuccessModal').classList.add('active');
                
                loadUserProfile(); // Tải lại số dư ngay lập tức
            }
        } catch(e) {}
    }, 3000);
}

async function closeQR(status = 'CANCELLED') {
    clearInterval(pollingInterval);
    
    if(currentTxId) { fetch('https://caoconaudio.onrender.com/api/deposit/update-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txId: currentTxId, status }) }); }
    
    document.getElementById('qrPaymentModal').classList.remove('active');
    setTimeout(() => loadUserProfile(), 500); // Làm mới lịch sử
}

function closeSuccessModal() { document.getElementById('depositSuccessModal').classList.remove('active'); }

async function loadUserProfile() {
    const userStr = localStorage.getItem('currentUser');
    if(!userStr) return;
    const localUser = JSON.parse(userStr);
    
    try {
        const res = await fetch('https://caoconaudio.onrender.com/api/profile', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: localUser.id })
        });
        const data = await res.json();
        if(res.ok) {
            // Cập nhật lại bộ nhớ trình duyệt
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            // Render số dư
            document.getElementById('walletBalance').innerText = new Intl.NumberFormat('vi-VN').format(data.user.balance || 0) + ' đ';
            
            // Render lịch sử giao dịch
            const txList = document.getElementById('transactionList');
            txList.innerHTML = '';
            if(data.transactions && data.transactions.length > 0) {
                data.transactions.forEach(tx => {
                    const dateObj = new Date(tx.createdAt);
                    const dateStr = `${dateObj.getHours()}:${dateObj.getMinutes() < 10 ? '0':''}${dateObj.getMinutes()} - ${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()}`;
                    
                    let statusText = 'Thành công';
                    let statusClass = 'status-COMPLETED';
                    if(tx.status === 'FAILED') { statusText = 'Thất bại'; statusClass = 'status-FAILED'; }
                    if(tx.status === 'CANCELLED') { statusText = 'Đã hủy'; statusClass = 'status-CANCELLED'; }
                    if(tx.status === 'PENDING') { statusText = 'Đang chờ'; statusClass = 'status-PENDING'; }
                    
                    txList.innerHTML += `
                        <div class="tx-item">
                            <div class="tx-info">
                                <span class="tx-type"><i class="fa-solid fa-money-bill-transfer" style="color: var(--text-muted); margin-right: 5px;"></i> ${tx.type === 'DEPOSIT' ? 'Nạp tiền qua QR' : tx.type}</span>
                                <span class="tx-status ${statusClass}">${statusText}</span>
                                <span class="tx-date">${dateStr} | GD: #${tx.description || 'N/A'}</span>
                            </div>
                            <div class="tx-amount" style="color: ${tx.status === 'COMPLETED' ? '#34c759' : 'var(--text-muted)'};">${tx.status === 'COMPLETED' ? '+' : ''}${new Intl.NumberFormat('vi-VN').format(tx.amount)} đ</div>
                        </div>
                    `;
                });
            } else {
                txList.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:14px; padding: 20px; background: var(--bg-main); border-radius: 12px;">Bạn chưa có giao dịch nào.</div>';
            }
        }
    } catch (e) {
        console.error("Lỗi tải thông tin tài khoản", e);
    }
}

function checkWalletAuth() {
    const userStr = localStorage.getItem('currentUser');
    if(userStr) {
        document.getElementById('walletAuthWarning').style.display = 'none';
        document.getElementById('walletMainContent').style.display = 'block';
        loadUserProfile(); 
    } else {
        document.getElementById('walletAuthWarning').style.display = 'block';
        document.getElementById('walletMainContent').style.display = 'none';
    }
}

// Kiểm tra trạng thái đăng nhập để hiển thị Giao diện phù hợp
function checkAuthAndRenderProfile() {
    const userStr = localStorage.getItem('currentUser');
    const authSection = document.getElementById('authSection');
    const profileSection = document.getElementById('profileSection');
    
    if(userStr) {
        const user = JSON.parse(userStr);
        document.getElementById('profileUsername').innerText = user.username;
        document.getElementById('profilePhone').innerText = user.phone;
        document.getElementById('profileEmail').innerText = user.email;
        document.getElementById('profileLevel').innerText = "Cấp độ: " + user.level;
        authSection.style.display = 'none';
        profileSection.style.display = 'block';
        loadUserProfile(); // Gọi API lấy số dư và lịch sử giao dịch
        fetchNotifications(); // Lấy thông báo cá nhân
        
        // Hiển thị Tab Admin nếu là Quản Trị Viên (Tên tài khoản là "admin")
        const adminLink = document.getElementById('adminMenuLink');
        if(user.level === 'Admin' || user.username.toLowerCase() === 'admin') {
            adminLink.style.display = 'flex';
        } else {
            adminLink.style.display = 'none';
        }
        
        // Hiển thị Tab Quản Lý Cấp Cao nếu là chunhatpham_admin
        const superAdminLink = document.getElementById('superAdminMenuLink');
        if(user.level === 'SuperAdmin' && user.username === 'chunhatpham_admin') {
            superAdminLink.style.display = 'flex';
        } else {
            superAdminLink.style.display = 'none';
        }
        
        updateHeaderIcons();
    } else {
        authSection.style.display = 'block';
        profileSection.style.display = 'none';
        document.getElementById('notiBadge').style.display = 'none';
        toggleAuthView('login');
        updateHeaderIcons();
    }
}

// ===================== GÓI PREMIUM VÀ ĐẶC QUYỀN =====================
function renderPremiumStatus() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        document.getElementById('premAuthWarning').style.display = 'block';
        document.getElementById('premMainContent').style.display = 'none';
        return;
    }
    const user = JSON.parse(userStr);
    document.getElementById('premAuthWarning').style.display = 'none';
    document.getElementById('premMainContent').style.display = 'block';

    document.getElementById('premUserLevel').innerText = user.level || 'Đồng';
    
    const now = new Date();
    const premUntil = user.premiumUntil ? new Date(user.premiumUntil) : null;
    const noAdsUntil = user.noAdsUntil ? new Date(user.noAdsUntil) : null;

    if (user.level === 'Admin' || user.level === 'SuperAdmin') {
        document.getElementById('premExpire').innerText = 'Vĩnh viễn';
        document.getElementById('premNoAds').innerText = 'Vĩnh viễn';
    } else {
        if (premUntil && premUntil > now) document.getElementById('premExpire').innerText = premUntil.toLocaleDateString('vi-VN');
        else document.getElementById('premExpire').innerText = 'Chưa đăng ký';

        if (noAdsUntil && noAdsUntil > now) document.getElementById('premNoAds').innerText = noAdsUntil.toLocaleDateString('vi-VN');
        else document.getElementById('premNoAds').innerText = 'Chưa đăng ký';
    }
    updateHeaderIcons();
}

// Dữ liệu các gói để hiển thị trên UI xác nhận
const premiumPackagesData = {
    'REMOVE_ADS': { price: 20000, name: 'Tắt Quảng Cáo 1 Tháng', icon: 'fa-solid fa-volume-xmark', color: '#52525b' },
    '1_MONTH': { price: 70000, name: 'Premium 1 Tháng (Hạng Bạc)', icon: 'fa-solid fa-medal', color: '#94a3b8' },
    '3_MONTHS': { price: 180000, name: 'Premium 3 Tháng (Hạng Vàng)', icon: 'fa-solid fa-crown', color: '#fbbf24' },
    '6_MONTHS': { price: 320000, name: 'Premium 6 Tháng (Kim Cương)', icon: 'fa-regular fa-gem', color: '#3b82f6' },
    '12_MONTHS': { price: 550000, name: 'Premium 1 Năm (Rubi)', icon: 'fa-solid fa-gem', color: '#e11d48' }
};

let selectedPremPackage = null;

function buyPremiumPackage(type) {
    const userStr = localStorage.getItem('currentUser');
    if(!userStr) return switchTab('account-tab');
    const user = JSON.parse(userStr);
    
    const pkg = premiumPackagesData[type];
    if(!pkg) return;

    selectedPremPackage = type;

    // Cập nhật thông tin lên Modal Xác Nhận
    document.getElementById('confirmPremIcon').className = pkg.icon;
    document.getElementById('confirmPremIcon').style.color = pkg.color;
    document.getElementById('confirmPremName').innerText = pkg.name;
    document.getElementById('confirmPremPrice').innerText = new Intl.NumberFormat('vi-VN').format(pkg.price) + 'đ';
    document.getElementById('confirmPremBalance').innerText = new Intl.NumberFormat('vi-VN').format(user.balance || 0) + 'đ';

    // Kiểm tra số dư ngay trên Modal
    if ((user.balance || 0) < pkg.price) {
        document.getElementById('confirmPremBalance').style.color = '#ff3b30'; // Đỏ nếu thiếu tiền
        document.getElementById('btnExecutePrem').innerText = 'Nạp Thêm Tiền';
        document.getElementById('btnExecutePrem').onclick = () => { closePremiumConfirm(); switchTab('wallet-tab'); };
    } else {
        document.getElementById('confirmPremBalance').style.color = '#34c759'; // Xanh nếu đủ tiền
        document.getElementById('btnExecutePrem').innerText = 'Xác Nhận Mua';
        document.getElementById('btnExecutePrem').onclick = executePremiumPurchase;
    }

    document.getElementById('premiumConfirmModal').classList.add('active');
}

function closePremiumConfirm() {
    document.getElementById('premiumConfirmModal').classList.remove('active');
    selectedPremPackage = null;
}

async function executePremiumPurchase() {
    if(!selectedPremPackage) return;
    const type = selectedPremPackage;
    const userStr = localStorage.getItem('currentUser');
    if(!userStr) return;
    const user = JSON.parse(userStr);

    closePremiumConfirm();
    
    showLoader();
    try {
        const res = await fetch('https://caoconaudio.onrender.com/api/premium/buy', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, packageType: type })
        });
        const data = await res.json();
        hideLoader();
        if (res.ok) {
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            // Hiển thị Màn hình chúc mừng mua thành công
            document.getElementById('successPremText').innerText = premiumPackagesData[type].name;
            document.getElementById('premiumSuccessModal').classList.add('active');

            renderPremiumStatus();
            loadUserProfile(); // Cập nhật lại số dư ngầm
        } else {
            showModal('Thất Bại', data.message);
            if(data.message.includes('Số dư không đủ')) setTimeout(() => switchTab('wallet-tab'), 1500);
        }
    } catch(e) { hideLoader(); showModal('Lỗi', 'Lỗi kết nối máy chủ.'); }
}

function closePremiumSuccess() {
    document.getElementById('premiumSuccessModal').classList.remove('active');
}

// ===================== QUÊN MẬT KHẨU FLOW =====================
let resetTargetEmail = "";

// 1. Gửi Email lấy OTP
document.getElementById('forgotEmailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    resetTargetEmail = document.getElementById('forgotEmailInput').value.trim();
    
    showLoader();
    try {
        const res = await fetch('https://caoconaudio.onrender.com/api/forgot-password', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: resetTargetEmail })
        });
        const data = await res.json();
        hideLoader();
        if(res.ok) {
            document.getElementById('displayForgotEmail').innerText = resetTargetEmail;
            toggleAuthView('forgot-otp');
            showModal('Thành Công', data.message, true);
        } else showModal('Lỗi', data.message);
    } catch (err) { hideLoader(); showModal('Lỗi', 'Không thể kết nối đến máy chủ.'); }
});

// 2. Chuyển form nhập Pass mới (Khi bấm Tiếp tục ở form OTP)
document.getElementById('forgotOtpForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const otp = document.getElementById('forgotOtpInput').value.trim();
    if(otp.length < 6) return showModal('Lỗi', 'Mã OTP phải đủ 6 chữ số');
    toggleAuthView('forgot-reset');
});

// 3. Lưu mật khẩu mới với OTP
document.getElementById('forgotResetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = document.getElementById('forgotOtpInput').value.trim();
    const newPass = document.getElementById('forgotNewPass').value;
    const confirmPass = document.getElementById('forgotConfirmPass').value;

    if(newPass !== confirmPass) return showModal('Lỗi', 'Mật khẩu xác nhận không khớp!');

    showLoader();
    try {
        const res = await fetch('https://caoconaudio.onrender.com/api/reset-password', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: resetTargetEmail, otp, newPassword: newPass })
        });
        const data = await res.json();
        hideLoader();
        if(res.ok) {
            showModal('Thành Công', data.message, true);
            document.getElementById('forgotEmailForm').reset();
            document.getElementById('forgotOtpForm').reset();
            document.getElementById('forgotResetForm').reset();
            toggleAuthView('login');
        } else showModal('Lỗi', data.message);
    } catch (err) { hideLoader(); showModal('Lỗi', 'Không thể kết nối đến máy chủ.'); }
});

// ===================== ĐỔI MẬT KHẨU TẠI PROFILE =====================
function toggleChangePassView() {
    const form = document.getElementById('changePassForm');
    form.style.display = form.style.display === 'none' ? 'flex' : 'none';
}

document.getElementById('changePassForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPassword = document.getElementById('cpOldPass').value;
    const newPassword = document.getElementById('cpNewPass').value;
    const confirmPassword = document.getElementById('cpConfirmPass').value;

    if (newPassword !== confirmPassword) return showModal('Lỗi', 'Mật khẩu xác nhận không khớp!');
    const user = JSON.parse(localStorage.getItem('currentUser'));

    showLoader();
    try {
        const res = await fetch('https://caoconaudio.onrender.com/api/change-password', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, oldPassword, newPassword })
        });
        const data = await res.json();
        hideLoader();
        if(res.ok) { showModal('Thành Công', data.message, true); document.getElementById('changePassForm').reset(); toggleChangePassView(); } 
        else showModal('Lỗi', data.message);
    } catch (err) { hideLoader(); showModal('Lỗi', 'Lỗi kết nối máy chủ.'); }
});

// ===================== QUẢN TRỊ VIÊN (ADMIN) =====================
document.getElementById('addMovieForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editMovieId').value;
    const name = document.getElementById('movieTitle').value.trim();
    const image = document.getElementById('movieImage').value.trim();
    const ss1 = document.getElementById('movieSS1').value.trim();
    const ss2 = document.getElementById('movieSS2').value.trim();
    const ss3 = document.getElementById('movieSS3').value.trim();
    const ss4 = document.getElementById('movieSS4').value.trim();
    const ss5 = document.getElementById('movieSS5').value.trim();
    
    showLoader();
    try {
        let url = 'https://caoconaudio.onrender.com/api/movies';
        let method = 'POST';
        if (id) { url = `https://caoconaudio.onrender.com/api/movies/${id}`; method = 'PUT'; }
        
        const res = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, image, ss1, ss2, ss3, ss4, ss5 })
        });
        
        hideLoader();
        if(res.ok) {
            showModal('Thành Công', id ? 'Đã cập nhật thông tin phim!' : 'Đã đăng phim mới!', true);
            cancelEditMovie();
            fetchMovies(); // Load lại list phim ở trang chủ
        } else showModal('Lỗi', 'Không thể lưu phim.');
    } catch(err) { hideLoader(); showModal('Lỗi', 'Lỗi kết nối máy chủ.'); }
});

function loadAdminMovies() {
    const list = document.getElementById('adminMovieList');
    list.innerHTML = '';
    if(realMovies.length === 0) { list.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Chưa có phim nào.</p>'; return; }
    
    realMovies.forEach(movie => {
        const safeName = movie.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        list.innerHTML += `
            <div class="admin-movie-item">
                <img src="${movie.image}" class="admin-movie-thumb">
                <div class="admin-movie-info">
                    <span class="admin-movie-title">${movie.name}</span>
                    <span class="admin-movie-date">Cập nhật: ${new Date(movie.updatedAt || movie.createdAt || Date.now()).toLocaleString('vi-VN')}</span>
                </div>
                <div class="admin-movie-actions">
                    <button class="admin-action-btn admin-btn-edit" onclick="editMovie('${movie._id}', '${safeName}', '${movie.image}', '${movie.ss1 || '#'}', '${movie.ss2 || '#'}', '${movie.ss3 || '#'}', '${movie.ss4 || '#'}', '${movie.ss5 || '#'}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                    <button class="admin-action-btn admin-btn-delete" onclick="deleteMovie('${movie._id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });
}

function editMovie(id, name, image, ss1, ss2, ss3, ss4, ss5) {
    document.getElementById('editMovieId').value = id;
    document.getElementById('movieTitle').value = name;
    document.getElementById('movieImage').value = image;
    document.getElementById('movieSS1').value = ss1;
    document.getElementById('movieSS2').value = ss2;
    document.getElementById('movieSS3').value = ss3;
    document.getElementById('movieSS4').value = ss4;
    document.getElementById('movieSS5').value = ss5;
    document.getElementById('saveMovieBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu Thay Đổi';
    document.getElementById('cancelEditBtn').style.display = 'block';
    document.getElementById('addMovieForm').scrollIntoView({behavior: 'smooth', block: 'center'});
}

function cancelEditMovie() {
    document.getElementById('editMovieId').value = '';
    document.getElementById('addMovieForm').reset();
    document.getElementById('saveMovieBtn').innerHTML = '<i class="fa-solid fa-plus"></i> Thêm Phim Mới';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

async function deleteMovie(id) {
    if(!confirm('Bạn có chắc chắn muốn xóa phim này vĩnh viễn không?')) return;
    showLoader();
    try {
        const res = await fetch(`https://caoconaudio.onrender.com/api/movies/${id}`, { method: 'DELETE' });
        hideLoader();
        if(res.ok) {
            showModal('Thành Công', 'Đã xóa phim', true);
            fetchMovies(); // Reload lại web
        } else showModal('Lỗi', 'Không thể xóa phim.');
    } catch(err) { hideLoader(); showModal('Lỗi', 'Lỗi kết nối máy chủ.'); }
}

// ===================== QUẢN LÝ CẤP CAO (SUPER ADMIN) =====================
function handleSaTimeFilterChange() {
    const filterValue = document.getElementById('saTimeFilter').value;
    const customRangeBox = document.getElementById('saCustomDateRange');
    if (filterValue === 'custom') {
        customRangeBox.style.display = 'flex';
    } else {
        customRangeBox.style.display = 'none';
        loadSuperAdminData(); // Tự động load dữ liệu ngay khi chọn
    }
}

let superAdminUsersList = [];
let superAdminTxList = [];
let superAdminSupportList = [];

async function loadSuperAdminData() {
    const userStr = localStorage.getItem('currentUser');
    if(!userStr) return switchTab('home-tab');
    const user = JSON.parse(userStr);

    // Tính toán mốc thời gian lọc
    const filterType = document.getElementById('saTimeFilter') ? document.getElementById('saTimeFilter').value : 'all';
    let startDate = null, endDate = null;
    
    if (filterType !== 'all') {
        const now = new Date();
        let start = new Date();
        let end = new Date();
        end.setHours(23, 59, 59, 999); // Lấy đến hết ngày
        
        if (filterType === 'today') { start.setHours(0,0,0,0); }
        else if (filterType === 'yesterday') { start.setDate(now.getDate()-1); start.setHours(0,0,0,0); end = new Date(start); end.setHours(23,59,59,999); }
        else if (filterType === '7days') { start.setDate(now.getDate()-7); start.setHours(0,0,0,0); }
        else if (filterType === '30days') { start.setDate(now.getDate()-30); start.setHours(0,0,0,0); }
        else if (filterType === '60days') { start.setDate(now.getDate()-60); start.setHours(0,0,0,0); }
        else if (filterType === '1year') { start.setFullYear(now.getFullYear()-1); start.setHours(0,0,0,0); }
        else if (filterType === 'custom') {
            const sVal = document.getElementById('saStartDate').value;
            const eVal = document.getElementById('saEndDate').value;
            if(sVal) start = new Date(sVal + 'T00:00:00');
            if(eVal) end = new Date(eVal + 'T23:59:59');
        }
        startDate = start.toISOString();
        endDate = end.toISOString();
    }

    showLoader();
    try {
        const res = await fetch('https://caoconaudio.onrender.com/api/superadmin/users', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId: user.id, startDate, endDate })
        });
        const data = await res.json();
        hideLoader();
        
        if(res.ok) {
            document.getElementById('saTotalUsers').innerText = data.users.length;
            document.getElementById('saTotalBalance').innerText = new Intl.NumberFormat('vi-VN').format(data.totalBalance) + ' đ';
            document.getElementById('saPendingSupport').innerText = data.pendingSupport || 0;
            document.getElementById('saSupportCountBadge').innerText = data.pendingSupport || 0;
            
            superAdminUsersList = data.users;
            superAdminTxList = data.transactions || [];
            superAdminSupportList = data.supportTickets || [];
            
            filterSuperAdminUsers();
            renderSaBankHistory();
            renderSaSupportInbox();
            renderSaGrantAccount();
            renderSaTopDeposits();
        } else {
            showModal('Cảnh Báo An Ninh', data.message);
            switchTab('home-tab'); // Đẩy ra trang chủ nếu cố tình truy cập trái phép
        }
    } catch(err) { hideLoader(); showModal('Lỗi', 'Mất kết nối với máy chủ bảo mật.'); }
}

function filterSuperAdminUsers() {
    const query = document.getElementById('saUserSearch').value.toLowerCase().trim();
    const levelFilter = document.getElementById('saUserLevelFilter').value;

    let filtered = superAdminUsersList;

    if (query) {
        filtered = filtered.filter(u => u.username.toLowerCase().includes(query) || u.phone.includes(query) || u.email.toLowerCase().includes(query));
    }

    if (levelFilter === 'NORMAL') {
        filtered = filtered.filter(u => u.level === 'Đồng');
    } else if (levelFilter === 'VIP') {
        filtered = filtered.filter(u => u.level !== 'Đồng' && u.level !== 'Admin' && u.level !== 'SuperAdmin');
    }

    const tbody = document.getElementById('superAdminUserList');
    tbody.innerHTML = '';
    filtered.forEach(u => {
        const dateObj = new Date(u.createdAt);
        const dateStr = `${dateObj.getHours()}:${dateObj.getMinutes() < 10 ? '0':''}${dateObj.getMinutes()} - ${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()}`;
        const balance = new Intl.NumberFormat('vi-VN').format(u.balance || 0) + ' đ';
        
        const safeName = u.username.replace(/'/g, "\\'").replace(/"/g, '&quot;'); const safePhone = (u.phone || '').replace(/'/g, "\\'"); const safeEmail = (u.email || '').replace(/'/g, "\\'"); const safeLevel = (u.level || '').replace(/'/g, "\\'");

        tbody.innerHTML += `
            <tr>
                <td style="color:var(--text-muted); font-size: 13px;">${dateStr}</td>
                <td><div style="font-weight: 800; color: var(--accent-color);">${u.username}</div></td>
                <td><div style="font-size:12px;color:var(--text-muted);">${u.email}</div><div>${u.phone}</div></td>
                <td><span class="sa-badge" style="background: ${u.level === 'Đồng' ? '#94a3b8' : 'var(--accent-gradient)'}">${u.level}</span></td>
                <td style="color: #34c759; font-weight: 800;">${balance}</td>
                <td>
                    <div class="sa-action-group">
                        <button class="sa-btn sa-btn-add" onclick="openSaBalanceModal('${u._id}', '${safeName}', 'ADD')" title="Cộng tiền"><i class="fa-solid fa-plus"></i></button>
                        <button class="sa-btn sa-btn-deduct" onclick="openSaBalanceModal('${u._id}', '${safeName}', 'DEDUCT')" title="Trừ tiền"><i class="fa-solid fa-minus"></i></button>
                        <button class="sa-btn sa-btn-edit" onclick="openSaEditModal('${u._id}', '${safeName}', '${safePhone}', '${safeEmail}', '${safeLevel}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                        ${u.level !== 'SuperAdmin' ? `<button class="sa-btn sa-btn-delete" onclick="saDeleteUser('${u._id}', '${safeName}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
}

// Các hàm Thao tác
function openSaBalanceModal(id, username, action) {
    document.getElementById('saBalanceUserId').value = id;
    document.getElementById('saBalanceAction').value = action;
    document.getElementById('saBalanceAmount').value = '';
    const reasonInput = document.getElementById('saBalanceReason');
    if (action === 'ADD') {
        document.getElementById('saBalanceTitle').innerText = 'Cộng Tiền Tài Khoản';
        document.getElementById('saBalanceDesc').innerHTML = `Nhập số tiền muốn <strong style="color:#34c759;">CỘNG</strong> cho tài khoản <strong>${username}</strong>`;
        document.getElementById('saBalanceSubmitBtn').style.background = '#34c759';
        reasonInput.style.display = 'none'; reasonInput.value = '';
    } else {
        document.getElementById('saBalanceTitle').innerText = 'Trừ Tiền Tài Khoản';
        document.getElementById('saBalanceDesc').innerHTML = `Nhập số tiền muốn <strong style="color:#ff9500;">TRỪ</strong> của tài khoản <strong>${username}</strong>`;
        document.getElementById('saBalanceSubmitBtn').style.background = '#ff9500';
        reasonInput.style.display = 'block'; reasonInput.value = '';
    }
    document.getElementById('saBalanceModal').classList.add('active');
}

async function submitSaBalance() {
    const admin = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const id = document.getElementById('saBalanceUserId').value;
    const action = document.getElementById('saBalanceAction').value;
    const amount = document.getElementById('saBalanceAmount').value;
    const reason = document.getElementById('saBalanceReason').value.trim();
    if(!amount || amount <= 0) return showModal('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
    
    showLoader();
    try {
        const res = await fetch(`https://caoconaudio.onrender.com/api/superadmin/users/${id}/balance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminId: admin.id, action, amount, reason }) });
        const data = await res.json(); hideLoader();
        if(res.ok) { document.getElementById('saBalanceModal').classList.remove('active'); showModal('Thành công', data.message, true); loadSuperAdminData(); } 
        else showModal('Lỗi', data.message);
    } catch(e) { hideLoader(); showModal('Lỗi', 'Mất kết nối máy chủ'); }
}

function openSaEditModal(id, username, phone, email, level) {
    document.getElementById('saEditUserId').value = id; document.getElementById('saEditUsername').value = username;
    document.getElementById('saEditPhone').value = phone; document.getElementById('saEditEmail').value = email; document.getElementById('saEditLevel').value = level;
    document.getElementById('saEditNewPassword').value = ''; document.getElementById('saEditPremiumDays').value = '';
    document.getElementById('saEditUserModal').classList.add('active');
}

async function submitSaEditUser() {
    const admin = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const id = document.getElementById('saEditUserId').value; const username = document.getElementById('saEditUsername').value.trim();
    const phone = document.getElementById('saEditPhone').value.trim(); const email = document.getElementById('saEditEmail').value.trim(); const level = document.getElementById('saEditLevel').value;
    const newPassword = document.getElementById('saEditNewPassword').value;
    const premiumDays = document.getElementById('saEditPremiumDays').value;
    
    showLoader();
    try {
        const res = await fetch(`https://caoconaudio.onrender.com/api/superadmin/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminId: admin.id, username, phone, email, level, newPassword, premiumDays }) });
        const data = await res.json(); hideLoader();
        if(res.ok) { document.getElementById('saEditUserModal').classList.remove('active'); showModal('Thành công', data.message, true); loadSuperAdminData(); } 
        else showModal('Lỗi', data.message);
    } catch(e) { hideLoader(); showModal('Lỗi', 'Mất kết nối máy chủ'); }
}

async function saDeleteUser(id, username) {
    if(!confirm(`Xác nhận XÓA VĨNH VIỄN tài khoản ${username}?\nHành động này không thể hoàn tác!`)) return;
    const admin = JSON.parse(localStorage.getItem('currentUser') || '{}');
    showLoader();
    try {
        const res = await fetch(`https://caoconaudio.onrender.com/api/superadmin/users/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminId: admin.id }) });
        const data = await res.json(); hideLoader();
        if(res.ok) { showModal('Thành công', data.message, true); loadSuperAdminData(); } else showModal('Lỗi', data.message);
    } catch(e) { hideLoader(); showModal('Lỗi', 'Mất kết nối máy chủ'); }
}

// ===================== RENDER CÁC TAB SUPER ADMIN MỚI =====================
function renderSaBankHistory() {
    const depositList = document.getElementById('saDepositList');
    const vipList = document.getElementById('saVipList');
    depositList.innerHTML = ''; vipList.innerHTML = '';

    superAdminTxList.forEach(tx => {
        const dateObj = new Date(tx.createdAt);
        const dateStr = `${dateObj.getHours()}:${dateObj.getMinutes() < 10 ? '0':''}${dateObj.getMinutes()} - ${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()}`;
        const amount = new Intl.NumberFormat('vi-VN').format(tx.amount) + ' đ';
        const userDisplay = tx.userId ? `${tx.userId.username} <br><span style="font-size:11px;color:var(--text-muted);">${tx.userId.phone || ''}</span>` : 'Khách Ẩn Danh';

        if (tx.type === 'DEPOSIT') {
            depositList.innerHTML += `<tr><td style="color:var(--text-muted);font-size:12px;">${dateStr}</td><td>${tx._id.substring(18).toUpperCase()}</td><td style="color:#34c759;font-weight:bold;">+${amount}</td><td>${tx.description || 'Nạp qua QR'}</td><td>${userDisplay}</td></tr>`;
        } else if (tx.type === 'PAYMENT') {
            vipList.innerHTML += `<tr><td style="color:var(--text-muted);font-size:12px;">${dateStr}</td><td>${tx._id.substring(18).toUpperCase()}</td><td style="color:#ff3b30;font-weight:bold;">-${amount}</td><td>${tx.description}</td><td>${userDisplay}</td></tr>`;
        }
    });
}

function renderSaSupportInbox() {
    const pendingList = document.getElementById('saSupportPendingList');
    const resolvedList = document.getElementById('saSupportResolvedList');
    pendingList.innerHTML = ''; resolvedList.innerHTML = '';

    superAdminSupportList.forEach(ticket => {
        const safeName = ticket.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeContact = ticket.contact.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeDesc = ticket.description.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '<br>');
        const safeReply = (ticket.adminReply || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '<br>');

        const dateObj = new Date(ticket.createdAt);
        const dateStr = `${dateObj.getHours()}:${dateObj.getMinutes() < 10 ? '0':''}${dateObj.getMinutes()} <br> ${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()}`;
        const userDisplay = ticket.userId ? `<strong style="color:var(--accent-color);">${ticket.userId.username}</strong><br>${ticket.name}` : ticket.name;

        if (ticket.status === 'PENDING') {
            pendingList.innerHTML += `<tr><td>${userDisplay}</td><td style="font-size:12px;">${ticket.contact}</td><td style="font-size:12px;color:var(--text-muted);">${dateStr}</td><td><span class="sa-badge" style="background:#ff9500;">Chờ xử lý</span></td><td><button class="sa-btn sa-btn-edit" onclick="openSaSupportModal('${ticket._id}', '${safeName}', '${safeContact}', '${safeDesc}', false, '')"><i class="fa-solid fa-reply"></i> Phản hồi</button></td></tr>`;
        } else {
            const replyDate = new Date(ticket.repliedAt || ticket.createdAt);
            const replyStr = `${replyDate.getHours()}:${replyDate.getMinutes() < 10 ? '0':''}${replyDate.getMinutes()} <br> ${replyDate.getDate()}/${replyDate.getMonth()+1}/${replyDate.getFullYear()}`;
            resolvedList.innerHTML += `<tr><td>${userDisplay}</td><td style="font-size:12px;color:var(--text-muted);">${dateStr}</td><td style="font-size:12px;color:var(--text-muted);">${replyStr}</td><td><span class="sa-badge" style="background:#34c759;">Đã xử lý</span></td><td><button class="sa-btn" style="background:#8e8e93;" onclick="openSaSupportModal('${ticket._id}', '${safeName}', '${safeContact}', '${safeDesc}', true, '${safeReply}')"><i class="fa-solid fa-eye"></i> Xem lại</button></td></tr>`;
        }
    });
}

function renderSaGrantAccount() {
    const list = document.getElementById('saGrantAccountList');
    list.innerHTML = '';
    const now = new Date();
    superAdminUsersList.forEach(u => {
        let remaining = 'Hết hạn';
        let expireDate = 'N/A';
        let isPrem = false;

        if (u.level === 'Admin' || u.level === 'SuperAdmin') {
            remaining = 'Vĩnh viễn'; expireDate = 'Vĩnh viễn';
        } else if (u.premiumUntil && new Date(u.premiumUntil) > now) {
            isPrem = true;
            const diffTime = Math.abs(new Date(u.premiumUntil) - now);
            remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + ' ngày';
            expireDate = new Date(u.premiumUntil).toLocaleDateString('vi-VN');
        } else if (u.noAdsUntil && new Date(u.noAdsUntil) > now) {
            const diffTime = Math.abs(new Date(u.noAdsUntil) - now);
            remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + ' ngày (Chỉ Tắt QC)';
            expireDate = new Date(u.noAdsUntil).toLocaleDateString('vi-VN');
        }
        
        const safeName = u.username.replace(/'/g, "\\'"); const safePhone = (u.phone || '').replace(/'/g, "\\'"); const safeEmail = (u.email || '').replace(/'/g, "\\'"); const safeLevel = (u.level || '').replace(/'/g, "\\'");
        
        list.innerHTML += `<tr><td><strong>${u.username}</strong></td><td><span class="sa-badge" style="background: ${u.level === 'Đồng' ? '#94a3b8' : 'var(--accent-gradient)'}">${u.level}</span></td><td style="color:${isPrem ? '#007aff' : 'var(--text-muted)'};font-weight:bold;">${remaining}</td><td style="font-size:12px;">${expireDate}</td><td><button class="sa-btn sa-btn-add" onclick="openSaEditModal('${u._id}', '${safeName}', '${safePhone}', '${safeEmail}', '${safeLevel}')"><i class="fa-solid fa-gift"></i> Tặng Gói</button></td></tr>`;
    });
}

function renderSaTopDeposits() {
    const list = document.getElementById('saTopDepositList');
    list.innerHTML = '';
    
    // Gom nhóm và tính tổng nạp theo user
    const userTotals = {};
    superAdminTxList.forEach(tx => {
        if (tx.type === 'DEPOSIT' && tx.userId) {
            if (!userTotals[tx.userId._id]) userTotals[tx.userId._id] = { user: tx.userId, total: 0 };
            userTotals[tx.userId._id].total += tx.amount;
        }
    });
    
    // Chuyển object thành mảng và sắp xếp giảm dần
    const topUsers = Object.values(userTotals).sort((a, b) => b.total - a.total).slice(0, 50); // Lấy Top 50
    
    topUsers.forEach((item, index) => {
        // Tìm balance hiện tại trong danh sách User
        const fullUser = superAdminUsersList.find(u => u._id === item.user._id);
        const currentBalance = fullUser ? fullUser.balance : 0;
        
        let topMedal = `#${index + 1}`;
        if (index === 0) topMedal = '<i class="fa-solid fa-medal" style="color: #ffd700; font-size:20px;"></i>';
        else if (index === 1) topMedal = '<i class="fa-solid fa-medal" style="color: #c0c0c0; font-size:18px;"></i>';
        else if (index === 2) topMedal = '<i class="fa-solid fa-medal" style="color: #cd7f32; font-size:16px;"></i>';
        
        list.innerHTML += `<tr><td style="font-weight:bold; font-size: 16px;">${topMedal}</td><td><strong>${item.user.username}</strong></td><td style="font-size:12px;color:var(--text-muted);">${item.user.phone || ''}<br>${item.user.email || ''}</td><td style="color:#ff3b30;font-weight:bold;">${new Intl.NumberFormat('vi-VN').format(item.total)} đ</td><td style="color:#34c759;font-weight:bold;">${new Intl.NumberFormat('vi-VN').format(currentBalance)} đ</td></tr>`;
    });
}

// ===================== XỬ LÝ HỖ TRỢ (SUPPORT) =====================
function openSaSupportModal(id, name, contact, desc, isResolved, replyMsg) {
    document.getElementById('saSupportId').value = id;
    document.getElementById('saSupportName').innerText = name;
    document.getElementById('saSupportContact').innerText = contact;
    document.getElementById('saSupportDesc').innerHTML = desc;
    
    if (isResolved) {
        document.getElementById('saSupportModalTitle').innerText = 'Chi Tiết Hỗ Trợ';
        document.getElementById('saSupportReplySection').style.display = 'none';
        document.getElementById('saSupportResolvedSection').style.display = 'block';
        document.getElementById('saSupportResolvedMsg').innerHTML = replyMsg;
        document.getElementById('saSupportSubmitBtn').style.display = 'none';
    } else {
        document.getElementById('saSupportModalTitle').innerText = 'Xử Lý Yêu Cầu Hỗ Trợ';
        document.getElementById('saSupportReplySection').style.display = 'block';
        document.getElementById('saSupportResolvedSection').style.display = 'none';
        document.getElementById('saSupportReplyMsg').value = '';
        document.getElementById('saSupportSubmitBtn').style.display = 'block';
    }
    document.getElementById('saSupportModal').classList.add('active');
}

async function submitSaSupportReply() {
    const admin = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const id = document.getElementById('saSupportId').value;
    const replyMessage = document.getElementById('saSupportReplyMsg').value.trim();
    if (!replyMessage) return showModal('Lỗi', 'Vui lòng nhập nội dung trả lời!');
    
    showLoader();
    try {
        const res = await fetch(`https://caoconaudio.onrender.com/api/superadmin/support/${id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminId: admin.id, replyMessage }) });
        const data = await res.json(); hideLoader();
        if(res.ok) { document.getElementById('saSupportModal').classList.remove('active'); showModal('Thành công', data.message, true); loadSuperAdminData(); } 
        else showModal('Lỗi', data.message);
    } catch(e) { hideLoader(); showModal('Lỗi', 'Mất kết nối máy chủ'); }
}

// ===================== SUPER ADMIN TABS =====================
function setupSuperAdminTabs() {
    const tabButtons = document.querySelectorAll('.sa-tab-btn');
    const tabContents = document.querySelectorAll('.sa-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => {
                if (content.id === targetId) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
    
    // Cài đặt Sub-tabs
    const subTabButtons = document.querySelectorAll('.sa-sub-tab-btn');
    const subTabContents = document.querySelectorAll('.sa-sub-tab-content');
    subTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-sub');
            const parentBox = button.closest('.sa-list-box'); // Chỉ đổi tab trong cùng khu vực
            
            parentBox.querySelectorAll('.sa-sub-tab-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            parentBox.querySelectorAll('.sa-sub-tab-content').forEach(content => {
                if (content.id === targetId) content.classList.add('active');
                else content.classList.remove('active');
            });
        });
    });
}

// ===================== THÔNG BÁO (NOTIFICATION) =====================
const notificationBtn = document.getElementById('notificationBtn');
const notificationDropdown = document.getElementById('notificationDropdown');
const notiBadge = document.getElementById('notiBadge');
const notiList = document.getElementById('notiList');
const markAllReadBtn = document.getElementById('markAllReadBtn');

notificationBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        showModal('Yêu Cầu Đăng Nhập', 'Vui lòng đăng nhập để xem thông báo cá nhân!');
        switchTab('account-tab');
        return;
    }
    notificationDropdown.classList.toggle('active');
    if (notificationDropdown.classList.contains('active')) fetchNotifications();
});

document.addEventListener('click', (e) => {
    if (!notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
        notificationDropdown.classList.remove('active');
    }
});

async function fetchNotifications() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    
    try {
        const res = await fetch(`https://caoconaudio.onrender.com/api/notifications/${user.id}`);
        const notis = await res.json();
        notiList.innerHTML = '';
        let unreadCount = 0;
        
        if (notis.length === 0) {
            notiList.innerHTML = '<div class="noti-empty">Bạn chưa có thông báo nào</div>';
        } else {
            notis.forEach(n => {
                if (!n.isRead) unreadCount++;
                const date = new Date(n.createdAt);
                const timeStr = `${date.getHours()}:${date.getMinutes() < 10 ? '0':''}${date.getMinutes()} - ${date.getDate()}/${date.getMonth()+1}`;
                
                notiList.innerHTML += `
                    <div class="noti-item ${n.isRead ? '' : 'unread'}" onclick="showModal('${n.title.replace(/'/g, "\\'")}', '${n.message.replace(/'/g, "\\'")}')">
                        <div class="noti-title">${n.title}</div>
                        <div class="noti-desc">${n.message}</div>
                        <div class="noti-time">${timeStr}</div>
                    </div>
                `;
            });
        }
        if (unreadCount > 0) {
            notiBadge.style.display = 'block';
            notiBadge.innerText = unreadCount > 9 ? '9+' : unreadCount;
        } else { notiBadge.style.display = 'none'; }
    } catch (e) {}
}

markAllReadBtn.addEventListener('click', async () => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    try {
        await fetch(`https://caoconaudio.onrender.com/api/notifications/${user.id}/read-all`, { method: 'POST' });
        fetchNotifications(); 
    } catch (e) {}
});

document.getElementById('sendNotiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const targetUsername = document.getElementById('notiTarget').value.trim();
    const title = document.getElementById('notiTitle').value.trim();
    const message = document.getElementById('notiMessage').value.trim();
    showLoader();
    try {
        const res = await fetch('https://caoconaudio.onrender.com/api/admin/send-notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminId: user.id, targetUsername, title, message }) });
        const data = await res.json();
        hideLoader();
        if (res.ok) { showModal('Thành Công', data.message, true); document.getElementById('sendNotiForm').reset(); } else { showModal('Lỗi', data.message); }
    } catch (e) { hideLoader(); showModal('Lỗi', 'Không thể kết nối máy chủ'); }
});

// Chạy kiểm tra auth khi web vừa load lên
checkAuthAndRenderProfile();
setupSuperAdminTabs();

// ===================== FETCH MOVIES =====================
async function fetchMovies() {
    try {
        // Đặt link tuyệt đối để chống lỗi khi mở bằng file tĩnh
        const response = await fetch('https://caoconaudio.onrender.com/api/movies');
        realMovies = await response.json();
        
        totalPages = Math.ceil(realMovies.length / 10) || 1;
        
        const homeMovies = realMovies.slice(0, 10); 
        homeGrid.innerHTML = '';
        homeMovies.forEach(movie => { homeGrid.appendChild(createMovieCard(true, movie)); });
        for (let i = homeMovies.length; i < 10; i++) { homeGrid.appendChild(createMovieCard(true, dummyMovie)); }
        
        renderPagination();
        if(document.getElementById('admin-tab').classList.contains('active')) loadAdminMovies();
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu từ server:', error);
        renderPagination(); // Đảm bảo dù lỗi cũng vẫn hiển thị thanh phân trang mặc định
    }
}

fetchMovies();