from typing import List, Dict
import json
import os

class ChatManager:
    def __init__(self, max_history: int = 50):
        self.max_history = max_history
        self.permanent_context = {}
        self.conversation_history = []
        self.load_permanent_context()
    
    def load_permanent_context(self):
        if os.path.exists('permanent_context.json'):
            with open('permanent_context.json', 'r') as f:
                self.permanent_context = json.load(f)
    
    def save_permanent_context(self):
        with open('permanent_context.json', 'w') as f:
            json.dump(self.permanent_context, f)
    
    def add_permanent_info(self, key: str, value: str):
        self.permanent_context[key] = value
        self.save_permanent_context()
    
    def add_to_history(self, message: str, response: str):
        self.conversation_history.append({
            "user": message,
            "assistant": response
        })
        if len(self.conversation_history) > self.max_history:
            self.conversation_history.pop(0)
    
    def get_context_for_prompt(self) -> str:
        context = "Permanent Context:\n"
        for key, value in self.permanent_context.items():
            context += f"{key}: {value}\n"
        
        context += "\nRecent Conversation History:\n"
        for exchange in self.conversation_history[-5:]:  # Last 5 conversations
            context += f"User: {exchange['user']}\nAssistant: {exchange['assistant']}\n"
        
        return context 