from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

class User(UserMixin):
    def __init__(self, email):
        self.email = email
        self.id = email  # Using email as the user ID

    @staticmethod
    def get(email):
        # In a real app, you'd check against a database
        # For this demo, we'll accept any valid email
        if '@' in email:
            return User(email)
        return None 