let currentChatId = localStorage.getItem('currentChatId');
let isShowingArchived = false;
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// Function to save chat message
function saveChat(message, isUser) {
    let chats = JSON.parse(localStorage.getItem('chats') || '[]');
    const timestamp = new Date().toISOString();
    
    if (!currentChatId) {
        // Create new chat
        currentChatId = 'chat_' + Date.now();
        const newChat = {
            id: currentChatId,
            title: message.split(' ').slice(0, 2).join(' ') + '...',
            messages: [],
            archived: false,
            timestamp: timestamp
        };
        chats.unshift(newChat);
        localStorage.setItem('currentChatId', currentChatId);
    }

    // Find current chat and add message
    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (currentChat) {
        currentChat.messages.push({
            content: message,
            isUser: isUser,
            timestamp: timestamp
        });
        localStorage.setItem('chats', JSON.stringify(chats));
        loadChatHistory();
    }
}

// Function to send message
async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    if (!message) return;

    // Clear input and disable send button
    userInput.value = '';
    userInput.style.height = 'auto';
    document.getElementById('send-button').disabled = true;

    // Display user message
    appendMessage(message, true);

    try {
        // Show typing indicator
        showTypingIndicator();

        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator();

        // Display bot response
        if (data.response) {
            appendMessage(data.response, false);
        }

        // Save chat history
        saveChat(message, true);
        if (data.response) {
            saveChat(data.response, false);
        }

    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator();
        appendMessage('Sorry, I encountered an error. Please try again.', false);
    }

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to load chat history
function loadChatHistory() {
    const historyList = document.getElementById('history-list');
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');
    
    historyList.innerHTML = '';
    
    // Filter chats based on archive status
    const filteredChats = chats.filter(chat => 
        isShowingArchived ? chat.archived : !chat.archived
    );

    filteredChats.forEach(chat => {
        const historyItem = createHistoryItem(chat);
        if (historyItem) {
            if (chat.id === currentChatId) {
                historyItem.classList.add('active');
            }
            historyList.appendChild(historyItem);
        }
    });

    // Update archive button text
    const toggleArchivedBtn = document.getElementById('toggle-archived');
    if (toggleArchivedBtn) {
        toggleArchivedBtn.querySelector('span').textContent = 
            isShowingArchived ? 'Show active chats' : 'Show archived chats';
    }
}

