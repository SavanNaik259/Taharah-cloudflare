
// Admin Authentication Utility
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'password123' // In a real app, this should be handled via a secure backend
};

const AdminAuth = {
    isAuthenticated() {
        const authData = localStorage.getItem('admin_auth');
        if (!authData) return false;
        
        try {
            const parsed = JSON.parse(authData);
            // Session expires after 24 hours
            const now = new Date().getTime();
            if (now - parsed.timestamp > 24 * 60 * 60 * 1000) {
                this.logout();
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    },

    login(username, password) {
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            const authData = {
                authenticated: true,
                timestamp: new Date().getTime()
            };
            localStorage.setItem('admin_auth', JSON.stringify(authData));
            return true;
        }
        return false;
    },

    logout() {
        localStorage.removeItem('admin_auth');
        window.location.reload();
    },

    checkAccess() {
        if (!this.isAuthenticated()) {
            this.showLoginOverlay();
            return false;
        }
        return true;
    },

    showLoginOverlay() {
        // Remove existing overlay if any
        const existing = document.getElementById('admin-login-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'admin-login-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        overlay.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 12px; width: 100%; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="font-size: 24px; color: #1e293b; margin-bottom: 8px;">Admin Login</h2>
                    <p style="color: #64748b; font-size: 14px;">Please authenticate to continue</p>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #1e293b;">Username</label>
                    <input type="text" id="admin-user" style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; outline: none;">
                </div>
                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #1e293b;">Password</label>
                    <input type="password" id="admin-pass" style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; outline: none;">
                </div>
                <button id="admin-login-btn" style="width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;">
                    Login
                </button>
                <div id="admin-error" style="color: #dc2626; font-size: 14px; margin-top: 12px; text-align: center; display: none;">
                    Invalid username or password
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const loginBtn = document.getElementById('admin-login-btn');
        const userInp = document.getElementById('admin-user');
        const passInp = document.getElementById('admin-pass');
        const errorDiv = document.getElementById('admin-error');

        const handleLogin = () => {
            if (this.login(userInp.value, passInp.value)) {
                overlay.remove();
                window.location.reload();
            } else {
                errorDiv.style.display = 'block';
                passInp.value = '';
                passInp.focus();
            }
        };

        loginBtn.onclick = handleLogin;
        passInp.onkeypress = (e) => { if (e.key === 'Enter') handleLogin(); };
    }
};

// Initialize protection
document.addEventListener('DOMContentLoaded', () => {
    AdminAuth.checkAccess();
});
