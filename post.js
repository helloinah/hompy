document.addEventListener('DOMContentLoaded', () => {
    const postList = document.getElementById('post-list');
    const contentFrame = document.getElementById('content-frame');

    // IMPORTANT: Replace 'YOUR_PUBLISHED_CSV_URL_HERE' with the actual published CSV URL of your Google Sheet
    const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRGDHN47eEH7dtDlYxoF-40-rXOyfuFeb5-fpd8_x4OUKaD30sJBytKI3s7lAsmlhSHTpkI6nXFk6aj/pub?output=csv';

    async function getSheetData() {
        try {
            const response = await fetch(sheetURL);
            const csvText = await response.text();
            return parseCSV(csvText);
        } catch (error) {
            console.error('Error fetching sheet data:', error);
            postList.innerHTML = '<li>Error loading posts. Please try again later.</li>';
            return [];
        }
    }

    function parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return [];

        const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const currentLine = parseCSVLine(lines[i]);
            if (currentLine.length === headers.length) {
                const rowData = {};
                for (let j = 0; j < headers.length; j++) {
                    rowData[headers[j]] = currentLine[j];
                }
                data.push(rowData);
            } else {
                console.warn(`Skipping malformed row ${i + 1}: ${lines[i]}`);
            }
        }
        return data;
    }

    function parseCSVLine(line) {
        const result = [];
        let inQuote = false;
        let currentField = '';
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuote = !inQuote;
                if (line[i + 1] === ',' || i === line.length - 1) {
                    // Do nothing, just toggle inQuote
                } else {
                    currentField += char;
                }
            } else if (char === ',' && !inQuote) {
                result.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        result.push(currentField.trim());
        return result.map(field => field.replace(/^"|"$/g, ''));
    }

    function getEmbedURL(type, id) {
    let embedSrc = '';
    switch (type.toLowerCase()) {
        case 'docs':
            embedSrc = `https://docs.google.com/document/d/${id}/preview`;
            break;
        case 'slide':
            embedSrc = `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000`;
            break;
         case 'img':
            embedSrc = `https://drive.google.com/file/d/${id}/preview`;
            break;
        case 'pdf':
            embedSrc = `https://drive.google.com/file/d/${id}/preview`;
            break;
        case 'spreadsheet':
            embedSrc = `https://docs.google.com/spreadsheets/d/${id}/pubhtml?widget=true&headers=false`;
            break;
        default:
            embedSrc = '';
    }
    return embedSrc;
}

    function createPostElement(postData) {
        const li = document.createElement('li');

        if (postData.pin && (postData.pin.toLowerCase() === 'true' || postData.pin === '1')) {
            li.classList.add('pinned');
        }

        const title = document.createElement('div');
        title.classList.add('post-title');
        title.textContent = postData.title || 'Untitled Post';
        li.appendChild(title);

        const date = document.createElement('div');
        date.classList.add('post-date');
        const postDate = postData.date ? new Date(postData.date) : null;
        date.textContent = postDate && !isNaN(postDate) ? postDate.toLocaleDateString() : '';
        li.appendChild(date);

        const note = document.createElement('div');
        note.classList.add('post-note');
        note.textContent = postData.note || '';
        li.appendChild(note);

        if (postData.tag) {
            const tag = document.createElement('span');
            tag.classList.add('post-tag');
            tag.textContent = postData.tag;
            li.appendChild(tag);
        }

        // Add external link button if link exists
        if (postData.link) {
            const externalLinkBtn = document.createElement('a');
            externalLinkBtn.classList.add('post-external-link-btn'); // New class for styling
            externalLinkBtn.href = postData.link;
            externalLinkBtn.target = '_blank'; // Opens in a new tab
            externalLinkBtn.textContent = 'View More'; // Or "Open Link", "External Site"
            li.appendChild(externalLinkBtn);
        }

        // Add click listener to load content into iframe
        // IMPORTANT: We need to prevent the button click from triggering the post selection.
        li.addEventListener('click', (event) => {
            // Check if the click originated from the external link button itself
            if (event.target.classList.contains('post-external-link-btn')) {
                // If so, let the browser handle the link click and do not update the iframe.
                return;
            }

            // Otherwise, update iframe source for the post
            const embedURL = getEmbedURL(postData.type, postData.id);
            if (embedURL) {
                contentFrame.src = embedURL;
            } else {
                contentFrame.src = 'about:blank';
                console.warn(`No embed URL generated for type: ${postData.type} and ID: ${postData.id}`);
            }
        });

        return li;
    }

    async function loadPosts() {
        const posts = await getSheetData();

        posts.sort((a, b) => {
            const aPinned = (a.pin && (a.pin.toLowerCase() === 'true' || a.pin === '1'));
            const bPinned = (b.pin && (b.pin.toLowerCase() === 'true' || b.pin === '1'));

            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;

            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);

            return dateB.getTime() - dateA.getTime();
        });

        postList.innerHTML = '';

        posts.forEach(postData => {
            const postElement = createPostElement(postData);
            postList.appendChild(postElement);
        });

        // Load the first post's content on initial load
        if (posts.length > 0) {
            const firstPost = posts[0];
            const embedURL = getEmbedURL(firstPost.type, firstPost.id);
            if (embedURL) {
                contentFrame.src = embedURL;
            } else {
                contentFrame.src = 'about:blank';
            }
        }
    }

    loadPosts();
});