// Function to load specific chat
function loadChat(chatId) {
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');
    const chat = chats.find(c => c.id === chatId);
    
    if (chat) {
        currentChatId = chatId;
        localStorage.setItem('currentChatId', chatId);
        
        // Clear and load messages
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '';
        
        if (chat.messages && chat.messages.length > 0) {
            chat.messages.forEach(msg => {
                appendMessage(msg.content, msg.isUser);
            });
        }
        
        // Update active state in sidebar
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.chatId === chatId) {
                item.classList.add('active');
            }
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Function to append message to chat
function appendMessage(content, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    // Format user messages
    if (isUser) {
        // Handle URLs
        let processedContent = content.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        // Handle email addresses
        processedContent = processedContent.replace(
            /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g,
            '<a href="mailto:$1">$1</a>'
        );
        
        // Handle line breaks
        processedContent = processedContent.replace(/\n/g, '<br>');
        
        bubble.innerHTML = processedContent;
    } else {
        // First handle code blocks (save them to restore later)
        let codeBlocks = [];
        let processedContent = content.replace(/```([\w:\/.-]+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            codeBlocks.push({
                language: lang || 'code snippet',
                code: code.trim()
            });
            return `###CODEBLOCK${codeBlocks.length - 1}###`;
        });

        // Handle markdown formatting
        processedContent = processedContent
            // Bold text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Paragraphs (double newlines)
            .replace(/\n\n/g, '</p><p>')
            // Single newlines
            .replace(/\n/g, '<br>');

        if (!processedContent.startsWith('<p>')) {
            processedContent = `<p>${processedContent}</p>`;
        }

        // Restore code blocks with syntax highlighting
        processedContent = processedContent.replace(/###CODEBLOCK(\d+)###/g, (match, index) => {
            const block = codeBlocks[index];
            const languageClass = `language-${block.language.toLowerCase() || 'javascript'}`;

            return `
                <div class="code-block">
                    <div class="code-header">
                        <span class="code-language">${block.language}</span>
                    </div>
                    <div class="code-content">
                        <pre><code class="${languageClass}">${escapeHtml(block.code)}</code></pre>
                        <button class="code-copy-btn" onclick="copyCode(this)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.912 4.895 3 6 3h8c1.105 0 2 .912 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.088 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Copy
                        </button>
                    </div>
                </div>
            `;
        });

        bubble.innerHTML = processedContent;
    }

    messageDiv.appendChild(bubble);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Add syntax highlighting for code blocks
    if (!isUser) {
        Prism.highlightAll();
    }
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Copy code function
function copyCode(button) {
    const codeBlock = button.closest('.code-block').querySelector('code');
    const text = codeBlock.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const originalContent = button.innerHTML;
        button.innerHTML = `
            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
        `;
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.classList.remove('copied');
        }, 2000);
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadChatHistory();
    
    // Load current chat if exists
    if (currentChatId) {
        loadChat(currentChatId);
    }

    // Add archive toggle listener
    const toggleArchivedBtn = document.getElementById('toggle-archived');
    if (toggleArchivedBtn) {
        toggleArchivedBtn.addEventListener('click', () => {
            isShowingArchived = !isShowingArchived;
            loadChatHistory();
        });
    }

    // New chat button
    document.getElementById('new-chat-button').addEventListener('click', () => {
        currentChatId = null;
        localStorage.removeItem('currentChatId');
        chatMessages.innerHTML = '';
    });

    // Send message on button click
    sendButton.addEventListener('click', sendMessage);

    // Send message on Enter (without shift)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendButton.disabled) sendMessage();
        }
    });

    // Enable/disable send button based on input
    userInput.addEventListener('input', function() {
        sendButton.disabled = !this.value.trim();
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });

    // Add clear conversations functionality
    const clearConversationsBtn = document.getElementById('clear-conversations');
    clearConversationsBtn.addEventListener('click', () => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Clear conversations</h3>
                <p>Are you sure you want to clear all conversations? This action cannot be undone.</p>
                <div class="modal-buttons">
                    <button class="modal-btn cancel">Cancel</button>
                    <button class="modal-btn delete">Clear</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.cancel').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.delete').addEventListener('click', () => {
            localStorage.removeItem('chats');
            localStorage.removeItem('currentChatId');
            currentChatId = null;
            chatMessages.innerHTML = '';
            loadChatHistory();
            modal.remove();
            showToast('Conversations cleared');
        });
    });

    // Add theme toggle button listener
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Set initial theme
    document.body.classList.toggle('light-mode', !isDarkMode);

    // Add these functions for data export/import
    document.getElementById('export-chats').addEventListener('click', exportChats);
    document.getElementById('import-chats-btn').addEventListener('click', () => {
        document.getElementById('import-chats').click();
    });
    document.getElementById('import-chats').addEventListener('change', importChats);
}); 

