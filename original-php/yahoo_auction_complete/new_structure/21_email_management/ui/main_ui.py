import sys
from PyQt5.QtWidgets import QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLabel, QLineEdit, QCheckBox, QListWidget, QListWidgetItem, QTabWidget
from PyQt5.QtCore import Qt
from logic import gmail_api
from logic import mail_sorter

class GmailCleanerUI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.gmail_service = gmail_api.get_gmail_service()
        self.initUI()
        self.load_emails('inbox')

    def initUI(self):
        self.setWindowTitle('Gmail Cleaner')
        self.setGeometry(100, 100, 800, 600)

        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        main_layout = QVBoxLayout()
        main_widget.setLayout(main_layout)

        # Search and Filter
        filter_layout = QHBoxLayout()
        self.search_bar = QLineEdit(self)
        self.search_bar.setPlaceholderText("検索キーワードやルールを入力...")
        self.search_button = QPushButton("検索", self)
        self.search_button.clicked.connect(self.search_emails)
        filter_layout.addWidget(self.search_bar)
        filter_layout.addWidget(self.search_button)
        main_layout.addLayout(filter_layout)

        # Tabs for sorting
        self.tabs = QTabWidget()
        self.tab_inbox = QWidget()
        self.tab_important = QWidget()
        self.tab_unnecessary = QWidget()
        self.tabs.addTab(self.tab_inbox, "未分類")
        self.tabs.addTab(self.tab_important, "重要")
        self.tabs.addTab(self.tab_unnecessary, "不要")

        self.inbox_list = QListWidget()
        self.important_list = QListWidget()
        self.unnecessary_list = QListWidget()
        
        inbox_layout = QVBoxLayout(self.tab_inbox)
        inbox_layout.addWidget(self.inbox_list)
        
        important_layout = QVBoxLayout(self.tab_important)
        important_layout.addWidget(self.important_list)
        
        unnecessary_layout = QVBoxLayout(self.tab_unnecessary)
        unnecessary_layout.addWidget(self.unnecessary_list)

        main_layout.addWidget(self.tabs)

        # Action Buttons
        action_layout = QHBoxLayout()
        self.delete_button = QPushButton("削除", self)
        self.delete_button.clicked.connect(self.delete_selected_emails)
        action_layout.addWidget(self.delete_button)
        main_layout.addLayout(action_layout)

    def load_emails(self, query):
        if not self.gmail_service:
            print("API service is not available.")
            return

        emails = gmail_api.list_emails(self.gmail_service, query)
        
        self.inbox_list.clear()
        self.important_list.clear()
        self.unnecessary_list.clear()

        sorted_emails = mail_sorter.sort_emails(emails)
        
        for email in sorted_emails['important']:
            item = QListWidgetItem(f"件名: {email['subject']} - 差出人: {email['from']}")
            self.important_list.addItem(item)
        
        for email in sorted_emails['unnecessary']:
            item = QListWidgetItem(f"件名: {email['subject']} - 差出人: {email['from']}")
            self.unnecessary_list.addItem(item)

        for email in sorted_emails['inbox']:
            item = QListWidgetItem(f"件名: {email['subject']} - 差出人: {email['from']}")
            self.inbox_list.addItem(item)
            
    def search_emails(self):
        query = self.search_bar.text()
        self.load_emails(query)

    def delete_selected_emails(self):
        selected_items = self.unnecessary_list.selectedItems()
        if not selected_items:
            print("削除するメールが選択されていません。")
            return
        
        email_ids = []
        for item in selected_items:
            # Need to get actual email ID from item data
            email_ids.append(item.data(Qt.UserRole))
        
        if gmail_api.delete_emails(self.gmail_service, email_ids):
            print(f"{len(email_ids)}件のメールを削除しました。")
            self.load_emails('inbox') # Reload to show changes
        else:
            print("削除に失敗しました。")