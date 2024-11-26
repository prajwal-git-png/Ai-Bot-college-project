from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from users import User
import google.generativeai as palm
from chat_manager import ChatManager
from dotenv import load_dotenv
import os
import re
import secrets

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY')

# Configure Google Palm API
palm.configure(api_key=os.getenv('GENAI_API_KEY'))
model = palm.GenerativeModel('gemini-pro')

# Initialize chat manager
chat_manager = ChatManager(max_history=50)

# Add some permanent context about the user (you can modify these)
chat_manager.add_permanent_info("user_name", "User")
chat_manager.add_permanent_info("user_preferences", "Prefers detailed technical explanations")
chat_manager.add_permanent_info("bot_personality", "Professional and friendly AI assistant")

# Add these lines after creating Flask app
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(email):
    return User.get(email)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        if email and '@' in email:
            user = User(email)
            login_user(user)
            return redirect(url_for('home'))
        flash('Invalid email format')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# Add @login_required to protected routes
@app.route('/')
@login_required
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
@login_required
def chat():
    data = request.json
    message = data.get('message')
    
    # Get context from chat manager
    context = chat_manager.get_context_for_prompt()
    
    # Create a prompt that includes context
    full_prompt = f"{context}\nUser: {message}\nAssistant:"
    
    # Generate response
    response = model.generate_content(full_prompt)
    
    # Add to history
    chat_manager.add_to_history(message, response.text)
    
    return jsonify({
        'response': response.text
    })

@app.route('/set_user_info', methods=['POST'])
def set_user_info():
    data = request.json
    key = data.get('key')
    value = data.get('value')
    
    if key and value:
        chat_manager.add_permanent_info(key, value)
        return jsonify({'status': 'success'})
    return jsonify({'status': 'error'})

if __name__ == '__main__':
    app.run(debug=True) 