# mail_sorter.py
def sort_emails(emails):
    """
    Emails are sorted based on predefined rules.
    This is a basic implementation.
    """
    sorted_dict = {
        'important': [],
        'unnecessary': [],
        'inbox': []
    }

    important_rules = ["請求", "重要", "確認"]
    unnecessary_rules = ["広告", "キャンペーン", "メルマガ", "SNS"]

    for email in emails:
        subject = email.get('subject', '').lower()
        sender = email.get('from', '').lower()

        # Check for important rules
        is_important = any(rule in subject for rule in important_rules) or "noreply" not in sender and "facebook" not in sender and "twitter" not in sender

        # Check for unnecessary rules
        is_unnecessary = any(rule in subject for rule in unnecessary_rules) or "amazon" in sender or "news" in sender

        if is_important:
            sorted_dict['important'].append(email)
        elif is_unnecessary:
            sorted_dict['unnecessary'].append(email)
        else:
            sorted_dict['inbox'].append(email)
            
    return sorted_dict