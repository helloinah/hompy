async function getSheetData() {
    const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRGDHN47eEH7dtDlYxoF-40-rXOyfuFeb5-fpd8_x4OUKaD30sJBytKI3s7lAsmlhSHTpkI6nXFk6aj/pub?output=csv'; // Replace with your actual published CSV URL
    try {
        const response = await fetch(sheetURL);
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        return [];
    }
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(','); // Assuming headers are in the first row
    const data = [];

    for (let i = 1; i < lines.length; i++) { // Skip header row
        const currentLine = lines[i].split(',');
        if (currentLine.length === headers.length) { // Ensure valid row
            const rowData = {};
            for (let j = 0; j < headers.length; j++) {
                // Trim whitespace and remove potential quotes from CSV values
                rowData[headers[j].trim().toLowerCase()] = currentLine[j].trim().replace(/^"|"$/g, '');
            }
            data.push(rowData);
        }
    }
    return data;
}

// Example usage:
// getSheetData().then(data => {
//     console.log(data); // This will log an array of objects, one for each row
//     // Now you can process this data to create your posts
// });