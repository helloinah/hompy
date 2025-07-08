// === CONFIGURATION ===
const SPREADSHEET_ID = '스프레드시트 ID'; // <-- 여기에 실제 스프레드시트 ID를 입력하세요
const POST_SHEET_NAME = 'DB'; // <-- 변경됨: 게시물 데이터가 있는 시트의 이름 (이제 'DB')
const COMMENT_SHEET_NAME = 'comment'; // 댓글 데이터가 있는 시트의 이름
const SPAM_LOG_SHEET_NAME = 'Spam_Log'; // 스팸 로그 시트의 이름

// --- DO NOT EDIT BELOW THIS LINE ---

/**
 * Main handler for HTTP GET requests, dispatches based on 'action' parameter.
 * Expected parameter: action (e.g., 'getComments', 'getPosts')
 */
function doGet(e) {
  const action = e.parameter.action;
  Logger.log(`Received GET action: ${action}`);

  if (action === 'getComments') {
    return handleGetComments(e);
  } else if (action === 'getPosts') {
    return handleGetPosts(e);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid action for GET.' }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Main handler for HTTP POST requests, dispatches based on 'action' parameter.
 * Expected parameters: action (e.g., 'addComment', 'updateLike', 'updateShare'), plus action-specific params.
 */
function doPost(e) {
  const action = e.parameter.action;
  Logger.log(`Received POST action: ${action}`);

  if (action === 'addComment') {
    return handleAddComment(e);
  } else if (action === 'updateLike') {
    return handleUpdateLike(e);
  } else if (action === 'updateShare') {
    return handleUpdateShare(e);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid action for POST.' }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}


/**
 * Helper function to retrieve post data, now with optional pagination and tag filtering.
 * Expected GET parameters:
 * - startIndex (optional): The 0-based index to start fetching posts from.
 * - numPosts (optional): The number of posts to fetch.
 * - tag (optional): Filter posts by this tag. If 'all', no tag filtering applied.
 */
function handleGetPosts(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(POST_SHEET_NAME);
    if (!sheet) {
      throw new Error(`Post sheet "${POST_SHEET_NAME}" not found.`);
    }

    const range = sheet.getDataRange();
    const values = range.getValues();

    if (values.length < 2) { // 헤더 행만 있거나 비어있는 경우
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }

    const headers = values[0].map(h => h.toLowerCase().trim());
    const allPosts = []; // Temporarily hold all parsed posts

    // 헤더 이름을 기반으로 열 인덱스를 찾습니다 (견고성을 위해)
    const pinCol = headers.indexOf('pin');
    const dateCol = headers.indexOf('date');
    const titleCol = headers.indexOf('title');
    const noteCol = headers.indexOf('note');
    const typeCol = headers.indexOf('type');
    const tagCol = headers.indexOf('tag');
    const idCol = headers.indexOf('id');
    const linkCol = headers.indexOf('link');
    const likeCol = headers.indexOf('like'); // I열 (0-based index: 8)
    const shareCol = headers.indexOf('share'); // J열 (0-based index: 9)

    // 모든 필수 열이 있는지 확인
    const requiredCols = [pinCol, dateCol, titleCol, noteCol, typeCol, tagCol, idCol, linkCol, likeCol, shareCol];
    if (requiredCols.some(col => col === -1)) {
        const missing = [];
        if (pinCol === -1) missing.push('pin');
        if (dateCol === -1) missing.push('date');
        if (titleCol === -1) missing.push('title');
        if (noteCol === -1) missing.push('note');
        if (typeCol === -1) missing.push('type');
        if (idCol === -1) missing.push('id');
        if (linkCol === -1) missing.push('link');
        if (likeCol === -1) missing.push('like');
        if (shareCol === -1) missing.push('share');
        throw new Error(`Missing required columns in Post sheet: ${missing.join(', ')}. Please check your headers.`);
    }

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const postData = {};

      // 열 인덱스를 사용하여 데이터 매핑
      postData.pin = (row[pinCol] && (row[pinCol].toString().toLowerCase() === 'true' || row[pinCol].toString() === '1'));
      postData.date = row[dateCol] ? new Date(row[dateCol]).toISOString() : '';
      postData.title = row[titleCol] ? row[titleCol].toString().trim() : '';
      postData.note = row[noteCol] ? row[noteCol].toString().trim() : '';
      postData.type = row[typeCol] ? row[typeCol].toString().trim() : '';
      postData.tag = row[tagCol] ? row[tagCol].toString().trim() : '';
      postData.id = row[idCol] ? row[idCol].toString().trim() : '';
      postData.link = row[linkCol] ? row[linkCol].toString().trim() : '';
      
      postData.like = parseInt(row[likeCol] || 0);
      postData.share = parseInt(row[shareCol] || 0);

      postData.rowIndex = i + 1;
      
      allPosts.push(postData);
    }

    allPosts.sort((a, b) => {
        if (a.pin && !b.pin) return -1;
        if (!a.pin && b.pin) return 1;

        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });

    let filteredAndPaginatedPosts = allPosts;

    const requestedTag = e.parameter.tag;
    if (requestedTag && requestedTag.toLowerCase() !== 'all') {
      filteredAndPaginatedPosts = allPosts.filter(post => 
        post.tag && post.tag.toLowerCase() === requestedTag.toLowerCase()
      );
    }

    const startIndex = parseInt(e.parameter.startIndex);
    const numPosts = parseInt(e.parameter.numPosts);

    if (!isNaN(startIndex) && !isNaN(numPosts) && startIndex >= 0 && numPosts > 0) {
      filteredAndPaginatedPosts = filteredAndPaginatedPosts.slice(startIndex, startIndex + numPosts);
    }

    return ContentService.createTextOutput(JSON.stringify(filteredAndPaginatedPosts)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in handleGetPosts: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}


/**
 * Helper function to handle updating a post's like count.
 */
function handleUpdateLike(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(POST_SHEET_NAME);
    if (!sheet) {
      throw new Error(`Post sheet "${POST_SHEET_NAME}" not found.`);
    }

    const rowIndex = parseInt(e.parameter.rowIndex);
    const likeAction = e.parameter.likeAction;

    if (isNaN(rowIndex) || rowIndex < 2) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid row index for like update.' }))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const likeColIndex = headers.map(h => h.toLowerCase().trim()).indexOf('like') + 1;

    if (likeColIndex === 0) {
      throw new Error("Like column not found in the spreadsheet. Please ensure header is 'like'.");
    }

    const currentLikes = parseInt(sheet.getRange(rowIndex, likeColIndex).getValue() || 0);
    let newLikes;

    if (likeAction === 'increment') {
      newLikes = currentLikes + 1;
    } else if (likeAction === 'decrement') {
      newLikes = Math.max(0, currentLikes - 1);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid like action.' }))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    sheet.getRange(rowIndex, likeColIndex).setValue(newLikes);
    
    Logger.log(`Updated likes for row ${rowIndex}: new count is ${newLikes}`);

    return ContentService.createTextOutput(JSON.stringify({ success: true, newLikes: newLikes }))
                         .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in handleUpdateLike: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper function to handle updating a post's share count. (NEW)
 */
function handleUpdateShare(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(POST_SHEET_NAME);
    if (!sheet) {
      throw new Error(`Post sheet "${POST_SHEET_NAME}" not found.`);
    }

    const rowIndex = parseInt(e.parameter.rowIndex);
    
    if (isNaN(rowIndex) || rowIndex < 2) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid row index for share update.' }))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const shareColIndex = headers.map(h => h.toLowerCase().trim()).indexOf('share') + 1;

    if (shareColIndex === 0) {
      throw new Error("Share column not found in the spreadsheet. Please ensure header is 'share'.");
    }

    const currentShares = parseInt(sheet.getRange(rowIndex, shareColIndex).getValue() || 0);
    const newShares = currentShares + 1;

    sheet.getRange(rowIndex, shareColIndex).setValue(newShares);

    Logger.log(`Updated shares for row ${rowIndex}: new count is ${newShares}`);

    return ContentService.createTextOutput(JSON.stringify({ success: true, newShares: newShares }))
                         .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in handleUpdateShare: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}


/**
 * Helper function to retrieve all comments.
 * MODIFIED: Now retrieves age and location as well, and filters by lastTimestamp.
 */
function handleGetComments(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(COMMENT_SHEET_NAME);
    if (!sheet) {
      throw new Error(`Comment sheet "${COMMENT_SHEET_NAME}" not found.`);
    }

    // Get lastTimestamp from the client, default to 0 if not provided
    const lastTimestamp = e.parameter.lastTimestamp ? parseInt(e.parameter.lastTimestamp) : 0;

    const range = sheet.getDataRange();
    const values = range.getValues();
    const comments = [];

    // Assuming headers are: Timestamp, Username, Age, Location, Message
    // Adjusted column indices based on your screenshot
    const timestampCol = 0; // A열
    const usernameCol = 1;  // B열
    const ageCol = 2;       // C열
    const locationCol = 3;  // D열
    const messageCol = 4;   // E열

    for (let i = 1; i < values.length; i++) { // Start from 1 to skip headers
      const row = values[i];
      const messageTimestamp = new Date(row[timestampCol]).getTime(); // Convert spreadsheet timestamp to milliseconds

      // Only include comments that are newer than the lastTimestamp provided by the client
      if (messageTimestamp > lastTimestamp) {
        comments.push({
          // Format date for consistent display on client-side
          timestamp: row[timestampCol] ? Utilities.formatDate(new Date(row[timestampCol]), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : '',
          username: row[usernameCol] || 'Anonymous',
          age: row[ageCol] || '', // Retrieve age
          location: row[locationCol] || '', // Retrieve location
          message: row[messageCol] || ''
        });
      }
    }
    // Sort comments by timestamp to ensure chronological order for the client
    comments.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    return ContentService.createTextOutput(JSON.stringify(comments))
                         .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in handleGetComments: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper function to handle adding a new comment (includes Honeypot spam prevention).
 * MODIFIED: Now accepts and appends age and location.
 */
function handleAddComment(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(COMMENT_SHEET_NAME);
    const spamLogSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SPAM_LOG_SHEET_NAME);
    const params = e.parameter;
    const userIp = e.remoteAddress;

    // --- 1. SPAM PREVENTION: Honeypot check ---
    if (params.hp_email && params.hp_email.length > 0) {
      Logger.log('Spam detected via honeypot: ' + JSON.stringify(params));
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Spam detected: honeypot triggered.' }))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    const username = params.username;
    const age = params.age; // NEW: Retrieve age
    const location = params.location; // NEW: Retrieve location
    const message = params.message;

    // --- NEW: Username, Age, Location Validation (Server-side) ---
    if (!username || username.trim() === '') {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Username cannot be empty.' }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    if (!age || age.trim() === '') { // Optional: Add validation for age
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Age cannot be empty.' }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    if (!location || location.trim() === '') { // Optional: Add validation for location
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Location cannot be empty.' }))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    // --- Input Validation (Existing) ---
    if (!message || message.trim() === '') {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Message cannot be empty.' }))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    // --- 2. SPAM PREVENTION: Content Filtering ---
    const forbiddenKeywords = [
      'http://', 'https://', 'www.', '.xyz', '.online', '.club', '.gdn',
      'buy now', 'free money', 'sex dating', 'casino', 'gambling', 'crypto',
      'earn at home', 'discount code', 'click here', 'guaranteed success'
    ];
    const lowerCaseMessage = message.toLowerCase();

    for (const keyword of forbiddenKeywords) {
      if (lowerCaseMessage.includes(keyword)) {
        Logger.log(`Spam detected: Keyword "${keyword}" found in message for IP ${userIp}.`);
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Your comment contains forbidden content.' }))
                             .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // --- 3. SPAM PREVENTION: IP Rate Limiting ---
    if (userIp) {
      if (!spamLogSheet) {
        Logger.log('Spam_Log sheet not found, cannot apply rate limit. Please create it.');
      } else {
        const logData = spamLogSheet.getDataRange().getValues();
        const currentTime = new Date().getTime();
        const rateLimitWindowMillis = 5 * 60 * 1000; // 5 minutes
        const maxCommentsPerWindow = 3; // Max 3 comments from same IP in 5 minutes

        let recentCommentsFromIp = 0;
        for (let i = 1; i < logData.length; i++) {
          const row = logData[i];
          const loggedIp = row[0];
          const loggedTimestamp = new Date(row[1]).getTime();

          if (loggedIp === userIp && (currentTime - loggedTimestamp) < rateLimitWindowMillis) {
            recentCommentsFromIp++;
          }
        }

        if (recentCommentsFromIp >= maxCommentsPerWindow) {
          Logger.log(`Spam detected: IP ${userIp} rate limit exceeded (${recentCommentsFromIp} comments in ${rateLimitWindowMillis / 60000} mins).`);
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Too many comments from this IP address. Please wait a few minutes.' }))
                               .setMimeType(ContentService.MimeType.JSON);
        }
        spamLogSheet.appendRow([userIp, new Date()]);
      }
    }
    
    // If all spam checks pass, append the comment
    const timestamp = new Date();
    // MODIFIED: Append age and location to the sheet
    sheet.appendRow([timestamp, username.trim(), age.trim(), location.trim(), message.trim()]);

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Comment added.' }))
                         .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in handleAddComment: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * This function is for initial setup/sheet name and ID testing.
 * MODIFIED: Update comment sheet headers for Age and Location.
 */
function setup() {
  try {
    // POST_SHEET_NAME 헤더 확인
    const mainSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(POST_SHEET_NAME);
    if (mainSheet) {
      Logger.log(`Main post sheet "${POST_SHEET_NAME}" found.`);
      const headers = mainSheet.getRange('A1:J1').getValues()[0];
      const requiredHeaders = ['Pin', 'Date', 'Title', 'Note', 'Type', 'Tag', 'ID', 'Link', 'Like', 'Share'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        Logger.log(`WARNING: Missing headers in ${POST_SHEET_NAME}: ${missingHeaders.join(', ')}`);
      } else {
        Logger.log(`All required headers found in ${POST_SHEET_NAME}.`);
      }
    } else {
      Logger.log(`Main post sheet "${POST_SHEET_NAME}" not found.`);
    }

    // COMMENT_SHEET_NAME 헤더 확인
    const commentSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(COMMENT_SHEET_NAME);
    if (commentSheet) {
      Logger.log(`Comment sheet "${COMMENT_SHEET_NAME}" found.`);
      if (commentSheet.getRange('A1').isBlank()) {
        // MODIFIED: Add 'Age' and 'Location' headers
        commentSheet.getRange('A1:E1').setValues([['Timestamp', 'Username', 'Age', 'Location', 'Message']]);
        Logger.log('Headers added to comment sheet.');
      }
    } else {
      Logger.log(`Comment sheet "${COMMENT_SHEET_NAME}" not found.`);
    }

    // SPAM_LOG_SHEET_NAME 헤더 확인
    const spamLogSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SPAM_LOG_SHEET_NAME);
    if (spamLogSheet) {
      Logger.log(`Spam_Log sheet "${SPAM_LOG_SHEET_NAME}" found.`);
      if (spamLogSheet.getRange('A1').isBlank()) {
        spamLogSheet.getRange('A1:B1').setValues([['IP', 'Timestamp']]);
        Logger.log('Headers added to Spam_Log sheet.');
      }
    } else {
      Logger.log(`Spam_Log sheet "${SPAM_LOG_SHEET_NAME}" not found.`);
    }

  } catch (e) {
    Logger.log('Error during setup: ' + e.message);
  }
}