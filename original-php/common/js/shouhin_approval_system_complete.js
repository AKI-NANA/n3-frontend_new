),
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '1000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        minWidth: '300px',
        maxWidth: '500px',
        fontSize: '0.875rem',
        fontWeight: '500',
        animation: 'slideInRight 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
    const colors = {
        'success': '#10b981',
        'danger': '#ef4444',
        'warning': '#f59e0b',
        'info': '#06b6d4'
    };
    return colors[type] || '#06b6d4';
}

// ===== CSS アニメーション追加 =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ===== グローバル関数として公開 =====
window.selectAllVisible = selectAllVisible;
window.deselectAll = deselectAll;
window.bulkApprove = bulkApprove;
window.bulkReject = bulkReject;
window.bulkHold = bulkHold;
window.clearSelection = clearSelection;
window.toggleSelection = toggleSelection;

console.log('📦 商品承認システム JavaScript ロード完了');