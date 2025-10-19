    ) {
        showNotification(message, 'error');
    }

    function getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-triangle';
            case 'warning': return 'exclamation-triangle';
            case 'info': 
            default: return 'info-circle';
        }
    }
    </script>
</body>
</html>