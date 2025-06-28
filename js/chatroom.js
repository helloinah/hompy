// js/chatroom.js

import { APPS_SCRIPT_URL } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username-input');
    const ageInput = document.getElementById('age-input');
    const locationInput = document.getElementById('location-input');
    const messageInput = document.getElementById('message-input');
    const sendMessageButton = document.getElementById('send-message-button');
    const messagesDisplay = document.getElementById('messages-display');
    const chatroomContent = document.getElementById('chatroom-content');

    const honeypotField = document.getElementById('hp_email'); // NEW: Honeypot field

    const chatroomContainer = document.getElementById('chatroom-container');
    const chatroomHeader = document.getElementById('chatroom-header');
    const toggleButton = document.getElementById('toggle-button');
    const chatroomHeaderTitle = document.getElementById('chatroom-header-title');
    const infoDiv = document.querySelector('.info');

    let currentUser = {
        username: '',
        age: '',
        location: '',
        colorClass: ''
    };

    let lastDisplayedDate = ''; // To manage date dividers
    let isChatOpen = false; // To manage chatroom open/close state

    const userColors = [
        'user-color-0', 'user-color-1', 'user-color-2',
        'user-color-3', 'user-color-4', 'user-color-5'
    ];
    let colorMap = new Map(); // Stores assigned colors to usernames

    // --- Function to save all user data to localStorage ---
    function saveUserData() {
        const userData = {
            username: usernameInput.value.trim(),
            age: ageInput.value.trim(),
            location: locationInput.value.trim(),
            colorClass: currentUser.colorClass
        };
        if (userData.username && userData.age && userData.location) {
            localStorage.setItem('chat_user_data', JSON.stringify(userData));
        } else {
            localStorage.removeItem('chat_user_data');
        }
    }

    // --- Function to load all user data from localStorage ---
    function loadUserData() {
        const storedData = localStorage.getItem('chat_user_data');
        if (storedData) {
            try {
                return JSON.parse(storedData);
            } catch (e) {
                console.error("Error parsing stored user data:", e);
                localStorage.removeItem('chat_user_data');
                return null;
            }
        }
        return null;
    }

    // --- Event Listeners ---
    chatroomHeader.addEventListener('click', (event) => {
        if (chatroomHeader.contains(event.target) && event.target !== usernameInput && event.target !== ageInput && event.target !== locationInput) {
            toggleChatroom();
        }
    });
    
    // Listen for changes on any of the info inputs
    usernameInput.addEventListener('change', handleUserInfoChange);
    ageInput.addEventListener('change', handleUserInfoChange);
    locationInput.addEventListener('change', handleUserInfoChange);

    function handleUserInfoChange() {
        assignUserColor();
        currentUser.username = usernameInput.value.trim();
        currentUser.age = ageInput.value.trim();
        currentUser.location = locationInput.value.trim();
        currentUser.colorClass = colorMap.get(currentUser.username) || '';
        saveUserData();
        checkAndHideInfoDiv();
    }

    sendMessageButton.addEventListener('click', sendChatMessage); // Renamed to sendChatMessage for clarity
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendChatMessage(); // Renamed for clarity
        }
    });

    // --- Assign User Color Function ---
    function assignUserColor() {
        const username = usernameInput.value.trim();
        if (username && !colorMap.has(username)) {
            const assignedColor = userColors[colorMap.size % userColors.length];
            colorMap.set(username, assignedColor);
        }
    }

    // --- Function to check if info div should be hidden ---
    function checkAndHideInfoDiv() {
        if (usernameInput.value.trim() && ageInput.value.trim() && locationInput.value.trim()) {
            infoDiv.classList.add('hidden');
        } else {
            infoDiv.classList.remove('hidden');
        }
    }

    // --- Toggle Chatroom Function ---
    function toggleChatroom() {
        if (isChatOpen) {
            chatroomContainer.classList.remove('open');
            chatroomHeaderTitle.textContent = '방명록';
        } else {
            chatroomContainer.classList.add('open');
            
            currentUser.username = usernameInput.value.trim();
            currentUser.age = ageInput.value.trim();
            currentUser.location = locationInput.value.trim();
            
            assignUserColor();
            currentUser.colorClass = colorMap.get(currentUser.username) || '';

            if (currentUser.username) {
                chatroomHeaderTitle.textContent = `${currentUser.username}님 환영합니다~!`;
            } else {
                chatroomHeaderTitle.textContent = '방명록';
            }
            chatroomContent.scrollTop = chatroomContent.scrollHeight;
        }
        isChatOpen = !isChatOpen;
    }

    // --- Send Chat Message Function (adapted from commentManager.js sendComment) ---
    async function sendChatMessage() {
        const username = usernameInput.value.trim();
        const message = messageInput.value.trim();
        const age = ageInput.value.trim();
        const location = locationInput.value.trim();
        const hpEmail = honeypotField.value.trim(); // NEW: Honeypot check

        if (hpEmail !== '') {
            console.warn("Honeypot triggered, likely spam attempt.");
            return;
        }

        if (!username || !age || !location) {
            alert('닉네임, 나이, 지역을 모두 입력해주세요!');
            return;
        }

        if (!message) {
            alert("메시지를 입력해주세요!");
            return;
        }

        sendMessageButton.disabled = true;
        sendMessageButton.style.opacity = '0.5';

        currentUser.username = username;
        currentUser.age = age;
        currentUser.location = location;
        assignUserColor();
        currentUser.colorClass = colorMap.get(currentUser.username);
        saveUserData(); // Save data when message is sent
        checkAndHideInfoDiv(); // Check and hide after sending a message

        try {
            const formData = new FormData();
            formData.append('action', 'addComment'); // Assuming Apps Script handles additional fields with this action
            formData.append('username', username);
            formData.append('message', message);
            formData.append('age', age); // NEW: Send age
            formData.append('location', location); // NEW: Send location

            const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: formData });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            if (result.success) {
                messageInput.value = '';
                await fetchChatMessages(); // Fetch and display messages again
                messagesDisplay.scrollTop = messagesDisplay.scrollHeight; // Scroll to bottom
            } else {
                console.error(`Error: ${result.error || 'Failed to add message.'}`);
                alert(`Error: ${result.error || 'Failed to add message.'}`);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message. Please try again.');
        } finally {
            sendMessageButton.disabled = false;
            sendMessageButton.style.opacity = '1';
        }
    }

    // --- Fetch Chat Messages Function (adapted from commentManager.js fetchComments) ---
    async function fetchChatMessages() {
        if (!messagesDisplay) {
            console.error("Messages display not initialized. Cannot fetch messages.");
            return;
        }
        try {
            const response = await fetch(APPS_SCRIPT_URL + '?action=getComments'); // Assuming Apps Script returns age and location with getComments
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const messages = await response.json();

            if (messages.success === false) {
                console.error("Error from Apps Script (getComments for chat):", messages.error);
                messagesDisplay.innerHTML = '<div class="chat-message">방명록을 읽어올 수 없습니다.</div>';
                return;
            }

            messagesDisplay.innerHTML = ''; // Clear existing messages
            lastDisplayedDate = ''; // Reset date for re-rendering

            if (!Array.isArray(messages) || messages.length === 0) {
                messagesDisplay.innerHTML = '<div class="chat-message">그 누구도 글을 남겨주징 않았네...</div>';
            } else {
                messages.forEach(msg => {
                    const now = new Date(msg.timestamp); // Use timestamp from Apps Script
                    const currentDate = now.toISOString().split('T')[0];
                    const currentTime = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

                    if (currentDate !== lastDisplayedDate) {
                        displayDateDivider(now);
                        lastDisplayedDate = currentDate;
                    }

                    // Assign color based on username from fetched data
                    if (msg.username && !colorMap.has(msg.username)) {
                         const assignedColor = userColors[colorMap.size % userColors.length];
                         colorMap.set(msg.username, assignedColor);
                    }
                    const msgColorClass = colorMap.get(msg.username) || '';

                    const messageElement = document.createElement('div');
                    messageElement.classList.add('chat-message');
                    messageElement.innerHTML = `
                        <span class="timestamp">${currentTime}</span>
                        <strong class="${msgColorClass}">${msg.username || ''}(${msg.age || ''}/${msg.location || ''}):</strong>
                        ${msg.message || ''}
                    `;
                    messagesDisplay.appendChild(messageElement);
                });
                messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
            }
        } catch (error) {
            console.error('Error fetching chat messages:', error);
            messagesDisplay.innerHTML = '<div class="chat-message">Failed to load messages.</div>';
        }
    }

    // --- Display Date Divider Function ---
    function displayDateDivider(dateObj) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;

        const dividerElement = document.createElement('div');
        dividerElement.classList.add('date-divider');
        dividerElement.innerHTML = `<span>${formattedDate}</span>`;
        messagesDisplay.appendChild(dividerElement);
    }

    // --- Initial Load Logic ---
    const loadedData = loadUserData();
    if (loadedData) {
        usernameInput.value = loadedData.username || '';
        ageInput.value = loadedData.age || '';
        locationInput.value = loadedData.location || '';
        
        currentUser.username = loadedData.username || '';
        currentUser.age = loadedData.age || '';
        currentUser.location = loadedData.location || '';
        currentUser.colorClass = loadedData.colorClass || '';
        if (currentUser.username && currentUser.colorClass) {
            colorMap.set(currentUser.username, currentUser.colorClass);
        }
    }
    checkAndHideInfoDiv(); // Check and hide info div on load

    // Initial fetch of messages
    fetchChatMessages();
    // Set interval for periodic updates
    setInterval(fetchChatMessages, 30000); // Fetch every 30 seconds

    isChatOpen = false; // Initial state for chatroom toggle
});