// Add these functions at the top
function createHistoryItem(chat) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.dataset.chatId = chat.id;
    
    historyItem.innerHTML = `
        <svg stroke="currentColor" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path>
        </svg>
        <span class="chat-title">${chat.title || 'New Chat'}</span>
        <button class="chat-options-btn">
            <svg width="16" height="4" viewBox="0 0 16 4" fill="currentColor">
                <circle cx="2" cy="2" r="1.5"/>
                <circle cx="8" cy="2" r="1.5"/>
                <circle cx="14" cy="2" r="1.5"/>
            </svg>
        </button>
        <div class="chat-options-menu">
            <div class="chat-option edit-label">Edit label</div>
            <div class="chat-option archive">${chat.archived ? 'Unarchive chat' : 'Archive chat'}</div>
            <div class="chat-option delete">Delete chat</div>
        </div>
    `;

    // Add click event for loading chat
    historyItem.addEventListener('click', (e) => {
        if (!e.target.closest('.chat-options-btn') && !e.target.closest('.chat-options-menu')) {
            loadChat(chat.id);
        }
    });

    // Add options button functionality
    const optionsBtn = historyItem.querySelector('.chat-options-btn');
    const optionsMenu = historyItem.querySelector('.chat-options-menu');
    
    optionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close all other menus first
        document.querySelectorAll('.chat-options-menu.active').forEach(menu => {
            if (menu !== optionsMenu) menu.classList.remove('active');
        });
        optionsMenu.classList.toggle('active');
    });

    // Add menu options functionality
    const editOption = historyItem.querySelector('.chat-option.edit-label');
    const archiveOption = historyItem.querySelector('.chat-option.archive');
    const deleteOption = historyItem.querySelector('.chat-option.delete');

    editOption.addEventListener('click', (e) => {
        e.stopPropagation();
        editChatLabel(chat.id);
        optionsMenu.classList.remove('active');
    });

    archiveOption.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleArchiveChat(chat.id);
        optionsMenu.classList.remove('active');
    });

    deleteOption.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteChat(chat.id);
        optionsMenu.classList.remove('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.chat-options-menu') && !e.target.closest('.chat-options-btn')) {
            optionsMenu.classList.remove('active');
        }
    });

    return historyItem;
}

function toggleArchiveChat(chatId) {
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');
    const chat = chats.find(c => c.id === chatId);
    
    if (chat) {
        chat.archived = !chat.archived;
        localStorage.setItem('chats', JSON.stringify(chats));
        
        // If archiving current chat, clear the current view
        if (chat.id === currentChatId && chat.archived) {
            currentChatId = null;
            localStorage.removeItem('currentChatId');
            document.getElementById('chat-messages').innerHTML = '';
        }
        
        showToast(chat.archived ? 'Chat archived' : 'Chat unarchived');
        loadChatHistory();
    }
}

function editChatLabel(chatId) {
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');
    const chat = chats.find(c => c.id === chatId);
    
    if (chat) {
        const editModal = document.createElement('div');
        editModal.className = 'modal';
        editModal.style.display = 'flex';
        
        editModal.innerHTML = `
            <div class="modal-content">
                <h3>Edit chat label</h3>
                <input type="text" class="edit-label-input" value="${chat.title}" 
                    placeholder="Enter new label" maxlength="30">
                <div class="modal-buttons">
                    <button class="modal-btn cancel">Cancel</button>
                    <button class="modal-btn save">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(editModal);
        
        const input = editModal.querySelector('.edit-label-input');
        input.focus();
        input.select();
        
        editModal.querySelector('.cancel').addEventListener('click', () => {
            editModal.remove();
        });
        
        editModal.querySelector('.save').addEventListener('click', () => {
            const newLabel = input.value.trim();
            if (newLabel) {
                chat.title = newLabel;
                localStorage.setItem('chats', JSON.stringify(chats));
                loadChatHistory();
                showToast('Chat label updated');
            }
            editModal.remove();
        });
    }
}

function deleteChat(chatId) {
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');
    const chatIndex = chats.findIndex(c => c.id === chatId);
    
    if (chatIndex !== -1) {
        chats.splice(chatIndex, 1);
        localStorage.setItem('chats', JSON.stringify(chats));
        showToast('Chat deleted');
        loadChatHistory();
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS for active state
const style = document.createElement('style');
style.textContent = `
    .history-item.active {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .history-item {
        cursor: pointer;
        transition: background 0.2s;
    }
    
    .history-item:hover {
        background: rgba(255, 255, 255, 0.05);
    }
`;
document.head.appendChild(style); 

// Add typing indicator functions
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-bubble">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Add this function to handle theme switching
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
}

// Add these functions for data export/import
function exportChats() {
    const chats = localStorage.getItem('chats');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(chats);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "chat_history.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importChats(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const chats = JSON.parse(e.target.result);
            localStorage.setItem('chats', JSON.stringify(chats));
            loadChatHistory();
            showToast('Chat history imported successfully');
        } catch (error) {
            showToast('Error importing chat history');
        }
    };
    
    reader.readAsText(file);
} 