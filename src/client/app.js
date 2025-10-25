// Test server connection
async function testConnection() {
    const resultDiv = document.getElementById('connectionResult');
    resultDiv.innerHTML = '<div class="result">Testing connection...</div>';
    
    try {
        const response = await fetch('/api/ping');
        const data = await response.json();
        
        resultDiv.innerHTML = `
            <div class="result success">
                <strong>✅ Connection Successful!</strong><br>
                Status: ${data.status}<br>
                Message: ${data.message}<br>
                Timestamp: ${data.timestamp}
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="result error">
                <strong>❌ Connection Failed</strong><br>
                Error: ${error.message}
            </div>
        `;
    }
}

// Test saving data
async function testSave() {
    const resultDiv = document.getElementById('saveResult');
    const key = document.getElementById('dataKey').value;
    const value = document.getElementById('dataValue').value;
    
    if (!value) {
        resultDiv.innerHTML = '<div class="result error">Please enter a value to save</div>';
        return;
    }
    
    resultDiv.innerHTML = '<div class="result">Saving data...</div>';
    
    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key, value })
        });
        
        const data = await response.json();
        
        if (data.success) {
            resultDiv.innerHTML = `
                <div class="result success">
                    <strong>✅ Data Saved Successfully!</strong><br>
                    Key: ${data.key}<br>
                    Message: ${data.message}<br>
                    Total Items: ${data.totalItems}
                </div>
            `;
            document.getElementById('getKey').value = data.key;
        } else {
            resultDiv.innerHTML = `
                <div class="result error">
                    <strong>❌ Save Failed</strong><br>
                    ${data.message}
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="result error">
                <strong>❌ Save Failed</strong><br>
                Error: ${error.message}
            </div>
        `;
    }
}

// Test getting data
async function testGet() {
    const resultDiv = document.getElementById('getResult');
    const key = document.getElementById('getKey').value;
    
    if (!key) {
        resultDiv.innerHTML = '<div class="result error">Please enter a key to retrieve</div>';
        return;
    }
    
    resultDiv.innerHTML = '<div class="result">Retrieving data...</div>';
    
    try {
        const response = await fetch(`/api/get?key=${encodeURIComponent(key)}`);
        const data = await response.json();
        
        if (data.success) {
            resultDiv.innerHTML = `
                <div class="result success">
                    <strong>✅ Data Retrieved!</strong><br>
                    Value: ${data.data.value}<br>
                    Saved At: ${data.data.savedAt}
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="result error">
                    <strong>❌ Not Found</strong><br>
                    ${data.message}
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="result error">
                <strong>❌ Retrieval Failed</strong><br>
                Error: ${error.message}
            </div>
        `;
    }
}

// Test listing all data
async function testList() {
    const resultDiv = document.getElementById('listResult');
    resultDiv.innerHTML = '<div class="result">Loading data...</div>';
    
    try {
        const response = await fetch('/api/list');
        const data = await response.json();
        
        if (data.success) {
            let itemsHtml = '';
            if (data.items.length === 0) {
                itemsHtml = '<em>No data stored yet</em>';
            } else {
                itemsHtml = data.items.map(item => 
                    `<div style="margin: 0.5rem 0; padding: 0.5rem; background: #f0f0f0; border-radius: 4px;">
                        <strong>Key:</strong> ${item.key}<br>
                        <strong>Value:</strong> ${item.value}<br>
                        <strong>Saved:</strong> ${item.savedAt}
                    </div>`
                ).join('');
            }
            
            resultDiv.innerHTML = `
                <div class="result success">
                    <strong>✅ Found ${data.count} item(s)</strong><br><br>
                    ${itemsHtml}
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="result error">
                    <strong>❌ Failed to list data</strong>
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="result error">
                <strong>❌ List Failed</strong><br>
                Error: ${error.message}
            </div>
        `;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners
    document.getElementById('btnTestConnection').addEventListener('click', testConnection);
    document.getElementById('btnSave').addEventListener('click', testSave);
    document.getElementById('btnGet').addEventListener('click', testGet);
    document.getElementById('btnList').addEventListener('click', testList);
    
    // Auto-test connection on load
    testConnection();
});
