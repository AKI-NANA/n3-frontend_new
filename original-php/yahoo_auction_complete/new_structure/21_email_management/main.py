import sys
from PyQt5.QtWidgets import QApplication
from ui.main_ui import GmailCleanerUI

if __name__ == '__main__':
    app = QApplication(sys.argv)
    ex = GmailCleanerUI()
    ex.show()
    sys.exit(app.exec_())